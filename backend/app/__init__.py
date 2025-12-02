import os
from flask import Flask, jsonify
from dotenv import load_dotenv
from pydantic import ValidationError

from .extensions import db, celery

from .routes.auth_routes import auth_bp
from .routes.text_routes import text_bp
from .routes.download_routes import download_bp
from .routes.upload_routes import upload_bp

def create_app():
    load_dotenv(override=True)

    app = Flask(__name__)

    #app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['CELERY_BROKER_URL'] = os.getenv('CELERY_BROKER_URL')
    app.config['CELERY_RESULT_BACKEND'] = os.getenv('CELERY_RESULT_BACKEND')

    db.init_app(app)
    
    celery.conf.update(app.config)

    @app.errorhandler(ValidationError)
    def handle_validation_error(e: ValidationError):
        error_details = [
            {"field": error.get("loc")[-1], "message": error.get("msg")}
            for error in e.errors()
        ]
        return jsonify({"error": "Validation failed", "details": error_details}), 400

    app.register_blueprint(auth_bp)
    app.register_blueprint(text_bp)
    app.register_blueprint(download_bp)
    app.register_blueprint(upload_bp)

    return app