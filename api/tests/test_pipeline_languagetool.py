import pytest
from app.text_pipeline.pipeline import process_tokens
from app.text_pipeline.models import Token


def test_pipeline_flags_languagetool_matches_by_offset(mocker):
    # Mock DictionaryService to return nothing
    dictionary = mocker.Mock()
    dictionary.get_candidates.return_value = []
    dictionary.is_valid_word.return_value = True
    mocker.patch('app.text_pipeline.pipeline._get_dictionary', return_value=dictionary)

    # Mock LanguageToolClient
    lt_client = mocker.Mock()
    # "A caza "
    #  0123456
    # "caza" is at offset 2, length 4
    lt_client.check_text.return_value = [
        {
            "offset": 2,
            "length": 4,
            "replacements": ["casa", "cada"],
            "message": "Spelling mistake"
        }
    ]
    mocker.patch('app.text_pipeline.pipeline._get_languagetool', return_value=lt_client)

    # Input: "A caza "
    tokens = [
        Token(idx=0, text="A", is_word=True, whitespace_after=" "),
        Token(idx=1, text="caza", is_word=True, whitespace_after=" "),
    ]
    text = "A caza "

    results = process_tokens(tokens, text)

    assert results[1]["to_be_normalized"] is True
    assert results[1]["suggestions"] == ["casa", "cada"]
    assert results[0]["to_be_normalized"] is False


def test_pipeline_merges_dictionary_and_languagetool_suggestions(mocker):
    # Mock DictionaryService to flag "caza"
    dictionary = mocker.Mock()
    dictionary.get_candidates.return_value = ["caca"]
    dictionary.is_valid_word.return_value = False
    mocker.patch('app.text_pipeline.pipeline._get_dictionary', return_value=dictionary)

    # Mock LanguageToolClient to also flag "caza"
    lt_client = mocker.Mock()
    lt_client.check_text.return_value = [
        {
            "offset": 2,
            "length": 4,
            "replacements": ["casa"],
            "message": "Spelling mistake"
        }
    ]
    mocker.patch('app.text_pipeline.pipeline._get_languagetool', return_value=lt_client)

    tokens = [
        Token(idx=0, text="A", is_word=True, whitespace_after=" "),
        Token(idx=1, text="caza", is_word=True, whitespace_after=" "),
    ]
    text = "A caza "

    results = process_tokens(tokens, text)

    assert results[1]["to_be_normalized"] is True
    assert "casa" in results[1]["suggestions"]
    assert "caca" in results[1]["suggestions"]
