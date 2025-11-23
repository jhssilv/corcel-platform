from flask import Blueprint, jsonify
from flask_pydantic import validate
import api_schemas as schemas
import database.queries as queries

text_bp = Blueprint('text', __name__)

@text_bp.route('/api/texts/<int:user_id>', methods=['GET'])
@validate()
def get_texts_data(user_id: int):
    try:
        with queries.get_db_session() as db_session:
            texts_data_from_db = queries.get_texts_data(db_session, user_id)
            
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

        response = schemas.TextsDataResponse(textsData=texts_list)
        return jsonify(response.model_dump(by_alias=True)), 200
    except Exception as e:
        return jsonify(schemas.ErrorResponse(error=str(e)).model_dump()), 500

@text_bp.route('/api/texts/<int:user_id>/<int:text_id>', methods=['GET'])
@validate()
def get_text_detail(user_id: int, text_id: int):
    try:
        with queries.get_db_session() as db_session:
            text_data_dict = queries.get_text_by_id(db_session, text_id, user_id)
            if not text_data_dict:
                return jsonify({"error": "Text not found"}), 404
        
            response_schema = schemas.TextDetailResponse(**text_data_dict)
            return jsonify(response_schema.model_dump(by_alias=True)), 200
    except Exception as e:
        return jsonify(schemas.ErrorResponse(error=str(e)).model_dump()), 500

@text_bp.route('/api/texts/<int:user_id>/<int:text_id>/normalizations', methods=['GET'])
@validate()
def get_normalizations(user_id: int, text_id: int):
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
            response_data = schemas.NormalizationResponse.dump_python(corrections)
            return jsonify(response_data), 200
    except Exception as e:
        return jsonify(schemas.ErrorResponse(error=str(e)).model_dump()), 500

@text_bp.route('/api/texts/<int:user_id>/<int:text_id>/normalizations', methods=['POST'])
@validate()
def save_normalization(user_id: int, text_id: int, body: schemas.NormalizationCreateRequest):
    try:
        with queries.get_db_session() as db_session:
            queries.save_normalization(
                db_session, text_id, user_id, body.first_index, body.last_index, body.new_token
            )
            response = schemas.MessageResponse(message=f"Correction added: {body.new_token}")
            return jsonify(response.model_dump()), 200
    except Exception as e:
        return jsonify(schemas.ErrorResponse(error=str(e)).model_dump()), 500

@text_bp.route('/api/texts/<int:user_id>/<int:text_id>/normalizations', methods=['DELETE'])
@validate()
def delete_normalization(user_id: int, text_id: int, body: schemas.NormalizationDeleteRequest):
    try:
        with queries.get_db_session() as db_session:
            queries.delete_normalization(db_session, text_id, user_id, body.word_index)
            response = schemas.MessageResponse(message="Normalization deleted")
            return jsonify(response.model_dump()), 200
    except Exception as e:
        return jsonify(schemas.ErrorResponse(error=str(e)).model_dump()), 500

@text_bp.route('/api/texts/<int:user_id>/<int:text_id>/normalizations', methods=['PATCH'])
@validate()
def toggle_normalization_status(user_id: int, text_id: int):
    try:
        with queries.get_db_session() as db_session:
            queries.toggle_normalized(db_session, text_id=text_id, user_id=user_id)
            response = schemas.MessageResponse(message="Status changed")
            return jsonify(response.model_dump()), 200
    except Exception as e:
        return jsonify(schemas.ErrorResponse(error=str(e)).model_dump()), 500