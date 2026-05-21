"""Background Celery task logic for asynchronous text ZIP uploads."""

import io
import os
import zipfile

from docx import Document

from ..logging_config import get_logger

logger = get_logger('app.task.text_upload_task_logic', source='task', task_module='text_upload_task_logic')

MAX_TEXT_UPLOAD_FILES = 200


def _collect_text_archive_members(zip_ref: zipfile.ZipFile) -> list[str]:
    file_list: list[str] = []

    for member_name in zip_ref.namelist():
        base_name = os.path.basename(member_name)
        if not base_name or base_name.startswith('__') or base_name.startswith('.'):
            continue
        if base_name.lower().endswith('.txt') or base_name.lower().endswith('.docx'):
            file_list.append(member_name)

    if len(file_list) == 0:
        raise ValueError('The zip file does not contain valid files.')

    if len(file_list) > MAX_TEXT_UPLOAD_FILES:
        raise ValueError(f'Maximum of {MAX_TEXT_UPLOAD_FILES} files allowed per upload.')

    return file_list


def run_text_upload_zip_pipeline(task, zip_path: str):
    from app.extensions import db
    from app.text_pipeline import get_tokenizer
    from app.database import models
    from app.database.queries import add_text

    from .text_task_logic import run_process_texts_pipeline

    text_ids: list[int] = []
    ingestion_failed_files: list[str] = []

    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            file_list = _collect_text_archive_members(zip_ref)
            total_files = len(file_list)
            tokenizer = get_tokenizer()

            logger.info(
                'Asynchronous text upload pipeline started',
                extra={'event': {'total_files': total_files}},
            )

            for index, member_name in enumerate(file_list):
                base_name = os.path.basename(member_name)
                task.update_state(
                    state='PROGRESS',
                    meta={
                        'current': index + 1,
                        'total': total_files,
                        'status': f'Importando arquivo {index + 1}/{total_files}',
                    },
                )

                try:
                    with zip_ref.open(member_name) as file_handle:
                        if member_name.lower().endswith('.docx'):
                            doc = Document(io.BytesIO(file_handle.read()))
                            text_content = "\n".join([paragraph.text for paragraph in doc.paragraphs])
                        else:
                            text_content = file_handle.read().decode('utf-8', errors='replace')

                    tokenized_tokens = tokenizer.tokenize(text_content)
                    tokenized_data = {token.idx: token for token in tokenized_tokens}
                    text_obj = models.Text(source_file_name=base_name)

                    tokens_with_candidates = []
                    for position, token_data in tokenized_data.items():
                        token = models.Token(
                            token_text=token_data.text,
                            is_word=token_data.is_word,
                            position=int(position),
                            to_be_normalized=False,
                            whitespace_after=token_data.whitespace_after,
                        )
                        tokens_with_candidates.append((token, []))

                    text_id = add_text(text_obj, tokens_with_candidates, db.session)
                    text_ids.append(text_id)

                except Exception as exc:
                    db.session.rollback()
                    ingestion_failed_files.append(base_name)
                    logger.exception(
                        'Failed to ingest uploaded text file',
                        extra={
                            'event': {
                                'file_name': base_name,
                                'error': str(exc),
                            }
                        },
                    )

            if not text_ids:
                raise RuntimeError('No files could be imported from the uploaded archive.')

            processing_result = run_process_texts_pipeline(task, text_ids)
            processing_failed_files = processing_result.get('failed_files', [])
            failed_files = list(dict.fromkeys([*ingestion_failed_files, *processing_failed_files]))

            logger.info(
                'Asynchronous text upload pipeline finished',
                extra={
                    'event': {
                        'total_files': total_files,
                        'created_texts': len(text_ids),
                        'failed_files': failed_files,
                    }
                },
            )

            return {
                'status': 'Concluido',
                'total': total_files,
                'result': {
                    'kind': 'text_upload',
                    'text_ids': text_ids,
                    'processed': processing_result.get('processed', 0),
                    'failed_files': failed_files,
                },
                'failed_files': failed_files,
            }

    except zipfile.BadZipFile as exc:
        raise RuntimeError('Invalid or corrupted ZIP file.') from exc
    except ValueError as exc:
        raise RuntimeError(str(exc)) from exc
    finally:
        if os.path.exists(zip_path):
            os.remove(zip_path)
