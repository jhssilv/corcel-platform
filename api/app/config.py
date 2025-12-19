import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///default.db')
    
    FLASK_APP = os.getenv('FLASK_APP', 'api/src/app')
    
    CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
    CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
    
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev_key')
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    JWT_TOKEN_LOCATION = ['cookies']
    
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev_key')