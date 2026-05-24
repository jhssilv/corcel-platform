from celery import signals

from ..extensions import celery
from ..logging_config import bind_task_context, clear_task_context, get_logger
from .ocr_task_logic import run_ocr_zip_pipeline
from .text_task_logic import run_process_single_text_pipeline
from .text_upload_task_logic import run_text_upload_zip_pipeline
from ..text_upload_batches import enqueue_pending_batch_texts, reconcile_stale_text_upload_batches


celery_logger = get_logger('app.celery.runtime', source='celery')


@signals.worker_ready.connect
def on_worker_ready(sender=None, **_kwargs):
    celery_logger.info(
        'Celery worker ready',
        extra={'event': {'source': 'celery', 'worker_hostname': getattr(sender, 'hostname', None)}},
    )
    try:
        reconcile_text_upload_batches_task.delay(force_processing_recovery=True)
    except Exception as exc:
        celery_logger.exception(
            'Failed to trigger text upload reconciliation on worker start',
            extra={'event': {'source': 'celery', 'error': str(exc)}},
        )


@signals.worker_shutdown.connect
def on_worker_shutdown(sender=None, **_kwargs):
    celery_logger.info(
        'Celery worker shutdown',
        extra={'event': {'source': 'celery', 'worker_hostname': getattr(sender, 'hostname', None)}},
    )


@signals.task_prerun.connect
def on_task_prerun(task=None, task_id=None, **_kwargs):
    bind_task_context(task_id)
    celery_logger.info(
        'Task started',
        extra={
            'event': {
                'source': 'celery',
                'celery_task_id': task_id,
                'task_name': getattr(task, 'name', None),
            }
        },
    )


@signals.task_postrun.connect
def on_task_postrun(task=None, task_id=None, state=None, **_kwargs):
    celery_logger.info(
        'Task finished',
        extra={
            'event': {
                'source': 'celery',
                'celery_task_id': task_id,
                'task_name': getattr(task, 'name', None),
                'state': state,
            }
        },
    )
    clear_task_context()


@signals.task_failure.connect
def on_task_failure(task_id=None, exception=None, traceback=None, sender=None, **_kwargs):
    celery_logger.error(
        'Task failed',
        extra={
            'event': {
                'source': 'celery',
                'celery_task_id': task_id,
                'task_name': getattr(sender, 'name', None),
                'error': str(exception),
                'traceback': str(traceback),
            }
        },
    )


@signals.task_retry.connect
def on_task_retry(request=None, reason=None, sender=None, **_kwargs):
    celery_logger.warning(
        'Task retry scheduled',
        extra={
            'event': {
                'source': 'celery',
                'celery_task_id': getattr(request, 'id', None),
                'task_name': getattr(sender, 'name', None),
                'reason': str(reason),
            }
        },
    )


@celery.task(bind=True)
def process_texts_background(self, batch_id: int):
    bind_task_context(self.request.id)
    try:
        from app.extensions import db

        enqueued = enqueue_pending_batch_texts(
            db.session,
            batch_id=batch_id,
            stale_after_seconds=self.app.conf.get('TEXT_UPLOAD_STALE_AFTER_SECONDS', 600),
        )
        return {'status': 'Completed', 'enqueued': enqueued, 'batch_id': batch_id}
    finally:
        clear_task_context()


@celery.task(bind=True, name='app.tasks.process_single_text_background')
def process_single_text_background(self, text_id: int):
    bind_task_context(self.request.id)
    try:
        return run_process_single_text_pipeline(self, text_id)
    finally:
        clear_task_context()


@celery.task(bind=True)
def process_ocr_zip(self, zip_path):
    bind_task_context(self.request.id)
    try:
        return run_ocr_zip_pipeline(self, zip_path)
    finally:
        clear_task_context()


@celery.task(bind=True)
def process_text_upload_zip(self, batch_id=None, zip_path=None, zip_payload_b64=None, original_filename=None):
    bind_task_context(self.request.id)
    try:
        return run_text_upload_zip_pipeline(
            self,
            batch_id=batch_id,
            zip_path=zip_path,
            zip_payload_b64=zip_payload_b64,
            original_filename=original_filename,
        )
    finally:
        clear_task_context()


@celery.task(bind=True, name='app.tasks.reconcile_text_upload_batches')
def reconcile_text_upload_batches_task(self, force_processing_recovery: bool = False):
    bind_task_context(self.request.id)
    try:
        from app.extensions import db

        touched_batch_ids = reconcile_stale_text_upload_batches(
            db.session,
            stale_after_seconds=self.app.conf.get('TEXT_UPLOAD_STALE_AFTER_SECONDS', 600),
            max_attempts=self.app.conf.get('TEXT_UPLOAD_MAX_PROCESSING_ATTEMPTS', 3),
            force_processing_recovery=force_processing_recovery,
        )
        return {
            'status': 'Completed',
            'touched_batch_ids': touched_batch_ids,
        }
    finally:
        clear_task_context()
