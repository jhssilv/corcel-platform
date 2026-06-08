from datetime import timedelta
from unittest.mock import MagicMock

from app.database.models import (
    ProcessingStatus,
    Suggestion,
    Text,
    TextUploadBatch,
    TextUploadBatchStatus,
    Token,
    TokensSuggestions,
    User,
)
from app.tasks.text_task_logic import run_process_single_text_pipeline
from app.text_upload_batches import enqueue_pending_batch_texts, reconcile_stale_text_upload_batches, utcnow


def _create_batch_with_texts(app, text_count: int = 1):
    from app.extensions import db

    with app.app_context():
        user = User(username="processor-admin", is_admin=True)
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        batch = TextUploadBatch(
            created_by_user_id=user.id,
            source_file_name="upload_batch.zip",
            status=TextUploadBatchStatus.QUEUED,
            total_files=1,
            created_texts=1,
            import_finished_at=utcnow(),
        )
        db.session.add(batch)
        db.session.flush()

        text_ids = []
        token_ids = []
        for index in range(text_count):
            text = Text(
                source_file_name=f"doc-{index}.txt",
                upload_batch_id=batch.id,
                processing_status=ProcessingStatus.PENDING,
            )
            db.session.add(text)
            db.session.flush()

            token = Token(
                text_id=text.id,
                token_text="helo",
                is_word=True,
                position=0,
                to_be_normalized=False,
                whitespace_after=" ",
            )
            db.session.add(token)
            db.session.flush()
            text_ids.append(text.id)
            token_ids.append(token.id)
        db.session.commit()

        return batch.id, text_ids, token_ids


def test_process_single_text_pipeline_marks_text_ready_and_updates_batch(app, mocker):
    from app.extensions import db

    batch_id, text_ids, token_ids = _create_batch_with_texts(app)
    text_id = text_ids[0]
    token_id = token_ids[0]
    mocker.patch(
        "app.tasks.text_task_logic.TextProcessingPipeline.process_tokens",
        return_value={0: {"to_be_normalized": True, "suggestions": ["hello"]}},
    )

    task = MagicMock()
    task.request.id = "task-123"

    with app.app_context():
        result = run_process_single_text_pipeline(task, text_id)
        saved_text = db.session.get(Text, text_id)
        saved_batch = db.session.get(TextUploadBatch, batch_id)
        saved_token = db.session.get(Token, token_id)

    assert result["processed"] == 1
    assert saved_text.processing_status == ProcessingStatus.READY
    assert saved_batch.status == TextUploadBatchStatus.COMPLETED
    assert saved_batch.processed_texts == 1
    assert saved_token.to_be_normalized is True


def test_process_single_text_pipeline_clears_previous_generated_state(app, mocker):
    from app.extensions import db

    batch_id, text_ids, token_ids = _create_batch_with_texts(app)
    text_id = text_ids[0]
    token_id = token_ids[0]

    with app.app_context():
        token = db.session.get(Token, token_id)
        suggestion = Suggestion(token_text="legacy")
        db.session.add(suggestion)
        db.session.flush()
        token.to_be_normalized = True
        db.session.add(TokensSuggestions(token_id=token.id, suggestion_id=suggestion.id))
        db.session.commit()

    mocker.patch(
        "app.tasks.text_task_logic.TextProcessingPipeline.process_tokens",
        return_value={0: {"to_be_normalized": False, "suggestions": []}},
    )

    task = MagicMock()
    task.request.id = "task-456"

    with app.app_context():
        run_process_single_text_pipeline(task, text_id)
        saved_token = db.session.get(Token, token_id)
        links = db.session.query(TokensSuggestions).filter_by(token_id=token_id).all()
        saved_batch = db.session.get(TextUploadBatch, batch_id)

    assert saved_token.to_be_normalized is False
    assert links == []
    assert saved_batch.status == TextUploadBatchStatus.COMPLETED


def test_reconcile_stale_text_upload_batches_requeues_orphaned_processing_text(app, mocker):
    from app.extensions import db

    batch_id, text_ids, _token_ids = _create_batch_with_texts(app)
    text_id = text_ids[0]

    with app.app_context():
        text = db.session.get(Text, text_id)
        batch = db.session.get(TextUploadBatch, batch_id)
        text.processing_status = ProcessingStatus.PROCESSING
        text.processing_attempts = 1
        text.processing_heartbeat_at = utcnow() - timedelta(minutes=20)
        text.processing_enqueued_at = utcnow() - timedelta(minutes=20)
        text.processing_task_id = "stale-task"
        batch.status = TextUploadBatchStatus.PROCESSING
        db.session.commit()

    enqueue = mocker.patch("app.tasks.celery_tasks.process_single_text_background.delay")
    enqueue.return_value.id = "requeued-task"

    with app.app_context():
        touched_batch_ids = reconcile_stale_text_upload_batches(
            db.session,
            stale_after_seconds=600,
            max_attempts=3,
        )
        saved_text = db.session.get(Text, text_id)
        saved_batch = db.session.get(TextUploadBatch, batch_id)

    assert touched_batch_ids == [batch_id]
    assert enqueue.called
    assert saved_text.processing_status == ProcessingStatus.PENDING
    assert saved_text.processing_task_id == "requeued-task"
    assert saved_batch.status == TextUploadBatchStatus.QUEUED


