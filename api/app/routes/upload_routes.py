import os
import uuid

from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

from app.background_jobs import create_background_job, get_background_job, serialize_background_job_status
from app.database import models
from app.extensions import db, limiter
from app.schemas import upload as upload_schemas
from app.tasks.constants import TEMP_UPLOADS_FOLDER, TEXT_UPLOAD_MAX_ARCHIVE_SIZE
from app.text_upload_batches import (
    list_resumable_text_upload_batches,
    serialize_text_upload_batch,
    sync_text_upload_batch_state,
)
from app.utils.api_errors import (
    INTERNAL_SERVER_ERROR,
    INVALID_REQUEST,
    RESOURCE_NOT_FOUND,
    error_response,
)
from app.utils.decorators import admin_required, login_required


upload_bp = Blueprint('upload', __name__)


@upload_bp.route('/api/upload', methods=['POST'])
@limiter.limit("10 per minute; 50 per hour")
@admin_required()
def upload_file(current_user):
    """Upload a ZIP file and create a durable background job."""
    if 'file' not in request.files:
        return error_response(error='File not found.', code=INVALID_REQUEST, status_code=400)

    file = request.files['file']

    if file.filename == '' or not file.filename.endswith('.zip'):
        return error_response(error='Invalid file type.', code=INVALID_REQUEST, status_code=400)

    file.seek(0, os.SEEK_END)
    archive_size = file.tell()
    file.seek(0)

    if archive_size > TEXT_UPLOAD_MAX_ARCHIVE_SIZE:
        return error_response(
            error='Uploaded ZIP exceeds the maximum supported size.',
            code=INVALID_REQUEST,
            status_code=400,
        )

    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4()}_{filename}"
    save_path = os.path.join(TEMP_UPLOADS_FOLDER, unique_name)
    file.save(save_path)

    batch = models.TextUploadBatch(
        created_by_user_id=current_user.id,
        source_file_name=unique_name,
        status=models.TextUploadBatchStatus.IMPORTING,
    )
    db.session.add(batch)
    db.session.commit()

    try:
        job = create_background_job(
            db.session,
            kind=models.BackgroundJobKind.TEXT_UPLOAD_IMPORT,
            created_by_user_id=current_user.id,
            payload_json={
                'batch_id': batch.id,
                'zip_path': save_path,
                'original_filename': unique_name,
            },
            status_message='Waiting...',
        )
    except Exception as exc:
        batch.status = models.TextUploadBatchStatus.FAILED
        batch.last_error = 'Failed to create text upload job.'
        db.session.commit()
        if os.path.exists(save_path):
            os.remove(save_path)
        return error_response(error='Internal server error', code=INTERNAL_SERVER_ERROR, status_code=500)

    response = upload_schemas.UploadResponse(job_id=job.id, batch_id=batch.id)
    return jsonify(response.model_dump()), 202


@upload_bp.route('/api/status/<job_id>', methods=['GET'])
@limiter.limit("120 per minute")
@login_required()
def job_status(current_user, job_id):
    """Get the status of a background job."""
    background_job = get_background_job(db.session, job_id)

    if background_job is None:
        return error_response(error='Job not found', code=RESOURCE_NOT_FOUND, status_code=404)

    if not current_user.is_admin and background_job.created_by_user_id != current_user.id:
        return error_response(error='Job not found', code=RESOURCE_NOT_FOUND, status_code=404)

    response_schema = upload_schemas.JobStatusResponse(**serialize_background_job_status(background_job))
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
