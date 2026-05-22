from flask import Blueprint, jsonify
from flask_pydantic import validate
from pydantic import BaseModel
from typing import List

from app.utils.decorators import login_required
import app.database.queries as queries
from app.schemas import generic as generic_schemas
from app.schemas import assignment as assignment_schemas
from app.extensions import db
from app.logging_config import get_logger
from app.utils.api_errors import (
    BUSINESS_RULE_VIOLATION,
    INTERNAL_SERVER_ERROR,
    error_response,
)

session = db.session

assignment_bp = Blueprint('assignment', __name__)
logger = get_logger('app.route.assignment', source='route', blueprint='assignment')



@assignment_bp.route('/api/assignments/', methods=['POST'])
@login_required()
@validate()
def bulk_assign_texts(current_user, body: assignment_schemas.BulkAssignRequest):
    """Bulk assigns texts to users with round-robin distribution.

    Args:
        current_user (User): The currently logged-in user.
        body (BulkAssignRequest): The request body containing text_ids and usernames.

    Returns:
        JSON response with assignment counts per user.
        
    Pre-Conditions:
        User must be logged in.
        
    """
    try:
        # Convert usernames to user IDs
        user_ids = queries.get_user_ids_by_usernames(session, body.usernames)
        
        if not user_ids:
            return error_response(error="No valid users found", code=BUSINESS_RULE_VIOLATION, status_code=400)
        
        if not body.text_ids:
            return error_response(error="No texts provided", code=BUSINESS_RULE_VIOLATION, status_code=400)
        
        # Perform bulk assignment
        assignment_counts = queries.bulk_assign_texts(session, body.text_ids, user_ids)
        
        # Convert user IDs back to usernames for response
        username_counts = {}
        for user_id, count in assignment_counts.items():
            username = queries.get_username_by_id(session, user_id)
            if username:
                username_counts[username] = count
        
        response = assignment_schemas.BulkAssignmentResponse(
            message="Texts assigned successfully",
            assignments=username_counts,
            totalTexts=len(body.text_ids),
            totalUsers=len(user_ids)
        )
        return jsonify(response.model_dump()), 200
        
    except Exception as e:
        logger.exception(
            'Bulk assignment failed',
            extra={'event': {'source': 'route', 'blueprint': 'assignment', 'error': str(e)}},
        )
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)


@assignment_bp.route('/api/assignments/', methods=['DELETE'])
@login_required()
@validate()
def bulk_unassign_texts(current_user, body: assignment_schemas.BulkAssignRequest):
    """Removes text assignments from specified users.

    Args:
        current_user (User): The currently logged-in user.
        body (BulkAssignRequest): The request body containing text_ids and usernames.

    Returns:
        JSON response with unassignment counts per user.
    """
    try:
        user_ids = queries.get_user_ids_by_usernames(session, body.usernames)
        
        if not user_ids:
            return error_response(error="No valid users found", code=BUSINESS_RULE_VIOLATION, status_code=400)
        
        if not body.text_ids:
            return error_response(error="No texts provided", code=BUSINESS_RULE_VIOLATION, status_code=400)
        
        unassignment_counts = queries.bulk_unassign_texts(session, body.text_ids, user_ids)
        
        username_counts = {}
        for user_id, count in unassignment_counts.items():
            username = queries.get_username_by_id(session, user_id)
            if username:
                username_counts[username] = count
        
        response = assignment_schemas.BulkUnassignmentResponse(
            message="Assignments removed successfully",
            unassignments=username_counts,
            totalTexts=len(body.text_ids),
            totalUsers=len(user_ids)
        )
        return jsonify(response.model_dump()), 200
        
    except Exception as e:
        logger.exception(
            'Bulk unassignment failed',
            extra={'event': {'source': 'route', 'blueprint': 'assignment', 'error': str(e)}},
        )
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)
