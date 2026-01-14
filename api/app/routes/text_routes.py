from flask import Blueprint, jsonify
from flask_pydantic import validate

from app.utils.decorators import login_required
import app.database.queries as queries
from app.extensions import db

from app.schemas import text as text_schemas
from app.schemas import generic as generic_schemas
from app.schemas import normalization as normalization_schemas
from app.schemas import whitelist as whitelist_schemas

session = db.session

text_bp = Blueprint('text', __name__)

@text_bp.route('/api/texts/', methods=['GET'])
@login_required()
def get_texts_data(current_user):
    try:
        texts_data_from_db = queries.get_texts_data(session, current_user.id)
        
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

        response = text_schemas.TextsDataResponse(textsData=texts_list)
        return jsonify(response.model_dump(by_alias=True)), 200
    except Exception as e:
        return jsonify(generic_schemas.ErrorResponse(error=str(e)).model_dump()), 500

@text_bp.route('/api/texts/<int:text_id>', methods=['GET'])
@login_required()
@validate()
def get_text_detail(current_user, text_id: int):
    try:
        text_data_dict = queries.get_text_by_id(session, text_id, current_user.id)
        if not text_data_dict:
            return jsonify({"error": "Text not found"}), 404
    
        response_schema = text_schemas.TextDetailResponse(**text_data_dict)
        return jsonify(response_schema.model_dump(by_alias=True)), 200
    except Exception as e:
        return jsonify(generic_schemas.ErrorResponse(error=str(e)).model_dump()), 500

@text_bp.route('/api/texts/<int:text_id>/normalizations', methods=['GET'])
@login_required()
@validate()
def get_normalizations(current_user, text_id: int):
    try:
        normalizations_from_db = queries.get_normalizations_by_text(session, text_id, current_user.id)

        corrections = {
            str(norm.start_index): normalization_schemas.NormalizationValue( 
                last_index=norm.end_index,
                new_token=norm.new_token
            )
            for norm in normalizations_from_db
        }
        validated = normalization_schemas.NormalizationResponse.validate_python(corrections)
        response_data = {key: value.model_dump() for key, value in validated.items()}
        return jsonify(response_data), 200
    except Exception as e:
        return jsonify(generic_schemas.ErrorResponse(error=str(e)).model_dump()), 500

@text_bp.route('/api/texts/<int:text_id>/normalizations', methods=['POST'])
@login_required()
@validate()
def save_normalization(current_user, text_id: int, body: normalization_schemas.NormalizationCreateRequest):
    try:
        queries.save_normalization(
            session, 
            text_id, 
            current_user.id, 
            body.first_index, 
            body.last_index, 
            body.new_token,
            body.suggest_for_all
        )
        response = generic_schemas.MessageResponse(message=f"Correction added: {body.new_token}")
        return jsonify(response.model_dump()), 200
    except Exception as e:
        return jsonify(generic_schemas.ErrorResponse(error=str(e)).model_dump()), 500

@text_bp.route('/api/texts/<int:text_id>/normalizations', methods=['DELETE'])
@login_required()
@validate()
def delete_normalization(current_user, text_id: int, body: normalization_schemas.NormalizationDeleteRequest):
    try:
        queries.delete_normalization(session, text_id, current_user.id, body.word_index)
        response = generic_schemas.MessageResponse(message="Normalization deleted")
        return jsonify(response.model_dump()), 200
    except Exception as e:
        return jsonify(generic_schemas.ErrorResponse(error=str(e)).model_dump()), 500

@text_bp.route('/api/texts/<int:text_id>/normalizations', methods=['PATCH'])
@login_required()
@validate()
def toggle_normalization_status(current_user, text_id: int):
    try:
        queries.toggle_normalized(session, text_id=text_id, user_id=current_user.id)
        response = generic_schemas.MessageResponse(message="Status changed")
        return jsonify(response.model_dump()), 200
    except Exception as e:
        return jsonify(generic_schemas.ErrorResponse(error=str(e)).model_dump()), 500
    
    
@text_bp.route('/api/tokens/<int:token_id>/suggestions/toggle', methods=['PATCH'])
@login_required()
@validate()
def toggle_token_suggestions(current_user, token_id: int, body: normalization_schemas.toggleToBeNormalizedRequest):
    try:
        queries.toggle_to_be_normalized(session, token_id=token_id)
        response = generic_schemas.MessageResponse(message="Token 'to_be_normalized' status toggled")
        return jsonify(response.model_dump()), 200
    except Exception as e:
        return jsonify(generic_schemas.ErrorResponse(error=str(e)).model_dump()), 500
    
@text_bp.route('/api/whitelist/', methods=['GET'])
@login_required()
def get_whitelist_tokens(current_user):
    try:
        whitelist_tokens = queries.get_whitelist_tokens(session)
        response = whitelist_schemas.WhitelistTokensResponse(tokens=whitelist_tokens)
        return jsonify(response.model_dump()), 200
    except Exception as e:
        return jsonify(whitelist_schemas.ErrorResponse(error=str(e)).model_dump()), 500

@text_bp.route('/api/whitelist/', methods=['POST', 'DELETE'])
@login_required()
@validate()
def manage_whitelist_token(current_user, body: whitelist_schemas.WhitelistManageRequest):
    try:
        if body.action == 'add':
            queries.add_whitelist_token(session, body.token_text)
            message = f"Token '{body.token_text}' added to whitelist."
        elif body.action == 'remove':
            queries.remove_whitelist_token(session, body.token_text)
            message = f"Token '{body.token_text}' removed from whitelist."
        else:
            return jsonify(generic_schemas.ErrorResponse(error="Invalid action").model_dump()), 400

        response = generic_schemas.MessageResponse(message=message)
        return jsonify(response.model_dump()), 200
    except Exception as e:
        return jsonify(generic_schemas.ErrorResponse(error=str(e)).model_dump()), 500

