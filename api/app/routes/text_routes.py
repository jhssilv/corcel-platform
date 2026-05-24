import os
from urllib.parse import unquote

from flask import Blueprint, jsonify
from flask_pydantic import validate

from app.utils.decorators import login_required
import app.database.queries as queries
from app.extensions import db, limiter
from app.database.models import Text, Token, RawText
from app.text_pipeline import TextProcessingPipeline

from app.schemas import text as text_schemas
from app.schemas import generic as generic_schemas
from app.schemas import normalization as normalization_schemas
from app.schemas import whitelist as whitelist_schemas
from app.logging_config import get_logger
from app.utils.api_errors import (
    INTERNAL_SERVER_ERROR,
    RESOURCE_NOT_FOUND,
    VALIDATION_ERROR,
    error_response,
)

session = db.session

text_bp = Blueprint('text', __name__)
logger = get_logger('app.route.text', source='route', blueprint='text')


def _parse_normalized_filter(normalized_param: str):
    """Parses normalized query param as tri-state: True, False, or None.

    Returns:
        tuple[bool | None, list[dict] | None]:
            - Parsed normalized filter value.
            - Validation error details (or None).
    """
    if normalized_param == '':
        return None, None

    normalized_value = normalized_param.lower()
    if normalized_value == 'true':
        return True, None
    if normalized_value == 'false':
        return False, None

    return None, [
        {
            "field": "normalized",
            "message": "Must be 'true' or 'false'",
        }
    ]

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
                "processing_status": row.processing_status.name if hasattr(row.processing_status, 'name') else str(row.processing_status),
            }
            for row in texts_data_from_db
        ]

        response = text_schemas.TextsDataResponse(textsData=texts_list)
        return jsonify(response.model_dump(by_alias=True)), 200
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)

@text_bp.route('/api/texts/status/batch', methods=['POST'])
@login_required()
@validate()
def get_batch_texts_status(current_user, body: text_schemas.BatchTextsStatusRequest):
    """Retrieves the processing status of a batch of text IDs."""
    from app.database.models import Text
    
    try:
        text_ids = body.text_ids
        texts = session.query(Text.id, Text.source_file_name, Text.processing_status).filter(Text.id.in_(text_ids)).all()
        found_ids = {text.id for text in texts}
        missing_ids = [text_id for text_id in text_ids if text_id not in found_ids]
        
        result = [
            {
                "id": t.id,
                "source_file_name": t.source_file_name,
                "processing_status": t.processing_status.name if hasattr(t.processing_status, 'name') else str(t.processing_status)
            }
            for t in texts
        ]
        
        response = text_schemas.BatchTextsStatusResponse(statuses=result, missing_ids=missing_ids)
        return jsonify(response.model_dump()), 200
    except Exception:
        logger.exception("Failed to fetch batch text statuses")
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)

@text_bp.route('/api/texts/filtered', methods=['GET'])
@login_required()
@validate()
def get_filtered_texts_data(current_user, query: text_schemas.FilteredTextsQuery):
    """Retrieves filtered texts based on query parameters.

    Returns:
        TextsDataResponse: The response containing the filtered list of texts.
    """
    try:
        # Parse grades
        grades = None
        if query.grades:
            grades = [int(g.strip()) for g in query.grades.split(',') if g.strip()]
        
        # Parse assigned users
        assigned_users = None
        if query.assigned_users:
            assigned_users = [u.strip() for u in query.assigned_users.split(',') if u.strip()]
        
        normalized_filter, normalized_error = _parse_normalized_filter(query.normalized or '')
        if normalized_error:
            return error_response(
                error="Validation failed",
                code=VALIDATION_ERROR,
                status_code=400,
                details=normalized_error,
            )
        
        # Use existing get_filtered_texts query
        texts_data_from_db = queries.get_filtered_texts(
            session,
            grades=grades,
            assigned_users=assigned_users,
            user_id=current_user.id,
            normalized=normalized_filter,
            file_name=query.file_name
        )
        
        texts_list = [
            {
                "id": row.id,
                "grade": row.grade,
                "normalized_by_user": row.normalized_by_user or False,
                "source_file_name": row.source_file_name,
                "users_assigned": row.users_assigned or [],
                "processing_status": row.processing_status.name if hasattr(row.processing_status, 'name') else str(row.processing_status),
            }
            for row in texts_data_from_db
        ]

        response = text_schemas.TextsDataResponse(textsData=texts_list)
        return jsonify(response.model_dump(by_alias=True)), 200
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)

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
            return error_response(error="Text not found", code=RESOURCE_NOT_FOUND, status_code=404)
    
        response_schema = text_schemas.TextDetailResponse(**text_data_dict)
        return jsonify(response_schema.model_dump(by_alias=True)), 200
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)

