import json
from datetime import datetime, timezone, timedelta
from typing import Iterable

from sqlalchemy import func, or_

from .database import models

NON_TERMINAL_BATCH_STATUSES = {
    models.TextUploadBatchStatus.IMPORTING,
    models.TextUploadBatchStatus.QUEUED,
    models.TextUploadBatchStatus.PROCESSING,
}


def utcnow() -> datetime:
    """Return current UTC time (naive for DB compatibility)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def load_failed_files(raw_value: str | None) -> list[str]:
    """Parse JSON string containing list of failed filenames."""
    if not raw_value:
        return []

    try:
        parsed = json.loads(raw_value)
        if isinstance(parsed, list):
            return [str(item) for item in parsed if isinstance(item, str)]
    except (json.JSONDecodeError, TypeError):
        pass

    return []


def dump_failed_files(values: Iterable[str]) -> str:
    """Serialize iterable of filenames to deduplicated JSON string."""
    return json.dumps(list(dict.fromkeys(values)))


def append_failed_files(batch: models.TextUploadBatch, values: Iterable[str]) -> None:
    """Append new failed filenames to a batch's JSON record."""
    merged = load_failed_files(batch.failed_files)
    merged.extend(v for v in values if v)
    batch.failed_files = dump_failed_files(merged)


def is_batch_recovering(
    batch: models.TextUploadBatch, texts: list[models.Text] | None = None
) -> bool:
    """Return True if any text in the batch is PENDING and has prior processing attempts."""
    items = texts if texts is not None else list(batch.texts)
    return any(
        text.processing_status == models.ProcessingStatus.PENDING
        and (text.processing_attempts or 0) > 0
        for text in items
    )


def build_batch_status_message(
    batch: models.TextUploadBatch,
    texts: list[models.Text] | None = None,
) -> str:
    """Build user-facing status string for a text upload batch."""
    recovering = is_batch_recovering(batch, texts)

    status_messages = {
        models.TextUploadBatchStatus.IMPORTING: "Importando arquivos do lote.",
        models.TextUploadBatchStatus.QUEUED: (
            "Retomando processamento dos textos."
            if recovering
            else "Textos aguardando processamento."
        ),
        models.TextUploadBatchStatus.PROCESSING: (
            "Reprocessando textos apos recuperacao."
            if recovering
            else "Processando textos em segundo plano."
        ),
        models.TextUploadBatchStatus.COMPLETED: "Processamento concluido.",
        models.TextUploadBatchStatus.COMPLETED_WITH_ERRORS: "Processamento concluido com falhas.",
        models.TextUploadBatchStatus.FAILED: "Nao foi possivel concluir o processamento do lote.",
    }

    return status_messages.get(batch.status, "Status do lote indisponivel.")


def sync_text_upload_batch_state(
    session, batch_id: int
) -> models.TextUploadBatch | None:
    """Synchronize a batch's counters and overall status based on its texts' status counts in DB."""
    batch = session.get(models.TextUploadBatch, batch_id)
    if batch is None:
        return None

    status_counts = dict(
        session.query(models.Text.processing_status, func.count(models.Text.id))
        .filter(models.Text.upload_batch_id == batch_id)
        .group_by(models.Text.processing_status)
        .all()
    )

    created_count = sum(status_counts.values())
    processed_count = status_counts.get(models.ProcessingStatus.READY, 0)
    failed_count = status_counts.get(models.ProcessingStatus.FAILED, 0)
    processing_count = status_counts.get(models.ProcessingStatus.PROCESSING, 0)
    pending_count = status_counts.get(models.ProcessingStatus.PENDING, 0)
    failed_files = load_failed_files(batch.failed_files)

    batch.created_texts = created_count
    batch.processed_texts = processed_count
    batch.failed_texts = failed_count

    now = utcnow()
    if batch.import_finished_at is None:
        batch.status = models.TextUploadBatchStatus.IMPORTING
    elif processing_count > 0:
        batch.status = models.TextUploadBatchStatus.PROCESSING
        if batch.processing_started_at is None:
            batch.processing_started_at = now
        batch.processing_finished_at = None
    elif pending_count > 0:
        batch.status = models.TextUploadBatchStatus.QUEUED
        batch.processing_finished_at = None
    elif created_count == 0:
        batch.status = models.TextUploadBatchStatus.FAILED
        if batch.processing_finished_at is None:
            batch.processing_finished_at = now
    elif failed_count > 0 or len(failed_files) > 0:
        batch.status = models.TextUploadBatchStatus.COMPLETED_WITH_ERRORS
        if batch.processing_finished_at is None:
            batch.processing_finished_at = now
    else:
        batch.status = models.TextUploadBatchStatus.COMPLETED
        if batch.processing_finished_at is None:
            batch.processing_finished_at = now

    session.commit()
    session.refresh(batch)
    return batch


def serialize_batch_text(text: models.Text) -> dict:
    """Serialize a single text object for batch responses."""
    return {
        "id": text.id,
        "source_file_name": text.source_file_name,
        "processing_status": text.processing_status.name,
        "processing_attempts": text.processing_attempts,
    }


