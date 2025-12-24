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
        MagicMock(id=1, grade=10, normalized_by_user=False, source_file_name="test.txt", users_assigned=["testuser"])
    ]

    response = auth_client.get('/api/texts/')
    assert response.status_code == 200
    data = response.json
    assert "textsData" in data
    assert len(data["textsData"]) == 1
    assert data["textsData"][0]["id"] == 1

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

def test_toggle_token_suggestions(auth_client, mocker):
    """Test toggling the 'to_be_normalized' status of a token."""
    mock_toggle = mocker.patch('app.database.queries.toggle_to_be_normalized')
    
    # Token ID 102
    response = auth_client.patch('/api/tokens/102/suggestions/toggle', json={"token_id": 102})
    
    assert response.status_code == 200
    assert response.json["message"] == "Token 'to_be_normalized' status toggled"
    mock_toggle.assert_called_once_with(mocker.ANY, token_id=102)

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
