from flask import Flask, jsonify
from flask_pydantic import validate
from pydantic import ValidationError
from flask_cors import CORS # Recomendado se usar React separado

from .routes.auth_routes import auth_bp
from .routes.text_routes import text_bp
from .routes.download_routes import download_bp
from .routes.upload_routes import upload_bp

def create_app():
    app = Flask(__name__)
    CORS(app)

    @app.errorhandler(ValidationError)
    def handle_validation_error(e: ValidationError):
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