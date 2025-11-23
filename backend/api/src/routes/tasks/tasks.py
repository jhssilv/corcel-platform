import os
import zipfile
from celery import Celery
from text_processor import TextProcessor
from dotenv import load_dotenv
from flask import jsonify

from api_schemas import ErrorResponse
from api_schemas import UploadResponse

load_dotenv()
redis_url = os.getenv("REDIS_URL")

celery = Celery(
    'tasks',
    broker=redis_url,
    backend=redis_url
)

celery.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone="America/Sao_Paulo"
)

@celery.task(bind=True)
def process_zip_texts(self, zip_path:str):
    if not os.path.exists(zip_path):
        error_response = ErrorResponse(error="Temp file not found.")
        return jsonify(error_response.model_dump()), 500
    
    processor = TextProcessor()
    results = {}
    
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            file_list = [f for f in zip_ref.namelist() 
                         if not f.startswith('__') and f.lower().endswith('.txt')]

            total_files = len(file_list)
            if total_files == 0:
                error_response = ErrorResponse(error="No valid .txt file found.")
                return jsonify(error_response.model_dump()), 500
    
            for index, filename in enumerate(file_list):
                self.update_state(state='PROGRESS',
                                  meta={
                                      'current':index,
                                      'total':total_files,
                                      'status': f'Processing: {filename}'
                                  })
                with zip_ref.open(filename) as f:
                    text_content = f.read().decode('utf-8', errors='replace')
    
                processed_data = processor.process_text(text=text_content)
                results[filename] = processed_data
    
        os.remove(zip_path)
    
        # TODO: send do database
    
        response = UploadResponse(message="Done!", total=total_files)
        return jsonify(response.model_dump()), 200
    
    
    except Exception as e:
        error_response = ErrorResponse(msg=e)
        return jsonify(error_response.model_dump()), 500