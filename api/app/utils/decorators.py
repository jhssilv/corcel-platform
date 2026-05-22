from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, current_user
from .api_errors import (
    AUTH_FORBIDDEN,
    AUTH_INVALID_USER,
    AUTH_NOT_AUTHENTICATED,
    error_response,
)


def login_required():
    """
    Decorator to restrict access to logged-in users only.
    Injects current_user into the decorated function.
    Usage:
    @login_required()
    def protected_route(current_user, ...):
        ...
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception:
                return error_response(error="Not authenticated", code=AUTH_NOT_AUTHENTICATED, status_code=401)

            if not current_user:
                return error_response(error="User not found or invalid token", code=AUTH_INVALID_USER, status_code=401)

            return fn(*args, current_user=current_user, **kwargs)
        return decorator
    return wrapper

def admin_required():
    """
    Decorator to restrict access to admin users only.
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception:
                return error_response(
                    error="Not authenticated",
                    code=AUTH_NOT_AUTHENTICATED,
                    status_code=401,
                )

            if not current_user:
                return error_response(
                    error="User not found or invalid token",
                    code=AUTH_INVALID_USER,
                    status_code=401,
                )
            
            if not current_user.is_admin:
                return error_response(
                    error="Access forbidden: Admins only",
                    code=AUTH_FORBIDDEN,
                    status_code=403,
                )

            return fn(*args, current_user=current_user, **kwargs)
        return decorator
    return wrapper
