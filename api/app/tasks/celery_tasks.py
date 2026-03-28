from ..extensions import celery
from .ocr_task_logic import run_ocr_zip_pipeline
from .text_task_logic import run_zip_texts_pipeline


@celery.task(bind=True)
def process_zip_texts(self, zip_path):
    return run_zip_texts_pipeline(self, zip_path)


@celery.task(bind=True)
def process_ocr_zip(self, zip_path):
    return run_ocr_zip_pipeline(self, zip_path)
