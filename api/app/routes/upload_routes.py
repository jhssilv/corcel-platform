import io
import os
import uuid
import zipfile
from docx import Document
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename

from app.tasks.celery_tasks import process_texts_background
from app.tasks.constants import TEMP_UPLOADS_FOLDER
from app.utils.decorators import admin_required
from app.extensions import limiter, db
from app.logging_config import get_logger
from app.tokenizer import Tokenizer
from app.database import models
from app.database.queries import add_text
from app.extensions import limiter
from app.logging_config import get_logger

from app.schemas import generic as generic_schemas


upload_bp = Blueprint('upload', __name__)
logger = get_logger('app.route.upload', source='route', blueprint='upload')

UPLOAD_FOLDER = TEMP_UPLOADS_FOLDER

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
        return jsonify(generic_schemas.ErrorResponse(error='File not found.').model_dump()), 400
    
    file = request.files['file']
    
    if file.filename == '' or not file.filename.endswith('.zip'):
        logger.warning(
            'Upload rejected due to invalid file extension',
            extra={'event': {'source': 'route', 'blueprint': 'upload', 'filename': file.filename}},
        )
        return jsonify(generic_schemas.ErrorResponse(error='Invalid file type.').model_dump()), 400
                
    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4()}_{filename}"
    save_path = os.path.join(UPLOAD_FOLDER, unique_name)
    file.save(save_path)

    try:
        with zipfile.ZipFile(save_path, 'r') as zip_ref:
            file_list = []
            for f in zip_ref.namelist():
                base_name = os.path.basename(f)
                if not base_name or base_name.startswith('__') or base_name.startswith('.'):
                    continue
                if base_name.lower().endswith('.txt') or base_name.lower().endswith('.docx'):
                    file_list.append(f)

            if len(file_list) == 0:
                return jsonify(generic_schemas.ErrorResponse(error='The zip file does not contain valid files.').model_dump()), 400
            
            if len(file_list) > 200:
                logger.warning('Upload rejected due to > 200 files batch limit')
                return jsonify(generic_schemas.ErrorResponse(error='Maximum of 200 files allowed per upload.').model_dump()), 400

            tokenizer = Tokenizer()
            text_ids = []

            for filename in file_list:
                base_name = os.path.basename(filename)
                
                with zip_ref.open(filename) as f_in:
                    if filename.lower().endswith('.docx'):
                        doc = Document(io.BytesIO(f_in.read()))
                        text_content = "\n".join([p.text for p in doc.paragraphs])
                    else:
                        text_content = f_in.read().decode('utf-8', errors='replace')
                
                tokenized_data = tokenizer.tokenize_only(text_content)
                text_obj = models.Text(source_file_name=base_name)

                tokens_with_candidates = []
                for position, token_data in tokenized_data.items():
                    token = models.Token(
                        token_text=token_data['text'],
                        is_word=token_data['is_word'],
                        position=int(position),
                        to_be_normalized=False,
                        whitespace_after=token_data.get('whitespace_after', '')
                    )
                    tokens_with_candidates.append((token, []))
                
                text_id = add_text(text_obj, tokens_with_candidates, db.session)
                text_ids.append(text_id)

        # Triggers phase 2 processing in background explicitly passing IDs
        process_texts_background.delay(text_ids)
        
    except zipfile.BadZipFile:
        return jsonify(generic_schemas.ErrorResponse(error='Invalid or corrupted ZIP file.').model_dump()), 400
    except Exception as e:
        logger.exception('Failed to parse and insert zip', extra={'event': {'error': str(e)}})
        return jsonify(generic_schemas.ErrorResponse(error='Failed to extract and process zip files.').model_dump()), 500
    finally:
        if os.path.exists(save_path):
            os.remove(save_path)
    
    return jsonify({'message': 'Texts uploaded and pending processing successfully', 'text_ids': text_ids}), 200

@upload_bp.route('/api/status/<task_id>', methods=['GET'])
@limiter.limit("120 per minute")
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
    task = process_texts_background.AsyncResult(task_id)
    
    response = {
        'state': task.state,
        'status': 'Waiting...'
    }

    if task.state == 'PROGRESS':
        response.update(task.info)
    elif task.state == 'SUCCESS':
        response['status'] = 'Finished'
        response['result'] = task.info.get('result')
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
        
    return jsonify(response)