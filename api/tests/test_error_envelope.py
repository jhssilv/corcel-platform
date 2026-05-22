def test_unknown_route_returns_json_error(client):
    """Unknown routes should return the canonical JSON error envelope."""
    response = client.get('/api/does-not-exist')

    assert response.status_code == 404
    assert response.is_json
    assert response.json["error"] == "The requested URL was not found on the server. If you entered the URL manually please check your spelling and try again."
    assert response.json["code"] == "RESOURCE_NOT_FOUND"


def test_validation_error_returns_canonical_envelope(auth_client):
    """DTO validation failures should use the canonical envelope with details."""
    response = auth_client.post('/api/texts/1/normalizations', json={"first_index": 1})

    assert response.status_code == 400
    assert response.json["error"] == "Validation failed"
    assert response.json["code"] == "VALIDATION_ERROR"
    assert isinstance(response.json["details"], list)
    assert any(detail["field"] == "last_index" for detail in response.json["details"])


def test_internal_server_error_uses_canonical_envelope(auth_client, mocker):
    """Unexpected route failures should not leak raw exception strings."""
    mocker.patch('app.database.queries.get_texts_data', side_effect=RuntimeError("boom"))

    response = auth_client.get('/api/texts/')

    assert response.status_code == 500
    assert response.json["error"] == "Internal server error"
    assert response.json["code"] == "INTERNAL_SERVER_ERROR"
    assert "details" not in response.json
