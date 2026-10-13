import pytest
from app.text_pipeline.tokenizer import Tokenizer, is_word_token


def test_is_word_token():
    # Valid words and compounds
    assert is_word_token("palavra") is True
    assert is_word_token("CASA") is True
    assert is_word_token("é") is True
    assert is_word_token("guarda-chuva") is True
    assert is_word_token("Disse-lhe") is True
    assert is_word_token("bem-te-vi") is True
    assert is_word_token("arco-íris") is True

    # Invalid non-words
    assert is_word_token("") is False
    assert is_word_token("-") is False
    assert is_word_token("--") is False
    assert is_word_token("---") is False
    assert is_word_token("-palavra") is False
    assert is_word_token("palavra-") is False
    assert is_word_token("palavra--outra") is False
    assert is_word_token("123") is False
    assert is_word_token("palavra123") is False
    assert is_word_token("palavra.") is False
    assert is_word_token("...") is False


def test_tokenizer_marks_hyphenated_words_as_words():
    tokenizer = Tokenizer()
    tokens = tokenizer.tokenize("O guarda-chuva é azul. Disse-lhe que sim.")

    tokens_by_text = {t.text: t for t in tokens}
    assert "guarda-chuva" in tokens_by_text
    assert tokens_by_text["guarda-chuva"].is_word is True

    assert "Disse-lhe" in tokens_by_text
    assert tokens_by_text["Disse-lhe"].is_word is True

    assert "." in tokens_by_text
    assert tokens_by_text["."].is_word is False
