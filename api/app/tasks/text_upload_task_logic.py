"""Background Celery task logic for asynchronous text ZIP uploads."""

import base64
import binascii
import io
import os
import zipfile

from docx import Document

from ..database import models
from ..logging_config import get_logger
from ..tasks.constants import (
    TEXT_UPLOAD_MAX_MEMBER_SIZE,
    TEXT_UPLOAD_MAX_UNCOMPRESSED_SIZE,
)
from ..text_upload_batches import (
    append_failed_files,
    load_failed_files,
    sync_text_upload_batch_state,
    utcnow,
)

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


def _validate_text_archive_members(zip_ref: zipfile.ZipFile, file_list: list[str]) -> None:
    total_uncompressed_size = 0

    for member_name in file_list:
        info = zip_ref.getinfo(member_name)
        if info.file_size > TEXT_UPLOAD_MAX_MEMBER_SIZE:
            raise ValueError(f'File "{os.path.basename(member_name)}" exceeds the 50 MB text upload limit.')

        total_uncompressed_size += info.file_size
        if total_uncompressed_size > TEXT_UPLOAD_MAX_UNCOMPRESSED_SIZE:
            raise ValueError('The uploaded archive exceeds the maximum uncompressed size.')


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
    batch_id: int | None = None,
    zip_path: str | None = None,
    zip_payload_b64: str | None = None,
    original_filename: str | None = None,
):
    from app.extensions import db
    from app.text_pipeline import get_tokenizer
    from app.database.queries import add_text

    text_ids: list[int] = []
    ingestion_failed_files: list[str] = []
    batch = db.session.get(models.TextUploadBatch, batch_id) if batch_id is not None else None

    try:
        if batch is None:
            raise RuntimeError('Text upload batch not found.')

        with _open_text_upload_archive(zip_path, zip_payload_b64) as zip_ref:
            file_list = _collect_text_archive_members(zip_ref)
            _validate_text_archive_members(zip_ref, file_list)
            total_files = len(file_list)
            tokenizer = get_tokenizer()
            batch.total_files = total_files
            batch.status = models.TextUploadBatchStatus.IMPORTING
            db.session.commit()

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
                if task is not None and hasattr(task, 'report_progress'):
                    task.report_progress(
                        current=index + 1,
                        total=total_files,
                        status_message=f'Importando arquivo {index + 1}/{total_files}',
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
                    text_obj = models.Text(
                        source_file_name=base_name,
                        upload_batch_id=batch.id,
                    )

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
                    if text_obj.id is None:
                        text_obj.id = text_id
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
                batch.status = models.TextUploadBatchStatus.FAILED
                batch.last_error = 'No files could be imported from the uploaded archive.'
                append_failed_files(batch, ingestion_failed_files)
                db.session.commit()
                raise RuntimeError('No files could be imported from the uploaded archive.')

            failed_files = list(dict.fromkeys(ingestion_failed_files))
            append_failed_files(batch, failed_files)
            batch.import_finished_at = utcnow()
            batch.status = models.TextUploadBatchStatus.QUEUED
            batch.last_error = None
            db.session.commit()

            batch = sync_text_upload_batch_state(db.session, batch.id)

            logger.info(
                'Asynchronous text upload pipeline finished',
                extra={
                    'event': {
                        'total_files': total_files,
                        'created_texts': len(text_ids),
                        'batch_id': batch.id,
                        'failed_files': failed_files,
                        'original_filename': original_filename,
                    }
                },
            )

            return {
                'status': 'Completed',
                'total': total_files,
                'result': {
                    'kind': 'text_upload',
                    'batch_id': batch.id,
                    'text_ids': text_ids,
                    'created': len(text_ids),
                    'failed_files': load_failed_files(batch.failed_files),
                },
                'failed_files': load_failed_files(batch.failed_files),
            }

    except zipfile.BadZipFile as exc:
        if batch is not None:
            batch.status = models.TextUploadBatchStatus.FAILED
            batch.last_error = 'Invalid or corrupted ZIP file.'
            db.session.commit()
        raise RuntimeError('Invalid or corrupted ZIP file.') from exc
    except ValueError as exc:
        if batch is not None:
            batch.status = models.TextUploadBatchStatus.FAILED
            batch.last_error = str(exc)
            db.session.commit()
        raise RuntimeError(str(exc)) from exc
    except RuntimeError:
        raise
    except Exception as exc:
        if batch is not None:
            batch.status = models.TextUploadBatchStatus.FAILED
            batch.last_error = str(exc)
            db.session.commit()
        raise
    finally:
        if zip_path and os.path.exists(zip_path):
            os.remove(zip_path)
