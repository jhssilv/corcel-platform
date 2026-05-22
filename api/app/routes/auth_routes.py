from flask import Blueprint, jsonify
from flask_jwt_extended import create_access_token, set_access_cookies, unset_jwt_cookies
from flask_pydantic import validate
import secrets

from app.schemas import auth as auth_schemas
from app.schemas import generic as generic_schemas
from app.schemas import user as user_schemas

import app.database.queries as queries
from app.database.models import User
from app.utils.decorators import login_required, admin_required
from app.extensions import db, limiter
from app.utils.api_errors import (
    AUTH_FORBIDDEN,
    AUTH_NOT_AUTHENTICATED,
    BUSINESS_RULE_VIOLATION,
    INTERNAL_SERVER_ERROR,
    RESOURCE_NOT_FOUND,
    error_response,
)

session = db.session

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/users', methods=['GET'])
@login_required()
def get_usernames(current_user):
    """Returns a list of all usernames.

    Args:
        current_user (User): The currently logged-in user.

    Returns: JSON response with a list of usernames.
        
    Pre-Conditions:
        User must be logged in.
        
    """
    try:
        usernames_tuples = queries.get_usernames(session)
        username_list = [item[0] for item in usernames_tuples]
        
        response_data = user_schemas.UsernamesResponse(usernames=username_list)
        return jsonify(response_data.model_dump()), 200
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)


@auth_bp.route('/api/me', methods=['GET'])
@login_required()
def get_current_user(current_user):
    """Returns current authenticated user basic profile."""
    try:
        response_data = user_schemas.CurrentUserResponse(
            username=current_user.username,
            isAdmin=current_user.is_admin,
        )
        return jsonify(response_data.model_dump(by_alias=True)), 200
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)


@auth_bp.route('/api/register', methods=['POST'])
@limiter.limit("10 per hour; 20 per day")
@validate()
@admin_required()
def register(body: auth_schemas.UserRegisterRequest, current_user=None):
    """Creates a new user with the given username.
    
    Args:
        body (UserRegisterRequest): username for the new user
        current_user (User): The currently logged-in user.
    
    Returns: JSON response indicating success or failure.
    
    Pre-Conditions:
        Admin privileges.
    
    """
    username = body.username
    
    user = queries.get_user_by_username(session, username)
    
    if user is not None:
        return error_response(error="Username already exists.", code=BUSINESS_RULE_VIOLATION, status_code=400)
    
    # Create inactive user with a random placeholder password; user sets a real one on activation
    temp_password = secrets.token_urlsafe(12)
    new_user = User(username=username, is_active=False)
    new_user.set_password(temp_password)
    
    session.add(new_user)
    session.commit()
    
    response = generic_schemas.MessageResponse(message="User created successfully")
    return jsonify(response.model_dump()), 201

@auth_bp.route('/api/activate', methods=['POST'])
@limiter.limit("5 per hour")
@validate()
def activate_account(body: auth_schemas.UserActivationRequest):
    """Activates a user account by setting the password and marking the account as active.

    Args:
        body (UserActivationRequest): Username and new password.
        
    Returns: JSON response indicating success or failure.

    """
    try:
        username = body.username
        password = body.password
        
        user = queries.get_user_by_username(session, username)
        
        if user is None:
            return error_response(error="Usuário não existe.", code=RESOURCE_NOT_FOUND, status_code=404)
            
        if user.is_active:
            return error_response(error="Usuário já está ativo.", code=BUSINESS_RULE_VIOLATION, status_code=400)
            
        user.set_password(password)
        user.is_active = True
        
        session.commit()
        
        response = generic_schemas.MessageResponse(message="Account activated successfully.")
        return jsonify(response.model_dump()), 200
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)

