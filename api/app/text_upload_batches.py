import json
from datetime import datetime, timedelta
from typing import Iterable

from .database import models


NON_TERMINAL_BATCH_STATUSES = {
    models.TextUploadBatchStatus.IMPORTING,
    models.TextUploadBatchStatus.QUEUED,
    models.TextUploadBatchStatus.PROCESSING,
}


def utcnow() -> datetime:
    return datetime.utcnow()


def load_failed_files(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []

    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError:
        return []

    return [str(item) for item in parsed if isinstance(item, str)]


def dump_failed_files(values: Iterable[str]) -> str:
    return json.dumps(list(dict.fromkeys(values)))


def append_failed_files(batch: models.TextUploadBatch, values: Iterable[str]) -> None:
    merged = load_failed_files(batch.failed_files)
    merged.extend(value for value in values if value)
    batch.failed_files = dump_failed_files(merged)


def is_batch_recovering(batch: models.TextUploadBatch, texts: list[models.Text] | None = None) -> bool:
    if texts is None:
        texts = list(batch.texts)

    return any(
        text.processing_status == models.ProcessingStatus.PENDING
        and text.processing_attempts > 0
        for text in texts
    )


def build_batch_status_message(
    batch: models.TextUploadBatch,
    texts: list[models.Text] | None = None,
) -> str:
    if texts is None:
        texts = list(batch.texts)

    recovering = is_batch_recovering(batch, texts)

    if batch.status == models.TextUploadBatchStatus.IMPORTING:
        return 'Importando arquivos do lote.'
    if batch.status == models.TextUploadBatchStatus.QUEUED:
        return 'Retomando processamento dos textos.' if recovering else 'Textos aguardando processamento.'
    if batch.status == models.TextUploadBatchStatus.PROCESSING:
        return 'Reprocessando textos apos recuperacao.' if recovering else 'Processando textos em segundo plano.'
    if batch.status == models.TextUploadBatchStatus.COMPLETED:
        return 'Processamento concluido.'
    if batch.status == models.TextUploadBatchStatus.COMPLETED_WITH_ERRORS:
        return 'Processamento concluido com falhas.'
    if batch.status == models.TextUploadBatchStatus.FAILED:
        return 'Nao foi possivel concluir o processamento do lote.'
    return 'Status do lote indisponivel.'


def sync_text_upload_batch_state(session, batch_id: int) -> models.TextUploadBatch | None:
    batch = session.get(models.TextUploadBatch, batch_id)
    if batch is None:
        return None

    texts = (
        session.query(models.Text)
        .filter(models.Text.upload_batch_id == batch_id)
        .all()
    )

    created_count = len(texts)
    processed_count = sum(text.processing_status == models.ProcessingStatus.READY for text in texts)
    failed_count = sum(text.processing_status == models.ProcessingStatus.FAILED for text in texts)
    processing_count = sum(text.processing_status == models.ProcessingStatus.PROCESSING for text in texts)
    pending_count = sum(text.processing_status == models.ProcessingStatus.PENDING for text in texts)
    failed_files = load_failed_files(batch.failed_files)

    batch.created_texts = created_count
    batch.processed_texts = processed_count
    batch.failed_texts = failed_count

    if batch.import_finished_at is None:
        batch.status = models.TextUploadBatchStatus.IMPORTING
    elif processing_count > 0:
        batch.status = models.TextUploadBatchStatus.PROCESSING
        if batch.processing_started_at is None:
            batch.processing_started_at = utcnow()
        batch.processing_finished_at = None
    elif pending_count > 0:
        batch.status = models.TextUploadBatchStatus.QUEUED
        batch.processing_finished_at = None
    elif created_count == 0:
        batch.status = models.TextUploadBatchStatus.FAILED
        if batch.processing_finished_at is None:
            batch.processing_finished_at = utcnow()
    elif failed_count > 0 or len(failed_files) > 0:
        batch.status = models.TextUploadBatchStatus.COMPLETED_WITH_ERRORS
        if batch.processing_finished_at is None:
            batch.processing_finished_at = utcnow()
    else:
        batch.status = models.TextUploadBatchStatus.COMPLETED
        if batch.processing_finished_at is None:
            batch.processing_finished_at = utcnow()

    session.commit()
    session.refresh(batch)
    return batch


def serialize_batch_text(text: models.Text) -> dict:
    return {
        'id': text.id,
        'source_file_name': text.source_file_name,
        'processing_status': text.processing_status.name,
        'processing_attempts': text.processing_attempts,
    }


def serialize_text_upload_batch(batch: models.TextUploadBatch, include_texts: bool = False) -> dict:
    texts = sorted(batch.texts, key=lambda text: text.id)
    payload = {
        'id': batch.id,
        'source_file_name': batch.source_file_name,
        'status': batch.status.name,
        'status_message': build_batch_status_message(batch, texts),
        'is_recovering': is_batch_recovering(batch, texts),
        'total_files': batch.total_files,
        'created_texts': batch.created_texts,
        'processed_texts': batch.processed_texts,
        'failed_texts': batch.failed_texts,
        'failed_files': load_failed_files(batch.failed_files),
        'created_at': batch.created_at,
        'updated_at': batch.updated_at,
        'import_finished_at': batch.import_finished_at,
        'processing_started_at': batch.processing_started_at,
        'processing_finished_at': batch.processing_finished_at,
        'last_error': batch.last_error,
    }

    if include_texts:
        payload['texts'] = [serialize_batch_text(text) for text in texts]

    return payload


def list_resumable_text_upload_batches(session, user_id: int, recent_window_hours: int = 24) -> list[models.TextUploadBatch]:
    recent_cutoff = utcnow() - timedelta(hours=recent_window_hours)

    return (
        session.query(models.TextUploadBatch)
        .filter(models.TextUploadBatch.created_by_user_id == user_id)
        .filter(
            (models.TextUploadBatch.status.in_(list(NON_TERMINAL_BATCH_STATUSES)))
            | (models.TextUploadBatch.updated_at >= recent_cutoff)
        )
        .order_by(models.TextUploadBatch.updated_at.desc(), models.TextUploadBatch.id.desc())
        .all()
    )


def enqueue_text_processing_task(session, text: models.Text):
    from .tasks.celery_tasks import process_single_text_background

    task = process_single_text_background.delay(text.id)
    text.processing_enqueued_at = utcnow()
    text.processing_task_id = task.id
    session.commit()
    return task


def enqueue_pending_batch_texts(session, batch_id: int, stale_after_seconds: int) -> int:
    batch = session.get(models.TextUploadBatch, batch_id)
    if batch is None or batch.status not in NON_TERMINAL_BATCH_STATUSES:
        return 0

    stale_cutoff = utcnow() - timedelta(seconds=stale_after_seconds)
    pending_texts = (
        session.query(models.Text)
        .filter(models.Text.upload_batch_id == batch_id)
        .filter(models.Text.processing_status == models.ProcessingStatus.PENDING)
        .all()
    )

    enqueued = 0
    for text in pending_texts:
        if text.processing_enqueued_at and text.processing_enqueued_at > stale_cutoff:
            continue
        try:
            enqueue_text_processing_task(session, text)
            enqueued += 1
        except Exception as exc:
            session.rollback()
            refreshed_text = session.get(models.Text, text.id)
            refreshed_batch = session.get(models.TextUploadBatch, batch_id)
            if refreshed_text is not None:
                refreshed_text.processing_task_id = None
                refreshed_text.processing_enqueued_at = None
                refreshed_text.last_processing_error = f'Failed to enqueue text processing task: {exc}'
            if refreshed_batch is not None:
                refreshed_batch.last_error = str(exc)
            session.commit()

    if enqueued > 0:
        batch.status = models.TextUploadBatchStatus.QUEUED
        batch.processing_finished_at = None
        session.commit()

    return enqueued


def reconcile_stale_text_upload_batches(
    session,
    stale_after_seconds: int,
    max_attempts: int,
    force_processing_recovery: bool = False,
) -> list[int]:
    stale_cutoff = utcnow() - timedelta(seconds=stale_after_seconds)
    touched_batch_ids: set[int] = set()

    active_batches = (
        session.query(models.TextUploadBatch)
        .filter(models.TextUploadBatch.status.in_(list(NON_TERMINAL_BATCH_STATUSES)))
        .all()
    )

    for batch in active_batches:
        batch_changed = False
        texts = (
            session.query(models.Text)
            .filter(models.Text.upload_batch_id == batch.id)
            .all()
        )

        for text in texts:
            if (
                text.processing_status == models.ProcessingStatus.PROCESSING
                and (
                    force_processing_recovery
                    or text.processing_heartbeat_at is None
                    or text.processing_heartbeat_at < stale_cutoff
                )
            ):
                if text.processing_attempts >= max_attempts:
                    text.processing_status = models.ProcessingStatus.FAILED
                    text.last_processing_error = 'Text processing exceeded the maximum retry attempts.'
                else:
                    text.processing_status = models.ProcessingStatus.PENDING
                    text.processing_task_id = None
                    text.processing_enqueued_at = None
                    if text.last_processing_error is None:
                        text.last_processing_error = (
                            'Recovered after worker restart.'
                            if force_processing_recovery
                            else 'Recovered after stale text processing task.'
                        )
                text.processing_heartbeat_at = utcnow()
                batch_changed = True

            if (
                text.processing_status == models.ProcessingStatus.PENDING
                and text.processing_enqueued_at
                and text.processing_enqueued_at < stale_cutoff
            ):
                text.processing_task_id = None
                text.processing_enqueued_at = None
                batch_changed = True

        if batch_changed:
            session.commit()

        if batch.import_finished_at is not None:
            enqueue_pending_batch_texts(session, batch.id, stale_after_seconds)

        sync_text_upload_batch_state(session, batch.id)
        touched_batch_ids.add(batch.id)

    return sorted(touched_batch_ids)
