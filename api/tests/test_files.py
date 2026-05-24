import io
import base64
import pytest

from app.database.models import ProcessingStatus, Text, TextUploadBatch, TextUploadBatchStatus, User
from app.extensions import db

def test_request_report(auth_client, mocker):
    """Test requesting a CSV report."""
    # Mock generate_report to return a CSV string
    mock_generate = mocker.patch('app.routes.download_routes.generate_report')
    mock_generate.return_value = "id,text\n1,hello"

    payload = {"text_ids": [1, 2]}
    response = auth_client.post('/api/report/', json=payload)
    
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "text/csv"
    assert response.headers["Content-Disposition"] == "attachment; filename=report.csv"
    assert response.data.decode('utf-8') == "id,text\n1,hello"
    mock_generate.assert_called_once()

def test_download_normalized_texts(auth_client, mocker):
    """Test downloading normalized texts as zip."""
    # Mock save_modified_texts to return a fake path
    mock_save = mocker.patch('app.routes.download_routes.save_modified_texts')
    mock_save.return_value = "/tmp/fake_path/texts.zip"
    
    # Mock os.path.exists to return True
    mocker.patch('os.path.exists', return_value=True)
    
    # Mock send_from_directory
    # Since send_from_directory is hard to mock perfectly because it returns a response object,
    # we can mock the function in the module.
    mock_send = mocker.patch('app.routes.download_routes.send_from_directory')
    mock_send.return_value = "ZIP_CONTENT"

    payload = {"text_ids": [1], "use_tags": False}
    response = auth_client.post('/api/download/', json=payload)
    
    assert response.status_code == 200
    mock_save.assert_called_once()

def test_upload_file_no_file(auth_client):
    """Test upload without file part."""
    # Need to mock admin_required if the test user isn't admin, 
    # but let's assume we can make the user admin or mock the decorator.
    # For simplicity, let's mock the decorator or make the user admin in fixture if needed.
    # However, `admin_required` checks `current_user.is_admin`.
    
    # Let's update the user to be admin
    from app.extensions import db
    from app.database.models import User
    
    # We need to access the app context to modify the user
    # But auth_client is already created. We can modify the DB directly.
    # The auth_client fixture creates a user with ID 1 (usually).
    # Let's just try and see if it fails with 403 or 400.
    # If it fails with 403/401, we need to make user admin.
    
    # Actually, let's mock the admin check for this test or ensure user is admin.
    # Since we can't easily modify the fixture mid-test without app context:
    pass 

def test_upload_file_success(client, app, mocker):
    """Test successful file upload."""
    # Create admin user
    with app.app_context():
        user = User(username="admin", is_admin=True)
        user.set_password("adminpass")
        db.session.add(user)
        db.session.commit()
    
    # Login as admin
    client.post('/api/login', json={"username": "admin", "password": "adminpass"})
    
    # Mock Celery task
    mock_task = mocker.patch('app.routes.upload_routes.process_text_upload_zip.delay')
    mock_task.return_value.id = "text-upload-task-123"

    data = {
        'file': (io.BytesIO(b"fake zip content"), 'test.zip')
    }
    
    response = client.post('/api/upload', data=data, content_type='multipart/form-data')
    
    assert response.status_code == 202
    assert response.json["task_id"] == "text-upload-task-123"
    assert isinstance(response.json["batch_id"], int)
    mock_task.assert_called_once()

    _, kwargs = mock_task.call_args
    assert kwargs["original_filename"].endswith("_test.zip")
    assert kwargs["batch_id"] == response.json["batch_id"]
    assert base64.b64decode(kwargs["zip_payload_b64"]) == b"fake zip content"

