import os
import uuid
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from werkzeug.utils import secure_filename
from sqlalchemy.orm.exc import NoResultFound

from app.tasks import process_ocr_zip
from app.utils.decorators import admin_required
from app.database.models import Token, Text, RawText
from app.extensions import db
from app.schemas import generic as generic_schemas

ocr_bp = Blueprint('ocr', __name__)

# Same as in tasks.py
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'temp_uploads')
IMAGES_FOLDER = os.path.join(os.getcwd(), 'images')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(IMAGES_FOLDER, exist_ok=True)

@ocr_bp.route('/api/ocr/upload', methods=['POST'])
@admin_required()
def upload_ocr_zip(current_user):
    """
    Uploads a ZIP file containing images for OCR processing.
    """
    if 'file' not in request.files:
        return jsonify(generic_schemas.ErrorResponse(error='File not found.').model_dump()), 400
    
    file = request.files['file']
    
    if file.filename == '' or not file.filename.endswith('.zip'):
        return jsonify(generic_schemas.ErrorResponse(error='Invalid file type. Must be .zip').model_dump()), 400
                
    filename = secure_filename(file.filename)
    unique_name = f"ocr_{uuid.uuid4()}_{filename}"
    save_path = os.path.join(UPLOAD_FOLDER, unique_name)
    
    file.save(save_path)
    
    task = process_ocr_zip.delay(save_path)
    
    return jsonify({'task_id': task.id}), 202

@ocr_bp.route('/api/ocr/raw-texts/<int:text_id>/image', methods=['GET'])
@admin_required()
def get_raw_text_image(current_user, text_id):
    """
    Retrieves the image file associated with a raw text.
    """
    try:
        raw_text = db.session.query(RawText).filter(RawText.id == text_id).one()
        
        if not raw_text.image_path:
            return jsonify({'error': 'This text does not have an associated image.'}), 404
        
        return send_from_directory(IMAGES_FOLDER, raw_text.image_path)
        
    except NoResultFound:
        return jsonify({'error': 'Raw text not found.'}), 404

