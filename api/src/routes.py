from datetime import datetime
import os
import shutil
from flask import Flask, after_this_request, jsonify, send_from_directory, request 
from flask_pydantic import validate
from pydantic import ValidationError
import logging

import api_schemas as schemas
import database_queries as queries
from recover_texts import save_modified_texts

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
    print(body, flush=True)
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
                    "normalized_by_user": row.normalized_by_user or False,
                    "source_file_name": row.source_file_name,
                    "users_assigned": row.users_assigned or [],
                }
                for row in texts_data_from_db
            ]

            # Using schema to ensure the response format
        response = schemas.TextsDataResponse(textsData=texts_list)
        return jsonify(response.model_dump(by_alias=True)), 200
    except Exception as e:
        error_response = schemas.ErrorResponse(error=str(e))
        return jsonify(error_response.model_dump()), 500


@api.route('/api/texts/<int:user_id>/<int:text_id>', methods=['GET'])
@validate()
def get_text_detail(user_id: int, text_id: int):
    """Returns detailed data for a single text."""
    try:
        with queries.get_db_session() as db_session:
            text_data_dict = queries.get_text_by_id(db_session, text_id, user_id)
            
            if not text_data_dict:
                return jsonify({"error": "Text not found"}), 404
        
            response_schema = schemas.TextDetailResponse(**text_data_dict)
            
            return jsonify(response_schema.model_dump(by_alias=True)), 200
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
                str(norm.start_index): schemas.NormalizationValue( 
                    last_index=norm.end_index,
                    new_token=norm.new_token
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
    

@api.route('/api/download/<int:user_id>', methods=['POST'])
def download_normalized_texts(user_id: int):
    try:
        body = request.get_json()
        if not body:
            error_response = schemas.ErrorResponse(error="Request body is missing or not JSON")
            return jsonify(error_response.model_dump()), 400

        text_ids = body.get('text_ids')
        use_tags = body.get('use_tags', False)

        if not isinstance(text_ids, list) or not text_ids:
            return jsonify({"error": "'text_ids' must be a non-empty list"}), 400

        parsed_user_id = int(user_id)

        zip_abs_path = save_modified_texts(parsed_user_id, text_ids, use_tags)

        if not os.path.exists(zip_abs_path):
            error_response = schemas.ErrorResponse(error="Failed to generate zip file on server.")
            return jsonify(error_response.model_dump()), 500

        directory = os.path.dirname(zip_abs_path)
        filename = os.path.basename(zip_abs_path)

        @after_this_request
        def cleanup(response):
            try:
                temp_dir = os.path.dirname(directory) # O diretório temporário pai
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
            except Exception as cleanup_error:
                logging.error(f"Error cleaning up temporary directory {temp_dir}: {cleanup_error}")
            return response

        return send_from_directory(
            directory=directory,
            path=filename,
            as_attachment=True
        )

    except Exception as e:
        logging.exception("Error during generation or sending of download:")
        error_response = schemas.ErrorResponse(error="Internal server error while generating the file.")
        return jsonify(error_response.model_dump()), 500