import socket
import uuid
from datetime import datetime, timedelta
from types import SimpleNamespace
from typing import Any

from sqlalchemy import and_, or_

from .database import models


TERMINAL_JOB_STATES = {
    models.BackgroundJobState.SUCCESS,
    models.BackgroundJobState.FAILURE,
}


def utcnow() -> datetime:
    return datetime.utcnow()


def build_worker_id() -> str:
    return f'{socket.gethostname()}-{uuid.uuid4()}'


def create_background_job(
    session,
    *,
    kind: models.BackgroundJobKind,
    created_by_user_id: int,
    payload_json: dict[str, Any],
    status_message: str = 'Waiting...',
) -> models.BackgroundJob:
    job = models.BackgroundJob(
        id=str(uuid.uuid4()),
        kind=kind,
        state=models.BackgroundJobState.PENDING,
        created_by_user_id=created_by_user_id,
        payload_json=payload_json,
        status_message=status_message,
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def get_background_job(session, job_id: str) -> models.BackgroundJob | None:
    return session.get(models.BackgroundJob, job_id)


def serialize_background_job_status(job: models.BackgroundJob) -> dict[str, Any]:
    result = job.result_json if isinstance(job.result_json, dict) else None
    failed_files = []
    if isinstance(result, dict):
        failed_files = result.get('failed_files') or []

    return {
        'state': job.state.name,
        'status': job.status_message,
        'current': job.current,
        'total': job.total,
        'result': job.result_json,
        'error': job.error_message,
        'failed_files': failed_files,
    }


def claim_next_background_job(
    session,
    *,
    worker_id: str,
    stale_after_seconds: int = 300,
) -> models.BackgroundJob | None:
    stale_cutoff = utcnow() - timedelta(seconds=stale_after_seconds)

    query = (
        session.query(models.BackgroundJob)
        .filter(
            or_(
                models.BackgroundJob.state == models.BackgroundJobState.PENDING,
                and_(
                    models.BackgroundJob.state == models.BackgroundJobState.RUNNING,
                    models.BackgroundJob.heartbeat_at.isnot(None),
                    models.BackgroundJob.heartbeat_at < stale_cutoff,
                ),
            )
        )
        .order_by(models.BackgroundJob.created_at.asc(), models.BackgroundJob.id.asc())
    )

    if session.bind and session.bind.dialect.name == 'postgresql':
        query = query.with_for_update(skip_locked=True)

    job = query.first()
    if job is None:
        session.rollback()
        return None

    now = utcnow()
    job.state = models.BackgroundJobState.RUNNING
    job.claimed_at = now
    job.claimed_by = worker_id
    job.heartbeat_at = now
    job.started_at = job.started_at or now
    job.finished_at = None
    job.attempts = (job.attempts or 0) + 1
    job.error_message = None
    session.commit()
    session.refresh(job)
    return job


def touch_background_job(
    session,
    job: models.BackgroundJob,
    *,
    current: int | None = None,
    total: int | None = None,
    status_message: str | None = None,
) -> models.BackgroundJob:
    if current is not None:
        job.current = current
    if total is not None:
        job.total = total
    if status_message is not None:
        job.status_message = status_message
    job.heartbeat_at = utcnow()
    session.commit()
    session.refresh(job)
    return job


def mark_background_job_success(
    session,
    job: models.BackgroundJob,
    *,
    result_json: dict[str, Any] | list[Any] | None = None,
    status_message: str = 'Finished',
    current: int | None = None,
    total: int | None = None,
) -> models.BackgroundJob:
    now = utcnow()
    job.state = models.BackgroundJobState.SUCCESS
    job.result_json = result_json
    job.status_message = status_message
    job.error_message = None
    job.current = current
    job.total = total
    job.heartbeat_at = now
    job.finished_at = now
    session.commit()
    session.refresh(job)
    return job


def mark_background_job_failure(
    session,
    job: models.BackgroundJob,
    *,
    error_message: str,
    result_json: dict[str, Any] | list[Any] | None = None,
    current: int | None = None,
    total: int | None = None,
) -> models.BackgroundJob:
    now = utcnow()
    job.state = models.BackgroundJobState.FAILURE
    job.result_json = result_json
    job.status_message = 'Processing Failed'
    job.error_message = error_message
    job.current = current
    job.total = total
    job.heartbeat_at = now
    job.finished_at = now
    session.commit()
    session.refresh(job)
    return job


class BackgroundJobReporter:
    def __init__(self, session, job_id: str):
        self._session = session
        self._job_id = job_id
        self.request = SimpleNamespace(id=job_id)

    def report_progress(
        self,
        *,
        current: int | None = None,
        total: int | None = None,
        status_message: str | None = None,
    ) -> None:
        job = get_background_job(self._session, self._job_id)
        if job is None:
            return

        touch_background_job(
            self._session,
            job,
            current=current,
            total=total,
            status_message=status_message,
        )
