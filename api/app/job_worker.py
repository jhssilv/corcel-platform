import time

from .background_jobs import build_worker_id
from .logging_config import get_logger
from .text_upload_batches import reconcile_stale_text_upload_batches


worker_logger = get_logger('app.jobs.runtime', source='job_worker')


def process_next_background_job(_session, *_args, **_kwargs) -> bool:
    return False


def process_next_pending_text(_session, *_args, **_kwargs) -> bool:
    return False


def run_background_job_worker(app) -> None:
    from app.extensions import db

    worker_id = build_worker_id()
    reconcile_interval = app.config.get('TEXT_UPLOAD_RECONCILE_INTERVAL_SECONDS', 60)
    stale_after_seconds = app.config.get('TEXT_UPLOAD_STALE_AFTER_SECONDS', 600)
    max_attempts = app.config.get('TEXT_UPLOAD_MAX_PROCESSING_ATTEMPTS', 3)

    worker_logger.info(
        'Background job worker starting',
        extra={'event': {'worker_id': worker_id}},
    )

    last_reconcile_at = 0.0

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
            time.sleep(1)
