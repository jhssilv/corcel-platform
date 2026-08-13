"""Text processing pipeline — public API.

Import surface for all consumers::

    from app.text_pipeline import process_text, Tokenizer

Flask integration (shared Tokenizer via ``g``)::

    # In app factory (app.py):
    from app.text_pipeline import init_tokenizer_extension
    init_tokenizer_extension(app)

    # In route/task code:
    from app.text_pipeline import get_tokenizer
    tokenizer = get_tokenizer()
"""

from flask import current_app, g

from .dictionary import DictionaryService
from .exceptions import ResourceLoadError
from .llm_client import OllamaClient
from .models import ProcessedToken, Token
from .pipeline import process_text, process_tokens
from .tokenizer import Tokenizer

__all__ = [
    "DictionaryService",
    "OllamaClient",
    "ProcessedToken",
    "ResourceLoadError",
    "process_text",
    "process_tokens",
    "Token",
    "Tokenizer",
    "get_tokenizer",
]


# ---------------------------------------------------------------------------
# Flask g-based shared Tokenizer (DI via Flask's request context)
# ---------------------------------------------------------------------------

def get_tokenizer() -> Tokenizer:
    """Return the request-scoped shared :class:`Tokenizer` from Flask ``g``.

    On first call within a request context the Tokenizer is instantiated
    and cached on ``g``; subsequent calls within the same request reuse
    it.  The spaCy model is itself lazy-loaded and cached on the Tokenizer
    instance, so it is only loaded once per worker process.

    Usage::

        from app.text_pipeline import get_tokenizer

        tokenizer = get_tokenizer()
        tokens = tokenizer.tokenize("some text")
    """
    if "tokenizer" not in g:
        g.tokenizer = Tokenizer()
    return g.tokenizer



