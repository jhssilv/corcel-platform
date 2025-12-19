from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, current_user


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
            except Exception as e:
                raise e

            if not current_user:
                return jsonify({"msg": "User not found or invalid token"}), 401

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
            except Exception as e:
                raise e

            if not current_user:
                return jsonify({"msg": "User not found or invalid token"}), 401
            
            if not current_user.is_admin:
                return jsonify({
                    "msg": "Access forbidden: Admins only",
                }), 403

            return fn(*args, current_user=current_user, **kwargs)
        return decorator
    return wrapper


