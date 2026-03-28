from ..database import models
from .text_formatting import format_text_content


def add_to_database(results: dict):
    from app.extensions import db

    db.session.remove() 

    print(f"DEBUG: Starting batch insert for {len(results)} files")
    for file_name, data in results.items():
        print(f"DEBUG: Preparing data for {file_name}")

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
        print(f"DEBUG: Successfully committed {len(results)} raw texts to database")
    except Exception as e:
        db.session.rollback()
        print(f"ERROR during commit: {e}")
        raise e
