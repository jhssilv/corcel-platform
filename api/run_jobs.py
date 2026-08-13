from app.app import create_app
from app.job_worker import run_background_job_worker


flask_app = create_app()
flask_app.app_context().push()



if __name__ == '__main__':
    run_background_job_worker(flask_app)
