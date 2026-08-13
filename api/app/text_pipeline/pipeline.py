"""Text processing pipeline orchestrator.

Coordinates the spell-check pipeline:

  Phase 1 — Generate dictionary candidates (Hunspell + SpellChecker).
  Phase 2 — Check grammar and contextual spelling via LanguageTool.
  Phase 3 — Merge dictionary candidates with LanguageTool suggestions.
"""

import time
from typing import TYPE_CHECKING

from . import config as cfg
from .config import nlp_max_suggestions
from .dictionary import DictionaryService, match_case
from .models import ProcessedToken, Token
from .tokenizer import Tokenizer
from .languagetool_client import LanguageToolClient

_dictionary = None
_languagetool = None


def _get_dictionary() -> DictionaryService:
    global _dictionary
    if _dictionary is None:
        _dictionary = DictionaryService()
    return _dictionary

def _get_languagetool() -> LanguageToolClient:
    global _languagetool
    if _languagetool is None:
        _languagetool = LanguageToolClient()
    return _languagetool


def process_text(text: str) -> dict[int, dict]:
    tokenizer = Tokenizer()
    tokens = tokenizer.tokenize(text)
    return process_tokens(tokens, text)


def process_tokens(
    tokens: list[Token],
    text: str,
) -> dict[int, dict]:
    try:
        dictionary = _get_dictionary()
        lt_client = _get_languagetool()
        
        lt_matches = lt_client.check_text(text)
        
        results = {}
        char_offset = 0
        
        for token in tokens:
            token_len = len(token.text)
            token_end = char_offset + token_len
            
            if not token.is_word or not token.text.replace("-", "").isalpha():
                results[token.idx] = ProcessedToken(
                    idx=token.idx,
                    text=token.text,
                    is_word=False,
                    whitespace_after=token.whitespace_after,
                )
            else:
                lt_replacements = []
                lt_flagged = False
                
                for match in lt_matches:
                    match_start = match["offset"]
                    match_end = match_start + match["length"]
                    
                    if char_offset < match_end and token_end > match_start:
                        lt_flagged = True
                        for rep in match["replacements"]:
                            if rep not in lt_replacements:
                                lt_replacements.append(rep)
                
                dict_is_correct = dictionary.is_valid_word(token.text)
                dict_candidates = dictionary.get_candidates(token.text)
                
                to_be_normalized = lt_flagged or not dict_is_correct
                
                suggestions = []
                for rep in lt_replacements:
                    suggestions.append(rep)
                for cand in dict_candidates:
                    if cand not in suggestions:
                        suggestions.append(cand)
                        
                results[token.idx] = ProcessedToken(
                    idx=token.idx,
                    text=token.text,
                    is_word=True,
                    whitespace_after=token.whitespace_after,
                    to_be_normalized=to_be_normalized,
                    suggestions=suggestions[:nlp_max_suggestions()]
                )

            char_offset = token_end + len(token.whitespace_after)

        return {idx: pt.to_dict() for idx, pt in results.items()}

    except Exception:
        raise
