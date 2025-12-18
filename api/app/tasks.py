import os
import zipfile

from .extensions import celery 
from .text_processor import TextProcessor
from .database.queries import add_text
from .database import models as models

def add_to_database(results: dict):
    for file_name, data in results.items():
        text = models.Text(source_file_name=file_name)
        tokens_with_suggestions = []

        for t in data.values():
            new_token = models.Token(
                token_text = t["text"],
                is_word = t["is_word"],
                position = t["idx"],
                to_be_normalized = t["to_be_normalized"],
                whitespace_after = t["whitespace_after"]
            )
            tokens_with_suggestions.append((new_token, t.get("suggestions", [])))

        add_text(text, tokens_with_suggestions)



@celery.task(bind=True)
def process_zip_texts(self, zip_path):
    if not os.path.exists(zip_path):
        return {'error': 'Temp file not found in server.'}

    processor = TextProcessor()
    db_session = get_db_session()
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
                return {'error': 'The zip file does not contain valid files.'}

            for index, filename in enumerate(file_list):
                self.update_state(state='PROGRESS',
                                  meta={
                                      'current': index + 1, 
                                      'total': total_files, 
                                      'status': f'Processando: {filename} ({index + 1}/{total_files})'
                                  })

                with zip_ref.open(filename) as f:
                    text_content = f.read().decode('utf-8', errors='replace')
                
                processed_data = processor.process_text(text_content)
                results[filename] = processed_data
                print("Processed: ", filename)

        os.remove(zip_path)
        
        add_to_database(results)
        
        return {
            'status': 'Concluido', 
            'total': total_files, 
            'result': results
        }

    except Exception as e:
        if os.path.exists(zip_path):
            os.remove(zip_path)

        return {'error': f'Server Internal Error: {str(e)}'}