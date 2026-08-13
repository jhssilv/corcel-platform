from ..database import models
from .text_formatting import format_text_content




def add_to_database(results: dict):
    from app.extensions import db

    db.session.remove() 

    for file_name, data in results.items():
        pass

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
    except Exception as e:
        db.session.rollback()
        raise e
