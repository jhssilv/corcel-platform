import pytest
from unittest.mock import MagicMock
from app.database.models import Text, TextsUsers, Normalization, Token
from app.extensions import db
from datetime import datetime

@pytest.fixture
def text_data(app, auth_client):
    """Fixture to create text data for testing."""
    # We don't need to create DB data if we mock queries, 
    # but keeping it for reference or if we decide to use DB.
    return 1

def test_get_texts_list(auth_client, mocker):
    """Test retrieving list of assigned texts."""
    mock_get = mocker.patch('app.database.queries.get_texts_data')
    mock_get.return_value = [
        MagicMock(
            id=1,
            grade=10,
            normalized_by_user=False,
            source_file_name="test.txt",
            users_assigned=["testuser"],
            processing_status="READY",
        )
    ]

    response = auth_client.get('/api/texts/')
    assert response.status_code == 200
    data = response.json
    assert "textsData" in data
    assert len(data["textsData"]) == 1
    assert data["textsData"][0]["id"] == 1
    assert data["textsData"][0]["processingStatus"] == "READY"


def test_get_filtered_texts_normalized_true(auth_client, mocker):
    """Test filtered texts with normalized=true."""
    mock_get = mocker.patch('app.database.queries.get_filtered_texts')
    mock_get.return_value = [
        MagicMock(
            id=1,
            grade=10,
            normalized_by_user=True,
            source_file_name="test.txt",
            users_assigned=["testuser"],
            processing_status="PROCESSING",
        )
    ]

    response = auth_client.get('/api/texts/filtered?normalized=true')

    assert response.status_code == 200
    assert response.json["textsData"][0]["normalizedByUser"] is True
    assert response.json["textsData"][0]["processingStatus"] == "PROCESSING"

    call_args = mock_get.call_args.kwargs
    assert call_args["normalized"] is True
    assert call_args["user_id"] is not None


def test_get_filtered_texts_normalized_false(auth_client, mocker):
    """Test filtered texts with normalized=false."""
    mock_get = mocker.patch('app.database.queries.get_filtered_texts')
    mock_get.return_value = [
        MagicMock(
            id=2,
            grade=8,
            normalized_by_user=False,
            source_file_name="essay.txt",
            users_assigned=[],
            processing_status="FAILED",
        )
    ]

    response = auth_client.get('/api/texts/filtered?normalized=false')

    assert response.status_code == 200
    assert response.json["textsData"][0]["normalizedByUser"] is False
    assert response.json["textsData"][0]["processingStatus"] == "FAILED"

    call_args = mock_get.call_args.kwargs
    assert call_args["normalized"] is False
    assert call_args["user_id"] is not None


def test_get_filtered_texts_normalized_invalid(auth_client, mocker):
    """Test filtered texts validation for invalid normalized value."""
    mock_get = mocker.patch('app.database.queries.get_filtered_texts')

    response = auth_client.get('/api/texts/filtered?normalized=invalid')

    assert response.status_code == 400
    assert response.json["error"] == "Validation failed"
    assert response.json["code"] == "VALIDATION_ERROR"
    assert response.json["details"][0]["field"] == "normalized"
    assert "true" in response.json["details"][0]["message"]
    mock_get.assert_not_called()

def test_get_text_detail(auth_client, mocker):
    """Test retrieving text details."""
    mock_get = mocker.patch('app.database.queries.get_text_by_id')
    mock_get.return_value = {
        "id": 1,
        "grade": 10,
        "tokens": [{"id": 101, "text": "Hello", "isWord": True, "position": 0, "candidates": [], "toBeNormalized": False}],
        "normalized_by_user": False,
        "source_file_name": "test.txt",
        "assigned_to_user": True
    }

    response = auth_client.get('/api/texts/1')
    assert response.status_code == 200
    data = response.json
    assert data["id"] == 1
    assert len(data["tokens"]) == 1

def test_get_text_detail_not_found(auth_client, mocker):
    """Test retrieving non-existent text."""
    mock_get = mocker.patch('app.database.queries.get_text_by_id')
    mock_get.return_value = None

    response = auth_client.get('/api/texts/999')
    assert response.status_code == 404
    assert response.json["code"] == "RESOURCE_NOT_FOUND"

def test_add_normalization(auth_client, mocker):
    """Test adding a normalization."""
    mock_save = mocker.patch('app.database.queries.save_normalization')
    
    payload = {
        "first_index": 1,
        "last_index": 1,
        "new_token": "World"
    }
    response = auth_client.post('/api/texts/1/normalizations', json=payload)
    assert response.status_code == 200
    assert "Correction added" in response.json["message"]
    mock_save.assert_called_once()

