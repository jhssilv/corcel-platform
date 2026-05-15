"""Unit tests for DictionaryService."""

import pytest
from unittest.mock import MagicMock

from app.text_pipeline.dictionary import DictionaryService, match_case
from app.text_pipeline.exceptions import ResourceLoadError


# ---------------------------------------------------------------------------
# match_case
# ---------------------------------------------------------------------------

class TestMatchCase:
    def test_lowercase_word_gives_lowercase_candidate(self):
        assert match_case("casa", "CASA") == "casa"

    def test_uppercase_word_gives_uppercase_candidate(self):
        assert match_case("CASA", "casa") == "CASA"

    def test_title_case_word_gives_capitalized_candidate(self):
        assert match_case("Casa", "cAsA") == "Casa"

    def test_mixed_lower_word_gives_lowercase_candidate(self):
        assert match_case("palavra", "Palavra") == "palavra"


# ---------------------------------------------------------------------------
# DictionaryService
# ---------------------------------------------------------------------------

def _make_service_with_mocks(mock_hobj, mock_spell) -> DictionaryService:
    """Return a DictionaryService with resources already injected (no load needed)."""
    service = DictionaryService()
    service._hobj = mock_hobj
    service._spell = mock_spell
    service._loaded = True
    return service


class TestDictionaryService:
    def test_is_valid_word_returns_true_when_hunspell_accepts(self):
        service = _make_service_with_mocks(
            mock_hobj=MagicMock(spell=MagicMock(return_value=True)),
            mock_spell=MagicMock(known=MagicMock(return_value={'casa'})),
        )
        assert service.is_valid_word("casa") is True

    def test_is_valid_word_returns_true_when_spellchecker_knows_word(self):
        service = _make_service_with_mocks(
            mock_hobj=MagicMock(spell=MagicMock(return_value=False)),
            mock_spell=MagicMock(known=MagicMock(return_value={'casa'})),
        )
        assert service.is_valid_word("casa") is True

    def test_is_valid_word_returns_false_for_unknown_word(self):
        service = _make_service_with_mocks(
            mock_hobj=MagicMock(spell=MagicMock(return_value=False)),
            mock_spell=MagicMock(known=MagicMock(return_value=set())),
        )
        assert service.is_valid_word("xyzabc") is False

    def test_get_candidates_excludes_original_word(self):
        service = _make_service_with_mocks(
            mock_hobj=MagicMock(suggest=MagicMock(return_value=['caza', 'casa'])),
            mock_spell=MagicMock(candidates=MagicMock(return_value={'caza', 'casa'})),
        )
        assert "caza" not in service.get_candidates("caza")

    def test_get_candidates_applies_case_matching(self):
        service = _make_service_with_mocks(
            mock_hobj=MagicMock(suggest=MagicMock(return_value=['casa'])),
            mock_spell=MagicMock(candidates=MagicMock(return_value=set())),
        )
        assert "CASA" in service.get_candidates("CAZA")

    def test_load_resources_raises_resource_load_error_on_hunspell_failure(self, mocker):
        service = DictionaryService()
        mocker.patch('app.text_pipeline.dictionary.HunSpell', side_effect=Exception("not found"))

        with pytest.raises(ResourceLoadError, match='Failed to load Hunspell'):
            service._load_resources()
