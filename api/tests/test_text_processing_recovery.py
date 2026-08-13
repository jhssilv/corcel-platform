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
from app.text_upload_batches import (
    claim_next_pending_text_for_processing,
    reconcile_stale_text_upload_batches,
    utcnow,
)


def _create_batch_with_texts(app, text_count: int = 1, *, import_finished: bool = True):
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
            total_files=text_count,
            created_texts=text_count,
            import_finished_at=utcnow() if import_finished else None,
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
        "app.tasks.text_task_logic.process_tokens",
        return_value={0: {"to_be_normalized": True, "suggestions": ["hello"]}},
    )

    task = MagicMock()
    task.report_progress = MagicMock()

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
        "app.tasks.text_task_logic.process_tokens",
        return_value={0: {"to_be_normalized": False, "suggestions": []}},
    )

    task = MagicMock()
    task.report_progress = MagicMock()

    with app.app_context():
        run_process_single_text_pipeline(task, text_id)
        saved_token = db.session.get(Token, token_id)
        links = db.session.query(TokensSuggestions).filter_by(token_id=token_id).all()
        saved_batch = db.session.get(TextUploadBatch, batch_id)

    assert saved_token.to_be_normalized is False
    assert links == []
    assert saved_batch.status == TextUploadBatchStatus.COMPLETED


def test_reconcile_stale_text_upload_batches_requeues_orphaned_processing_text(app):
    from app.extensions import db

    batch_id, text_ids, _token_ids = _create_batch_with_texts(app)
    text_id = text_ids[0]

    with app.app_context():
        text = db.session.get(Text, text_id)
        batch = db.session.get(TextUploadBatch, batch_id)
        text.processing_status = ProcessingStatus.PROCESSING
        text.processing_attempts = 1
        text.processing_heartbeat_at = utcnow() - timedelta(minutes=20)
        batch.status = TextUploadBatchStatus.PROCESSING
        db.session.commit()

    with app.app_context():
        touched_batch_ids = reconcile_stale_text_upload_batches(
            db.session,
            stale_after_seconds=600,
            max_attempts=3,
        )
        saved_text = db.session.get(Text, text_id)
        saved_batch = db.session.get(TextUploadBatch, batch_id)

    assert touched_batch_ids == [batch_id]
    assert saved_text.processing_status == ProcessingStatus.PENDING
    assert saved_text.last_processing_error == "Recovered after stale text processing task."
    assert saved_batch.status == TextUploadBatchStatus.QUEUED


def test_reconcile_text_upload_batches_forces_processing_recovery_on_worker_start(app):
    from app.extensions import db

    batch_id, text_ids, _token_ids = _create_batch_with_texts(app)
    text_id = text_ids[0]

    with app.app_context():
        text = db.session.get(Text, text_id)
        batch = db.session.get(TextUploadBatch, batch_id)
        text.processing_status = ProcessingStatus.PROCESSING
        text.processing_attempts = 1
        text.processing_heartbeat_at = utcnow()
        batch.status = TextUploadBatchStatus.PROCESSING
        db.session.commit()

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
    assert saved_text.processing_status == ProcessingStatus.PENDING
    assert saved_text.last_processing_error == "Recovered after worker restart."
    assert saved_batch.status == TextUploadBatchStatus.QUEUED


def test_reconcile_text_upload_batches_marks_text_failed_after_max_attempts(app):
    from app.extensions import db

    batch_id, text_ids, _token_ids = _create_batch_with_texts(app)
    text_id = text_ids[0]

    with app.app_context():
        text = db.session.get(Text, text_id)
        batch = db.session.get(TextUploadBatch, batch_id)
        text.processing_status = ProcessingStatus.PROCESSING
        text.processing_attempts = 3
        text.processing_heartbeat_at = utcnow() - timedelta(minutes=20)
        batch.status = TextUploadBatchStatus.PROCESSING
        db.session.commit()

    with app.app_context():
        reconcile_stale_text_upload_batches(
            db.session,
            stale_after_seconds=600,
            max_attempts=3,
        )
        saved_text = db.session.get(Text, text_id)
        saved_batch = db.session.get(TextUploadBatch, batch_id)

    assert saved_text.processing_status == ProcessingStatus.FAILED
    assert saved_text.last_processing_error == "Text processing exceeded the maximum retry attempts."
    assert saved_batch.status == TextUploadBatchStatus.COMPLETED_WITH_ERRORS


def test_claim_next_pending_text_for_processing_skips_importing_batches(app):
    from app.extensions import db

    batch_id, text_ids, _token_ids = _create_batch_with_texts(app, import_finished=False)
    text_id = text_ids[0]

    with app.app_context():
        claimed_text_id = claim_next_pending_text_for_processing(db.session, stale_after_seconds=600)
        saved_text = db.session.get(Text, text_id)

    assert claimed_text_id is None
    assert saved_text.processing_status == ProcessingStatus.PENDING


def test_claim_next_pending_text_for_processing_claims_ready_batches(app):
    from app.extensions import db

    batch_id, text_ids, _token_ids = _create_batch_with_texts(app, import_finished=True)
    text_id = text_ids[0]

    with app.app_context():
        claimed_text_id = claim_next_pending_text_for_processing(db.session, stale_after_seconds=600)
        saved_text = db.session.get(Text, text_id)
        saved_batch = db.session.get(TextUploadBatch, batch_id)

    assert claimed_text_id == text_id
    assert saved_text.processing_status == ProcessingStatus.PROCESSING
    assert saved_text.processing_attempts == 1
    assert saved_batch.status == TextUploadBatchStatus.PROCESSING
