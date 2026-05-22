import os
import uuid
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from werkzeug.utils import secure_filename
from sqlalchemy.orm.exc import NoResultFound

from app.tasks.celery_tasks import process_ocr_zip
from app.tasks.constants import IMAGES_FOLDER, TEMP_UPLOADS_FOLDER
from app.utils.decorators import admin_required
from app.database.models import RawText
from app.extensions import db, limiter
from app.schemas import ocr as ocr_schemas
from app.logging_config import get_logger
from app.utils.api_errors import (
    BUSINESS_RULE_VIOLATION,
    INTERNAL_SERVER_ERROR,
    INVALID_REQUEST,
    RESOURCE_NOT_FOUND,
    error_response,
)

ocr_bp = Blueprint('ocr', __name__)
logger = get_logger('app.route.ocr', source='route', blueprint='ocr')

UPLOAD_FOLDER = TEMP_UPLOADS_FOLDER

@ocr_bp.route('/api/ocr/upload', methods=['POST'])
@limiter.limit("5 per minute; 20 per hour")
@admin_required()
def upload_ocr_zip(current_user):
    """
    Uploads a ZIP file containing images for OCR processing.
    """
    MAX_ZIP_SIZE = 500 * 1024 * 1024  # 500 MB limit for uploaded zip
    
    if 'file' not in request.files:
        logger.warning('OCR upload missing file', extra={'event': {'source': 'route', 'blueprint': 'ocr'}})
        return error_response(error='File not found.', code=INVALID_REQUEST, status_code=400)
    
    file = request.files['file']
    
    if file.filename == '' or not file.filename.endswith('.zip'):
        logger.warning(
            'OCR upload rejected due to invalid extension',
            extra={'event': {'source': 'route', 'blueprint': 'ocr', 'filename': file.filename}},
        )
        return error_response(error='Invalid file type. Must be .zip', code=INVALID_REQUEST, status_code=400)
    
    # Check file size before saving
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)  # Reset to beginning
    
    if file_size > MAX_ZIP_SIZE:
        logger.warning(
            'OCR upload rejected due to oversized payload',
            extra={
                'event': {
                    'source': 'route',
                    'blueprint': 'ocr',
                    'file_size': file_size,
                    'max_size': MAX_ZIP_SIZE,
                }
            },
        )
        return error_response(
            error=f'File too large. Maximum size is {MAX_ZIP_SIZE // (1024*1024)}MB',
            code=BUSINESS_RULE_VIOLATION,
            status_code=400,
        )
                
    filename = secure_filename(file.filename)
    unique_name = f"ocr_{uuid.uuid4()}_{filename}"
    save_path = os.path.join(UPLOAD_FOLDER, unique_name)
    
    file.save(save_path)

    try:
        task = process_ocr_zip.delay(save_path)
    except Exception as e:
        logger.exception('Failed to enqueue OCR upload task', extra={'event': {'error': str(e)}})
        if os.path.exists(save_path):
            os.remove(save_path)
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)
    
    response = ocr_schemas.OCRUploadResponse(task_id=task.id)
    return jsonify(response.model_dump()), 202

@ocr_bp.route('/api/ocr/raw-texts/<int:text_id>/image', methods=['GET'])
@admin_required()
def get_raw_text_image(current_user, text_id):
    """
    Retrieves the image file associated with a raw text.
    """
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
        logger.warning(
            'Raw text image requested for nonexistent record',
            extra={'event': {'source': 'route', 'blueprint': 'ocr', 'text_id': text_id}},
        )
        return error_response(error='Raw text not found.', code=RESOURCE_NOT_FOUND, status_code=404)
    except Exception as e:
        logger.exception(
            'Failed to fetch raw text image',
            extra={'event': {'source': 'route', 'blueprint': 'ocr', 'text_id': text_id, 'error': str(e)}},
        )
        return error_response(error="Internal server error", code=INTERNAL_SERVER_ERROR, status_code=500)