@text_bp.route('/api/raw-texts/', methods=['GET'])
@login_required()
def get_raw_texts_data(current_user):
    """Retrieves the list of raw texts metadata.

    Args:
        current_user (User): The currently logged-in user.

    Returns:
        JSON response with list of raw texts.
        
    Pre-Conditions:
        User must be logged in.
        
    """
    try:
        raw_texts_data = queries.get_raw_texts(session)
        
        texts_list = [
            {
                "id": row.id,
                "sourceFileName": row.source_file_name,
            }
            for row in raw_texts_data
        ]

        response = text_schemas.RawTextsDataResponse(textsData=texts_list)
        return jsonify(response.model_dump(by_alias=True)), 200
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)

@text_bp.route('/api/raw-texts/<int:text_id>', methods=['GET'])
@login_required()
@validate()
def get_raw_text_detail(current_user, text_id: int):
    """Retrieves the detailed information of a specific raw text.

    Args:
        current_user (User): The currently logged-in user.
        text_id (int): The ID of the raw text to retrieve.

    Returns:
        JSON response with raw text details.
        
    Pre-Conditions:
        User must be logged in.
        
    """
    try:
        raw_text_data = queries.get_raw_text_by_id(session, text_id)
        if not raw_text_data:
            return error_response(error="Raw text not found", code=RESOURCE_NOT_FOUND, status_code=404)
    
        response = text_schemas.RawTextDetailResponse(**raw_text_data)
        return jsonify(response.model_dump()), 200
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)

@text_bp.route('/api/raw-texts/<int:text_id>', methods=['PUT'])
@login_required()
@validate()
def update_raw_text(current_user, text_id: int, body: text_schemas.UpdateRawTextRequest):
    """Updates the text content of a specific raw text.

    Args:
        current_user (User): The currently logged-in user.
        text_id (int): The ID of the raw text to update.

    Returns:
        JSON response with success message.
        
    Pre-Conditions:
        User must be logged in.
        Request body must contain 'text_content' field.
        
    """
    try:
        new_content = body.text_content
        
        success = queries.update_raw_text_content(session, text_id, new_content)
        if not success:
            return error_response(error="Raw text not found", code=RESOURCE_NOT_FOUND, status_code=404)
    
        response = generic_schemas.MessageResponse(message="Text updated successfully")
        return jsonify(response.model_dump()), 200
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)

