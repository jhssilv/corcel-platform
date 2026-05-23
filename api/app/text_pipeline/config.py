"""Config accessors for the text processing pipeline.

Components read their settings by calling the helpers in this module.
Each helper tries ``current_app.config`` first (available during Flask
request and application contexts) and falls back to the class-level
defaults defined in :class:`app.config.Config` when no app context
exists (Celery workers, standalone scripts, tests).

Usage::

    from .config import ollama_base_url, nlp_hunspell_dic

    url = ollama_base_url()   # → value from current_app.config or Config default
"""

from flask import current_app

from ..config import Config


def _cfg(key: str):
    """Return *key* from Flask app config if an app context is active,
    otherwise fall back to the class-level default on :class:`~app.config.Config`.

    Args:
        key: Uppercase config key, e.g. ``"OLLAMA_BASE_URL"``.
    """
    try:
        return current_app.config[key]
    except RuntimeError:
        # No active Flask application context (Celery worker, test, script).
        return getattr(Config, key)


# ---------------------------------------------------------------------------
# Ollama / LLM
# ---------------------------------------------------------------------------

def ollama_base_url() -> str:
    return _cfg('OLLAMA_BASE_URL')

def ollama_model() -> str:
    return _cfg('OLLAMA_MODEL')

def ollama_min_ctx() -> int:
    return _cfg('OLLAMA_MIN_CTX')

def ollama_max_ctx() -> int:
    return _cfg('OLLAMA_MAX_CTX')

def ollama_timeout() -> int:
    return _cfg('OLLAMA_TIMEOUT')

def ollama_temperature() -> float:
    return _cfg('OLLAMA_TEMPERATURE')

def ignore_llm_if_on_cpu() -> bool:
    return _cfg('IGNORE_LLM_IF_ON_CPU')

def llm_device() -> str:
    return _cfg('LLM_DEVICE')


# ---------------------------------------------------------------------------
# Spell-check / dictionary
# ---------------------------------------------------------------------------

def nlp_max_suggestions() -> int:
    return _cfg('NLP_MAX_SUGGESTIONS')

def nlp_hunspell_dic() -> str:
    return _cfg('NLP_HUNSPELL_DIC')

def nlp_hunspell_aff() -> str:
    return _cfg('NLP_HUNSPELL_AFF')

def nlp_spellchecker_dict() -> str | None:
    return _cfg('NLP_SPELLCHECKER_DICT')

def nlp_dict_download_url() -> str:
    return _cfg('NLP_DICT_DOWNLOAD_URL')

def nlp_dict_download_timeout() -> int:
    return _cfg('NLP_DICT_DOWNLOAD_TIMEOUT')
