import json
import logging
import threading
import traceback
from contextvars import ContextVar
from datetime import datetime
from pathlib import Path


_request_id_ctx = ContextVar('request_id', default=None)
_trace_id_ctx = ContextVar('trace_id', default=None)
_user_id_ctx = ContextVar('user_id', default=None)
_job_id_ctx = ContextVar('job_id', default=None)

_handler_lock = threading.Lock()
_jsonl_handler = None


def _now_local_iso():
    return datetime.now().astimezone().isoformat(timespec='milliseconds')


def _normalize_level(log_level):
    if isinstance(log_level, int):
        return log_level
    return logging._nameToLevel.get(str(log_level).upper(), logging.INFO)


def _safe_json(value):
    if value is None:
        return None
    try:
        json.dumps(value)
        return value
    except Exception:
        return str(value)


def _truncate(value, max_chars=8000):
    if value is None:
        return None
    text = value if isinstance(value, str) else str(value)
    if len(text) <= max_chars:
        return text
    return f"{text[:max_chars]}... [truncated]"


def _is_sensitive_key(key):
    normalized = str(key).lower().replace('-', '_')
    sensitive_tokens = (
        'password',
        'authorization',
        'token',
        'jwt',
        'cookie',
        'session',
        'api_key',
        'apikey',
    )
    return any(token in normalized for token in sensitive_tokens)


def _mask_for_field(field_name):
    token = str(field_name).upper().replace('-', '_').replace(' ', '_')
    return f'[{token}]'


def redact_sensitive_data(value):
    if isinstance(value, dict):
        output = {}
        for key, inner_value in value.items():
            if _is_sensitive_key(key):
                output[key] = _mask_for_field(key)
            else:
                output[key] = redact_sensitive_data(inner_value)
        return output

    if isinstance(value, list):
        return [redact_sensitive_data(item) for item in value]

    return value


def sanitize_headers(headers, allowlist):
    sanitized = {}
    allowset = {item.lower() for item in allowlist}
    for key, value in headers.items():
        lower_key = key.lower()
        if lower_key not in allowset:
            continue
        if _is_sensitive_key(lower_key):
            sanitized[lower_key] = _mask_for_field(lower_key)
        else:
            sanitized[lower_key] = _truncate(value, 512)
    return sanitized


class StructuredAdapter(logging.LoggerAdapter):
    def process(self, msg, kwargs):
        extra = kwargs.setdefault('extra', {})
        event = extra.get('event', {})
        if not isinstance(event, dict):
            event = {}

        for key, value in self.extra.items():
            event.setdefault(key, value)

        extra['event'] = event
        return msg, kwargs


def get_logger(name, **event_defaults):
    return StructuredAdapter(logging.getLogger(name), event_defaults)


def _rotate_if_needed(file_path: Path, max_bytes: int):
    if not file_path.exists() or file_path.stat().st_size < max_bytes:
        return

    suffix = 1
    while True:
        rotated_path = file_path.with_name(f'{file_path.name}.{suffix}')
        if not rotated_path.exists():
            file_path.rename(rotated_path)
            break
        suffix += 1


def _resolve_target_filename(event):
    source = event.get('source', 'app')
    if source == 'route':
        return f"{event.get('blueprint') or 'http'}.jsonl"
    if source == 'task':
        module_name = event.get('task_module') or 'tasks'
        return f'{module_name}.jsonl'
    if source in {'job_worker', 'worker'}:
        return 'job_worker.jsonl'
    return 'app.jsonl'


class JsonlFileHandler(logging.Handler):
    def __init__(self, *, root_dir: str, max_file_bytes: int):
        super().__init__()
        self.root_dir = Path(root_dir)
        self.max_file_bytes = max_file_bytes
        self._write_lock = threading.Lock()

    def emit(self, record):
        event = self._build_event(record)
        if not event:
            return

        file_name = _resolve_target_filename(event)
        file_path = self.root_dir / file_name

        try:
            self.root_dir.mkdir(parents=True, exist_ok=True)
            with self._write_lock:
                _rotate_if_needed(file_path, self.max_file_bytes)
                with file_path.open('a', encoding='utf-8') as stream:
                    stream.write(json.dumps(event, ensure_ascii=False) + '\n')
        except Exception:
            return

    def _build_event(self, record):
        event = {}

        if hasattr(record, 'event') and isinstance(record.event, dict):
            event.update(record.event)

        source = event.get('source')
        if not source:
            if '.route.' in record.name:
                source = 'route'
            elif '.task.' in record.name:
                source = 'task'
            elif '.jobs.' in record.name or '.worker' in record.name:
                source = 'job_worker'
            else:
                source = 'app'

        event.update(
            {
                'timestamp': _now_local_iso(),
                'level': record.levelname,
                'logger': record.name,
                'message': record.getMessage(),
                'source': source,
                'request_id': event.get('request_id') or _request_id_ctx.get(),
                'trace_id': event.get('trace_id') or _trace_id_ctx.get(),
                'user_id': event.get('user_id') or _user_id_ctx.get(),
                'job_id': event.get('job_id') or _job_id_ctx.get(),
            }
        )

        if record.exc_info:
            event['exception'] = ''.join(traceback.format_exception(*record.exc_info))

        return redact_sensitive_data(_safe_json(event))


def configure_stream_logging(config):
    global _jsonl_handler

    with _handler_lock:
        if _jsonl_handler is not None:
            return

        handler = JsonlFileHandler(
            root_dir=config.get('LOG_ROOT_DIR'),
            max_file_bytes=int(config.get('LOG_FILE_MAX_BYTES', 512 * 1024 * 1024)),
        )

        root_logger = logging.getLogger()
        root_logger.setLevel(_normalize_level(config.get('LOG_LEVEL', 'INFO')))
        root_logger.addHandler(handler)
        _jsonl_handler = handler


def bind_request_context(request_id=None, trace_id=None, user_id=None):
    if request_id:
        _request_id_ctx.set(request_id)
    if trace_id:
        _trace_id_ctx.set(trace_id)
    if user_id is not None:
        _user_id_ctx.set(str(user_id))


def clear_request_context():
    _request_id_ctx.set(None)
    _trace_id_ctx.set(None)
    _user_id_ctx.set(None)


def bind_job_context(job_id=None):
    if job_id:
        _job_id_ctx.set(str(job_id))


def clear_job_context():
    _job_id_ctx.set(None)


def bind_task_context(job_id=None):
    bind_job_context(job_id)


def clear_task_context():
    clear_job_context()


def start_stream_consumer(_config):
    return None
