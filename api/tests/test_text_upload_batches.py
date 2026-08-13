import json
from datetime import timedelta
import pytest

from app.database.models import (
    ProcessingStatus,
    Text,
    TextUploadBatch,
    TextUploadBatchStatus,
    User,
)
from app.text_upload_batches import (
    append_failed_files,
    build_batch_status_message,
    claim_next_pending_text_for_processing,
    dump_failed_files,
    is_batch_recovering,
    list_resumable_text_upload_batches,
    load_failed_files,
    reconcile_stale_text_upload_batches,
    serialize_batch_text,
    serialize_text_upload_batch,
    sync_text_upload_batch_state,
    utcnow,
)


# -----------------------------------------------------------------------------
# Unit Tests: Helper Functions
# -----------------------------------------------------------------------------

def test_load_failed_files_handles_various_inputs():
    assert load_failed_files(None) == []
    assert load_failed_files("") == []
    assert load_failed_files("invalid json") == []
    assert load_failed_files('["file1.txt", "file2.txt"]') == ["file1.txt", "file2.txt"]
    assert load_failed_files('["file1.txt", 123, null]') == ["file1.txt"]


def test_dump_failed_files_deduplicates():
    res = dump_failed_files(["a.txt", "b.txt", "a.txt"])
    assert json.loads(res) == ["a.txt", "b.txt"]


def test_append_failed_files_updates_batch(app):
    from app.extensions import db

    with app.app_context():
        batch = TextUploadBatch(failed_files=json.dumps(["exist.txt"]))
        append_failed_files(batch, ["exist.txt", "new.txt", ""])
        assert json.loads(batch.failed_files) == ["exist.txt", "new.txt"]


def test_is_batch_recovering():
    text_normal = Text(processing_status=ProcessingStatus.PENDING, processing_attempts=0)
    text_recovering = Text(processing_status=ProcessingStatus.PENDING, processing_attempts=1)
    text_ready = Text(processing_status=ProcessingStatus.READY, processing_attempts=2)

    batch = TextUploadBatch()

    assert not is_batch_recovering(batch, [text_normal])
    assert is_batch_recovering(batch, [text_normal, text_recovering])
    assert not is_batch_recovering(batch, [text_ready])


def test_build_batch_status_message():
    b_importing = TextUploadBatch(status=TextUploadBatchStatus.IMPORTING)
    b_queued = TextUploadBatch(status=TextUploadBatchStatus.QUEUED)
    b_processing = TextUploadBatch(status=TextUploadBatchStatus.PROCESSING)
    b_completed = TextUploadBatch(status=TextUploadBatchStatus.COMPLETED)
    b_completed_err = TextUploadBatch(status=TextUploadBatchStatus.COMPLETED_WITH_ERRORS)
    b_failed = TextUploadBatch(status=TextUploadBatchStatus.FAILED)

    text_recovering = Text(processing_status=ProcessingStatus.PENDING, processing_attempts=1)

    assert build_batch_status_message(b_importing, []) == 'Importando arquivos do lote.'
    assert build_batch_status_message(b_queued, []) == 'Textos aguardando processamento.'
    assert build_batch_status_message(b_queued, [text_recovering]) == 'Retomando processamento dos textos.'
    assert build_batch_status_message(b_processing, []) == 'Processando textos em segundo plano.'
    assert build_batch_status_message(b_processing, [text_recovering]) == 'Reprocessando textos apos recuperacao.'
    assert build_batch_status_message(b_completed, []) == 'Processamento concluido.'
    assert build_batch_status_message(b_completed_err, []) == 'Processamento concluido com falhas.'
    assert build_batch_status_message(b_failed, []) == 'Nao foi possivel concluir o processamento do lote.'


# -----------------------------------------------------------------------------
# Database Integration Tests: sync_text_upload_batch_state
# -----------------------------------------------------------------------------

def test_sync_text_upload_batch_state_non_existent(app):
    from app.extensions import db

    with app.app_context():
        res = sync_text_upload_batch_state(db.session, 999999)
        assert res is None


def test_sync_text_upload_batch_state_importing(app):
    from app.extensions import db

    with app.app_context():
        user = User(username="u1")
        user.set_password("p")
        db.session.add(user)
        db.session.commit()

        batch = TextUploadBatch(created_by_user_id=user.id, import_finished_at=None)
        db.session.add(batch)
        db.session.commit()

        synced = sync_text_upload_batch_state(db.session, batch.id)
        assert synced.status == TextUploadBatchStatus.IMPORTING


