import io
import uuid
import shutil
import zipfile
from PIL import Image
import os
from docx import Document

from .extensions import celery 
from .text_processor import TextProcessor
from .database.queries import add_text
from .database import models as models
from .services import ocr_service

# Ensure images directory exists
IMAGES_FOLDER = os.path.join(os.getcwd(), 'images')
os.makedirs(IMAGES_FOLDER, exist_ok=True)

def format_text_content(text):
    """
    Format text by:
    - Removing single line breaks
    - Converting double line breaks to line break + tab
    This is applied only once during initial text insertion.
    """
    if not text:
        return text
    
    # Replace double line breaks with a placeholder
    double_lb_placeholder = '___DOUBLE_LB___'
    formatted = text.replace('\n\n', double_lb_placeholder)
    
    # Remove all single line breaks
    formatted = formatted.replace('\n', ' ')
    
    # Replace placeholder with line break + tab
    formatted = formatted.replace(double_lb_placeholder, '\n\t')
    
    return formatted

def add_to_database(results: dict):
    from app.extensions import db # explicit import to manage session
    db.session.remove() # Ensure clean session
    
    print(f"DEBUG: Starting batch insert for {len(results)} files")
    for file_name, data in results.items():
        print(f"DEBUG: Preparing data for {file_name}")
        
        # Format text content (only happens once during initial insert)
        formatted_text = format_text_content(data['text_content'])
        
        # Create RawText entry
        raw_text = models.RawText(
            source_file_name=file_name,
            text_content=formatted_text,
            image_path=data['image_path']
        )
        db.session.add(raw_text)
    
    try:
        db.session.commit()
        print(f"DEBUG: Successfully committed {len(results)} raw texts to database")
    except Exception as e:
        db.session.rollback()
        print(f"ERROR during commit: {e}")
        raise e



@celery.task(bind=True)
def process_zip_texts(self, zip_path):
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
                
                self.update_state(state='PROGRESS',
                                  meta={
                                      'current': index + 1, 
                                      'total': total_files, 
                                      'status': f'Processando: {base_name} ({index + 1}/{total_files})'
                                  })

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
                        whitespace_after=token_data['whitespace_after'] if token_data['whitespace_after'] else '',
                    )
                    candidates = token_data.get('suggestions', [])
                    tokens_with_candidates.append((token, candidates))
                
                # Insert into texts, tokens, suggestions tables
                db.session.remove()  # Ensure clean session for worker
                text_id = add_text(text_obj, tokens_with_candidates, db.session)
                
                results[base_name] = {
                    'text_id': text_id,
                    'token_count': len(tokens_with_candidates)
                }
                print(f"Processed: {base_name} -> text_id={text_id}")

        return {
            'status': 'Concluido', 
            'total': total_files, 
            'result': results,
            'failed_files': []
        }

    except Exception as e:
        raise RuntimeError(f'Server Internal Error: {str(e)}') from e
    finally:
        if os.path.exists(zip_path):
            os.remove(zip_path)

