from flask_sqlalchemy import SQLAlchemy
from celery import Celery
from flask_jwt_extended import JWTManager, get_jwt_identity, verify_jwt_in_request
from flask_bcrypt import Bcrypt
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
celery = Celery()
jwt = JWTManager()
bcrypt = Bcrypt()

def get_user_id_or_ip():
    """
    Key function for Flask-Limiter.
    Uses the authenticated User's ID if a valid JWT is present.
    Falls back to the client's IP address for unauthenticated requests.
    """
    try:
        # Check if there is a valid JWT in the request without throwing an error if absent
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            return f"user:{identity}"
    except Exception:
        pass
        
    return f"ip:{get_remote_address()}"

limiter = Limiter(
    key_func=get_user_id_or_ip,
    default_limits=["200 per minute"],
)