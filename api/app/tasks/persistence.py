from ..database import models
from ..logging_config import get_logger
from .text_formatting import format_text_content


logger = get_logger('app.task.persistence', source='task', task_module='persistence')


def add_to_database(results: dict):
    from app.extensions import db

    db.session.remove() 

    logger.info('Starting batch insert', extra={'event': {'count': len(results)}})
    for file_name, data in results.items():
        logger.info('Preparing raw text payload', extra={'event': {'file_name': file_name}})

        # Format text content (only happens once during initial insert)
        formatted_text = format_text_content(data['text_content'])

        # Create RawText entry
        raw_text = models.RawText(
            source_file_name=file_name,
            text_content=formatted_text,
            image_path=data['image_path'],
        )
        db.session.add(raw_text)

    try:
        db.session.commit()
        logger.info('Committed raw texts batch', extra={'event': {'count': len(results)}})
    except Exception as e:
        db.session.rollback()
        logger.exception('Error committing raw texts batch', extra={'event': {'error': str(e)}})
        raise e
