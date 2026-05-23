"""Ollama LLM client for spell-check assistance.

Handles prompt construction, HTTP communication with the Ollama API,
and response parsing.  On failure it degrades gracefully so callers can
fall back to dictionary-only normalization.
"""

import json
import re

import requests

from . import config as cfg
from ..logging_config import get_logger

logger = get_logger('app.task.llm_client', source='task', task_module='text_task_logic')


class OllamaClient:
    """Communicates with an Ollama instance to obtain spell-check corrections.

    Configuration is read from the active Flask app config (via
    :mod:`.config`) at construction time, falling back to
    :class:`~app.config.Config` defaults when no app context is present.
    """

    def __init__(self) -> None:
        # Capture at construction time so the instance is context-independent.
        self._base_url = cfg.ollama_base_url().rstrip('/')
        self._model = cfg.ollama_model()
        self._min_ctx = cfg.ollama_min_ctx()
        self._max_ctx = cfg.ollama_max_ctx()
        self._timeout = cfg.ollama_timeout()
        self._temperature = cfg.ollama_temperature()
        self._ignore_if_on_cpu = cfg.ignore_llm_if_on_cpu()
        self._device = cfg.llm_device()

    # ------------------------------------------------------------------
    # Token / context estimation
    # ------------------------------------------------------------------

    @staticmethod
    def _estimate_token_count(text: str) -> int:
        """Heuristic token-count estimate for context-window sizing."""
        if not text:
            return 0
        char_estimate = (len(text) + 3) // 4
        word_estimate = len(re.findall(r"\S+", text))
        return max(char_estimate, word_estimate)

    def _compute_context_size(self, prompt: str, source_text: str) -> int:
        prompt_tokens = self._estimate_token_count(prompt)
        source_tokens = self._estimate_token_count(source_text)
        estimated_output_tokens = 96 + min(512, int(source_tokens * 1.8))

        estimated_total = int((prompt_tokens + estimated_output_tokens) * 1.15)
        estimated_total = max(self._min_ctx, estimated_total)

        if self._max_ctx < self._min_ctx:
            return estimated_total

        return min(estimated_total, self._max_ctx)

    # ------------------------------------------------------------------
    # Prompt
    # ------------------------------------------------------------------

    @staticmethod
    def _build_prompt(text: str) -> str:
        return (
            "Você é um corretor ortográfico de português brasileiro.\n"
            "Analise o texto abaixo e identifique TODAS as palavras escritas "
            "de forma incorreta, com erros ortográficos ou que não pertencem "
            "ao português padrão (incluindo palavras estrangeiras.\n\n"
            "Para CADA palavra incorreta, forneça:\n"
            '  - "word": a palavra exatamente como aparece no texto\n'
            '  - "suggestions": lista de até 5 sugestões de correção, '
            "ordenadas da mais provável para a menos provável\n\n"
            "Regras:\n"
            "- NÃO inclua palavras corretas.\n"
            "- NÃO altere nomes próprios, siglas ou abreviações.\n"
            "- Mantenha a capitalização original na chave 'word'.\n"
            "- Responda APENAS com um JSON array, sem texto adicional.\n\n"
            "Texto:\n"
            f'"""\n{text}\n"""\n\n'
            "Resposta (JSON array):"
        )

    # ------------------------------------------------------------------
    # HTTP call
    # ------------------------------------------------------------------

    def _generate(self, prompt: str, num_ctx: int | None = None) -> str:
        """Send a generation request to Ollama and return the raw response text."""
        payload: dict = {
            "model": self._model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": self._temperature,
            },
        }
        if num_ctx is not None:
            payload["options"]["num_ctx"] = num_ctx

        resp = requests.post(
            f"{self._base_url}/api/generate",
            json=payload,
            timeout=self._timeout,
        )
        resp.raise_for_status()
        return resp.json().get("response", "")

    # ------------------------------------------------------------------
    # Response parsing
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_response(raw: str) -> dict[str, list[str]] | None:
        """Parse the LLM's JSON-array response into ``{word_lower: [suggestions]}``.

        Handles common LLM quirks: markdown fenced code-blocks, leading
        prose before the JSON array, etc.  Returns ``None`` on
        unparseable output rather than raising.
        """
        text = raw.strip()

        # Strip markdown code fences
        if text.startswith("```"):
            lines = text.splitlines()
            lines = [line for line in lines if not line.strip().startswith("```")]
            text = "\n".join(lines).strip()

        try:
            items = json.loads(text)
        except json.JSONDecodeError:
            start = text.find("[")
            end = text.rfind("]")
            if start != -1 and end != -1:
                try:
                    items = json.loads(text[start: end + 1])
                except json.JSONDecodeError:
                    logger.warning('LLM response could not be parsed as JSON: %.500s', raw)
                    return None
            else:
                logger.warning('No JSON array found in LLM response: %.500s', raw)
                return None

        result: dict[str, list[str]] = {}
        for entry in items:
            if not isinstance(entry, dict):
                continue
            word = entry.get("word", "")
            suggestions = entry.get("suggestions", [])
            if word:
                result[word.lower()] = [s for s in suggestions if isinstance(s, str)]
        return result

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_corrections(self, text: str) -> dict[str, list[str]] | None:
        """Ask the LLM which words in *text* are misspelled.

        Returns:
            ``{word_lower: [suggestion, …]}`` for every word the LLM
            considers incorrect.  Returns an empty dict when the LLM is
            unreachable or returns unparseable output (graceful degradation).
        """
        if self._ignore_if_on_cpu and self._device == 'cpu':
            logger.info(
                'LLM request skipped because CPU-only execution is disabled',
                extra={'event': {'device': self._device}},
            )
            return None

        prompt = self._build_prompt(text)
        num_ctx = self._compute_context_size(prompt, text)

        logger.info(
            'LLM request context estimated',
            extra={
                'event': {
                    'model': self._model,
                    'estimated_prompt_tokens': self._estimate_token_count(prompt),
                    'estimated_source_tokens': self._estimate_token_count(text),
                    'num_ctx': num_ctx,
                }
            },
        )

        try:
            raw = self._generate(prompt, num_ctx=num_ctx)
        except Exception as exc:
            logger.warning(
                'LLM request failed, falling back to dictionary-only normalization',
                extra={'event': {'error': str(exc)}},
            )
            return None

        return self._parse_response(raw)
