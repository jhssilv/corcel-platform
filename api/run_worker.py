# api/run_worker.py
import os
from dotenv import load_dotenv

load_dotenv()

from app.app import create_app
from app.extensions import celery
from app.logging_config import configure_stream_logging, get_logger, start_stream_consumer

flask_app = create_app()
flask_app.app_context().push()

configure_stream_logging(flask_app.config)
start_stream_consumer(flask_app.config)

worker_logger = get_logger('app.celery.worker', source='celery')
worker_logger.info('Celery worker bootstrap complete', extra={'event': {'source': 'celery'}})
