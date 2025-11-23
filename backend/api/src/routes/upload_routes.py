import os
import uuid
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from .tasks import tasks 
import api_schemas as schemas

upload_bp = Blueprint('upload', __name__)

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'temp_uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@upload_bp.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify(schemas.ErrorResponse(msg='File not found.').model_dump()), 400
    
    file = request.files['file']
    
    if file.filename == '' or not file.filename.endswith('.zip'):
        return jsonify(schemas.ErrorResponse(msg='Invalid file type.').model_dump()), 400
                
    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4()}_{filename}"
    save_path = os.path.join(UPLOAD_FOLDER, unique_name)
    
    file.save(save_path)
    
    task = tasks.delay(save_path)
    
    return jsonify({'task_id': task.id}), 202

@upload_bp.route('/api/status/<task_id>', methods=['GET'])
def task_status(task_id):
    task = tasks.AsyncResult(task_id)
    
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