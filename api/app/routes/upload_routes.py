import uuid
import base64
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename

from app.tasks.celery_tasks import process_text_upload_zip
from app.utils.decorators import admin_required, login_required
from app.extensions import celery, limiter
from app.logging_config import get_logger
from app.utils.api_errors import (
    INTERNAL_SERVER_ERROR,
    INVALID_REQUEST,
    error_response,
)

from app.schemas import upload as upload_schemas


upload_bp = Blueprint('upload', __name__)
logger = get_logger('app.route.upload', source='route', blueprint='upload')

@upload_bp.route('/api/upload', methods=['POST'])
@limiter.limit("10 per minute; 50 per hour")
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
        logger.warning(
            'Upload request missing file',
            extra={'event': {'source': 'route', 'blueprint': 'upload'}},
        )
        return error_response(error='File not found.', code=INVALID_REQUEST, status_code=400)
    
    file = request.files['file']
    
    if file.filename == '' or not file.filename.endswith('.zip'):
        logger.warning(
            'Upload rejected due to invalid file extension',
            extra={'event': {'source': 'route', 'blueprint': 'upload', 'filename': file.filename}},
        )
        return error_response(error='Invalid file type.', code=INVALID_REQUEST, status_code=400)
                
    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4()}_{filename}"
    zip_payload_b64 = base64.b64encode(file.read()).decode('ascii')

    try:
        task = process_text_upload_zip.delay(
            zip_payload_b64=zip_payload_b64,
            original_filename=unique_name,
        )
    except Exception as e:
        logger.exception('Failed to enqueue text upload task', extra={'event': {'error': str(e)}})
        return error_response(error='Internal server error', code=INTERNAL_SERVER_ERROR, status_code=500)

    response = upload_schemas.UploadResponse(task_id=task.id)
    return jsonify(response.model_dump()), 202

@upload_bp.route('/api/status/<task_id>', methods=['GET'])
@limiter.limit("120 per minute")
@login_required()
def task_status(current_user, task_id):
    """Gets the status of a background upload task.

    Args:
        task_id (str): The ID of the task.

    Returns: JSON response with the task status and any relevant information:
        state: Current state of the task (e.g., PENDING, PROGRESS, SUCCESS, FAILURE).
        status: A human-readable status message.
        result: (if SUCCESS) Result data from the task.
        error: (if FAILURE) Error message from the task.
    """
    task = celery.AsyncResult(task_id)
    
    response = {
        'state': task.state,
        'status': 'Waiting...'
    }

    if task.state == 'PROGRESS' and isinstance(task.info, dict):
        response.update(task.info)
    elif task.state == 'SUCCESS' and isinstance(task.info, dict):
        response['status'] = 'Finished'
        response['result'] = task.info.get('result')
        response['current'] = task.info.get('current')
        response['total'] = task.info.get('total')
        response['failed_files'] = task.info.get('failed_files', [])
    elif task.state == 'FAILURE':
        response['status'] = 'Processing Failed'
        response['error'] = str(task.info)
        logger.error(
            'Upload task failed',
            extra={
                'event': {
                    'source': 'route',
                    'blueprint': 'upload',
                    'celery_task_id': task_id,
                    'error': str(task.info),
                }
            },
        )
        
    response_schema = upload_schemas.TaskStatusResponse(**response)
    return jsonify(response_schema.model_dump()), 200