def test_sync_text_upload_batch_state_empty_texts_fails(app):
    from app.extensions import db

    with app.app_context():
        user = User(username="u2")
        user.set_password("p")
        db.session.add(user)
        db.session.commit()

        batch = TextUploadBatch(created_by_user_id=user.id, import_finished_at=utcnow())
        db.session.add(batch)
        db.session.commit()

        synced = sync_text_upload_batch_state(db.session, batch.id)
        assert synced.status == TextUploadBatchStatus.FAILED
        assert synced.processing_finished_at is not None


def test_sync_text_upload_batch_state_queued_and_processing(app):
    from app.extensions import db

    with app.app_context():
        user = User(username="u3")
        user.set_password("p")
        db.session.add(user)
        db.session.commit()

        batch = TextUploadBatch(created_by_user_id=user.id, import_finished_at=utcnow())
        db.session.add(batch)
        db.session.commit()

        t1 = Text(upload_batch_id=batch.id, processing_status=ProcessingStatus.PENDING)
        db.session.add(t1)
        db.session.commit()

        # When pending > 0 -> QUEUED
        synced = sync_text_upload_batch_state(db.session, batch.id)
        assert synced.status == TextUploadBatchStatus.QUEUED

        # When processing > 0 -> PROCESSING
        t1.processing_status = ProcessingStatus.PROCESSING
        db.session.commit()

        synced = sync_text_upload_batch_state(db.session, batch.id)
        assert synced.status == TextUploadBatchStatus.PROCESSING
        assert synced.processing_started_at is not None


def test_sync_text_upload_batch_state_completed_and_with_errors(app):
    from app.extensions import db

    with app.app_context():
        user = User(username="u4")
        user.set_password("p")
        db.session.add(user)
        db.session.commit()

        batch = TextUploadBatch(created_by_user_id=user.id, import_finished_at=utcnow())
        db.session.add(batch)
        db.session.commit()

        t1 = Text(upload_batch_id=batch.id, processing_status=ProcessingStatus.READY)
        db.session.add(t1)
        db.session.commit()

        # All READY -> COMPLETED
        synced = sync_text_upload_batch_state(db.session, batch.id)
        assert synced.status == TextUploadBatchStatus.COMPLETED

        # Add a FAILED text -> COMPLETED_WITH_ERRORS
        t2 = Text(upload_batch_id=batch.id, processing_status=ProcessingStatus.FAILED)
        db.session.add(t2)
        db.session.commit()

        synced = sync_text_upload_batch_state(db.session, batch.id)
        assert synced.status == TextUploadBatchStatus.COMPLETED_WITH_ERRORS
        assert synced.failed_texts == 1
        assert synced.processed_texts == 1


# -----------------------------------------------------------------------------
# Database Integration Tests: Serialization & Resumable Batches
# -----------------------------------------------------------------------------

def test_serialize_text_upload_batch(app):
    from app.extensions import db

    with app.app_context():
        user = User(username="u5")
        user.set_password("p")
        db.session.add(user)
        db.session.commit()

        batch = TextUploadBatch(
            created_by_user_id=user.id,
            source_file_name="test.zip",
            status=TextUploadBatchStatus.QUEUED,
        )
        db.session.add(batch)
        db.session.commit()

        text = Text(source_file_name="doc.txt", upload_batch_id=batch.id, processing_status=ProcessingStatus.PENDING)
        db.session.add(text)
        db.session.commit()

        # Test without texts
        res_no_texts = serialize_text_upload_batch(batch, include_texts=False)
        assert res_no_texts['id'] == batch.id
        assert res_no_texts['status'] == 'QUEUED'
        assert 'texts' not in res_no_texts

        # Test with texts
        res_with_texts = serialize_text_upload_batch(batch, include_texts=True)
        assert 'texts' in res_with_texts
        assert len(res_with_texts['texts']) == 1
        assert res_with_texts['texts'][0]['source_file_name'] == 'doc.txt'


def test_list_resumable_text_upload_batches(app):
    from app.extensions import db

    with app.app_context():
        user1 = User(username="u6")
        user1.set_password("p")
        user2 = User(username="u7")
        user2.set_password("p")
        db.session.add_all([user1, user2])
        db.session.commit()

        b1 = TextUploadBatch(created_by_user_id=user1.id, status=TextUploadBatchStatus.QUEUED)
        b2 = TextUploadBatch(created_by_user_id=user1.id, status=TextUploadBatchStatus.COMPLETED)
        b3 = TextUploadBatch(created_by_user_id=user2.id, status=TextUploadBatchStatus.PROCESSING)

        db.session.add_all([b1, b2, b3])
        db.session.commit()

        batches_u1 = list_resumable_text_upload_batches(db.session, user1.id)
        u1_ids = [b.id for b in batches_u1]
        assert b1.id in u1_ids
        assert b2.id in u1_ids  # Recent completed batch is included within 24h
        assert b3.id not in u1_ids
