from flask import Blueprint, jsonify
from flask_pydantic import validate
from datetime import datetime
import api_schemas as schemas
import database.queries as queries

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/users', methods=['GET'])
def get_usernames():
    """Returns a list of all usernames."""
    try:
        with queries.get_db_session() as db_session:
            usernames_tuples = queries.get_usernames(db_session)
            username_list = [item[0] for item in usernames_tuples]
            
            response_data = schemas.UsernamesResponse(usernames=username_list)
            return jsonify(response_data.model_dump()), 200
    except Exception as e:
        error_response = schemas.ErrorResponse(error=str(e))
        return jsonify(error_response.model_dump()), 500

@auth_bp.route('/api/login', methods=['POST'])
@validate()
def login(body: schemas.LoginRequest):
    """Authenticates a user."""
    try:
        with queries.get_db_session() as db_session:
            success, user_id = queries.authenticate_user(db_session, body.username, body.password)

            response_data = {
                "timestamp": datetime.now(),
                "userId": user_id
            }

            if success:
                response_data["message"] = f"Hello, {body.username}!"
                status_code = 200
            else:
                response_data["message"] = "Incorrect username or password."
                status_code = 401
            
            response = schemas.LoginResponse(**response_data)
            return jsonify(response.model_dump()), status_code

    except Exception as e:
        error_response = schemas.ErrorResponse(error=str(e))
        return jsonify(error_response.model_dump()), 500