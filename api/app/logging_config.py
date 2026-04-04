import json
import logging
import os
import socket
import threading
import time
import traceback
import uuid
from contextvars import ContextVar
from datetime import datetime
from pathlib import Path

from redis import Redis
from redis.exceptions import RedisError


_request_id_ctx = ContextVar('request_id', default=None)
_trace_id_ctx = ContextVar('trace_id', default=None)
_user_id_ctx = ContextVar('user_id', default=None)
_task_id_ctx = ContextVar('celery_task_id', default=None)

_producer_lock = threading.Lock()
_producer_handler = None
_consumer_thread = None


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


class RedisStreamHandler(logging.Handler):
    def __init__(self, redis_url, stream_key, stream_maxlen):
        super().__init__()
        self.stream_key = stream_key
        self.stream_maxlen = stream_maxlen
        self.client = Redis.from_url(redis_url, decode_responses=True)

    def emit(self, record):
        event = self._build_event(record)
        if not event:
            return

        try:
            self.client.xadd(
                self.stream_key,
                {'event': json.dumps(event, ensure_ascii=False)},
                maxlen=self.stream_maxlen,
                approximate=True,
            )
        except RedisError:
            # Fail-open behavior by design.
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
            elif '.celery' in record.name:
                source = 'celery'
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
                'celery_task_id': event.get('celery_task_id') or _task_id_ctx.get(),
            }
        )

        if record.exc_info:
            event['exception'] = ''.join(traceback.format_exception(*record.exc_info))

        return redact_sensitive_data(_safe_json(event))


def configure_stream_logging(config):
    global _producer_handler

    with _producer_lock:
        if _producer_handler is not None:
            return

        handler = RedisStreamHandler(
            redis_url=config.get('LOG_REDIS_URL'),
            stream_key=config.get('LOG_STREAM_KEY'),
            stream_maxlen=config.get('LOG_STREAM_MAXLEN'),
        )

        root_logger = logging.getLogger()
        root_logger.setLevel(_normalize_level(config.get('LOG_LEVEL', 'INFO')))
        root_logger.addHandler(handler)
        _producer_handler = handler


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


def bind_task_context(task_id=None):
    if task_id:
        _task_id_ctx.set(str(task_id))


def clear_task_context():
    _task_id_ctx.set(None)


def _rotate_if_needed(file_path, max_bytes):
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
    if source == 'celery':
        return 'celery_worker.jsonl'
    return 'app.jsonl'


def _flush_events(logs_root_dir, max_file_bytes, buffered_records):
    logs_root = Path(logs_root_dir)
    logs_root.mkdir(parents=True, exist_ok=True)

    grouped = {}
    for _, event in buffered_records:
        file_name = _resolve_target_filename(event)
        grouped.setdefault(file_name, []).append(event)

    for file_name, events in grouped.items():
        path = logs_root / file_name
        _rotate_if_needed(path, max_file_bytes)
        with path.open('a', encoding='utf-8') as stream:
            for event in events:
                stream.write(json.dumps(event, ensure_ascii=False) + '\n')


def _consume_stream_loop(config):
    redis_client = Redis.from_url(config.get('LOG_REDIS_URL'), decode_responses=True)
    stream_key = config.get('LOG_STREAM_KEY')
    group = config.get('LOG_STREAM_GROUP')
    consumer = config.get('LOG_STREAM_CONSUMER') or f"{socket.gethostname()}-{os.getpid()}"
    flush_batch_size = int(config.get('LOG_FLUSH_BATCH_SIZE', 500))
    flush_interval = float(config.get('LOG_FLUSH_INTERVAL_SECONDS', 2))
    max_file_bytes = int(config.get('LOG_FILE_MAX_BYTES', 512 * 1024 * 1024))
    logs_root_dir = config.get('LOG_ROOT_DIR')

    while True:
        try:
            redis_client.xgroup_create(stream_key, group, id='0', mkstream=True)
            break
        except RedisError as exc:
            if 'BUSYGROUP' in str(exc):
                break
            time.sleep(1)

    pending = []
    last_flush = time.monotonic()

    while True:
        try:
            response = redis_client.xreadgroup(
                groupname=group,
                consumername=consumer,
                streams={stream_key: '>'},
                count=flush_batch_size,
                block=1000,
            )
        except RedisError:
            time.sleep(1)
            continue

        if response:
            for _, entries in response:
                for entry_id, fields in entries:
                    raw_event = fields.get('event')
                    if not raw_event:
                        continue
                    try:
                        event = json.loads(raw_event)
                    except json.JSONDecodeError:
                        event = {
                            'timestamp': _now_local_iso(),
                            'level': 'ERROR',
                            'source': 'app',
                            'message': 'Invalid log event payload',
                            'raw_event': _truncate(raw_event),
                        }
                    pending.append((entry_id, event))

        should_flush = (
            len(pending) >= flush_batch_size
            or (pending and (time.monotonic() - last_flush) >= flush_interval)
        )

        if not should_flush:
            continue

        try:
            _flush_events(logs_root_dir, max_file_bytes, pending)
        except Exception:
            time.sleep(1)
            continue

        for entry_id, _ in pending:
            try:
                redis_client.xack(stream_key, group, entry_id)
            except RedisError:
                continue

        pending.clear()
        last_flush = time.monotonic()


def start_stream_consumer(config):
    global _consumer_thread

    with _producer_lock:
        if _consumer_thread and _consumer_thread.is_alive():
            return

        _consumer_thread = threading.Thread(
            target=_consume_stream_loop,
            args=(config,),
            daemon=True,
            name='redis-log-stream-consumer',
        )
        _consumer_thread.start()