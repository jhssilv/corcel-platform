"""Text processing pipeline orchestrator.

Coordinates the three-phase spell-check pipeline:

  Phase 1 — Generate dictionary candidates (Hunspell + SpellChecker).
  Phase 2 — Ask the LLM which tokens are incorrect (single batch call).
  Phase 3 — Merge dictionary candidates with LLM suggestions; decide
             ``to_be_normalized`` per token.

Usage::

    from app.text_pipeline import TextProcessingPipeline

    pipeline = TextProcessingPipeline()
    results = pipeline.process_text("O governo precisa fazer casas melhore.")
    # results: dict[int, dict]  — keyed by token position

For use inside Flask routes, obtain the shared instance from ``g``::

    from app.text_pipeline import get_pipeline
    pipeline = get_pipeline()
"""

import time

from .config import nlp_max_suggestions
from .dictionary import DictionaryService, match_case
from .llm_client import OllamaClient
from .models import ProcessedToken, Token
from .tokenizer import Tokenizer
from ..logging_config import get_logger

logger = get_logger('app.task.text_processor', source='task', task_module='text_task_logic')



class TextProcessingPipeline:
    """Orchestrates the full text-processing pipeline.

    Dependencies (``dictionary``, ``llm``) are injected via the
    constructor so they can be easily swapped in tests.

    Args:
        config: Pipeline configuration.  Defaults to env-var-derived values.
        dictionary: Dictionary service instance.  Created from *config* if omitted.
        llm: Ollama LLM client instance.  Created from *config* if omitted.
    """

    def __init__(
        self,
        dictionary: DictionaryService | None = None,
        llm: OllamaClient | None = None,
    ) -> None:
        self._dictionary = dictionary or DictionaryService()
        self._llm = llm or OllamaClient()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def process_text(self, text: str, llm_assists_detection: bool = True) -> dict[int, dict]:
        """Tokenise *text* and run the full pipeline.

        Args:
            text: Raw text string to process.
            llm_assists_detection: Passed through to :meth:`process_tokens`.

        Returns:
            ``dict[int, dict]`` — token results keyed by position index.
        """
        tokenizer = Tokenizer()
        tokens = tokenizer.tokenize(text)
        return self.process_tokens(tokens, text, llm_assists_detection=llm_assists_detection)

    def process_tokens(
        self,
        tokens: list[Token],
        text: str,
        llm_assists_detection: bool = True,
    ) -> dict[int, dict]:
        """Run the full pipeline on a pre-tokenised token list.

        Args:
            tokens: Ordered list of :class:`~.models.Token` dataclasses.
            text: Full original text string, used as LLM context.
            llm_assists_detection: If ``True`` (default), the LLM helps
                decide whether a word is incorrect and can flag words
                that the dictionary considers valid.  If ``False``, only
                the dictionaries determine correctness; the LLM still
                provides suggestions for words the dictionary flags.

        Returns:
            ``dict[int, dict]`` — keyed by token index.
        """
        start = time.perf_counter()
        logger.info(
            'Text processing started',
            extra={'event': {
                'status': 'started',
                'token_count': len(tokens),
                'llm_assists_detection': llm_assists_detection,
            }},
        )

        try:
            candidates = self._phase1_generate_candidates(tokens)
            llm_corrections = self._phase2_llm_corrections(text)
            results = self._phase3_merge(tokens, candidates, llm_corrections, llm_assists_detection)

            logger.info(
                'Text processing finished',
                extra={'event': {
                    'status': 'success',
                    'duration_ms': int((time.perf_counter() - start) * 1000),
                    'token_count': len(results),
                }},
            )
            return {idx: pt.to_dict() for idx, pt in results.items()}

        except Exception:
            logger.exception(
                'Text processing finished with error',
                extra={'event': {
                    'status': 'error',
                    'duration_ms': int((time.perf_counter() - start) * 1000),
                }},
            )
            raise

    # ------------------------------------------------------------------
    # Phase 1 — Dictionary candidate generation
    # ------------------------------------------------------------------

    def _phase1_generate_candidates(
        self, tokens: list[Token]
    ) -> dict[int, list[str]]:
        """Generate correction candidates for each word token.

        Non-word tokens (punctuation, numbers, hyphenated non-words) are
        skipped; a ``ProcessedToken`` with ``is_word=False`` is the
        caller's responsibility to handle.

        Returns:
            ``{token.idx: [case-matched candidate, …]}``
        """
        candidates: dict[int, list[str]] = {}
        for token in tokens:
            if not token.is_word or not token.text.replace("-", "").isalpha():
                continue
            candidates[token.idx] = self._dictionary.get_candidates(token.text)
        return candidates

    # ------------------------------------------------------------------
    # Phase 2 — LLM correction batch
    # ------------------------------------------------------------------

    def _phase2_llm_corrections(self, text: str) -> dict[str, list[str]]:
        """Delegate to the LLM client; return empty dict on any failure."""
        return self._llm.get_corrections(text)

    # ------------------------------------------------------------------
    # Phase 3 — Merge and decide to_be_normalized
    # ------------------------------------------------------------------

    def _phase3_merge(
        self,
        tokens: list[Token],
        candidates: dict[int, list[str]],
        llm_corrections: dict[str, list[str]],
        llm_assists_detection: bool,
    ) -> dict[int, ProcessedToken]:
        """Merge all signals into final :class:`~.models.ProcessedToken` objects."""
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
            dict_is_correct = self._dictionary.is_valid_word(token.text)
            llm_flagged = word_lower in llm_corrections

            to_be_normalized = self._decide_normalization(
                dict_is_correct, llm_flagged, llm_corrections.get(word_lower, []),
                llm_assists_detection,
            )

            suggestions = self._build_suggestions(
                token.text, word_lower, llm_flagged, llm_corrections,
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

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _decide_normalization(
        dict_is_correct: bool,
        llm_flagged: bool,
        llm_suggestions: list[str],
        llm_assists_detection: bool,
    ) -> bool:
        """Apply the correctness decision matrix.

        With LLM assistance (``llm_assists_detection=True``):

        +------------------+-------------+-------------------------------+
        | dict_is_correct  | llm_flagged | to_be_normalized              |
        +==================+=============+===============================+
        | False            | True        | True                          |
        +------------------+-------------+-------------------------------+
        | True             | True        | True only if LLM has          |
        |                  |             | suggestions (confident flag)   |
        +------------------+-------------+-------------------------------+
        | False            | False       | False (LLM overrides dict)    |
        +------------------+-------------+-------------------------------+
        | True             | False       | False                         |
        +------------------+-------------+-------------------------------+

        Without LLM assistance: dictionary alone decides.
        """
        if not llm_assists_detection:
            return not dict_is_correct

        if llm_flagged and not dict_is_correct:
            return True
        if llm_flagged and dict_is_correct:
            return bool(llm_suggestions)
        return False

    @staticmethod
    def _build_suggestions(
        word: str,
        word_lower: str,
        llm_flagged: bool,
        llm_corrections: dict[str, list[str]],
        dict_candidates: list[str],
    ) -> list[str]:
        """Build the final suggestion list: LLM first, then dictionary.

        LLM suggestions are case-matched to the original word.
        Duplicates and the word itself are removed.
        Total is capped at ``_MAX_SUGGESTIONS``.
        """
        suggestions: list[str] = []

        if llm_flagged:
            for raw in llm_corrections[word_lower]:
                matched = match_case(word, raw)
                if matched not in suggestions and matched.lower() != word_lower:
                    suggestions.append(matched)

        for candidate in dict_candidates:
            if candidate not in suggestions:
                suggestions.append(candidate)

        return suggestions[:nlp_max_suggestions()]
