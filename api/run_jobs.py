from app.app import create_app
from app.job_worker import run_background_job_worker
from app.logging_config import get_logger


flask_app = create_app()
flask_app.app_context().push()

worker_logger = get_logger('app.jobs.bootstrap', source='job_worker')
worker_logger.info('Background job worker bootstrap complete', extra={'event': {'source': 'job_worker'}})


if __name__ == '__main__':
    run_background_job_worker(flask_app)
