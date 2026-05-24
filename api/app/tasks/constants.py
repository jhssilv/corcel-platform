import os


TEMP_UPLOADS_FOLDER = os.path.join(os.getcwd(), 'temp_uploads')
IMAGES_FOLDER = os.path.join(os.getcwd(), 'images')

# Text upload safety limits
TEXT_UPLOAD_MAX_ARCHIVE_SIZE = 100 * 1024 * 1024  # 100 MB
TEXT_UPLOAD_MAX_UNCOMPRESSED_SIZE = 250 * 1024 * 1024  # 250 MB
TEXT_UPLOAD_MAX_MEMBER_SIZE = 50 * 1024 * 1024  # 50 MB per text file

# OCR processing safety limits
OCR_MAX_UNCOMPRESSED_SIZE = 1000 * 1024 * 1024  # 1000 MB
OCR_MAX_IMAGE_PIXELS = 89478485  # ~300 megapixels (PIL default)
OCR_MAX_IMAGE_DIMENSION = 20000

VALID_IMAGE_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.tif', '.tiff')
IMAGE_MAGIC_BYTES = {
    b'\xff\xd8\xff': 'jpg',
    b'\x89PNG\r\n\x1a\n': 'png',
    b'II*\x00': 'tiff',  # Little-endian TIFF
    b'MM\x00*': 'tiff',  # Big-endian TIFF
}


os.makedirs(TEMP_UPLOADS_FOLDER, exist_ok=True)
os.makedirs(IMAGES_FOLDER, exist_ok=True)
