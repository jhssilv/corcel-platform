import time

from .background_jobs import (
    BackgroundJobReporter,
    build_worker_id,
    claim_next_background_job,
    mark_background_job_failure,
    mark_background_job_success,
)
from .database import models
from .tasks.ocr_task_logic import run_ocr_zip_pipeline
from .tasks.text_task_logic import run_process_single_text_pipeline
from .tasks.text_upload_task_logic import run_text_upload_zip_pipeline
from .text_upload_batches import (
    claim_next_pending_text_for_processing,
    reconcile_stale_text_upload_batches,
)




def _run_text_upload_import_job(session, job: models.BackgroundJob) -> None:
    payload = job.payload_json or {}
    reporter = BackgroundJobReporter(session, job.id)
    result = run_text_upload_zip_pipeline(
        reporter,
        batch_id=payload.get('batch_id'),
        zip_path=payload.get('zip_path'),
        original_filename=payload.get('original_filename'),
    )

    mark_background_job_success(
        session,
        job,
        result_json=result.get('result'),
        status_message='Finished',
        current=result.get('total'),
        total=result.get('total'),
    )


def _run_ocr_upload_job(session, job: models.BackgroundJob) -> None:
    payload = job.payload_json or {}
    reporter = BackgroundJobReporter(session, job.id)
    result = run_ocr_zip_pipeline(reporter, payload.get('zip_path'))

    mark_background_job_success(
        session,
        job,
        result_json=result.get('result'),
        status_message='Finished',
        current=result.get('total'),
        total=result.get('total'),
    )


def process_next_background_job(session, *, worker_id: str, stale_after_seconds: int) -> bool:
    job = claim_next_background_job(
        session,
        worker_id=worker_id,
        stale_after_seconds=stale_after_seconds,
    )
    if job is None:
        return False

    try:
        if job.kind == models.BackgroundJobKind.TEXT_UPLOAD_IMPORT:
            _run_text_upload_import_job(session, job)
        elif job.kind == models.BackgroundJobKind.OCR_UPLOAD:
            _run_ocr_upload_job(session, job)
        else:
            raise RuntimeError(f'Unsupported background job kind: {job.kind.name}')

    except Exception as exc:
        session.rollback()
        failed_job = session.get(models.BackgroundJob, job.id)
        if failed_job is not None:
            mark_background_job_failure(session, failed_job, error_message=str(exc))


    return True


def process_next_pending_text(
    session,
    *,
    worker_id: str,
    stale_after_seconds: int,
    max_attempts: int,
) -> bool:
    _ = max_attempts
    text_id = claim_next_pending_text_for_processing(session, stale_after_seconds=stale_after_seconds)
    if text_id is None:
        return False

    try:
        result = run_process_single_text_pipeline(None, text_id)
    except Exception as exc:
        session.rollback()

    return True


def run_background_job_worker(app) -> None:
    from app.extensions import db

    worker_id = build_worker_id()
    reconcile_interval = app.config.get('TEXT_UPLOAD_RECONCILE_INTERVAL_SECONDS', 60)
    stale_after_seconds = app.config.get('TEXT_UPLOAD_STALE_AFTER_SECONDS', 600)
    max_attempts = app.config.get('TEXT_UPLOAD_MAX_PROCESSING_ATTEMPTS', 3)
    idle_sleep_seconds = app.config.get('JOB_WORKER_IDLE_SLEEP_SECONDS', 1)


    with app.app_context():
        reconcile_stale_text_upload_batches(
            db.session,
            stale_after_seconds=stale_after_seconds,
            max_attempts=max_attempts,
            force_processing_recovery=True,
        )
        db.session.remove()

    last_reconcile_at = time.monotonic()

    while True:
        did_work = False

        with app.app_context():
            did_work = process_next_background_job(
                db.session,
                worker_id=worker_id,
                stale_after_seconds=stale_after_seconds,
            ) or did_work
            did_work = process_next_pending_text(
                db.session,
                worker_id=worker_id,
                stale_after_seconds=stale_after_seconds,
                max_attempts=max_attempts,
            ) or did_work

            now = time.monotonic()
            if (now - last_reconcile_at) >= reconcile_interval:
                reconcile_stale_text_upload_batches(
                    db.session,
                    stale_after_seconds=stale_after_seconds,
                    max_attempts=max_attempts,
                )
                last_reconcile_at = now

            db.session.remove()

        if not did_work:
            time.sleep(idle_sleep_seconds)
