import os
from datetime import timedelta


PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///default.db')
    
    FLASK_APP = os.getenv('FLASK_APP', 'api/src/app')
    
    CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
    CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
    RATELIMIT_STORAGE_URI = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    
    SECRET_KEY = os.getenv('SECRET_KEY')
    
    if SECRET_KEY is None:
        raise ValueError("SECRET_KEY environment variable is not set.")
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    JWT_TOKEN_LOCATION = ['cookies']
    
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)

    # Unified logging settings
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_REDIS_URL = os.getenv('LOG_REDIS_URL', os.getenv('REDIS_URL', 'redis://localhost:6379/0'))
    LOG_STREAM_KEY = os.getenv('LOG_STREAM_KEY', 'corcel:logs:stream')
    LOG_STREAM_GROUP = os.getenv('LOG_STREAM_GROUP', 'corcel:logs:writer')
    LOG_STREAM_MAXLEN = int(os.getenv('LOG_STREAM_MAXLEN', '200000'))
    LOG_FLUSH_BATCH_SIZE = int(os.getenv('LOG_FLUSH_BATCH_SIZE', '500'))
    LOG_FLUSH_INTERVAL_SECONDS = float(os.getenv('LOG_FLUSH_INTERVAL_SECONDS', '2'))
    LOG_FILE_MAX_BYTES = int(os.getenv('LOG_FILE_MAX_BYTES', str(512 * 1024 * 1024)))
    LOG_ROOT_DIR = os.getenv('LOG_ROOT_DIR', os.path.join(PROJECT_ROOT, 'logs'))

    # Header allowlist and sensitive key matching
    LOG_HEADER_ALLOWLIST = [
        'content-type',
        'content-length',
        'user-agent',
        'x-request-id',
        'accept',
    ]
    