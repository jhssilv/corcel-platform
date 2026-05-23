"""Background Celery task logic for asynchronous text ZIP uploads."""

import base64
import binascii
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


def _open_text_upload_archive(zip_path: str | None, zip_payload_b64: str | None) -> zipfile.ZipFile:
    if zip_payload_b64 is not None:
        try:
            zip_bytes = base64.b64decode(zip_payload_b64)
        except (binascii.Error, ValueError) as exc:
            raise RuntimeError('Invalid or corrupted ZIP file.') from exc

        return zipfile.ZipFile(io.BytesIO(zip_bytes), 'r')

    if zip_path is None:
        raise RuntimeError('No ZIP archive was provided.')

    return zipfile.ZipFile(zip_path, 'r')


def run_text_upload_zip_pipeline(
    task,
    zip_path: str | None = None,
    zip_payload_b64: str | None = None,
    original_filename: str | None = None,
):
    from app.extensions import db
    from app.text_pipeline import get_tokenizer
    from app.database import models
    from app.database.queries import add_text

    from .celery_tasks import process_texts_background

    text_ids: list[int] = []
    ingestion_failed_files: list[str] = []

    try:
        with _open_text_upload_archive(zip_path, zip_payload_b64) as zip_ref:
            file_list = _collect_text_archive_members(zip_ref)
            total_files = len(file_list)
            tokenizer = get_tokenizer()

            logger.info(
                'Asynchronous text upload pipeline started',
                extra={
                    'event': {
                        'total_files': total_files,
                        'original_filename': original_filename,
                    }
                },
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

            try:
                processing_task = process_texts_background.delay(text_ids)
            except Exception as exc:
                imported_texts = (
                    db.session.query(models.Text)
                    .filter(models.Text.id.in_(text_ids))
                    .all()
                )
                for text_obj in imported_texts:
                    text_obj.processing_status = models.ProcessingStatus.FAILED
                db.session.commit()
                raise RuntimeError('Failed to enqueue background text processing.') from exc

            failed_files = list(dict.fromkeys(ingestion_failed_files))

            logger.info(
                'Asynchronous text upload pipeline finished',
                extra={
                    'event': {
                        'total_files': total_files,
                        'created_texts': len(text_ids),
                        'processing_task_id': processing_task.id,
                        'failed_files': failed_files,
                        'original_filename': original_filename,
                    }
                },
            )

            return {
                'status': 'Concluido',
                'total': total_files,
                'result': {
                    'kind': 'text_upload',
                    'text_ids': text_ids,
                    'created': len(text_ids),
                    'failed_files': failed_files,
                },
                'failed_files': failed_files,
            }

    except zipfile.BadZipFile as exc:
        raise RuntimeError('Invalid or corrupted ZIP file.') from exc
    except ValueError as exc:
        raise RuntimeError(str(exc)) from exc
    finally:
        if zip_path and os.path.exists(zip_path):
            os.remove(zip_path)