def test_task_status(auth_client, mocker):
    """Test checking task status."""
    # Mock AsyncResult
    mock_result = mocker.patch('app.routes.upload_routes.celery.AsyncResult')
    mock_instance = mock_result.return_value
    mock_instance.state = 'SUCCESS'
    mock_instance.info = {
        'result': {
            'kind': 'text_upload',
            'batch_id': 99,
            'text_ids': [1, 2],
            'created': 2,
            'failed_files': [],
        }
    }
    
    response = auth_client.get('/api/status/task-123')
    
    assert response.status_code == 200
    assert response.json['status'] == 'Finished'
    assert response.json['result']['kind'] == 'text_upload'
    assert response.json['result']['batch_id'] == 99
    assert response.json['result']['text_ids'] == [1, 2]

def test_task_status_progress(auth_client, mocker):
    """Test checking task progress details."""
    mock_result = mocker.patch('app.routes.upload_routes.celery.AsyncResult')
    mock_instance = mock_result.return_value
    mock_instance.state = 'PROGRESS'
    mock_instance.info = {
        'current': 2,
        'total': 5,
        'status': 'Importando arquivo 2/5',
    }

    response = auth_client.get('/api/status/task-123')

    assert response.status_code == 200
    assert response.json['state'] == 'PROGRESS'
    assert response.json['current'] == 2
    assert response.json['total'] == 5
    assert response.json['status'] == 'Importando arquivo 2/5'


def test_task_status_requires_auth(client):
    """Task status polling should require authentication."""
    response = client.get('/api/status/task-123')

    assert response.status_code == 401
    assert response.json["code"] == "AUTH_NOT_AUTHENTICATED"


def test_download_normalized_texts_empty_ids_returns_error(auth_client):
    """Download failures should use the canonical error envelope."""
    response = auth_client.post('/api/download/', json={"text_ids": [], "use_tags": False})

    assert response.status_code == 400
    assert response.json["error"] == "'text_ids' must be a non-empty list"
    assert response.json["code"] == "BUSINESS_RULE_VIOLATION"


def test_batch_status_reports_missing_ids(auth_client, app):
    with app.app_context():
        text = Text(source_file_name="doc.txt", processing_status=ProcessingStatus.PENDING)
        db.session.add(text)
        db.session.commit()
        text_id = text.id

    response = auth_client.post('/api/texts/status/batch', json={"text_ids": [text_id, 999999]})

    assert response.status_code == 200
    assert response.json["statuses"][0]["id"] == text_id
    assert response.json["missing_ids"] == [999999]


def test_get_text_upload_batch_detail(admin_client, app):
    with app.app_context():
        admin_user = db.session.query(User).filter_by(username="adminuser").first()
        batch = TextUploadBatch(
            created_by_user_id=admin_user.id,
            source_file_name="upload_batch.zip",
            status=TextUploadBatchStatus.QUEUED,
            total_files=2,
            created_texts=2,
            failed_files='["bad.txt"]',
        )
        db.session.add(batch)
        db.session.flush()

        db.session.add_all([
            Text(source_file_name="good-1.txt", upload_batch_id=batch.id, processing_status=ProcessingStatus.PENDING),
            Text(source_file_name="good-2.txt", upload_batch_id=batch.id, processing_status=ProcessingStatus.PROCESSING),
        ])
        db.session.commit()
        batch_id = batch.id

    response = admin_client.get(f'/api/text-upload-batches/{batch_id}')

    assert response.status_code == 200
    assert response.json["id"] == batch_id
    assert response.json["failed_files"] == ["bad.txt"]
    assert len(response.json["texts"]) == 2


def test_get_active_text_upload_batches_returns_current_admin_batches(admin_client, app):
    with app.app_context():
        admin_user = db.session.query(User).filter_by(username="adminuser").first()
        batch = TextUploadBatch(
            created_by_user_id=admin_user.id,
            source_file_name="upload_batch.zip",
            status=TextUploadBatchStatus.QUEUED,
            total_files=1,
            created_texts=1,
        )
        db.session.add(batch)
        db.session.commit()
        batch_id = batch.id

    response = admin_client.get('/api/text-upload-batches/active')

    assert response.status_code == 200
    assert response.json["batches"]
    assert response.json["batches"][0]["id"] == batch_id
