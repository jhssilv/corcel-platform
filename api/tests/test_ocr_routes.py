import pytest
import os
import io
import zipfile
from app.database.models import RawText
from app.extensions import db


def test_upload_ocr_zip_success(admin_client, app, mocker):
    """Test successful OCR ZIP upload by admin."""
    # Mock Celery task
    mock_task = mocker.patch('app.routes.ocr_routes.process_ocr_zip.delay')
    mock_task.return_value.id = "ocr-task-123"
    
    # Create a minimal valid ZIP file
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w') as zf:
        zf.writestr('test_image.jpg', b'fake image data')
    zip_buffer.seek(0)
    
    data = {
        'file': (zip_buffer, 'test_images.zip')
    }
    
    response = admin_client.post('/api/ocr/upload', 
                                  data=data, 
                                  content_type='multipart/form-data')
    
    assert response.status_code == 202
    assert 'task_id' in response.json
    assert response.json['task_id'] == "ocr-task-123"
    
    # Verify task was called
    mock_task.assert_called_once()


def test_upload_ocr_zip_non_admin(auth_client, app):
    """Test that non-admin users cannot upload OCR zips."""
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w') as zf:
        zf.writestr('test.jpg', b'data')
    zip_buffer.seek(0)
    
    data = {
        'file': (zip_buffer, 'test.zip')
    }
    
    response = auth_client.post('/api/ocr/upload', 
                                 data=data, 
                                 content_type='multipart/form-data')
    
    assert response.status_code == 403


def test_upload_ocr_zip_unauthenticated(client, app):
    """Test that unauthenticated users cannot upload."""
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w') as zf:
        zf.writestr('test.jpg', b'data')
    zip_buffer.seek(0)
    
    data = {
        'file': (zip_buffer, 'test.zip')
    }
    
    response = client.post('/api/ocr/upload', 
                           data=data, 
                           content_type='multipart/form-data')
    
    assert response.status_code == 401


def test_upload_ocr_zip_no_file(admin_client, app):
    """Test upload without file."""
    response = admin_client.post('/api/ocr/upload', 
                                  data={}, 
                                  content_type='multipart/form-data')
    
    assert response.status_code == 400
    assert 'error' in response.json
    assert 'not found' in response.json['error'].lower()


def test_upload_ocr_zip_invalid_file_type(admin_client, app):
    """Test upload with non-ZIP file."""
    data = {
        'file': (io.BytesIO(b'not a zip'), 'test.txt')
    }
    
    response = admin_client.post('/api/ocr/upload', 
                                  data=data, 
                                  content_type='multipart/form-data')
    
    assert response.status_code == 400
    assert 'error' in response.json
    assert 'zip' in response.json['error'].lower()


def test_upload_ocr_zip_empty_filename(admin_client, app):
    """Test upload with empty filename."""
    data = {
        'file': (io.BytesIO(b'data'), '')
    }
    
    response = admin_client.post('/api/ocr/upload', 
                                  data=data, 
                                  content_type='multipart/form-data')
    
    assert response.status_code == 400


def test_get_raw_text_image_success(admin_client, app, tmp_path):
    """Test successful retrieval of raw text image."""
    from app.routes.ocr_routes import IMAGES_FOLDER
    
    # Create a test image file
    os.makedirs(IMAGES_FOLDER, exist_ok=True)
    test_image_name = "test_uuid_image.jpg"
    test_image_path = os.path.join(IMAGES_FOLDER, test_image_name)
    
    with open(test_image_path, 'wb') as f:
        f.write(b'fake image content')
    
    try:
        # Create a RawText entry with image_path
        with app.app_context():
            raw_text = RawText(
                source_file_name="test.jpg",
                text_content="Sample OCR text",
                image_path=test_image_name
            )
            db.session.add(raw_text)
            db.session.commit()
            raw_text_id = raw_text.id
        
        response = admin_client.get(f'/api/ocr/raw-texts/{raw_text_id}/image')
        
        assert response.status_code == 200
        assert response.data == b'fake image content'
    
    finally:
        # Cleanup
        if os.path.exists(test_image_path):
            os.remove(test_image_path)


def test_get_raw_text_image_not_found(admin_client, app):
    """Test retrieval of non-existent raw text."""
    response = admin_client.get('/api/ocr/raw-texts/99999/image')
    
    assert response.status_code == 404
    assert 'error' in response.json


def test_get_raw_text_image_no_image_path(admin_client, app):
    """Test retrieval when raw text exists but has no image."""
    with app.app_context():
        raw_text = RawText(
            source_file_name="test.txt",
            text_content="Text without image",
            image_path=None
        )
        db.session.add(raw_text)
        db.session.commit()
        raw_text_id = raw_text.id
    
    response = admin_client.get(f'/api/ocr/raw-texts/{raw_text_id}/image')
    
    assert response.status_code == 404
    assert 'error' in response.json


def test_get_raw_text_image_non_admin(auth_client, app):
    """Test that non-admin users cannot retrieve images."""
    response = auth_client.get('/api/ocr/raw-texts/1/image')
    
    assert response.status_code == 403


def test_get_raw_text_image_unauthenticated(client, app):
    """Test that unauthenticated users cannot retrieve images."""
    response = client.get('/api/ocr/raw-texts/1/image')
    
    assert response.status_code == 401
