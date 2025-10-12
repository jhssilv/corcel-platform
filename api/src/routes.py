from datetime import datetime
from flask import Flask, jsonify, request 
from flask_pydantic import validate
from pydantic import ValidationError

import api_schemas as schemas
import database_queries as queries

api = Flask(__name__)

@api.errorhandler(ValidationError)
def handle_validation_error(e: ValidationError):
    """
    Catches validation errors from Pydantic and returns a detailed 400 JSON response.
    """
    # e.errors() returns a list of dictionaries with details about each error
    # Ex: [{'loc': ('body', 'username'), 'msg': 'Field required', 'type': 'missing'}]
    error_details = [
        {
            "field": error.get("loc")[-1], # Gets the field name
            "message": error.get("msg")
        }
        for error in e.errors()
    ]
    
    return jsonify({
        "error": "Validation failed",
        "details": error_details
    }), 400

@api.route('/api/users', methods=['GET'])
def get_usernames():
    """Returns a list of all usernames."""
    try:
        with queries.get_db_session() as db_session:
            usernames_tuples = queries.get_usernames(db_session)
            username_list = [item[0] for item in usernames_tuples]
            
            # Using schema to ensure the response format
            response_data = schemas.UsernamesResponse(usernames=username_list)
            
            return jsonify(response_data.model_dump()), 200
    except Exception as e:
        error_response = schemas.ErrorResponse(error=str(e))
        return jsonify(error_response.model_dump()), 500

@api.route('/api/login', methods=['POST'])
@validate()
def login(body: schemas.LoginRequest):
    """Authenticates a user and returns a userId and a message."""
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
                response_data["message"] = "Incorrect username or password. Please try again."
                status_code = 401
            
            # Using schema to ensure the response format
            response = schemas.LoginResponse(**response_data)
            return jsonify(response.model_dump()), status_code

    except Exception as e:
        error_response = schemas.ErrorResponse(error=str(e))
        return jsonify(error_response.model_dump()), 500


@api.route('/api/texts/<int:user_id>', methods=['GET'])
@validate()
def get_texts_data(user_id: int):
    """Returns metadata for all texts for a specific user."""
    try:
        with queries.get_db_session() as db_session:
            texts_data_from_db = queries.get_texts_data(db_session, user_id)
            
            # Transforming the raw DB data into the expected schema format
            # (list of dictionaries)
            texts_list = [
                {
                    "id": row.id,
                    "grade": row.grade,
                    "users_who_normalized": row.userswhonormalized or [],
                    "normalized_by_user": row.normalizedbyuser,
                    "source_file_name": row.sourcefilename,
                    "assigned_to_user": row.assignedtouser,
                }
                for row in texts_data_from_db
            ]

            # Using schema to ensure the response format
            response = schemas.TextsDataResponse(textsData=texts_list)
            return jsonify(response.model_dump()), 200
    except Exception as e:
        error_response = schemas.ErrorResponse(error=str(e))
        return jsonify(error_response.model_dump()), 500


@api.route('/api/texts/<int:user_id>/<int:text_id>', methods=['GET'])
@validate()
def get_text_detail(user_id: int, text_id: int):
    """Returns detailed data for a single text."""
    try:
        with queries.get_db_session() as db_session:
            text_data = queries.get_text_by_id(db_session, text_id, user_id)

            if not text_data:
                return jsonify({"error": "Text not found"}), 404

            # Using schema to ensure the response format
            response = schemas.TextDetailResponse(
                index=text_data.id,
                tokens=text_data.tokens or [],
                word_map=text_data.wordmap or [],
                candidates=text_data.candidates or {},
                grade=text_data.grade,
                corrections={},
                teacher=text_data.teacher,
                is_corrected=text_data.normalizedbyuser,
                source_file_name=text_data.sourcefilename,
                corrected_by_user=text_data.assignedtouser
            )
            return jsonify(response.model_dump()), 200
        
    except Exception as e:
        error_response = schemas.ErrorResponse(error=str(e))
        return jsonify(error_response.model_dump()), 500

@api.route('/api/texts/<int:user_id>/<int:text_id>/normalizations', methods=['GET'])
@validate()
def get_normalizations(user_id: int, text_id: int):
    """Returns all normalizations for a text."""
    try:
        with queries.get_db_session() as db_session:
            normalizations_from_db = queries.get_normalizations_by_text(db_session, text_id, user_id)

            corrections = {
                str(norm.startindex): schemas.NormalizationValue( 
                    last_index=norm.endindex,
                    new_token=norm.newtoken
                )
                for norm in normalizations_from_db
            }

            # Using schema to ensure the response format
            response_data = schemas.NormalizationResponse.dump_python(corrections)
            return jsonify(response_data), 200
        
    except Exception as e:
        error_response = schemas.ErrorResponse(error=str(e))
        return jsonify(error_response.model_dump()), 500


@api.route('/api/texts/<int:user_id>/<int:text_id>/normalizations', methods=['DELETE'])
@validate()
def delete_normalization(user_id: int, text_id: int, body: schemas.NormalizationDeleteRequest):
    """Deletes a normalization."""
    try:
        with queries.get_db_session() as db_session:
            queries.delete_normalization(
                db_session,
                text_id=text_id,
                user_id=user_id,
                start_index=body.word_index
            )
            
            # Using schema to ensure the response format
            response = schemas.MessageResponse(message="Normalization deleted successfully")
            return jsonify(response.model_dump()), 200
    except Exception as e:
        error_response = schemas.ErrorResponse(error=str(e))
        return jsonify(error_response.model_dump()), 500


@api.route('/api/texts/<int:user_id>/<int:text_id>/normalizations', methods=['POST'])
@validate()
def save_normalization(user_id: int, text_id: int, body: schemas.NormalizationCreateRequest):
    """Adds or saves a new normalization."""
    try:
        with queries.get_db_session() as db_session:
            queries.save_normalization(
                db_session,
                text_id=text_id,
                user_id=user_id,
                start_index=body.first_index,
                end_index=body.last_index,
                new_token=body.new_token
            )
            
            # Using schema to ensure the response format
            response = schemas.MessageResponse(message=f"Correction added successfully: {body.new_token}")
            return jsonify(response.model_dump()), 200
    except Exception as e:
        error_response = schemas.ErrorResponse(error=str(e))
        return jsonify(error_response.model_dump()), 500


@api.route('/api/texts/<int:user_id>/<int:text_id>/normalizations', methods=['PATCH'])
@validate()
def toggle_normalization_status(user_id: int, text_id: int):
    """Toggles the 'normalized' status for a text."""
    try:
        with queries.get_db_session() as db_session:
            queries.toggle_normalized(db_session, text_id=text_id, user_id=user_id)
            
            # Using schema to ensure the response format
            response = schemas.MessageResponse(message="Correction status changed successfully")
            return jsonify(response.model_dump()), 200
    except Exception as e:
        error_response = schemas.ErrorResponse(error=str(e))
        return jsonify(error_response.model_dump()), 500