def serialize_text_upload_batch(
    batch: models.TextUploadBatch, include_texts: bool = False
) -> dict:
    """Serialize a TextUploadBatch into a dictionary payload."""
    texts = sorted(batch.texts, key=lambda text: text.id)
    recovering = is_batch_recovering(batch, texts)

    payload = {
        "id": batch.id,
        "source_file_name": batch.source_file_name,
        "status": batch.status.name,
        "status_message": build_batch_status_message(batch, texts),
        "is_recovering": recovering,
        "total_files": batch.total_files,
        "created_texts": batch.created_texts,
        "processed_texts": batch.processed_texts,
        "failed_texts": batch.failed_texts,
        "failed_files": load_failed_files(batch.failed_files),
        "created_at": batch.created_at,
        "updated_at": batch.updated_at,
        "import_finished_at": batch.import_finished_at,
        "processing_started_at": batch.processing_started_at,
        "processing_finished_at": batch.processing_finished_at,
        "last_error": batch.last_error,
    }

    if include_texts:
        payload["texts"] = [serialize_batch_text(text) for text in texts]

    return payload


def list_resumable_text_upload_batches(
    session,
    user_id: int,
    recent_window_hours: int = 24,
) -> list[models.TextUploadBatch]:
    """Query active or recently updated batches for a user."""
    recent_cutoff = utcnow() - timedelta(hours=recent_window_hours)

    return (
        session.query(models.TextUploadBatch)
        .filter(models.TextUploadBatch.created_by_user_id == user_id)
        .filter(
            (models.TextUploadBatch.status.in_(NON_TERMINAL_BATCH_STATUSES))
            | (models.TextUploadBatch.updated_at >= recent_cutoff)
        )
        .order_by(
            models.TextUploadBatch.updated_at.desc(), models.TextUploadBatch.id.desc()
        )
        .all()
    )


def claim_next_pending_text_for_processing(
    session,
    stale_after_seconds: int,
):
    """Claim and mark the next pending text for worker processing."""
    query = (
        session.query(models.Text)
        .outerjoin(
            models.TextUploadBatch,
            models.Text.upload_batch_id == models.TextUploadBatch.id,
        )
        .filter(models.Text.processing_status == models.ProcessingStatus.PENDING)
        .filter(
            or_(
                models.Text.upload_batch_id.is_(None),
                models.TextUploadBatch.import_finished_at.isnot(None),
            )
        )
        .order_by(models.Text.creation_date.asc(), models.Text.id.asc())
    )

    if session.bind and session.bind.dialect.name == "postgresql":
        query = query.with_for_update(skip_locked=True)

    text = query.first()
    if text is None:
        session.rollback()
        return None

    now = utcnow()
    text.processing_status = models.ProcessingStatus.PROCESSING
    text.processing_started_at = text.processing_started_at or now
    text.processing_heartbeat_at = now
    text.processing_attempts = (text.processing_attempts or 0) + 1
    text.last_processing_error = None

    batch = (
        session.get(models.TextUploadBatch, text.upload_batch_id)
        if text.upload_batch_id
        else None
    )
    if batch is not None:
        if batch.status != models.TextUploadBatchStatus.IMPORTING:
            batch.status = models.TextUploadBatchStatus.PROCESSING
        batch.processing_started_at = batch.processing_started_at or now
        batch.processing_finished_at = None
        batch.last_error = None

    session.commit()
    session.refresh(text)
    return text.id


def reconcile_stale_text_upload_batches(
    session,
    stale_after_seconds: int,
    max_attempts: int,
    force_processing_recovery: bool = False,
) -> list[int]:
    """Find and reset stale processing texts back to PENDING or FAILED."""
    stale_cutoff = utcnow() - timedelta(seconds=stale_after_seconds)
    touched_batch_ids: set[int] = set()

    active_batches = (
        session.query(models.TextUploadBatch)
        .filter(models.TextUploadBatch.status.in_(NON_TERMINAL_BATCH_STATUSES))
        .all()
    )

    now = utcnow()
    for batch in active_batches:
        batch_changed = False
        texts = (
            session.query(models.Text)
            .filter(models.Text.upload_batch_id == batch.id)
            .all()
        )

        for text in texts:
            if text.processing_status == models.ProcessingStatus.PROCESSING and (
                force_processing_recovery
                or text.processing_heartbeat_at is None
                or text.processing_heartbeat_at < stale_cutoff
            ):
                if text.processing_attempts >= max_attempts:
                    text.processing_status = models.ProcessingStatus.FAILED
                    text.last_processing_error = (
                        "Text processing exceeded the maximum retry attempts."
                    )
                else:
                    text.processing_status = models.ProcessingStatus.PENDING
                    if text.last_processing_error is None:
                        text.last_processing_error = (
                            "Recovered after worker restart."
                            if force_processing_recovery
                            else "Recovered after stale text processing task."
                        )
                text.processing_heartbeat_at = now
                batch_changed = True

        if batch_changed:
            session.commit()

        sync_text_upload_batch_state(session, batch.id)
        touched_batch_ids.add(batch.id)

    return sorted(touched_batch_ids)
