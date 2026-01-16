import os
import uuid
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename

from app.tasks import process_zip_texts 
from app.utils.decorators import admin_required

from app.schemas import generic as generic_schemas


upload_bp = Blueprint('upload', __name__)

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'temp_uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@upload_bp.route('/api/upload', methods=['POST'])
@admin_required()
def upload_file(current_user):
    """Uploads a ZIP file for processing.

    Args:
        current_user (User): The currently logged-in user.

    Returns:
        JSON response with the task ID.
        
    Pre-Conditions:
        Admin privileges.
        
    """
    if 'file' not in request.files:
        return jsonify(generic_schemas.ErrorResponse(error='File not found.').model_dump()), 400
    
    file = request.files['file']
    
    if file.filename == '' or not file.filename.endswith('.zip'):
        return jsonify(generic_schemas.ErrorResponse(error='Invalid file type.').model_dump()), 400
                
    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4()}_{filename}"
    save_path = os.path.join(UPLOAD_FOLDER, unique_name)
    
    file.save(save_path)
    
    task = process_zip_texts.delay(save_path)
    
    return jsonify({'task_id': task.id}), 202

@upload_bp.route('/api/status/<task_id>', methods=['GET'])
def task_status(task_id):
    """Gets the status of a background text processing task.

    Args:
        task_id (str): The ID of the task.

    Returns: JSON response with the task status and any relevant information:
        state: Current state of the task (e.g., PENDING, PROGRESS, SUCCESS, FAILURE).
        status: A human-readable status message.
        result: (if SUCCESS) Result data from the task.
        error: (if FAILURE) Error message from the task.
    """
    task = process_zip_texts.AsyncResult(task_id)
    
    response = {
        'state': task.state,
        'status': 'Waiting...'
    }

    if task.state == 'PROGRESS':
        response.update(task.info)
    elif task.state == 'SUCCESS':
        response['status'] = 'Finished'
        response['result'] = task.info.get('result')
    elif task.state == 'FAILURE':
        response['status'] = 'Processing Failed'
        response['error'] = str(task.info)
        
    return jsonify(response)