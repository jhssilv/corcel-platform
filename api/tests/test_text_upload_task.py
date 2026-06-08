import base64
import zipfile
from unittest.mock import MagicMock

import pytest

from app.database.models import ProcessingStatus, Text, TextUploadBatch, TextUploadBatchStatus, User
from app.tasks.text_upload_task_logic import run_text_upload_zip_pipeline


def _create_upload_batch(app):
    from app.extensions import db

    with app.app_context():
        user = User(username="batch-admin", is_admin=True)
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        batch = TextUploadBatch(
            created_by_user_id=user.id,
            source_file_name="upload_batch.zip",
            status=TextUploadBatchStatus.IMPORTING,
        )
        db.session.add(batch)
        db.session.commit()
        return batch.id


def test_run_text_upload_zip_pipeline_success(app, mocker, tmp_path):
    zip_path = tmp_path / "texts.zip"
    with zipfile.ZipFile(zip_path, "w") as zip_file:
        zip_file.writestr("doc.txt", "hello world")

    tokenizer = MagicMock()
    tokenizer.tokenize.return_value = []

    mocker.patch("app.text_pipeline.get_tokenizer", return_value=tokenizer)
    mocker.patch("app.database.queries.add_text", return_value=11)

    task = MagicMock()
    batch_id = _create_upload_batch(app)

    with app.app_context():
        result = run_text_upload_zip_pipeline(task, batch_id=batch_id, zip_path=str(zip_path))

    assert result["result"]["kind"] == "text_upload"
    assert result["result"]["batch_id"] == batch_id
    assert result["result"]["text_ids"] == [11]
    assert result["result"]["created"] == 1
    assert result["result"]["failed_files"] == []
    assert not zip_path.exists()


def test_run_text_upload_zip_pipeline_invalid_zip(app, tmp_path):
    zip_path = tmp_path / "invalid.zip"
    zip_path.write_bytes(b"not-a-zip")

    task = MagicMock()
    batch_id = _create_upload_batch(app)

    with app.app_context(), pytest.raises(RuntimeError, match="Invalid or corrupted ZIP file."):
        run_text_upload_zip_pipeline(task, batch_id=batch_id, zip_path=str(zip_path))

    assert not zip_path.exists()


def test_run_text_upload_zip_pipeline_requires_valid_members(app, tmp_path):
    zip_path = tmp_path / "images_only.zip"
    with zipfile.ZipFile(zip_path, "w") as zip_file:
        zip_file.writestr("image.png", b"pngdata")

    task = MagicMock()
    batch_id = _create_upload_batch(app)

    with app.app_context(), pytest.raises(RuntimeError, match="does not contain valid files"):
        run_text_upload_zip_pipeline(task, batch_id=batch_id, zip_path=str(zip_path))

    assert not zip_path.exists()


def test_run_text_upload_zip_pipeline_rejects_large_archives(app, tmp_path):
    zip_path = tmp_path / "too_many.zip"
    with zipfile.ZipFile(zip_path, "w") as zip_file:
        for index in range(201):
            zip_file.writestr(f"doc-{index}.txt", "hello world")

    task = MagicMock()
    batch_id = _create_upload_batch(app)

    with app.app_context(), pytest.raises(RuntimeError, match="Maximum of 200 files allowed per upload."):
        run_text_upload_zip_pipeline(task, batch_id=batch_id, zip_path=str(zip_path))

    assert not zip_path.exists()


def test_run_text_upload_zip_pipeline_collects_partial_failures(app, mocker, tmp_path):
    zip_path = tmp_path / "mixed.zip"
    with zipfile.ZipFile(zip_path, "w") as zip_file:
        zip_file.writestr("good-1.txt", "alpha")
        zip_file.writestr("bad.txt", "beta")
        zip_file.writestr("good-2.txt", "gamma")

    tokenizer = MagicMock()
    tokenizer.tokenize.return_value = []

    mocker.patch("app.text_pipeline.get_tokenizer", return_value=tokenizer)
    add_text = mocker.patch("app.database.queries.add_text")
    add_text.side_effect = [11, RuntimeError("insert failed"), 12]

    task = MagicMock()
    batch_id = _create_upload_batch(app)

    with app.app_context():
        result = run_text_upload_zip_pipeline(task, batch_id=batch_id, zip_path=str(zip_path))

    assert result["result"]["text_ids"] == [11, 12]
    assert result["result"]["created"] == 2
    assert result["result"]["failed_files"] == ["bad.txt"]
    assert result["failed_files"] == ["bad.txt"]
    assert not zip_path.exists()


def test_run_text_upload_zip_pipeline_accepts_base64_payload(app, mocker, tmp_path):
    zip_buffer = tmp_path / "payload.zip"
    with zipfile.ZipFile(zip_buffer, "w") as zip_file:
        zip_file.writestr("doc.txt", "hello world")

    tokenizer = MagicMock()
    tokenizer.tokenize.return_value = []

    mocker.patch("app.text_pipeline.get_tokenizer", return_value=tokenizer)
    mocker.patch("app.database.queries.add_text", return_value=42)

    task = MagicMock()
    zip_payload_b64 = base64.b64encode(zip_buffer.read_bytes()).decode("ascii")
    batch_id = _create_upload_batch(app)

    with app.app_context():
        result = run_text_upload_zip_pipeline(
            task,
            batch_id=batch_id,
            zip_payload_b64=zip_payload_b64,
            original_filename="payload.zip",
        )

    assert result["result"]["text_ids"] == [42]
    assert result["result"]["created"] == 1
    assert result["result"]["batch_id"] == batch_id


def test_run_text_upload_zip_pipeline_keeps_imported_texts_pending_until_worker_claims_them(app, mocker, tmp_path):
    from app.extensions import db

    zip_path = tmp_path / "pending.zip"
    with zipfile.ZipFile(zip_path, "w") as zip_file:
        zip_file.writestr("doc.txt", "hello world")

    tokenizer = MagicMock()
    tokenizer.tokenize.return_value = []

    mocker.patch("app.text_pipeline.get_tokenizer", return_value=tokenizer)

    task = MagicMock()
    batch_id = _create_upload_batch(app)

    with app.app_context():
        result = run_text_upload_zip_pipeline(task, batch_id=batch_id, zip_path=str(zip_path))
        saved_text = db.session.get(Text, result["result"]["text_ids"][0])

    assert saved_text is not None
    assert saved_text.processing_status == ProcessingStatus.PENDING
    assert saved_text.upload_batch_id == batch_id


def test_run_text_upload_zip_pipeline_marks_batch_queued_after_import(app, mocker, tmp_path):
    from app.extensions import db

    zip_path = tmp_path / "queued.zip"
    with zipfile.ZipFile(zip_path, "w") as zip_file:
        zip_file.writestr("doc.txt", "hello world")

    tokenizer = MagicMock()
    tokenizer.tokenize.return_value = []
    mocker.patch("app.text_pipeline.get_tokenizer", return_value=tokenizer)

    task = MagicMock()
    batch_id = _create_upload_batch(app)

    with app.app_context():
        run_text_upload_zip_pipeline(task, batch_id=batch_id, zip_path=str(zip_path))
        saved_batch = db.session.get(TextUploadBatch, batch_id)

    assert saved_batch.status == TextUploadBatchStatus.QUEUED
    assert saved_batch.import_finished_at is not None
