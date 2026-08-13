import os
import uuid

from flask import Blueprint, jsonify, request, send_from_directory
from sqlalchemy.orm.exc import NoResultFound
from werkzeug.utils import secure_filename

from app.background_jobs import create_background_job
from app.database import models
from app.database.models import RawText
from app.extensions import db, limiter
from app.schemas import ocr as ocr_schemas
from app.tasks.constants import IMAGES_FOLDER, TEMP_UPLOADS_FOLDER
from app.utils.api_errors import (
    BUSINESS_RULE_VIOLATION,
    INTERNAL_SERVER_ERROR,
    INVALID_REQUEST,
    RESOURCE_NOT_FOUND,
    error_response,
)
from app.utils.decorators import admin_required


ocr_bp = Blueprint('ocr', __name__)

UPLOAD_FOLDER = TEMP_UPLOADS_FOLDER


@ocr_bp.route('/api/ocr/upload', methods=['POST'])
@limiter.limit("5 per minute; 20 per hour")
@admin_required()
def upload_ocr_zip(current_user):
    """Upload a ZIP file containing images for OCR processing."""
    max_zip_size = 500 * 1024 * 1024

    if 'file' not in request.files:
        return error_response(error='File not found.', code=INVALID_REQUEST, status_code=400)

    file = request.files['file']

    if file.filename == '' or not file.filename.endswith('.zip'):
        return error_response(error='Invalid file type. Must be .zip', code=INVALID_REQUEST, status_code=400)

    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size > max_zip_size:
        return error_response(
            error=f'File too large. Maximum size is {max_zip_size // (1024 * 1024)}MB',
            code=BUSINESS_RULE_VIOLATION,
            status_code=400,
        )

    filename = secure_filename(file.filename)
    unique_name = f"ocr_{uuid.uuid4()}_{filename}"
    save_path = os.path.join(UPLOAD_FOLDER, unique_name)
    file.save(save_path)

    try:
        job = create_background_job(
            db.session,
            kind=models.BackgroundJobKind.OCR_UPLOAD,
            created_by_user_id=current_user.id,
            payload_json={
                'zip_path': save_path,
                'original_filename': unique_name,
            },
            status_message='Waiting...',
        )
    except Exception as exc:
        if os.path.exists(save_path):
            os.remove(save_path)
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)

    response = ocr_schemas.OCRUploadResponse(job_id=job.id)
    return jsonify(response.model_dump()), 202


@ocr_bp.route('/api/ocr/raw-texts/<int:text_id>/image', methods=['GET'])
@admin_required()
def get_raw_text_image(current_user, text_id):
    """Retrieve the image file associated with a raw text."""
    _ = current_user
    try:
        raw_text = db.session.query(RawText).filter(RawText.id == text_id).one()

        if not raw_text.image_path:
            return error_response(
                error='This text does not have an associated image.',
                code=RESOURCE_NOT_FOUND,
                status_code=404,
            )

        return send_from_directory(IMAGES_FOLDER, raw_text.image_path)

    except NoResultFound:
        return error_response(error='Raw text not found.', code=RESOURCE_NOT_FOUND, status_code=404)
    except Exception as exc:
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)
