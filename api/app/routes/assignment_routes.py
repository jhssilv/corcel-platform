from flask import Blueprint, jsonify
from flask_pydantic import validate
from pydantic import BaseModel
from typing import List

from app.utils.decorators import login_required
import app.database.queries as queries
from app.schemas import generic as generic_schemas
from app.extensions import db

session = db.session

assignment_bp = Blueprint('assignment', __name__)


class BulkAssignRequest(BaseModel):
    """Request schema for bulk text assignment."""
    text_ids: List[int]
    usernames: List[str]


@assignment_bp.route('/api/assignments/', methods=['POST'])
@login_required()
@validate()
def bulk_assign_texts(current_user, body: BulkAssignRequest):
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
            return jsonify(generic_schemas.ErrorResponse(error="No valid users found").model_dump()), 400
        
        if not body.text_ids:
            return jsonify(generic_schemas.ErrorResponse(error="No texts provided").model_dump()), 400
        
        # Perform bulk assignment
        assignment_counts = queries.bulk_assign_texts(session, body.text_ids, user_ids)
        
        # Convert user IDs back to usernames for response
        username_counts = {}
        for user_id, count in assignment_counts.items():
            username = queries.get_username_by_id(session, user_id)
            if username:
                username_counts[username] = count
        
        return jsonify({
            "message": "Texts assigned successfully",
            "assignments": username_counts,
            "totalTexts": len(body.text_ids),
            "totalUsers": len(user_ids)
        }), 200
        
    except Exception as e:
        return jsonify(generic_schemas.ErrorResponse(error=str(e)).model_dump()), 500