@celery.task(bind=True)
def process_ocr_zip(self, zip_path):
    """
    Process a ZIP file containing images with OCR.
    """
    MAX_UNCOMPRESSED_SIZE = 1000 * 1024 * 1024  # 1000 MB limit for uncompressed content
    MAX_IMAGE_PIXELS = 89478485  # ~300 megapixels (PIL default is 89478485)
    MAX_IMAGE_DIMENSION = 20000  # Maximum width or height in pixels
    
    print(f"Starting OCR processing for zip: {zip_path}")
    if not os.path.exists(zip_path):
        print(f"Error: Zip file not found at {zip_path}")
        raise FileNotFoundError('Temp file not found in server.')

    # Ensure images directory exists (in case it was deleted or worker runs in different context)
    os.makedirs(IMAGES_FOLDER, exist_ok=True)

    results = {}
    
    valid_extensions = ('.png', '.jpg', '.jpeg', '.tif', '.tiff')
    # Magic bytes for image validation
    image_magic_bytes = {
        b'\xff\xd8\xff': 'jpg',
        b'\x89PNG\r\n\x1a\n': 'png',
        b'II*\x00': 'tiff',  # Little-endian TIFF
        b'MM\x00*': 'tiff',  # Big-endian TIFF
    }

    try:
        # Check uncompressed size to prevent zip bombs
        with zipfile.ZipFile(zip_path, 'r') as zip_check:
            total_size = sum(info.file_size for info in zip_check.infolist())
            if total_size > MAX_UNCOMPRESSED_SIZE:
                raise ValueError(
                    f'Uncompressed size too large ({total_size // (1024*1024)}MB). '
                    f'Maximum is {MAX_UNCOMPRESSED_SIZE // (1024*1024)}MB.'
                )
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            file_list = [
                f for f in zip_ref.namelist() 
                if not f.startswith('__') and f.lower().endswith(valid_extensions)
            ]
            
            total_files = len(file_list)
            print(f"Found {total_files} images in zip.")
            
            if total_files == 0:
                raise ValueError('The zip file does not contain valid images.')

            for index, filename in enumerate(file_list):
                # Path traversal protection: ensure filename doesn't escape directory
                base_name = os.path.basename(filename)
                # Only block actual path traversal attempts (../) not subdirectories
                if '..' in filename:
                    raise ValueError(f'Invalid filename (path traversal detected): {filename}')
                
                print(f"Processing file {index+1}/{total_files}: {base_name}")
                self.update_state(state='PROGRESS',
                                  meta={
                                      'current': index + 1, 
                                      'total': total_files, 
                                      'status': f'Processando OCR: {base_name} ({index + 1}/{total_files})'
                                  })

                # 1. Read image from ZIP
                with zip_ref.open(filename) as file:
                    image_bytes = file.read()
                
                # Validate magic bytes to ensure it's actually an image
                is_valid_image = False
                for magic, img_type in image_magic_bytes.items():
                    if image_bytes.startswith(magic):
                        is_valid_image = True
                        break
                
                if not is_valid_image:
                    raise ValueError(f'Invalid image file format (magic bytes check failed): {base_name}')
                
                # 2. Convert/Optimize Image (e.g. to JPG)
                # Set PIL protection limits
                Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS
                
                image = Image.open(io.BytesIO(image_bytes))
                
                # Check image dimensions before processing
                width, height = image.size
                if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
                    raise ValueError(f'Image dimensions too large ({width}x{height}) for {base_name}')
                
                # Ensure RGB
                if image.mode != 'RGB':
                    image = image.convert('RGB')
                
                # Save to permanent storage
                # structure: images/<uuid>_<filename>.jpg
                clean_name = os.path.splitext(base_name)[0] + ".jpg"
                storage_filename = f"{uuid.uuid4()}_{clean_name}"
                storage_path = os.path.join(IMAGES_FOLDER, storage_filename)
                
                image.save(storage_path, format="JPEG", quality=85)
                print(f"Image saved to {storage_path}")
                
                # 3. Perform OCR
                # Use the saved file path or the bytes. Service accepts path.
                print(f"Calling OCR Service for {base_name}...")
                extracted_text = ocr_service.perform_ocr(storage_path)
                print(f"OCR Success for {base_name}. Extracted {len(extracted_text)} chars.")
                
                # 4. Store raw text without tokenization
                # Use only the base filename (last part after / or \)
                results[base_name] = {
                    'text_content': extracted_text,
                    'image_path': storage_filename
                }
                print("Processed OCR: ", base_name)

        print(f"Adding {len(results)} texts to database...")
        add_to_database(results)
        print("Database update complete.")
        
        return {
            'status': 'Concluido', 
            'total': total_files, 
            'result': results,
            'failed_files': []
        }

    except Exception as e:
        print(f"Fatal error in process_ocr_zip: {e}")
        raise RuntimeError(f'OCR Processing Error: {str(e)}') from e
    finally:
        if os.path.exists(zip_path):
            os.remove(zip_path)
