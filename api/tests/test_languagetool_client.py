import pytest
from app.text_pipeline.languagetool_client import LanguageToolClient


def test_languagetool_client_returns_matches(mocker):
    client = LanguageToolClient(base_url="http://localhost:8010")

    mock_response = mocker.Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "matches": [
            {
                "message": "Erro ortográfico",
                "shortMessage": "Ortografia",
                "replacements": [{"value": "casa"}, {"value": "cada"}],
                "offset": 2,
                "length": 4,
                "context": {"text": "A caza", "offset": 2, "length": 4},
                "rule": {"id": "MORFOLOGIK_RULE_PT_BR", "issueType": "misspelling"},
            }
        ]
    }
    mock_post = mocker.patch("requests.post", return_value=mock_response)

    matches = client.check_text("A caza")

    mock_post.assert_called_once_with(
        "http://localhost:8010/v2/check",
        data={"text": "A caza", "language": "pt-BR"},
        timeout=5.0,
    )

    assert len(matches) == 1
    assert matches[0]["offset"] == 2
    assert matches[0]["length"] == 4
    assert matches[0]["replacements"] == ["casa", "cada"]


def test_languagetool_client_handles_server_error(mocker):
    client = LanguageToolClient(base_url="http://localhost:8010")

    mock_response = mocker.Mock()
    mock_response.status_code = 500
    mocker.patch("requests.post", return_value=mock_response)

    matches = client.check_text("A caza")
    assert matches == []


def test_languagetool_client_handles_network_error(mocker):
    client = LanguageToolClient(base_url="http://localhost:8010")

    import requests

    mocker.patch("requests.post", side_effect=requests.exceptions.ConnectionError)

    matches = client.check_text("A caza")
    assert matches == []
