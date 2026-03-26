import pytest
from app.text_processor import TextProcessor
from app.database.models import Text, Token, Suggestion
from app.database.queries import add_text
from app.extensions import db

@pytest.fixture
def mock_text_processor(mocker):
    """
    Fixture that returns a TextProcessor with LLM calls mocked out
    to avoid external dependency/network calls during tests.
    """
    processor = TextProcessor()

    # Avoid external LLM call and provide deterministic correction for this test case
    mocker.patch.object(processor, '_get_llm_corrections', return_value={'caza': ['casa']})
    
    return processor

def test_processor_and_db_insertion(app, mock_text_processor):
    """
    Integration test to verify:
    1. TextProcessor generates candidates for tokens (using real HunSpell/SpellChecker).
    2. Results are correctly inserted into the database via add_text.
    3. Relationships (Suggestions) are correctly preserved.
    """
    
    # 1. Process a sample text with a known error
    # "casa" is correct, "caza" is incorrect
    sample_text = "A casa e a caza." 
    
    # Run the processor
    results = mock_text_processor.process_text(sample_text)
    
    # Verify results structure
    assert len(results) > 0
    
    # Check if "caza" was detected as incorrect
    tokens_list = list(results.values())
    caza_token_data = next((t for t in tokens_list if t['text'] == 'caza'), None)
    
    assert caza_token_data is not None, "Token 'caza' not found in results"
    assert caza_token_data['to_be_normalized'] is True, "'caza' should be flagged for normalization"
    assert len(caza_token_data['suggestions']) > 0, "Should have suggestions for 'caza'"
    
    # 2. Prepare data for add_text (Simulating what tasks.py does)
    from app.database import models
    
    text_obj = models.Text(source_file_name="integration_test.txt")
    tokens_with_suggestions = []

    for t in results.values():
        new_token = models.Token(
            token_text = t["text"],
            is_word = t["is_word"],
            position = t["idx"],
            to_be_normalized = t["to_be_normalized"],
            whitespace_after = t["whitespace_after"]
        )
        tokens_with_suggestions.append((new_token, t.get("suggestions", [])))

    # 3. Insert into DB
    # We use the db session from the app fixture
    # Note: add_text expects a session-like object that has .add(), .commit()
    # Flask-SQLAlchemy 3.x requires using db.session
    text_id = add_text(text_obj, tokens_with_suggestions, db.session)
    
    assert text_id is not None
    
    # 4. Verify DB state
    saved_text = db.session.get(Text, text_id)
    assert saved_text is not None
    assert saved_text.source_file_name == "integration_test.txt"
    
    # Verify token count
    # "A", " ", "casa", " ", "e", " ", "a", " ", "caza", "." (maybe punctuation is separate or attached depending on tokenizer)
    # Spacy tokenizer usually splits punctuation.
    # "A", "casa", "e", "a", "caza", "." -> 6 tokens + spaces?
    # TextProcessor output includes tokens for everything Spacy produces.
    assert len(saved_text.tokens) == len(results)
    
    # Verify the incorrect token in DB
    db_caza_token = db.session.query(Token).filter_by(text_id=text_id, token_text='caza').first()
    assert db_caza_token is not None
    assert db_caza_token.to_be_normalized is True
    
    # Verify suggestions are linked in the DB
    assert len(db_caza_token.suggestions) > 0
    suggestion_texts = [s.token_text for s in db_caza_token.suggestions]
    
    # Ensure the suggestions we saw in the processor result are actually in the DB
    for sug in caza_token_data['suggestions']:
        assert sug in suggestion_texts

    # Verify a correct token
    db_casa_token = db.session.query(Token).filter_by(text_id=text_id, token_text='casa').first()
    assert db_casa_token is not None
    assert db_casa_token.to_be_normalized is False
