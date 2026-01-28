import pytest
import os
import io
import zipfile
import uuid
from PIL import Image
from app.tasks import process_ocr_zip, format_text_content, add_to_database
from app.database.models import RawText
from app.extensions import db


def test_format_text_content_double_newlines():
    """Test that double newlines are converted to newline+tab."""
    text = "Paragraph one.\n\nParagraph two."
    result = format_text_content(text)
    assert result == "Paragraph one.\n\tParagraph two."


def test_format_text_content_single_newlines():
    """Test that single newlines are removed."""
    text = "Line one\nLine two"
    result = format_text_content(text)
    assert result == "Line one Line two"


def test_format_text_content_mixed():
    """Test mixed newline handling."""
    text = "First paragraph.\n\nSecond paragraph\nhas two lines.\n\nThird paragraph."
    result = format_text_content(text)
    assert result == "First paragraph.\n\tSecond paragraph has two lines.\n\tThird paragraph."


def test_format_text_content_empty():
    """Test with empty text."""
    assert format_text_content("") == ""
    assert format_text_content(None) == None


def test_add_to_database(app):
    """Test adding OCR results to database."""
    results = {
        'image1.jpg': {
            'text_content': 'Text from image 1',
            'image_path': 'uuid1_image1.jpg'
        },
        'image2.png': {
            'text_content': 'Text from image 2',
            'image_path': 'uuid2_image2.jpg'
        }
    }
    
    with app.app_context():
        add_to_database(results)
        
        # Verify entries were created
        raw_texts = db.session.query(RawText).all()
        assert len(raw_texts) == 2
        
        # Verify data
        filenames = {rt.source_file_name for rt in raw_texts}
        assert 'image1.jpg' in filenames
        assert 'image2.png' in filenames


def test_process_ocr_zip_success(app, mocker, tmp_path):
    """Test successful processing of OCR ZIP file."""
    # Create test images
    zip_path = tmp_path / "test_ocr.zip"
    
    with zipfile.ZipFile(zip_path, 'w') as zf:
        # Add a test image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        zf.writestr('test_image.jpg', img_bytes.getvalue())
    
    # Mock OCR service
    mocker.patch('app.tasks.ocr_service.perform_ocr', return_value="Extracted text content")
    
    # Mock the update_state method on the task
    mocker.patch.object(process_ocr_zip, 'update_state')
    
    with app.app_context():
        # Call the task's run method directly with just the zip_path
        result = process_ocr_zip.run(str(zip_path))
        
        # Verify result
        assert result['status'] == 'Concluido'
        assert result['total'] == 1
        assert 'test_image.jpg' in result['result']
        
        # Verify database entry
        raw_texts = db.session.query(RawText).all()
        assert len(raw_texts) == 1
        assert raw_texts[0].source_file_name == 'test_image.jpg'
        assert raw_texts[0].text_content == "Extracted text content"
        assert raw_texts[0].image_path is not None
        
        # Verify image was saved
        from app.tasks import IMAGES_FOLDER
        saved_image_path = os.path.join(IMAGES_FOLDER, raw_texts[0].image_path)
        assert os.path.exists(saved_image_path)
        
        # Cleanup
        if os.path.exists(saved_image_path):
            os.remove(saved_image_path)
    
    # Verify ZIP was deleted
    assert not os.path.exists(zip_path)


