from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, set_access_cookies, unset_jwt_cookies
from flask_pydantic import validate
from datetime import datetime

import app.api_schemas as schemas
import app.database.queries as queries
from app.database.models import User
from app.utils.decorators import login_required
from app.extensions import db


auth_bp = Blueprint('auth', __name__)

@login_required()
@auth_bp.route('/api/users', methods=['GET'])
def get_usernames(current_user):
    """Returns a list of all usernames."""
    try:
        usernames_tuples = queries.get_usernames(db)
        username_list = [item[0] for item in usernames_tuples]
        
        response_data = schemas.UsernamesResponse(usernames=username_list)
        return jsonify(response_data.model_dump()), 200
    except Exception as e:
        error_response = schemas.ErrorResponse(error=str(e))
        return jsonify(error_response.model_dump()), 500


@auth_bp.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    
    user = queries.get_user_by_username(db, username)
    
    if user is not None:
        return jsonify({"error": "Username already exists."}), 400
    
    new_user = User(username=username)
    new_user.set_password(password)
    
    db.add(new_user)
    db.commit()
    
    return jsonify({"msg": "User created successfully"}), 201

@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    
    user = queries.get_user_by_username(db, username)
    
    if user is None:
        return jsonify({"error": "User does not exist."}), 401
    
    elif not user.check_password(password):
        return jsonify({"error": "Invalid password."}), 401
    
    access_token = create_access_token(identity=user.id)
    response = jsonify({"msg": "Login successful"})
    set_access_cookies(response, access_token)
    
    return response, 200
    
@auth_bp.route('/api/logout', methods=['GET'])
def logout():
    response = jsonify({"msg": "Logout successful"})
    unset_jwt_cookies(response)
    return response, 200