def test_reconcile_text_upload_batches_forces_processing_recovery_on_worker_start(app, mocker):
    from app.extensions import db

    batch_id, text_ids, _token_ids = _create_batch_with_texts(app)
    text_id = text_ids[0]

    with app.app_context():
        text = db.session.get(Text, text_id)
        batch = db.session.get(TextUploadBatch, batch_id)
        text.processing_status = ProcessingStatus.PROCESSING
        text.processing_attempts = 1
        text.processing_heartbeat_at = utcnow()
        text.processing_task_id = "worker-restart-task"
        batch.status = TextUploadBatchStatus.PROCESSING
        db.session.commit()

    enqueue = mocker.patch("app.tasks.celery_tasks.process_single_text_background.delay")
    enqueue.return_value.id = "recovered-task"

    with app.app_context():
        touched_batch_ids = reconcile_stale_text_upload_batches(
            db.session,
            stale_after_seconds=600,
            max_attempts=3,
            force_processing_recovery=True,
        )
        saved_text = db.session.get(Text, text_id)
        saved_batch = db.session.get(TextUploadBatch, batch_id)

    assert touched_batch_ids == [batch_id]
    assert enqueue.called
    assert saved_text.processing_status == ProcessingStatus.PENDING
    assert saved_text.processing_task_id == "recovered-task"
    assert saved_text.last_processing_error == "Recovered after worker restart."
    assert saved_batch.status == TextUploadBatchStatus.QUEUED


def test_reconcile_text_upload_batches_forces_pending_recovery_on_worker_start(app, mocker):
    from app.extensions import db

    batch_id, text_ids, _token_ids = _create_batch_with_texts(app)
    text_id = text_ids[0]

    with app.app_context():
        text = db.session.get(Text, text_id)
        batch = db.session.get(TextUploadBatch, batch_id)
        text.processing_status = ProcessingStatus.PENDING
        text.processing_attempts = 1
        text.processing_enqueued_at = utcnow()
        text.processing_task_id = "lost-redis-task"
        batch.status = TextUploadBatchStatus.PROCESSING
        db.session.commit()

    enqueue = mocker.patch("app.tasks.celery_tasks.process_single_text_background.delay")
    enqueue.return_value.id = "recovered-pending-task"

    with app.app_context():
        touched_batch_ids = reconcile_stale_text_upload_batches(
            db.session,
            stale_after_seconds=600,
            max_attempts=3,
            force_processing_recovery=True,
        )
        saved_text = db.session.get(Text, text_id)
        saved_batch = db.session.get(TextUploadBatch, batch_id)

    assert touched_batch_ids == [batch_id]
    assert enqueue.called
    assert saved_text.processing_status == ProcessingStatus.PENDING
    assert saved_text.processing_task_id == "recovered-pending-task"
    assert saved_text.last_processing_error == "Recovered pending text after worker restart."
    assert saved_batch.status == TextUploadBatchStatus.QUEUED


def test_reconcile_text_upload_batches_keeps_recent_pending_enqueue_in_periodic_mode(app, mocker):
    from app.extensions import db

    batch_id, text_ids, _token_ids = _create_batch_with_texts(app)
    text_id = text_ids[0]

    with app.app_context():
        text = db.session.get(Text, text_id)
        batch = db.session.get(TextUploadBatch, batch_id)
        text.processing_status = ProcessingStatus.PENDING
        text.processing_attempts = 1
        text.processing_enqueued_at = utcnow()
        text.processing_task_id = "recent-task"
        batch.status = TextUploadBatchStatus.QUEUED
        db.session.commit()

    enqueue = mocker.patch("app.tasks.celery_tasks.process_single_text_background.delay")

    with app.app_context():
        touched_batch_ids = reconcile_stale_text_upload_batches(
            db.session,
            stale_after_seconds=600,
            max_attempts=3,
            force_processing_recovery=False,
        )
        saved_text = db.session.get(Text, text_id)
        saved_batch = db.session.get(TextUploadBatch, batch_id)

    assert touched_batch_ids == [batch_id]
    assert not enqueue.called
    assert saved_text.processing_task_id == "recent-task"
    assert saved_text.processing_enqueued_at is not None
    assert saved_text.last_processing_error is None
    assert saved_batch.status == TextUploadBatchStatus.QUEUED


def test_enqueue_pending_batch_texts_continues_after_single_enqueue_failure(app, mocker):
    from app.extensions import db

    batch_id, text_ids, _token_ids = _create_batch_with_texts(app, text_count=2)
    failed_text_id, successful_text_id = text_ids

    def delay_side_effect(text_id):
        if text_id == failed_text_id:
            raise RuntimeError("broker unavailable")
        task = MagicMock()
        task.id = f"task-{text_id}"
        return task

    enqueue = mocker.patch(
        "app.tasks.celery_tasks.process_single_text_background.delay",
        side_effect=delay_side_effect,
    )

    with app.app_context():
        enqueued = enqueue_pending_batch_texts(
            db.session,
            batch_id=batch_id,
            stale_after_seconds=600,
        )
        failed_text = db.session.get(Text, failed_text_id)
        successful_text = db.session.get(Text, successful_text_id)
        saved_batch = db.session.get(TextUploadBatch, batch_id)

    assert enqueue.call_count == 2
    assert enqueued == 1
    assert failed_text.processing_status == ProcessingStatus.PENDING
    assert failed_text.processing_task_id is None
    assert failed_text.processing_enqueued_at is None
    assert failed_text.last_processing_error == "Failed to enqueue text processing task: broker unavailable"
    assert successful_text.processing_task_id == f"task-{successful_text_id}"
    assert saved_batch.status == TextUploadBatchStatus.QUEUED
    assert saved_batch.last_error == "broker unavailable"
