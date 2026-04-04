import io
import os
import zipfile

from docx import Document

from ..database import models
from ..database.queries import add_text
from ..logging_config import get_logger
from ..text_processor import TextProcessor


logger = get_logger('app.task.text_task_logic', source='task', task_module='text_task_logic')


def run_zip_texts_pipeline(task, zip_path):
    from app.extensions import db

    if not os.path.exists(zip_path):
        logger.error('Text zip file not found', extra={'event': {'zip_path': zip_path}})
        raise FileNotFoundError('Temp file not found in server.')

    processor = TextProcessor()
    results = {}

    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # filters .txt and .docx files
            file_list = []
            for f in zip_ref.namelist():
                base_name = os.path.basename(f)
                
                # skip directories, meta-files, and hidden files
                if not base_name or base_name.startswith('__') or base_name.startswith('.'):
                    continue

                if base_name.lower().endswith('.txt') or base_name.lower().endswith('.docx'):
                    file_list.append(f)

            total_files = len(file_list)

            if total_files == 0:
                raise ValueError('The zip file does not contain valid files.')

            for index, filename in enumerate(file_list):
                # Extract just the filename without directory prefix
                base_name = os.path.basename(filename)
                logger.info(
                    'Text file processing started',
                    extra={
                        'event': {
                            'status': 'started',
                            'file_name': base_name,
                            'index': index + 1,
                            'total_files': total_files,
                        }
                    },
                )

                task.update_state(
                    state='PROGRESS',
                    meta={
                        'current': index + 1,
                        'total': total_files,
                        'status': f'Processando: {base_name} ({index + 1}/{total_files})',
                    },
                )

                try:
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
                    logger.info(
                        'Text file processing finished',
                        extra={
                            'event': {
                                'status': 'success',
                                'file_name': base_name,
                                'text_id': text_id,
                                'token_count': len(tokens_with_candidates),
                            }
                        },
                    )
                except Exception as e:
                    logger.exception(
                        'Text file processing finished with error',
                        extra={
                            'event': {
                                'status': 'error',
                                'file_name': base_name,
                                'error': str(e),
                            }
                        },
                    )
                    raise

        return {
            'status': 'Concluido',
            'total': total_files,
            'result': results,
            'failed_files': [],
        }

    except Exception as e:
        logger.exception('Fatal error in text zip pipeline', extra={'event': {'zip_path': zip_path, 'error': str(e)}})
        raise RuntimeError(f'Server Internal Error: {str(e)}') from e
    finally:
        if os.path.exists(zip_path):
            os.remove(zip_path)