def test_get_normalizations(auth_client, mocker):
    """Test retrieving normalizations."""
    mock_get = mocker.patch('app.database.queries.get_normalizations_by_text')
    mock_norm = MagicMock(start_index=1, end_index=1, new_token="World")
    mock_get.return_value = [mock_norm]

    response = auth_client.get('/api/texts/1/normalizations')
    assert response.status_code == 200
    data = response.json
    assert "1" in data
    assert data["1"]["new_token"] == "World"

def test_delete_normalization(auth_client, mocker):
    """Test deleting a normalization."""
    mock_delete = mocker.patch('app.database.queries.delete_normalization')

    payload = {"word_index": 1}
    response = auth_client.delete('/api/texts/1/normalizations', json=payload)
    assert response.status_code == 200
    assert response.json["message"] == "Normalization deleted"
    mock_delete.assert_called_once()

def test_toggle_normalization_status(auth_client, mocker):
    """Test toggling the normalized status of a text."""
    mock_toggle = mocker.patch('app.database.queries.toggle_normalized')
    
    response = auth_client.patch('/api/texts/1/normalizations')
    assert response.status_code == 200
    assert response.json["message"] == "Status changed"
    mock_toggle.assert_called_once()

def test_set_token_normalization_flag_true(auth_client, mocker):
    """Test explicitly setting the 'to_be_normalized' flag to true."""
    mock_set = mocker.patch('app.database.queries.set_to_be_normalized', return_value=object())

    response = auth_client.patch(
        '/api/tokens/102/normalization-flag',
        json={"to_be_normalized": True},
    )

    assert response.status_code == 200
    assert response.json["message"] == "Token marked as requiring normalization."
    mock_set.assert_called_once_with(mocker.ANY, token_id=102, to_be_normalized=True)


def test_set_token_normalization_flag_false(auth_client, mocker):
    """Test explicitly setting the 'to_be_normalized' flag to false."""
    mock_set = mocker.patch('app.database.queries.set_to_be_normalized', return_value=object())

    response = auth_client.patch(
        '/api/tokens/102/normalization-flag',
        json={"to_be_normalized": False},
    )

    assert response.status_code == 200
    assert response.json["message"] == "Token marked as not requiring normalization."
    mock_set.assert_called_once_with(mocker.ANY, token_id=102, to_be_normalized=False)


def test_set_token_normalization_flag_not_found(auth_client, mocker):
    """Test explicitly setting the token flag for a missing token."""
    mocker.patch('app.database.queries.set_to_be_normalized', return_value=None)

    response = auth_client.patch(
        '/api/tokens/102/normalization-flag',
        json={"to_be_normalized": True},
    )

    assert response.status_code == 404
    assert response.json["error"] == "Token not found"
    assert response.json["code"] == "RESOURCE_NOT_FOUND"

def test_save_normalization_with_global_suggestion(auth_client, mocker):
    """Test saving a normalization with suggest_for_all=True."""
    mock_save = mocker.patch('app.database.queries.save_normalization')
    
    payload = {
        "first_index": 1,
        "last_index": 1,
        "new_token": "World",
        "suggest_for_all": True
    }
    response = auth_client.post('/api/texts/1/normalizations', json=payload)
    
    assert response.status_code == 200
    assert "Correction added" in response.json["message"]
    
    # Verify save_normalization was called with suggest_for_all=True
    mock_save.assert_called_once()
    call_args = mock_save.call_args
    # args: (session, text_id, user_id, first_index, last_index, new_token, suggest_for_all)
    assert call_args[0][6] is True


def test_create_whitelist_token(auth_client, mocker):
    """Test adding a token to the whitelist without an action field."""
    mock_add = mocker.patch('app.database.queries.add_whitelist_token')

    response = auth_client.post('/api/whitelist/', json={"token_text": "caza"})

    assert response.status_code == 200
    assert response.json["message"] == "Token 'caza' added to whitelist."
    mock_add.assert_called_once_with(mocker.ANY, "caza")


def test_delete_whitelist_token(auth_client, mocker):
    """Test removing a token from the whitelist using the path token."""
    mock_remove = mocker.patch('app.database.queries.remove_whitelist_token')

    response = auth_client.delete('/api/whitelist/token%20text')

    assert response.status_code == 200
    assert response.json["message"] == "Token 'token text' removed from whitelist."
    mock_remove.assert_called_once_with(mocker.ANY, "token text")
