import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from pydantic import ValidationError
from celery import Celery

from .extensions import db, celery
from .routes.auth_routes import auth_bp
from .routes.text_routes import text_bp
from .routes.download_routes import download_bp
from .routes.upload_routes import upload_bp

load_dotenv()

def make_celery(app_name=__name__):
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    celery_instance = Celery(
        app_name,
        backend=redis_url,
        broker=redis_url,
        include=['api.app.tasks'] # Ajuste o caminho das tasks conforme necessário
    )
    return celery_instance

def create_app():
    app = Flask(__name__)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['CELERY_BROKER_URL'] = os.getenv('CELERY_BROKER_URL')
    app.config['CELERY_RESULT_BACKEND'] = os.getenv('CELERY_RESULT_BACKEND')
    #app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev_key')

    CORS(app) 
    db.init_app(app)
    
    # Atualiza a configuração da instância global do Celery
    celery.conf.update(app.config)

    @app.errorhandler(ValidationError)
    def handle_validation_error(e: ValidationError):
        """Captura erros do Pydantic e retorna JSON formatado."""
        error_details = [
            {
                "field": error.get("loc")[-1],
                "message": error.get("msg")
            }
            for error in e.errors()
        ]
        return jsonify({
            "error": "Validation failed",
            "details": error_details
        }), 400

    app.register_blueprint(auth_bp)
    app.register_blueprint(text_bp)
    app.register_blueprint(download_bp)
    app.register_blueprint(upload_bp)

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)