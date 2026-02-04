import io
import uuid
import shutil
import zipfile
from PIL import Image
import os
from docx import Document

from .extensions import celery 
from .text_processor import TextProcessor
from .tokenizer import Tokenizer
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
    if not os.path.exists(zip_path):
        return {'error': 'Temp file not found in server.'}

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
                    if filename.lower().endswith('.docx'):
                        doc = Document(io.BytesIO(f.read()))
                        text_content = "\n".join([p.text for p in doc.paragraphs])
                    else:
                        text_content = f.read().decode('utf-8', errors='replace')
                
                processed_data = processor.process_text(text_content)
                # Old structure compatibility: direct dict of tokens
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

@celery.task(bind=True)
def process_ocr_zip(self, zip_path):
    """
    Process a ZIP file containing images with OCR.
    """
    MAX_UNCOMPRESSED_SIZE = 500 * 1024 * 1024  # 500 MB limit for uncompressed content
    MAX_IMAGE_PIXELS = 89478485  # ~300 megapixels (PIL default is 89478485)
    MAX_IMAGE_DIMENSION = 20000  # Maximum width or height in pixels
    
    print(f"Starting OCR processing for zip: {zip_path}")
    if not os.path.exists(zip_path):
        print(f"Error: Zip file not found at {zip_path}")
        return {'error': 'Temp file not found in server.'}

    # Ensure images directory exists (in case it was deleted or worker runs in different context)
    os.makedirs(IMAGES_FOLDER, exist_ok=True)

    processor = Tokenizer() # Using lightweight Tokenizer
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
                os.remove(zip_path)
                return {'error': f'Uncompressed size too large ({total_size // (1024*1024)}MB). Maximum is {MAX_UNCOMPRESSED_SIZE // (1024*1024)}MB.'}
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            file_list = [
                f for f in zip_ref.namelist() 
                if not f.startswith('__') and f.lower().endswith(valid_extensions)
            ]
            
            total_files = len(file_list)
            print(f"Found {total_files} images in zip.")
            
            if total_files == 0:
                os.remove(zip_path)
                return {'error': 'The zip file does not contain valid images.'}

            for index, filename in enumerate(file_list):
                # Path traversal protection: ensure filename doesn't escape directory
                base_name = os.path.basename(filename)
                if '..' in filename or filename != base_name:
                    print(f"Skipping potentially malicious filename: {filename}")
                    results[filename] = {'error': 'Invalid filename (path traversal detected)'}
                    continue
                
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
                    print(f"Invalid image file (magic bytes check failed): {base_name}")
                    results[base_name] = {'error': 'Invalid image file format'}
                    continue
                
                # 2. Convert/Optimize Image (e.g. to JPG)
                try:
                    # Set PIL protection limits
                    Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS
                    
                    image = Image.open(io.BytesIO(image_bytes))
                    
                    # Check image dimensions before processing
                    width, height = image.size
                    if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
                        print(f"Image too large: {width}x{height}")
                        results[base_name] = {'error': f'Image dimensions too large ({width}x{height})'}
                        continue
                    
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

                except Exception as img_err:
                    print(f"Error processing image {base_name}: {img_err}")
                    # Log error but continue?
                    results[base_name] = {
                        'error': str(img_err)
                    }

        os.remove(zip_path)
        
        # Filter out errors before adding to DB
        valid_results = {k: v for k, v in results.items() if 'error' not in v}
        print(f"Adding {len(valid_results)} texts to database...")
        add_to_database(valid_results)
        print("Database update complete.")
        
        return {
            'status': 'Concluido', 
            'total': total_files, 
            'result': results # Contains errors if any
        }

    except Exception as e:
        print(f"Fatal error in process_ocr_zip: {e}")
        if os.path.exists(zip_path):
            os.remove(zip_path)
        return {'error': f'OCR Processing Error: {str(e)}'}
