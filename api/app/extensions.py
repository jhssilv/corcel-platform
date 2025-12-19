from flask_sqlalchemy import SQLAlchemy
from celery import Celery
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
celery = Celery()
jwt = JWTManager()
bcrypt = Bcrypt()