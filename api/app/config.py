import os
from datetime import timedelta

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
    