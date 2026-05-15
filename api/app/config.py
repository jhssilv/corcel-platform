import os
from datetime import timedelta


PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


class Config:
    # --- Flask / Core --------------------------------------------------------

    FLASK_APP = os.getenv('FLASK_APP', 'api/src/app')

    SECRET_KEY = os.getenv('SECRET_KEY')

    if SECRET_KEY is None:
        raise ValueError("SECRET_KEY environment variable is not set.")

    # --- Database ------------------------------------------------------------

    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///default.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- Authentication ------------------------------------------------------

    JWT_TOKEN_LOCATION = ['cookies']
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)

    # --- Celery / Redis -------------------------------------------------------

    CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
    CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
    RATELIMIT_STORAGE_URI = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

    # --- Logging -------------------------------------------------------------

    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_REDIS_URL = os.getenv('LOG_REDIS_URL', os.getenv('REDIS_URL', 'redis://localhost:6379/0'))
    LOG_STREAM_KEY = os.getenv('LOG_STREAM_KEY', 'corcel:logs:stream')
    LOG_STREAM_GROUP = os.getenv('LOG_STREAM_GROUP', 'corcel:logs:writer')
    LOG_STREAM_MAXLEN = int(os.getenv('LOG_STREAM_MAXLEN', '200000'))
    LOG_FLUSH_BATCH_SIZE = int(os.getenv('LOG_FLUSH_BATCH_SIZE', '500'))
    LOG_FLUSH_INTERVAL_SECONDS = float(os.getenv('LOG_FLUSH_INTERVAL_SECONDS', '2'))
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
    # Keys consumed by app.text_pipeline.  All names are prefixed with OLLAMA_
    # or NLP_ to avoid collisions with Flask / Celery built-ins.

    # Ollama LLM endpoint
    OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
    OLLAMA_MODEL = 'gemma3:4b'
    OLLAMA_MIN_CTX = int(os.getenv('OLLAMA_MIN_CTX', '1024'))
    OLLAMA_MAX_CTX = int(os.getenv('OLLAMA_MAX_CTX', '8192'))
    OLLAMA_TIMEOUT = 120        # seconds — hard-coded; override via subclass if needed
    OLLAMA_TEMPERATURE = 0.1

    # Spell-check / dictionary
    NLP_MAX_SUGGESTIONS = 7
    NLP_HUNSPELL_DIC = os.getenv('HUNSPELL_DIC', '/usr/share/hunspell/pt_BR.dic')
    NLP_HUNSPELL_AFF = os.getenv('HUNSPELL_AFF', '/usr/share/hunspell/pt_BR.aff')
    NLP_SPELLCHECKER_DICT = os.getenv('SPELLCHECKER_DICT')     # None -> use built-in path
    NLP_DICT_DOWNLOAD_URL = 'https://www.ime.usp.br/~pf/dicios/br-utf8.txt'
    NLP_DICT_DOWNLOAD_TIMEOUT = 30  # seconds