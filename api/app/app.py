import time
import uuid

from dotenv import load_dotenv

load_dotenv()

from flask import Flask, g, request
from flask_cors import CORS
from flask_jwt_extended import get_jwt_identity
from werkzeug.exceptions import HTTPException
from flask_pydantic.exceptions import ValidationError as FlaskPydanticValidationError
from pydantic import ValidationError as PydanticValidationError

from .config import Config
from .database.models import User
from .extensions import db, jwt, limiter
from .routes.assignment_routes import assignment_bp
from .routes.auth_routes import auth_bp
from .routes.download_routes import download_bp
from .routes.ocr_routes import ocr_bp
from .routes.text_routes import text_bp
from .routes.upload_routes import upload_bp
from .utils.api_errors import (
    INTERNAL_SERVER_ERROR,
    INVALID_REQUEST,
    METHOD_NOT_ALLOWED,
    RATE_LIMIT_EXCEEDED,
    RESOURCE_NOT_FOUND,
    VALIDATION_ERROR,
    error_response,
)


def create_app():
    app = Flask(__name__)

    app.config.from_object(Config)

    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data["sub"]
        return db.session.get(User, identity)

    CORS(app)
    jwt.init_app(app)
    db.init_app(app)
    limiter.init_app(app)

    @app.errorhandler(PydanticValidationError)
    @app.errorhandler(FlaskPydanticValidationError)
    def handle_validation_error(error):
        error_details = []
        if isinstance(error, PydanticValidationError):
            error_details = [
                {
                    "field": item.get("loc")[-1] if item.get("loc") else None,
                    "message": item.get("msg"),
                }
                for item in error.errors()
            ]
        else:
            for param_type in ['body_params', 'query_params', 'path_params', 'form_params']:
                params = getattr(error, param_type, None)
                if params:
                    for item in params:
                        error_details.append({
                            "field": item.get("loc")[-1] if item.get("loc") else None,
                            "message": item.get("msg"),
                        })
        return error_response(
            error="Validation failed",
            code=VALIDATION_ERROR,
            status_code=400,
            details=error_details,
        )

    @app.errorhandler(429)
    def ratelimit_handler(error):
        details = [{"field": None, "message": str(error.description)}]
        return error_response(
            error="Rate limit exceeded",
            code=RATE_LIMIT_EXCEEDED,
            status_code=429,
            details=details,
        )

    @app.errorhandler(HTTPException)
    def handle_http_exception(error: HTTPException):
        if error.code == 429:
            return ratelimit_handler(error)

        code = RESOURCE_NOT_FOUND if error.code == 404 else METHOD_NOT_ALLOWED if error.code == 405 else INVALID_REQUEST
        return error_response(
            error=error.description,
            code=code,
            status_code=error.code or 500,
        )

    @app.errorhandler(Exception)
    def handle_unexpected_exception(error: Exception):
        return error_response(
            error="Internal server error",
            code=INTERNAL_SERVER_ERROR,
            status_code=500,
        )

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
