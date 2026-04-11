from celery import signals

from ..extensions import celery
from ..logging_config import bind_task_context, clear_task_context, get_logger
from .ocr_task_logic import run_ocr_zip_pipeline
from .text_task_logic import run_process_texts_pipeline


celery_logger = get_logger('app.celery.runtime', source='celery')


@signals.worker_ready.connect
def on_worker_ready(sender=None, **_kwargs):
    celery_logger.info(
        'Celery worker ready',
        extra={'event': {'source': 'celery', 'worker_hostname': getattr(sender, 'hostname', None)}},
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
def process_texts_background(self, text_ids: list):
    bind_task_context(self.request.id)
    try:
        return run_process_texts_pipeline(self, text_ids)
    finally:
        clear_task_context()


@celery.task(bind=True)
def process_ocr_zip(self, zip_path):
    bind_task_context(self.request.id)
    try:
        return run_ocr_zip_pipeline(self, zip_path)
    finally:
        clear_task_context()