@text_bp.route('/api/raw-texts/<int:text_id>/finalize', methods=['POST'])
@limiter.limit("20 per minute")
@login_required()
@validate()
def finalize_raw_text(current_user, text_id: int, body: text_schemas.FinalizeRawTextRequest):
    """Finalizes a raw text by processing it into tokens/suggestions and deleting the raw text.

    Args:
        current_user (User): The currently logged-in user.
        text_id (int): The ID of the raw text to finalize.

    Returns:
        JSON response with the new text ID.
        
    Pre-Conditions:
        User must be logged in.
        Raw text must exist.
        Request body may optionally contain 'source_file_name' to override the default.
        
    """
    try:
        # Get raw text
        raw_text_data = queries.get_raw_text_by_id(session, text_id)
        if not raw_text_data:
            return error_response(error="Raw text not found", code=RESOURCE_NOT_FOUND, status_code=404)
        
        # Get the actual RawText object for deletion
        raw_text = session.query(RawText).filter(RawText.id == text_id).first()
        if not raw_text:
            return error_response(error="Raw text not found", code=RESOURCE_NOT_FOUND, status_code=404)
        
        # Get optional source_file_name from request body
        source_file_name = body.source_file_name if body.source_file_name is not None else raw_text_data['source_file_name']
        
        text_content = raw_text_data['text_content']
        image_path = raw_text_data['image_path']
        
        # Process text with TextProcessingPipeline to get tokens and suggestions
        pipeline = TextProcessingPipeline()
        processed_data = pipeline.process_text(text_content)
        
        # Create Text object
        text_obj = Text(source_file_name=source_file_name)
        
        # Create tokens with candidates list
        tokens_with_candidates = []
        for idx, token_data in processed_data.items():
            token = Token(
                position=token_data['idx'],
                token_text=token_data['text'],
                is_word=token_data['is_word'],
                to_be_normalized=token_data['to_be_normalized'],
                whitespace_after=token_data['whitespace_after']
            )
            candidates = token_data.get('suggestions', [])
            tokens_with_candidates.append((token, candidates))
        
        # Add to database
        new_text_id = queries.add_text(text_obj, tokens_with_candidates, session)
        
        # Delete raw text from database
        session.delete(raw_text)
        session.commit()
        
        # Delete image file if it exists
        if image_path:
            images_folder = os.path.join(os.getcwd(), 'images')
            image_full_path = os.path.join(images_folder, image_path)
            if os.path.exists(image_full_path):
                os.remove(image_full_path)
                logger.info(
                    'Deleted OCR image file after finalization',
                    extra={'event': {'source': 'route', 'blueprint': 'text', 'image_path': image_full_path}},
                )
        
        response = text_schemas.FinalizeRawTextResponse(message="Text finalized successfully", text_id=new_text_id)
        return jsonify(response.model_dump()), 200
    except Exception as e:
        session.rollback()
        logger.exception(
            'Error finalizing raw text',
            extra={'event': {'source': 'route', 'blueprint': 'text', 'error': str(e), 'text_id': text_id}},
        )
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)

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
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)

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
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)

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
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)

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
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)

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
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)
    
    
@text_bp.route('/api/tokens/<int:token_id>/normalization-flag', methods=['PATCH'])
@login_required()
@validate()
def set_token_normalization_flag(current_user, token_id: int, body: normalization_schemas.SetToBeNormalizedRequest):
    """Sets the to_be_normalized flag for a specific token for ALL users.

    Args:
        current_user (User): The currently logged-in user.
        token_id (int): The ID of the token whose to_be_normalized flag will be updated.
        body (SetToBeNormalizedRequest): The request body containing the desired flag state.

    Returns:
        MessageResponse: The response containing a confirmation message.
        
    Pre-Conditions:
        User must be logged in.
        
    """
    try:
        token = queries.set_to_be_normalized(session, token_id=token_id, to_be_normalized=body.to_be_normalized)
        if token is None:
            return error_response(error="Token not found", code=RESOURCE_NOT_FOUND, status_code=404)

        message = (
            "Token marked as requiring normalization."
            if body.to_be_normalized
            else "Token marked as not requiring normalization."
        )
        response = generic_schemas.MessageResponse(message=message)
        return jsonify(response.model_dump()), 200
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)
    
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
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)

@text_bp.route('/api/whitelist/', methods=['POST'])
@login_required()
@validate()
def create_whitelist_token(current_user, body: whitelist_schemas.WhitelistTokenCreateRequest):
    """Adds a token to the whitelist.

    Args:
        current_user (User): The currently logged-in user.
        body (whitelist_schemas.WhitelistTokenCreateRequest): The request body containing the token text.

    Returns:
        MessageResponse: The response containing a confirmation message.
        
    Pre-Conditions:
        User must be logged in.
        
    """
    try:
        queries.add_whitelist_token(session, body.token_text)
        message = f"Token '{body.token_text}' added to whitelist."

        response = generic_schemas.MessageResponse(message=message)
        return jsonify(response.model_dump()), 200
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)


@text_bp.route('/api/whitelist/<path:token_text>', methods=['DELETE'])
@login_required()
def delete_whitelist_token(current_user, token_text: str):
    """Removes a token from the whitelist."""
    try:
        decoded_token_text = unquote(token_text)
        queries.remove_whitelist_token(session, decoded_token_text)
        response = generic_schemas.MessageResponse(message=f"Token '{decoded_token_text}' removed from whitelist.")
        return jsonify(response.model_dump()), 200
    except Exception:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)
