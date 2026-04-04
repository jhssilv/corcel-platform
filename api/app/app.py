import os
import time
import uuid
from dotenv import load_dotenv

load_dotenv() # Load env vars before importing config

from flask import Flask, jsonify, g, request
from flask_cors import CORS
from pydantic import ValidationError
from celery import Celery
from flask_jwt_extended import get_jwt_identity

from .extensions import db, celery, jwt, limiter
from .routes.auth_routes import auth_bp
from .routes.text_routes import text_bp
from .routes.download_routes import download_bp
from .routes.upload_routes import upload_bp
from .routes.ocr_routes import ocr_bp
from .routes.assignment_routes import assignment_bp
from .config import Config
from .logging_config import (
    bind_request_context,
    clear_request_context,
    configure_stream_logging,
    get_logger,
    redact_sensitive_data,
    sanitize_headers,
)
from .database.models import User

def make_celery(app_name=__name__):
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    celery_instance = Celery(
        app_name,
        backend=redis_url,
        broker=redis_url,
        include=['api.app.tasks.celery_tasks'] # Ajuste o caminho das tasks conforme necessário
    )
    return celery_instance

def create_app():
    app = Flask(__name__)
    
    app.config.from_object(Config)
    configure_stream_logging(app.config)

    request_logger = get_logger('app.route.http', source='route')

    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data["sub"]
        return db.session.get(User, identity)

    CORS(app) 
    jwt.init_app(app)
    db.init_app(app)
    limiter.init_app(app)
    
    # Atualiza a configuração da instância global do Celery
    celery.conf.update(app.config)

    @app.before_request
    def before_request_logging():
        request_id = request.headers.get('x-request-id') or str(uuid.uuid4())
        trace_id = request.headers.get('x-trace-id') or request_id
        user_id = None

        try:
            user_id = get_jwt_identity()
        except Exception:
            user_id = None

        g.request_started_at = time.perf_counter()
        g.request_id = request_id
        g.trace_id = trace_id
        bind_request_context(request_id=request_id, trace_id=trace_id, user_id=user_id)

    @app.after_request
    def after_request_logging(response):
        duration_ms = int((time.perf_counter() - g.get('request_started_at', time.perf_counter())) * 1000)
        status_code = response.status_code
        should_include_body = status_code >= 400

        request_body = None
        if should_include_body:
            request_json = request.get_json(silent=True)
            if request_json is not None:
                request_body = redact_sensitive_data(request_json)

        response_body = None
        if should_include_body and response.is_json:
            response_json = response.get_json(silent=True)
            if response_json is not None:
                response_body = redact_sensitive_data(response_json)

        request_logger.info(
            'HTTP request completed',
            extra={
                'event': {
                    'source': 'route',
                    'blueprint': request.blueprint or 'http',
                    'method': request.method,
                    'path': request.path,
                    'status_code': status_code,
                    'duration_ms': duration_ms,
                    'query_params': redact_sensitive_data(request.args.to_dict(flat=False)),
                    'headers': sanitize_headers(request.headers, app.config.get('LOG_HEADER_ALLOWLIST', [])),
                    'client_ip': request.headers.get('X-Forwarded-For', request.remote_addr),
                    'request_body': request_body,
                    'response_body': response_body,
                    'request_id': g.get('request_id'),
                    'trace_id': g.get('trace_id'),
                }
            },
        )

        response.headers['X-Request-Id'] = g.get('request_id', '')
        response.headers['X-Trace-Id'] = g.get('trace_id', '')

        return response

    @app.teardown_request
    def teardown_logging(_exc):
        clear_request_context()

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
        request_logger.warning(
            'Validation failed',
            extra={
                'event': {
                    'source': 'route',
                    'blueprint': request.blueprint or 'http',
                    'validation_errors': error_details,
                }
            },
        )
        return jsonify({
            "error": "Validation failed",
            "details": error_details
        }), 400

    @app.errorhandler(429)
    def ratelimit_handler(e):
        request_logger.warning(
            'Rate limit exceeded',
            extra={
                'event': {
                    'source': 'route',
                    'blueprint': request.blueprint or 'http',
                    'error': str(e.description),
                }
            },
        )
        return jsonify(error="Rate limit exceeded", message=str(e.description)), 429

    app.register_blueprint(auth_bp)
    app.register_blueprint(text_bp)
    app.register_blueprint(download_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(ocr_bp)
    app.register_blueprint(assignment_bp)
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)