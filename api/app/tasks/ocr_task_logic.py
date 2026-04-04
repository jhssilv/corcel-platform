import io
import os
import uuid
import zipfile

from PIL import Image

from ..services import ocr_service
from ..logging_config import get_logger
from .constants import (
    IMAGE_MAGIC_BYTES,
    IMAGES_FOLDER,
    OCR_MAX_IMAGE_DIMENSION,
    OCR_MAX_IMAGE_PIXELS,
    OCR_MAX_UNCOMPRESSED_SIZE,
    VALID_IMAGE_EXTENSIONS,
)
from .persistence import add_to_database


logger = get_logger('app.task.ocr_task_logic', source='task', task_module='ocr_task_logic')


def run_ocr_zip_pipeline(task, zip_path):
    """
    Process a ZIP file containing images with OCR.
    """
    logger.info('Starting OCR zip pipeline', extra={'event': {'zip_path': zip_path}})
    if not os.path.exists(zip_path):
        logger.error('OCR zip file not found', extra={'event': {'zip_path': zip_path}})
        raise FileNotFoundError('Temp file not found in server.')

    # Ensure images directory exists (in case it was deleted or worker runs in different context)
    os.makedirs(IMAGES_FOLDER, exist_ok=True)

    results = {}

    try:
        # Check uncompressed size to prevent zip bombs
        with zipfile.ZipFile(zip_path, 'r') as zip_check:
            total_size = sum(info.file_size for info in zip_check.infolist())
            if total_size > OCR_MAX_UNCOMPRESSED_SIZE:
                raise ValueError(
                    f'Uncompressed size too large ({total_size // (1024 * 1024)}MB). '
                    f'Maximum is {OCR_MAX_UNCOMPRESSED_SIZE // (1024 * 1024)}MB.'
                )

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            file_list = [
                f
                for f in zip_ref.namelist()
                if not f.startswith('__') and f.lower().endswith(VALID_IMAGE_EXTENSIONS)
            ]

            total_files = len(file_list)
            logger.info('Found images in OCR zip', extra={'event': {'total_files': total_files}})

            if total_files == 0:
                raise ValueError('The zip file does not contain valid images.')

            for index, filename in enumerate(file_list):
                # Path traversal protection: ensure filename doesn't escape directory
                base_name = os.path.basename(filename)
                # Only block actual path traversal attempts (../) not subdirectories
                if '..' in filename:
                    raise ValueError(f'Invalid filename (path traversal detected): {filename}')

                logger.info(
                    'Image processing started',
                    extra={
                        'event': {
                            'status': 'started',
                            'index': index + 1,
                            'total_files': total_files,
                            'file_name': base_name,
                        }
                    },
                )
                task.update_state(
                    state='PROGRESS',
                    meta={
                        'current': index + 1,
                        'total': total_files,
                        'status': f'Processando OCR: {base_name} ({index + 1}/{total_files})',
                    },
                )

                try:
                    # 1. Read image from ZIP
                    with zip_ref.open(filename) as file:
                        image_bytes = file.read()

                    # Validate magic bytes to ensure it's actually an image
                    is_valid_image = False
                    for magic in IMAGE_MAGIC_BYTES:
                        if image_bytes.startswith(magic):
                            is_valid_image = True
                            break

                    if not is_valid_image:
                        raise ValueError(
                            f'Invalid image file format (magic bytes check failed): {base_name}'
                        )

                    # 2. Convert/Optimize Image (e.g. to JPG)
                    # Set PIL protection limits
                    Image.MAX_IMAGE_PIXELS = OCR_MAX_IMAGE_PIXELS

                    image = Image.open(io.BytesIO(image_bytes))

                    # Check image dimensions before processing
                    width, height = image.size
                    if width > OCR_MAX_IMAGE_DIMENSION or height > OCR_MAX_IMAGE_DIMENSION:
                        raise ValueError(
                            f'Image dimensions too large ({width}x{height}) for {base_name}'
                        )

                    # Ensure RGB
                    if image.mode != 'RGB':
                        image = image.convert('RGB')

                    # Save to permanent storage
                    # structure: images/<uuid>_<filename>.jpg
                    clean_name = os.path.splitext(base_name)[0] + '.jpg'
                    storage_filename = f"{uuid.uuid4()}_{clean_name}"
                    storage_path = os.path.join(IMAGES_FOLDER, storage_filename)

                    image.save(storage_path, format='JPEG', quality=85)
                    logger.info('Image saved for OCR', extra={'event': {'storage_path': storage_path}})

                    # 3. Perform OCR
                    # Use the saved file path or the bytes. Service accepts path.
                    logger.info('Calling OCR service', extra={'event': {'file_name': base_name}})
                    extracted_text = ocr_service.perform_ocr(storage_path)

                    # 4. Store raw text without tokenization
                    # Use only the base filename (last part after / or \\\)
                    results[base_name] = {
                        'text_content': extracted_text,
                        'image_path': storage_filename,
                    }
                    logger.info(
                        'Image processing finished',
                        extra={
                            'event': {
                                'status': 'success',
                                'file_name': base_name,
                                'extracted_chars': len(extracted_text),
                            }
                        },
                    )
                except Exception as e:
                    logger.exception(
                        'Image processing finished with error',
                        extra={
                            'event': {
                                'status': 'error',
                                'file_name': base_name,
                                'error': str(e),
                            }
                        },
                    )
                    raise

            logger.info('Persisting OCR results to database', extra={'event': {'count': len(results)}})
            add_to_database(results)
            logger.info('OCR zip pipeline finished', extra={'event': {'status': 'success', 'count': len(results)}})

        return {
            'status': 'Concluido',
            'total': total_files,
            'result': results,
            'failed_files': [],
        }

    except Exception as e:
        logger.exception(
            'OCR zip pipeline finished with error',
            extra={'event': {'status': 'error', 'error': str(e)}},
        )
        raise RuntimeError(f'OCR Processing Error: {str(e)}') from e
    finally:
        if os.path.exists(zip_path):
            os.remove(zip_path)
