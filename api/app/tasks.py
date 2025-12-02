import os
import zipfile
from flask import jsonify

from .extensions import celery 
from .text_processor import TextProcessor
from app.api_schemas import ErrorResponse

@celery.task(bind=True)
def process_zip_texts(self, zip_path):
    if not os.path.exists(zip_path):
        response = ErrorResponse(error='Temp file not found in server.')
        return jsonify(response.model_dump()), 500

    processor = TextProcessor()
    results = {}

    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # filters .txt files
            file_list = [
                f for f in zip_ref.namelist() 
                if not f.startswith('__') and f.lower().endswith('.txt')
            ]
            
            total_files = len(file_list)
            
            if total_files == 0:
                os.remove(zip_path)
                response = ErrorResponse(error='The zip file does not contain valid files.')
                return jsonify(response.model_dump()), 500

            for index, filename in enumerate(file_list):
                self.update_state(state='PROGRESS',
                                  meta={
                                      'current': index + 1, 
                                      'total': total_files, 
                                      'status': f'Processando: {filename}'
                                  })

                with zip_ref.open(filename) as f:
                    text_content = f.read().decode('utf-8', errors='replace')
                
                processed_data = processor.process_text(text_content)
                results[filename] = processed_data

        os.remove(zip_path)
        
        # TODO: Include db operations
        
        return {
            'status': 'Concluido', 
            'total': total_files, 
            'result': results
        }

    except Exception as e:
        if os.path.exists(zip_path):
            os.remove(zip_path)

        response = ErrorResponse(error='Server Internal Error.')
        return jsonify(response.model_dump()), 500