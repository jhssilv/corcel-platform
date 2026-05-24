import uuid
import base64
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename

from app.database import models
from app.tasks.celery_tasks import process_text_upload_zip
from app.tasks.constants import TEXT_UPLOAD_MAX_ARCHIVE_SIZE
from app.utils.decorators import admin_required, login_required
from app.extensions import celery, db, limiter
from app.logging_config import get_logger
from app.text_upload_batches import list_resumable_text_upload_batches, serialize_text_upload_batch, sync_text_upload_batch_state
from app.utils.api_errors import (
    INTERNAL_SERVER_ERROR,
    INVALID_REQUEST,
    RESOURCE_NOT_FOUND,
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
    zip_payload = file.read()

    if len(zip_payload) > TEXT_UPLOAD_MAX_ARCHIVE_SIZE:
        return error_response(
            error='Uploaded ZIP exceeds the maximum supported size.',
            code=INVALID_REQUEST,
            status_code=400,
        )

    batch = models.TextUploadBatch(
        created_by_user_id=current_user.id,
        source_file_name=unique_name,
        status=models.TextUploadBatchStatus.IMPORTING,
    )
    db.session.add(batch)
    db.session.commit()

    zip_payload_b64 = base64.b64encode(zip_payload).decode('ascii')

    try:
        task = process_text_upload_zip.delay(
            batch_id=batch.id,
            zip_payload_b64=zip_payload_b64,
            original_filename=unique_name,
        )
        batch.celery_import_task_id = task.id
        db.session.commit()
    except Exception as e:
        logger.exception('Failed to enqueue text upload task', extra={'event': {'error': str(e)}})
        batch.status = models.TextUploadBatchStatus.FAILED
        batch.last_error = 'Failed to enqueue text upload task.'
        db.session.commit()
        return error_response(error='Internal server error', code=INTERNAL_SERVER_ERROR, status_code=500)

    response = upload_schemas.UploadResponse(task_id=task.id, batch_id=batch.id)
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


@upload_bp.route('/api/text-upload-batches/<int:batch_id>', methods=['GET'])
@limiter.limit("120 per minute")
@admin_required()
def get_text_upload_batch(current_user, batch_id: int):
    batch = (
        db.session.query(models.TextUploadBatch)
        .filter_by(id=batch_id, created_by_user_id=current_user.id)
        .first()
    )
    if batch is None:
        return error_response(error='Batch not found', code=RESOURCE_NOT_FOUND, status_code=404)

    batch = sync_text_upload_batch_state(db.session, batch.id)
    response = upload_schemas.TextUploadBatchDetail(**serialize_text_upload_batch(batch, include_texts=True))
    return jsonify(response.model_dump(mode='json')), 200


@upload_bp.route('/api/text-upload-batches/active', methods=['GET'])
@limiter.limit("120 per minute")
@admin_required()
def get_active_text_upload_batches(current_user):
    batches = list_resumable_text_upload_batches(db.session, current_user.id)
    serialized_batches = []

    for batch in batches:
        synced_batch = sync_text_upload_batch_state(db.session, batch.id)
        serialized_batches.append(serialize_text_upload_batch(synced_batch, include_texts=False))

    response = upload_schemas.ActiveTextUploadBatchesResponse(
        batches=[upload_schemas.TextUploadBatchSummary(**item) for item in serialized_batches]
    )
    return jsonify(response.model_dump(mode='json')), 200
