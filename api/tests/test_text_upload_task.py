import zipfile
import base64
from unittest.mock import MagicMock

import pytest

from app.tasks.text_upload_task_logic import run_text_upload_zip_pipeline


def test_run_text_upload_zip_pipeline_success(app, mocker, tmp_path):
    """Text upload task should create text IDs and return a typed result payload."""
    zip_path = tmp_path / "texts.zip"
    with zipfile.ZipFile(zip_path, "w") as zip_file:
        zip_file.writestr("doc.txt", "hello world")

    tokenizer = MagicMock()
    tokenizer.tokenize.return_value = []

    mocker.patch("app.text_pipeline.get_tokenizer", return_value=tokenizer)
    mocker.patch("app.database.queries.add_text", return_value=11)
    enqueue = mocker.patch("app.tasks.celery_tasks.process_texts_background.delay")
    enqueue.return_value.id = "processing-task-123"

    task = MagicMock()

    with app.app_context():
        result = run_text_upload_zip_pipeline(task, str(zip_path))

    assert result["result"]["kind"] == "text_upload"
    assert result["result"]["text_ids"] == [11]
    assert result["result"]["created"] == 1
    assert result["result"]["failed_files"] == []
    enqueue.assert_called_once_with([11])
    assert not zip_path.exists()


def test_run_text_upload_zip_pipeline_invalid_zip(app, tmp_path):
    """Invalid text upload archives should fail and be cleaned up."""
    zip_path = tmp_path / "invalid.zip"
    zip_path.write_bytes(b"not-a-zip")

    task = MagicMock()

    with app.app_context(), pytest.raises(RuntimeError, match="Invalid or corrupted ZIP file."):
        run_text_upload_zip_pipeline(task, str(zip_path))

    assert not zip_path.exists()


def test_run_text_upload_zip_pipeline_requires_valid_members(app, tmp_path):
    """Archives without supported text files should fail."""
    zip_path = tmp_path / "images_only.zip"
    with zipfile.ZipFile(zip_path, "w") as zip_file:
        zip_file.writestr("image.png", b"pngdata")

    task = MagicMock()

    with app.app_context(), pytest.raises(RuntimeError, match="does not contain valid files"):
        run_text_upload_zip_pipeline(task, str(zip_path))

    assert not zip_path.exists()


def test_run_text_upload_zip_pipeline_rejects_large_archives(app, tmp_path):
    """Archives above the upload batch limit should fail before ingestion."""
    zip_path = tmp_path / "too_many.zip"
    with zipfile.ZipFile(zip_path, "w") as zip_file:
        for index in range(201):
            zip_file.writestr(f"doc-{index}.txt", "hello world")

    task = MagicMock()

    with app.app_context(), pytest.raises(RuntimeError, match="Maximum of 200 files allowed per upload."):
        run_text_upload_zip_pipeline(task, str(zip_path))

    assert not zip_path.exists()


def test_run_text_upload_zip_pipeline_collects_partial_failures(app, mocker, tmp_path):
    """Per-file ingestion failures should surface in the final result while valid files are queued."""
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
    enqueue = mocker.patch("app.tasks.celery_tasks.process_texts_background.delay")
    enqueue.return_value.id = "processing-task-456"

    task = MagicMock()

    with app.app_context():
        result = run_text_upload_zip_pipeline(task, str(zip_path))

    assert result["result"]["text_ids"] == [11, 12]
    assert result["result"]["created"] == 2
    assert result["result"]["failed_files"] == ["bad.txt"]
    assert result["failed_files"] == ["bad.txt"]
    enqueue.assert_called_once_with([11, 12])
    assert not zip_path.exists()


def test_run_text_upload_zip_pipeline_accepts_base64_payload(app, mocker, tmp_path):
    """Text upload task should ingest archives from in-memory payloads without filesystem access."""
    zip_buffer = tmp_path / "payload.zip"
    with zipfile.ZipFile(zip_buffer, "w") as zip_file:
        zip_file.writestr("doc.txt", "hello world")

    tokenizer = MagicMock()
    tokenizer.tokenize.return_value = []

    mocker.patch("app.text_pipeline.get_tokenizer", return_value=tokenizer)
    mocker.patch("app.database.queries.add_text", return_value=42)
    enqueue = mocker.patch("app.tasks.celery_tasks.process_texts_background.delay")
    enqueue.return_value.id = "processing-task-payload"

    task = MagicMock()
    zip_payload_b64 = base64.b64encode(zip_buffer.read_bytes()).decode("ascii")

    with app.app_context():
        result = run_text_upload_zip_pipeline(
            task,
            zip_payload_b64=zip_payload_b64,
            original_filename="payload.zip",
        )

    assert result["result"]["text_ids"] == [42]
    assert result["result"]["created"] == 1
    enqueue.assert_called_once_with([42])


def test_run_text_upload_zip_pipeline_keeps_imported_texts_pending_until_background_task(app, mocker, tmp_path):
    """Imported texts should remain PENDING until the separate processing task picks them up."""
    from app.database.models import ProcessingStatus, Text
    from app.extensions import db

    zip_path = tmp_path / "pending.zip"
    with zipfile.ZipFile(zip_path, "w") as zip_file:
        zip_file.writestr("doc.txt", "hello world")

    tokenizer = MagicMock()
    tokenizer.tokenize.return_value = []

    mocker.patch("app.text_pipeline.get_tokenizer", return_value=tokenizer)
    enqueue = mocker.patch("app.tasks.celery_tasks.process_texts_background.delay")
    enqueue.return_value.id = "processing-task-789"

    task = MagicMock()

    with app.app_context():
        result = run_text_upload_zip_pipeline(task, str(zip_path))
        saved_text = db.session.get(Text, result["result"]["text_ids"][0])

    assert saved_text is not None
    assert saved_text.processing_status == ProcessingStatus.PENDING
    enqueue.assert_called_once()


def test_run_text_upload_zip_pipeline_marks_imported_texts_failed_when_enqueueing_background_task_fails(
    app, mocker, tmp_path
):
    """Imported texts should become FAILED if the follow-up processing task cannot be queued."""
    from app.database.models import ProcessingStatus, Text
    from app.extensions import db

    zip_path = tmp_path / "enqueue-failure.zip"
    with zipfile.ZipFile(zip_path, "w") as zip_file:
        zip_file.writestr("doc.txt", "hello world")

    tokenizer = MagicMock()
    tokenizer.tokenize.return_value = []

    mocker.patch("app.text_pipeline.get_tokenizer", return_value=tokenizer)
    mocker.patch(
        "app.tasks.celery_tasks.process_texts_background.delay",
        side_effect=RuntimeError("broker unavailable"),
    )

    task = MagicMock()

    with app.app_context():
        with pytest.raises(RuntimeError, match="Failed to enqueue background text processing."):
            run_text_upload_zip_pipeline(task, str(zip_path))
        saved_texts = db.session.query(Text).all()

    assert len(saved_texts) == 1
    assert saved_texts[0].processing_status == ProcessingStatus.FAILED
    assert not zip_path.exists()
