import io
import os
import zipfile

from docx import Document

from ..database import models
from ..database.queries import add_text
from ..text_processor import TextProcessor


def run_zip_texts_pipeline(task, zip_path):
    from app.extensions import db

    if not os.path.exists(zip_path):
        raise FileNotFoundError('Temp file not found in server.')

    processor = TextProcessor()
    results = {}

    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # filters .txt and .docx files
            file_list = []
            for f in zip_ref.namelist():
                # skip meta-files and hidden files
                if f.startswith('__') or f.startswith('.') or '/.' in f:
                    continue

                if f.lower().endswith('.txt') or f.lower().endswith('.docx'):
                    file_list.append(f)

            total_files = len(file_list)

            if total_files == 0:
                raise ValueError('The zip file does not contain valid files.')

            for index, filename in enumerate(file_list):
                # Extract just the filename without directory prefix
                base_name = os.path.basename(filename)

                task.update_state(
                    state='PROGRESS',
                    meta={
                        'current': index + 1,
                        'total': total_files,
                        'status': f'Processando: {base_name} ({index + 1}/{total_files})',
                    },
                )

                with zip_ref.open(filename) as f:
                    if filename.lower().endswith('.docx'):
                        doc = Document(io.BytesIO(f.read()))
                        text_content = "\n".join([p.text for p in doc.paragraphs])
                    else:
                        text_content = f.read().decode('utf-8', errors='replace')

                # Process text to get tokens with suggestions
                processed_data = processor.process_text(text_content)

                # Create Text object with just the filename (no directory prefix)
                text_obj = models.Text(source_file_name=base_name)

                # Build tokens_with_candidates for add_text
                tokens_with_candidates = []
                for position, token_data in processed_data.items():
                    token = models.Token(
                        token_text=token_data['text'],
                        is_word=token_data['is_word'],
                        position=int(position),
                        to_be_normalized=token_data['to_be_normalized'],
                        whitespace_after=token_data['whitespace_after']
                        if token_data['whitespace_after']
                        else '',
                    )
                    candidates = token_data.get('suggestions', [])
                    tokens_with_candidates.append((token, candidates))

                # Insert into texts, tokens, suggestions tables
                db.session.remove()  # Ensure clean session for worker
                text_id = add_text(text_obj, tokens_with_candidates, db.session)

                results[base_name] = {
                    'text_id': text_id,
                    'token_count': len(tokens_with_candidates),
                }
                print(f"Processed: {base_name} -> text_id={text_id}")

        return {
            'status': 'Concluido',
            'total': total_files,
            'result': results,
            'failed_files': [],
        }

    except Exception as e:
        raise RuntimeError(f'Server Internal Error: {str(e)}') from e
    finally:
        if os.path.exists(zip_path):
            os.remove(zip_path)
