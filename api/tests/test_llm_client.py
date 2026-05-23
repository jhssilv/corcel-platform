"""Unit tests for OllamaClient."""

import pytest

from app.text_pipeline.llm_client import OllamaClient


class TestTokenEstimation:
    def test_empty_string_returns_zero(self):
        assert OllamaClient._estimate_token_count("") == 0

    def test_short_text_is_positive(self):
        assert OllamaClient._estimate_token_count("hello world") > 0

    def test_char_and_word_estimates_take_max(self):
        # 4 chars → char_estimate = (4+3)//4 = 1, word_estimate = 1 → max = 1
        assert OllamaClient._estimate_token_count("word") == 1
        # "hello world" → char_estimate = (11+3)//4 = 3, word_estimate = 2 → max = 3
        assert OllamaClient._estimate_token_count("hello world") == 3


class TestParseResponse:
    def test_valid_json_array(self):
        raw = '[{"word": "caza", "suggestions": ["casa"]}]'
        result = OllamaClient._parse_response(raw)
        assert result == {"caza": ["casa"]}

    def test_keys_are_lowercased(self):
        raw = '[{"word": "CAZA", "suggestions": ["casa"]}]'
        result = OllamaClient._parse_response(raw)
        assert "caza" in result

    def test_strips_markdown_fences(self):
        raw = "```json\n[{\"word\": \"caza\", \"suggestions\": [\"casa\"]}]\n```"
        result = OllamaClient._parse_response(raw)
        assert "caza" in result

    def test_extracts_json_from_prose(self):
        raw = 'Here are the corrections: [{"word": "caza", "suggestions": ["casa"]}] Done.'
        result = OllamaClient._parse_response(raw)
        assert "caza" in result

    def test_empty_string_returns_none(self):
        assert OllamaClient._parse_response("") is None

    def test_unparseable_json_returns_none(self):
        assert OllamaClient._parse_response("not json at all") is None

    def test_non_string_suggestions_are_filtered(self):
        raw = '[{"word": "caza", "suggestions": ["casa", 42, null]}]'
        result = OllamaClient._parse_response(raw)
        assert result["caza"] == ["casa"]

    def test_entry_without_word_is_skipped(self):
        raw = '[{"suggestions": ["casa"]}]'
        result = OllamaClient._parse_response(raw)
        assert result == {}


class TestGetCorrections:
    def test_skips_llm_when_cpu_execution_is_disabled(self, mocker):
        client = OllamaClient()
        client._ignore_if_on_cpu = True
        client._device = "cpu"
        generate = mocker.patch.object(client, '_generate')

        assert client.get_corrections("A caza bonita.") is None
        generate.assert_not_called()

    def test_returns_parsed_corrections_on_success(self, mocker):
        client = OllamaClient()
        client._ignore_if_on_cpu = False
        mocker.patch.object(
            client, '_generate',
            return_value='[{"word": "caza", "suggestions": ["casa"]}]'
        )
        result = client.get_corrections("A caza bonita.")
        assert "caza" in result

    def test_returns_none_on_request_failure(self, mocker):
        client = OllamaClient()
        client._ignore_if_on_cpu = False
        mocker.patch.object(client, '_generate', side_effect=Exception("connection refused"))
        assert client.get_corrections("A caza bonita.") is None

    def test_returns_none_on_parse_failure(self, mocker):
        client = OllamaClient()
        client._ignore_if_on_cpu = False
        mocker.patch.object(client, '_generate', return_value="not json")
        assert client.get_corrections("A caza bonita.") is None

    def test_returns_empty_dict_when_llm_finds_no_corrections(self, mocker):
        client = OllamaClient()
        client._ignore_if_on_cpu = False
        mocker.patch.object(client, '_generate', return_value="[]")
        assert client.get_corrections("Texto correto.") == {}
