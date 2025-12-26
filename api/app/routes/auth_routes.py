from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, set_access_cookies, unset_jwt_cookies
from flask_pydantic import validate
from datetime import datetime
import secrets

import app.api_schemas as schemas
import app.database.queries as queries
from app.database.models import User
from app.utils.decorators import login_required, admin_required
from app.extensions import db

session = db.session

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/users', methods=['GET'])
@login_required()
def get_usernames(current_user):
    """Returns a list of all usernames."""
    try:
        usernames_tuples = queries.get_usernames(session)
        username_list = [item[0] for item in usernames_tuples]
        
        response_data = schemas.UsernamesResponse(usernames=username_list)
        return jsonify(response_data.model_dump()), 200
    except Exception as e:
        error_response = schemas.ErrorResponse(error=str(e))
        return jsonify(error_response.model_dump()), 500


@auth_bp.route('/api/register', methods=['POST'])
@validate()
@admin_required()
def register(body: schemas.UserRegisterRequest, current_user=None):
    username = body.username
    
    user = queries.get_user_by_username(session, username)
    
    if user is not None:
        return jsonify({"error": "Usuário já existe."}), 400
    
    # Create inactive user with random password
    new_user = User(username=username, is_active=False)
    new_user.set_password(secrets.token_urlsafe(32))
    
    session.add(new_user)
    session.commit()
    
    return jsonify({"message": "Usuário Criado com Sucesso"}), 201

@auth_bp.route('/api/activate', methods=['POST'])
@validate()
def activate_account(body: schemas.UserActivationRequest):
    username = body.username
    password = body.password
    
    user = queries.get_user_by_username(session, username)
    
    if user is None:
        return jsonify({"error": "User does not exist."}), 404
        
    if user.is_active:
        return jsonify({"error": "User is already active."}), 400
        
    user.set_password(password)
    user.is_active = True
    
    session.commit()
    
    return jsonify({"message": "Account activated successfully."}), 200

@auth_bp.route('/api/login', methods=['POST'])
@validate()
def login(body: schemas.UserCredentials):
    username = body.username
    password = body.password
    
    user = queries.get_user_by_username(session, username)
    
    if user is None:
        return jsonify({"error": "User does not exist."}), 401
    
    elif not user.check_password(password):
        return jsonify({"error": "Invalid password."}), 403
        
    if not user.is_active:
        return jsonify({"error": "Account is not active."}), 403
    
    user_is_admin = user.is_admin
    
    access_token = create_access_token(identity=str(user.id))
    response = jsonify({"message": "Login successful", "isAdmin": user_is_admin})
    set_access_cookies(response, access_token)
    
    return response, 200
    
@auth_bp.route('/api/logout', methods=['GET'])
def logout():
    response = jsonify({"message": "Logout successful"})
    unset_jwt_cookies(response)
    return response, 200

@auth_bp.route('/api/users/toggleActive', methods=['PATCH'])
@validate()
@admin_required()
def deactivate_user(body: schemas.UserRegisterRequest, current_user=None):
    username = body.username
    
    user = queries.get_user_by_username(session, username)
    
    if user is None:
        return jsonify({"error": "User does not exist."}), 404
        
    user.is_active = not user.is_active
    session.commit()
    
    if not user.is_active:
        return jsonify({"message": "User deactivated successfully."}), 200
    else:
        return jsonify({"message": "User activated successfully."}), 200
    
@auth_bp.route('/api/users/changePassword', methods=['PATCH'])
@validate()
@admin_required()
def toggle_user_is_admin(body: schemas.UserRegisterRequest, current_user=None):
    username = body.username
    
    user = queries.get_user_by_username(session, username)
    
    if user is None:
        return jsonify({"error": "User does not exist."}), 404
        
    user.is_admin = not user.is_admin
    session.commit()
    
    if user.is_admin:
        return jsonify({"message": "User granted admin privileges."}), 200
    else:
        return jsonify({"message": "User admin privileges revoked."}), 200
    
@auth_bp.route('/api/users/data', methods=['GET'])
@admin_required()
def get_users_data(current_user=None):
    try:
        users = queries.get_all_users(session)
        users_data = []
        
        for user in users:
            data = schemas.UserData(
                username=user.username,
                isAdmin=user.is_admin,
                isActive=user.is_active,
                lastLogin=user.last_login
            )
            users_data.append(data)
        
        return jsonify(schemas.UsersDataResponse(usersData=users_data).model_dump(by_alias=True)), 200
    except Exception as e:
        error_response = schemas.ErrorResponse(error=str(e))
        return jsonify(error_response.model_dump()), 500
    