@auth_bp.route('/api/login', methods=['POST'])
@limiter.limit("10 per minute; 20 per hour")
@validate()
def login(body: auth_schemas.UserCredentials):
    """Logs in a user by verifying credentials and issuing a JWT token.

    Args:
        body (UserCredentials): Username and password.

    Returns: JSON response with a success message and admin status, or an error message. 
    If successful, sets a JWT token in the response cookies.

    """
    try:
        username = body.username
        password = body.password
        
        user = queries.get_user_by_username(session, username)
        
        if user is None:
            return error_response(error="User does not exist.", code=AUTH_NOT_AUTHENTICATED, status_code=401)
        
        elif not user.check_password(password):
            return error_response(error="Invalid password.", code=AUTH_FORBIDDEN, status_code=403)
            
        if not user.is_active:
            return error_response(error="Account is not active.", code=AUTH_FORBIDDEN, status_code=403)
        
        user_is_admin = user.is_admin
        
        access_token = create_access_token(identity=str(user.id))
        success_response = auth_schemas.LoginResponse(message="Login successful", isAdmin=user_is_admin)
        response = jsonify(success_response.model_dump(by_alias=True))
        set_access_cookies(response, access_token)
        
        return response, 200
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)
    
@auth_bp.route('/api/logout', methods=['GET'])
@login_required()
def logout(current_user):
    """Logs out a user by clearing the JWT cookies.

    Returns: JSON response indicating successful logout.
    """
    try:
        success_response = generic_schemas.MessageResponse(message="Logout successful")
        response = jsonify(success_response.model_dump())
        unset_jwt_cookies(response)
        return response, 200
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)

@auth_bp.route('/api/users/<string:username>/status', methods=['PATCH'])
@limiter.limit("10 per minute")
@validate()
@admin_required()
def set_user_status(username: str, body: auth_schemas.SetUserActiveRequest, current_user):
    """Sets the active status of a user.

    Args:
        username (str): Username of the target user.
        body (SetUserActiveRequest): Desired active status.
        current_user (User): The currently logged-in user.

    Returns: JSON response indicating success or failure.
        
    Pre-Conditions:
        Admin privileges.
        
    """
    try:
        user = queries.set_user_active_status(session, username, body.is_active)

        if user is None:
            return error_response(error="User does not exist.", code=RESOURCE_NOT_FOUND, status_code=404)

        message = "User activated successfully." if body.is_active else "User deactivated successfully."
        response = generic_schemas.MessageResponse(message=message)
        return jsonify(response.model_dump()), 200
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)
    
@auth_bp.route('/api/users/<string:username>/role', methods=['PATCH'])
@limiter.limit("10 per minute")
@validate()
@admin_required()
def set_user_role(username: str, body: auth_schemas.SetUserAdminRequest, current_user):
    """Sets the admin status of a user.

    Args:
        username (str): Username of the target user.
        body (SetUserAdminRequest): Desired admin status.
        current_user (User): The currently logged-in user.

    Returns:
        JSON response indicating success or failure.
        
    Pre-Conditions:
        Admin privileges.

    Post-Conditions:
        User's admin status is updated unless they are the last admin being revoked.
        
    """
    try:
        user = queries.get_user_by_username(session, username)
        
        if user is None:
            return error_response(error="Usuário não existe.", code=RESOURCE_NOT_FOUND, status_code=404)
            
        number_of_admins = queries.count_admin_users(session)
        if number_of_admins <= 1 and user.is_admin and not body.is_admin:
            return error_response(
                error="Cannot revoke admin privileges from the last admin user.",
                code=BUSINESS_RULE_VIOLATION,
                status_code=400,
            )

        queries.set_user_admin_status(session, username, body.is_admin)
        message = "User granted admin privileges." if body.is_admin else "User admin privileges revoked."
        response = generic_schemas.MessageResponse(message=message)
        return jsonify(response.model_dump()), 200
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)
    
@auth_bp.route('/api/users/data', methods=['GET'])
@admin_required()
def get_users_data(current_user):
    """Returns detailed data for all users.

    Args:
        current_user: The currently logged-in user.

    Returns: JSON response containing detailed data for all users:
            - username
            - isAdmin
            - isActive
            - lastLogin
        
    Pre-Conditions:
        Admin privileges.
        
    """
    try:
        users = queries.get_all_users(session)
        users_data = []
        
        for user in users:
            data = user_schemas.UserData(
                username=user.username,
                isAdmin=user.is_admin,
                isActive=user.is_active,
                lastLogin=user.last_login
            )
            users_data.append(data)
        
        return jsonify(user_schemas.UsersDataResponse(usersData=users_data).model_dump(by_alias=True)), 200
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)
    