def test_process_ocr_zip_multiple_images(app, mocker, tmp_path):
    """Test processing ZIP with multiple images."""
    zip_path = tmp_path / "multi_ocr.zip"
    
    with zipfile.ZipFile(zip_path, 'w') as zf:
        for i in range(3):
            img = Image.new('RGB', (100, 100))
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='JPEG')
            zf.writestr(f'image_{i}.jpg', img_bytes.getvalue())
    
    # Mock OCR service to return different text for each image
    mock_ocr = mocker.patch('app.tasks.ocr_service.perform_ocr')
    mock_ocr.side_effect = [f"Text {i}" for i in range(3)]
    
    # Mock update_state
    mocker.patch.object(process_ocr_zip, 'update_state')
    
    with app.app_context():
        result = process_ocr_zip.run(str(zip_path))
        
        assert result['total'] == 3
        assert len(result['result']) == 3
        
        # Verify all were saved to database
        raw_texts = db.session.query(RawText).all()
        assert len(raw_texts) == 3
        
        # Cleanup saved images
        from app.tasks import IMAGES_FOLDER
        for rt in raw_texts:
            img_path = os.path.join(IMAGES_FOLDER, rt.image_path)
            if os.path.exists(img_path):
                os.remove(img_path)


def test_process_ocr_zip_file_not_found(app, mocker):
    """Test processing non-existent ZIP file."""
    with app.app_context():
        result = process_ocr_zip.run("/non/existent/path.zip")
        
        assert 'error' in result
        assert 'not found' in result['error'].lower()


def test_process_ocr_zip_no_images(app, mocker, tmp_path):
    """Test processing ZIP with no valid images."""
    zip_path = tmp_path / "empty.zip"
    
    with zipfile.ZipFile(zip_path, 'w') as zf:
        zf.writestr('readme.txt', b'No images here')
    
    with app.app_context():
        result = process_ocr_zip.run(str(zip_path))
        
        assert 'error' in result
        assert 'not contain valid images' in result['error']


def test_process_ocr_zip_mixed_files(app, mocker, tmp_path):
    """Test processing ZIP with both valid and invalid files."""
    zip_path = tmp_path / "mixed.zip"
    
    with zipfile.ZipFile(zip_path, 'w') as zf:
        # Valid image
        img = Image.new('RGB', (100, 100))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        zf.writestr('valid.png', img_bytes.getvalue())
        
        # Text file (should be ignored)
        zf.writestr('invalid.txt', b'Not an image')
        
        # Another valid image
        img2 = Image.new('RGB', (50, 50))
        img_bytes2 = io.BytesIO()
        img2.save(img_bytes2, format='JPEG')
        zf.writestr('valid2.jpg', img_bytes2.getvalue())
    
    mocker.patch('app.tasks.ocr_service.perform_ocr', return_value="OCR text")
    mocker.patch.object(process_ocr_zip, 'update_state')
    
    with app.app_context():
        result = process_ocr_zip.run(str(zip_path))
        
        # Should process only the 2 valid images
        assert result['total'] == 2
        
        raw_texts = db.session.query(RawText).all()
        assert len(raw_texts) == 2
        
        # Cleanup
        from app.tasks import IMAGES_FOLDER
        for rt in raw_texts:
            img_path = os.path.join(IMAGES_FOLDER, rt.image_path)
            if os.path.exists(img_path):
                os.remove(img_path)


def test_process_ocr_zip_filters_double_underscore(app, mocker, tmp_path):
    """Test that files starting with __ are filtered out."""
    zip_path = tmp_path / "filtered.zip"
    
    with zipfile.ZipFile(zip_path, 'w') as zf:
        # Valid image
        img = Image.new('RGB', (100, 100))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        zf.writestr('normal.jpg', img_bytes.getvalue())
        
        # Should be filtered
        zf.writestr('__MACOSX/hidden.jpg', img_bytes.getvalue())
    
    mocker.patch('app.tasks.ocr_service.perform_ocr', return_value="Text")
    mocker.patch.object(process_ocr_zip, 'update_state')
    
    with app.app_context():
        result = process_ocr_zip.run(str(zip_path))
        
        # Should only process 1 image (not the __MACOSX one)
        assert result['total'] == 1
        assert 'normal.jpg' in result['result']
        
        # Cleanup
        from app.tasks import IMAGES_FOLDER
        for rt in db.session.query(RawText).all():
            img_path = os.path.join(IMAGES_FOLDER, rt.image_path)
            if os.path.exists(img_path):
                os.remove(img_path)


