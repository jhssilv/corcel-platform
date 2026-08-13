import os
from datetime import timedelta


PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def _get_bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default

    normalized = value.strip().lower()
    if normalized not in {'true', 'false'}:
        raise ValueError(f"{name} environment variable must resolve to 'true' or 'false'.")

    return normalized == 'true'


def detect_llm_device() -> str:
    try:
        import torch
    except ImportError:
        return 'cpu'

    if torch.cuda.is_available():
        return 'cuda'

    mps_backend = getattr(torch.backends, 'mps', None)
    if mps_backend is not None and mps_backend.is_available():
        return 'mps'

    return 'cpu'


class Config:
    # --- Flask / Core --------------------------------------------------------

    FLASK_APP = os.getenv('FLASK_APP', 'api/src/app')

    SECRET_KEY = os.getenv('SECRET_KEY')

    if SECRET_KEY is None:
        raise ValueError("SECRET_KEY environment variable is not set.")

    FLASK_PYDANTIC_VALIDATION_ERROR_RAISE = True

    # --- Database ------------------------------------------------------------

    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///default.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- Authentication ------------------------------------------------------

    JWT_TOKEN_LOCATION = ['cookies']
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)

    # --- Background jobs / rate limiting ------------------------------------

    RATELIMIT_STORAGE_URI = 'memory://'
    TEXT_UPLOAD_RECONCILE_INTERVAL_SECONDS = int(os.getenv('TEXT_UPLOAD_RECONCILE_INTERVAL_SECONDS', '60'))
    TEXT_UPLOAD_STALE_AFTER_SECONDS = int(os.getenv('TEXT_UPLOAD_STALE_AFTER_SECONDS', '600'))
    TEXT_UPLOAD_MAX_PROCESSING_ATTEMPTS = int(os.getenv('TEXT_UPLOAD_MAX_PROCESSING_ATTEMPTS', '3'))
    JOB_WORKER_IDLE_SLEEP_SECONDS = float(os.getenv('JOB_WORKER_IDLE_SLEEP_SECONDS', '1'))

    # --- Logging -------------------------------------------------------------

    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE_MAX_BYTES = int(os.getenv('LOG_FILE_MAX_BYTES', str(512 * 1024 * 1024)))
    LOG_ROOT_DIR = os.getenv('LOG_ROOT_DIR', os.path.join(PROJECT_ROOT, 'logs'))

    LOG_HEADER_ALLOWLIST = [
        'content-type',
        'content-length',
        'user-agent',
        'x-request-id',
        'accept',
    ]

    # --- Text Processing Pipeline --------------------------------------------
    # Keys consumed by app.text_pipeline. All names are prefixed with OLLAMA_
    # or NLP_ to avoid collisions with Flask built-ins.

    # Ollama LLM endpoint
    OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
    OLLAMA_MODEL = 'gemma3:4b'
    OLLAMA_MIN_CTX = int(os.getenv('OLLAMA_MIN_CTX', '1024'))
    OLLAMA_MAX_CTX = int(os.getenv('OLLAMA_MAX_CTX', '8192'))
    OLLAMA_TIMEOUT = 120        # seconds — hard-coded; override via subclass if needed
    OLLAMA_TEMPERATURE = 0.1
    IGNORE_LLM_IF_ON_CPU = _get_bool_env('IGNORE_LLM_IF_ON_CPU', default=False)
    LLM_DEVICE = os.getenv('LLM_DEVICE', detect_llm_device()).strip().lower()

    # Spell-check / dictionary
    NLP_MAX_SUGGESTIONS = 7
    NLP_HUNSPELL_DIC = os.getenv('HUNSPELL_DIC', '/usr/share/hunspell/pt_BR.dic')
    NLP_HUNSPELL_AFF = os.getenv('HUNSPELL_AFF', '/usr/share/hunspell/pt_BR.aff')
    NLP_SPELLCHECKER_DICT = os.getenv('SPELLCHECKER_DICT')     # None -> use built-in path
    NLP_DICT_DOWNLOAD_URL = 'https://www.ime.usp.br/~pf/dicios/br-utf8.txt'
    NLP_DICT_DOWNLOAD_TIMEOUT = 30  # seconds
