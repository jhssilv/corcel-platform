import os
import shutil
from flask import Blueprint, jsonify, make_response, send_from_directory, request, after_this_request
from flask_pydantic import validate

from app.utils.decorators import login_required
from app.logging_config import DownloadLogger
import app.schemas.download as download_schemas
import app.schemas.generic as generic_schemas
from app.download_texts import save_modified_texts
from app.generate_report import generate_report

download_bp = Blueprint('download', __name__)

download_log_manager = DownloadLogger(log_file='logs/download_activity.log')
logger = download_log_manager.get_logger()

@download_bp.route('/api/report/', methods=['POST'])
@login_required()
@validate()
def request_report(current_user, body: download_schemas.ReportRequest):  
    """ Handles report generation and download requests given a list of text IDs.

    Args:
        current_user: The currently logged-in user.
        body (ReportRequest): List of text IDs for the report.

    Returns: A response object containing the generated csv report.
        
    Pre-Conditions:
        User must be logged in.
        
    """
    report = generate_report(current_user.id, body.text_ids)
    
    response = make_response(report)
    response.headers["Content-Disposition"] = "attachment; filename=report.csv"
    response.headers["Content-type"] = "text/csv"
    return response

@download_bp.route('/api/download/', methods=['POST'])
@login_required()
@validate()
def download_normalized_texts(current_user, body: download_schemas.DownloadRequest):
    """Handles downloading of normalized texts.

    Args:
        current_user: The currently logged-in user.
        body (DownloadRequest): Contains text IDs and use_tags flag.
            - text_ids: List of text IDs to download.
            - use_tags: Boolean indicating whether to use XML syntax in normalized tokens.

    Returns: A response object containing the generated zip file.
        
    Pre-Conditions:
        User must be logged in.
        
    """
    try:
        logger.info(f"Download request received for user ID: {current_user.id}")

        text_ids = body.text_ids
        use_tags = body.use_tags

        if not text_ids:
            return jsonify({"error": "'text_ids' must be a non-empty list"}), 400

        zip_abs_path = save_modified_texts(current_user.id, text_ids, use_tags)

        if not os.path.exists(zip_abs_path):
            return jsonify(generic_schemas.ErrorResponse(error="Failed to generate zip").model_dump()), 500

        directory = os.path.dirname(zip_abs_path)
        filename = os.path.basename(zip_abs_path)

        @after_this_request
        def cleanup(response):
            try:
                if os.path.exists(directory):
                    shutil.rmtree(directory)
            except Exception as e:
                logger.error(f"Cleanup error: {e}")
            return response

        return send_from_directory(directory=directory, path=filename, as_attachment=True)

    except Exception as e:
        logger.exception("Error during download")
        return jsonify(generic_schemas.ErrorResponse(error="Internal server error").model_dump()), 500