def test_process_ocr_zip_image_conversion(app, mocker, tmp_path):
    """Test that images are converted to RGB and saved as JPEG."""
    zip_path = tmp_path / "convert.zip"
    
    with zipfile.ZipFile(zip_path, 'w') as zf:
        # Create RGBA PNG
        img = Image.new('RGBA', (100, 100), color=(255, 0, 0, 128))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        zf.writestr('rgba_image.png', img_bytes.getvalue())
    
    mocker.patch('app.tasks.ocr_service.perform_ocr', return_value="Converted text")
    mocker.patch.object(process_ocr_zip, 'update_state')
    
    with app.app_context():
        result = process_ocr_zip.run(str(zip_path))
        
        raw_text = db.session.query(RawText).first()
        
        # Verify image was saved as JPEG
        assert raw_text.image_path.endswith('.jpg')
        
        from app.tasks import IMAGES_FOLDER
        saved_path = os.path.join(IMAGES_FOLDER, raw_text.image_path)
        
        # Load and verify it's RGB JPEG
        saved_img = Image.open(saved_path)
        assert saved_img.mode == 'RGB'
        assert saved_img.format == 'JPEG'
        
        # Cleanup
        os.remove(saved_path)


def test_process_ocr_zip_unique_filenames(app, mocker, tmp_path):
    """Test that saved images have unique UUID filenames."""
    zip_path = tmp_path / "unique.zip"
    
    with zipfile.ZipFile(zip_path, 'w') as zf:
        img = Image.new('RGB', (100, 100))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        zf.writestr('same_name.jpg', img_bytes.getvalue())
    
    mocker.patch('app.tasks.ocr_service.perform_ocr', return_value="Text")
    mocker.patch.object(process_ocr_zip, 'update_state')
    
    with app.app_context():
        result = process_ocr_zip.run(str(zip_path))
        
        raw_text = db.session.query(RawText).first()
        
        # Verify UUID is in filename
        assert len(raw_text.image_path.split('_')) >= 2
        # First part should be a UUID
        uuid_part = raw_text.image_path.split('_')[0]
        assert len(uuid_part) == 36  # UUID length with dashes
        
        # Cleanup
        from app.tasks import IMAGES_FOLDER
        img_path = os.path.join(IMAGES_FOLDER, raw_text.image_path)
        if os.path.exists(img_path):
            os.remove(img_path)


def test_process_ocr_zip_ocr_error_continues(app, mocker, tmp_path):
    """Test that OCR error on one image doesn't stop processing others."""
    zip_path = tmp_path / "error_test.zip"
    
    with zipfile.ZipFile(zip_path, 'w') as zf:
        for i in range(3):
            img = Image.new('RGB', (100, 100))
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='JPEG')
            zf.writestr(f'image_{i}.jpg', img_bytes.getvalue())
    
    # Make OCR fail for the second image
    mock_ocr = mocker.patch('app.tasks.ocr_service.perform_ocr')
    mock_ocr.side_effect = ["Text 0", Exception("OCR failed"), "Text 2"]
    
    mocker.patch.object(process_ocr_zip, 'update_state')
    
    with app.app_context():
        result = process_ocr_zip.run(str(zip_path))
        
        # Should have processed all 3, but only 2 succeeded
        assert result['total'] == 3
        assert 'image_0.jpg' in result['result']
        assert 'image_2.jpg' in result['result']
        assert 'error' in result['result']['image_1.jpg']
        
        # Only 2 should be in database (errors filtered out)
        raw_texts = db.session.query(RawText).all()
        assert len(raw_texts) == 2
        
        # Cleanup
        from app.tasks import IMAGES_FOLDER
        for rt in raw_texts:
            img_path = os.path.join(IMAGES_FOLDER, rt.image_path)
            if os.path.exists(img_path):
                os.remove(img_path)
