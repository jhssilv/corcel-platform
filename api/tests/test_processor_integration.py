"""Integration test: TextProcessingPipeline → database insertion.

Verifies that:
  1. The pipeline produces structurally correct output for a known input.
  2. Error detection works (mocked LLM + real Hunspell/SpellChecker).
  3. Results are correctly persisted via add_text.
  4. DB relationships (Token → Suggestions) are intact.
"""

import pytest
from app.text_pipeline import process_text, process_tokens
from app.text_pipeline.models import Token
from app.database.models import Text, Token as DbToken
from app.database.queries import add_text
from app.extensions import db


@pytest.fixture
def mock_lt_pipeline(mocker):
    """Mock the LanguageTool call out, let Dictionary logic run."""
    lt_client = mocker.Mock()
    # "A casa e a caza."
    #  0123456789012345
    lt_client.check_text.return_value = [
        {
            "offset": 11,
            "length": 4,
            "replacements": ["casa"],
            "message": "Spelling mistake"
        }
    ]
    mocker.patch('app.text_pipeline.pipeline._get_languagetool', return_value=lt_client)


def test_pipeline_detects_misspelled_token(mock_lt_pipeline):
    """Pipeline should flag 'caza' as incorrect and provide suggestions."""
    sample_text = "A casa e a caza."
    results = process_text(sample_text)

    assert len(results) > 0

    tokens_list = list(results.values())
    caza = next((t for t in tokens_list if t['text'] == 'caza'), None)

    assert caza is not None, "Token 'caza' not found in results"
    assert caza['to_be_normalized'] is True, "'caza' should be flagged for normalization"
    assert len(caza['suggestions']) > 0, "Should have suggestions for 'caza'"


def test_pipeline_leaves_correct_token_clean(mock_lt_pipeline):
    """Pipeline should not flag 'casa' as incorrect."""
    results = process_text("A casa e a caza.")

    casa = next((t for t in results.values() if t['text'] == 'casa'), None)
    assert casa is not None
    assert casa['to_be_normalized'] is False


def test_pipeline_process_tokens_accepts_token_dataclasses(mock_lt_pipeline):
    """process_tokens() should accept a list of typed Token dataclasses."""
    tokens = [
        Token(idx=0, text='caza', is_word=True, whitespace_after=' '),
        Token(idx=1, text='.', is_word=False, whitespace_after=''),
    ]
    results = process_tokens(tokens, 'caza.')

    assert 0 in results
    assert results[0]['to_be_normalized'] is True
    assert 1 in results
    assert results[1]['to_be_normalized'] is False


def test_pipeline_flags_dictionary_invalid_token_when_lt_request_fails(mocker):
    """LT failures should fall back to dictionary-only normalization decisions."""
    dictionary = mocker.Mock()
    dictionary.get_candidates.return_value = ["casa"]
    dictionary.is_valid_word.return_value = False
    mocker.patch('app.text_pipeline.pipeline._get_dictionary', return_value=dictionary)

    lt_client = mocker.Mock()
    lt_client.check_text.return_value = []
    mocker.patch('app.text_pipeline.pipeline._get_languagetool', return_value=lt_client)

    results = process_tokens(
        [Token(idx=0, text='caza', is_word=True, whitespace_after=' ')],
        'caza ',
    )

    assert results[0]['to_be_normalized'] is True
    assert results[0]['suggestions'] == ["casa"]


def test_pipeline_and_db_insertion(app, mock_lt_pipeline):
    """End-to-end: pipeline output is correctly persisted via add_text."""
    sample_text = "A casa e a caza."
    results = process_text(sample_text)

    text_obj = Text(source_file_name="integration_test.txt")
    tokens_with_suggestions = []

    for t in results.values():
        new_token = DbToken(
            token_text=t["text"],
            is_word=t["is_word"],
            position=t["idx"],
            to_be_normalized=t["to_be_normalized"],
            whitespace_after=t["whitespace_after"],
        )
        tokens_with_suggestions.append((new_token, t.get("suggestions", [])))

    text_id = add_text(text_obj, tokens_with_suggestions, db.session)
    assert text_id is not None

    saved_text = db.session.get(Text, text_id)
    assert saved_text is not None
    assert saved_text.source_file_name == "integration_test.txt"
    assert len(saved_text.tokens) == len(results)

    db_caza = db.session.query(DbToken).filter_by(text_id=text_id, token_text='caza').first()
    assert db_caza is not None
    assert db_caza.to_be_normalized is True
    assert len(db_caza.suggestions) > 0

    caza_result = next(t for t in results.values() if t['text'] == 'caza')
    saved_suggestion_texts = [s.token_text for s in db_caza.suggestions]
    for sug in caza_result['suggestions']:
        assert sug in saved_suggestion_texts

    db_casa = db.session.query(DbToken).filter_by(text_id=text_id, token_text='casa').first()
    assert db_casa is not None
    assert db_casa.to_be_normalized is False
