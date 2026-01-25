# api/run_worker.py
import os
from dotenv import load_dotenv

load_dotenv()

from app.app import create_app
from app.extensions import celery

flask_app = create_app()
flask_app.app_context().push()
