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
    """Retrieves the list of texts metadata for the current user.

    Args:
        current_user (User): The currently logged-in user.

    Returns:
        TextsDataResponse: The response containing the list of texts metadata.
        
    Pre-Conditions:
        User must be logged in.
        
    """
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
    """Retrieves the detailed information, tokens, suggestions and normalizations of a specific text.

    Args:
        current_user (User): The currently logged-in user.
        text_id (int): The ID of the text to retrieve.

    Returns:
        TextDetailResponse: The response containing the detailed information of the text.
        
    Pre-Conditions:
        User must be logged in.
        
    """
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
    """Retrieves the normalizations for a specific text.

    Args:
        current_user (User): The currently logged-in user.
        text_id (int): The ID of the text to retrieve normalizations for.

    Returns:
        NormalizationResponse: The response containing the normalizations for the text.
        
    Pre-Conditions:
        User must be logged in.
        
    """
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
    """_summary_

    Args:
        current_user (User): The currently logged-in user.
        text_id (int): The ID of the text to retrieve.
        body (NormalizationCreateRequest): The request body containing normalization details.

    Returns:
        MessageResponse: The response containing a confirmation message.
    
    Pre-Conditions:
        User must be logged in.
    
    """
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
    """Deletes a normalization for a specific user and token.

    Args:
        current_user (User): The currently logged-in user.
        text_id (int): The ID of the text to retrieve normalizations for.
        body (NormalizationDeleteRequest): The request body containing normalization details.

    Returns:
        MessageResponse: The response containing a confirmation message.
        
    Pre-Conditions:
        User must be logged in.
        
    """
    try:
        queries.delete_normalization(session, text_id, current_user.id, body.word_index)
        response = generic_schemas.MessageResponse(message="Normalization deleted")
        return jsonify(response.model_dump()), 200
    except Exception as e:
        return jsonify(generic_schemas.ErrorResponse(error=str(e)).model_dump()), 500

@text_bp.route('/api/texts/<int:text_id>/normalizations/all', methods=['DELETE'])
@login_required()
@validate()
def delete_all_normalizations(current_user, text_id: int):
    """Deletes all normalizations for a specific user and text.

    Args:
        current_user (User): The currently logged-in user.
        text_id (int): The ID of the text to retrieve normalizations for.
    Returns:
        MessageResponse: The response containing a confirmation message.
    Pre-Conditions:
        User must be logged in.
    """
    try:
        queries.delete_all_normalizations(session, current_user.id, text_id)
        response = generic_schemas.MessageResponse(message="All normalizations deleted")
        return jsonify(response.model_dump()), 200
    except Exception as e:
        return jsonify(generic_schemas.ErrorResponse(error=str(e)).model_dump()), 500

@text_bp.route('/api/texts/<int:text_id>/normalizations', methods=['PATCH'])
@login_required()
@validate()
def toggle_normalization_status(current_user, text_id: int):
    """Toggles the normalized status of a text for the current user.

    Args:
        current_user (User): The currently logged-in user.
        text_id (int): The ID of the text to toggle normalization status for.

    Returns:
        MessageResponse: The response containing a confirmation message.
        
    Pre-Conditions:
        User must be logged in.
        
    """
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
    """Toggles the to_be_normalized flag for a specific token for ALL users.

    Args:
        current_user (User): The currently logged-in user.
        token_id (int): The ID of the token to toggle the to_be_normalized flag for.
        body (toggleToBeNormalizedRequest): The request body containing toggle details.

    Returns:
        MessageResponse: The response containing a confirmation message.
        
    Pre-Conditions:
        User must be logged in.
        
    """
    try:
        queries.toggle_to_be_normalized(session, token_id=token_id)
        response = generic_schemas.MessageResponse(message="Token 'to_be_normalized' status toggled")
        return jsonify(response.model_dump()), 200
    except Exception as e:
        return jsonify(generic_schemas.ErrorResponse(error=str(e)).model_dump()), 500
    
@text_bp.route('/api/whitelist/', methods=['GET'])
@login_required()
def get_whitelist_tokens(current_user):
    """Retrieves the list of whitelist tokens.
    Args:
        current_user (User): The currently logged-in user.
    Returns:
        WhitelistTokensResponse: The response containing the list of whitelist tokens.
    Pre-Conditions:
        User must be logged in
    """
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
    """Manages whitelist tokens by adding or removing them.

    Args:
        current_user (User): The currently logged-in user.
        body (whitelist_schemas.WhitelistManageRequest): The request body containing token management details.

    Returns:
        MessageResponse: The response containing a confirmation message.
        
    Pre-Conditions:
        User must be logged in.
        
    """
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

