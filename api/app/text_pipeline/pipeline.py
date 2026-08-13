"""Text processing pipeline orchestrator.

Coordinates the three-phase spell-check pipeline:

  Phase 1 — Generate dictionary candidates (Hunspell + SpellChecker).
  Phase 2 — Ask the LLM which tokens are incorrect (single batch call).
  Phase 3 — Merge dictionary candidates with LLM suggestions; decide
             ``to_be_normalized`` per token.

Usage::

    from app.text_pipeline import process_text

    results = process_text("O governo precisa fazer casas melhore.")
    # results: dict[int, dict]  — keyed by token position
"""

import time
from typing import TYPE_CHECKING

from . import config as cfg
from .config import nlp_max_suggestions
from .dictionary import DictionaryService, match_case
from .models import ProcessedToken, Token
from .tokenizer import Tokenizer

if TYPE_CHECKING:
    from .llm_client import OllamaClient


_dictionary = None
_llm = None


def _get_dictionary() -> DictionaryService:
    global _dictionary
    if _dictionary is None:
        _dictionary = DictionaryService()
    return _dictionary


def _llm_is_disabled() -> bool:
    return cfg.ignore_llm_if_on_cpu() and cfg.llm_device() == "cpu"


def _get_llm() -> "OllamaClient | None":
    global _llm
    if _llm is not None:
        return _llm

    if _llm_is_disabled():
        return None

    from .llm_client import OllamaClient

    _llm = OllamaClient()
    return _llm


def process_text(text: str, llm_assists_detection: bool = True) -> dict[int, dict]:
    """Tokenise *text* and run the full pipeline.

    Args:
        text: Raw text string to process.
        llm_assists_detection: Passed through to :func:`process_tokens`.

    Returns:
        ``dict[int, dict]`` — token results keyed by position index.
    """
    tokenizer = Tokenizer()
    tokens = tokenizer.tokenize(text)
    return process_tokens(tokens, text, llm_assists_detection=llm_assists_detection)


def process_tokens(
    tokens: list[Token],
    text: str,
    llm_assists_detection: bool = True,
) -> dict[int, dict]:
    """Run the full pipeline on a pre-tokenised token list."""
    try:
        candidates = _phase1_generate_candidates(tokens)
        llm_corrections = _phase2_llm_corrections(text)
        effective_llm_assists_detection = (
            llm_assists_detection and llm_corrections is not None
        )
        results = _phase3_merge(
            tokens,
            candidates,
            llm_corrections or {},
            effective_llm_assists_detection,
        )

        return {idx: pt.to_dict() for idx, pt in results.items()}

    except Exception:
        raise


def _phase1_generate_candidates(tokens: list[Token]) -> dict[int, list[str]]:
    """Generate correction candidates for each word token."""
    dictionary = _get_dictionary()
    candidates: dict[int, list[str]] = {}
    for token in tokens:
        if not token.is_word or not token.text.replace("-", "").isalpha():
            continue
        candidates[token.idx] = dictionary.get_candidates(token.text)
    return candidates


def _phase2_llm_corrections(text: str) -> dict[str, list[str]] | None:
    """Delegate to the LLM client; return ``None`` when it is unavailable."""
    llm = _get_llm()
    if llm is None:
        return None
    return llm.get_corrections(text)


def _phase3_merge(
    tokens: list[Token],
    candidates: dict[int, list[str]],
    llm_corrections: dict[str, list[str]],
    llm_assists_detection: bool,
) -> dict[int, ProcessedToken]:
    """Merge all signals into final :class:`~.models.ProcessedToken` objects."""
    dictionary = _get_dictionary()
    results: dict[int, ProcessedToken] = {}

    for token in tokens:
        # Non-word tokens pass through unchanged.
        if not token.is_word or not token.text.replace("-", "").isalpha():
            results[token.idx] = ProcessedToken(
                idx=token.idx,
                text=token.text,
                is_word=False,
                whitespace_after=token.whitespace_after,
            )
            continue

        word_lower = token.text.lower()
        dict_is_correct = dictionary.is_valid_word(token.text)
        llm_flagged = word_lower in llm_corrections

        to_be_normalized = _decide_normalization(
            dict_is_correct,
            llm_flagged,
            llm_corrections.get(word_lower, []),
            llm_assists_detection,
        )

        suggestions = _build_suggestions(
            token.text,
            word_lower,
            llm_flagged,
            llm_corrections,
            candidates.get(token.idx, []),
        )

        results[token.idx] = ProcessedToken(
            idx=token.idx,
            text=token.text,
            is_word=True,
            whitespace_after=token.whitespace_after,
            to_be_normalized=to_be_normalized,
            suggestions=suggestions,
        )

    return results


def _decide_normalization(
    dict_is_correct: bool,
    llm_flagged: bool,
    llm_suggestions: list[str],
    llm_assists_detection: bool,
) -> bool:
    """Apply the correctness decision matrix."""
    if not llm_assists_detection:
        return not dict_is_correct

    if llm_flagged and not dict_is_correct:
        return True
    if llm_flagged and dict_is_correct:
        return bool(llm_suggestions)
    return False


def _build_suggestions(
    word: str,
    word_lower: str,
    llm_flagged: bool,
    llm_corrections: dict[str, list[str]],
    dict_candidates: list[str],
) -> list[str]:
    """Build the final suggestion list: LLM first, then dictionary."""
    suggestions: list[str] = []

    if llm_flagged:
        for raw in llm_corrections[word_lower]:
            matched = match_case(word, raw)
            if matched not in suggestions and matched.lower() != word_lower:
                suggestions.append(matched)

    for candidate in dict_candidates:
        if candidate not in suggestions:
            suggestions.append(candidate)

    return suggestions[: nlp_max_suggestions()]
