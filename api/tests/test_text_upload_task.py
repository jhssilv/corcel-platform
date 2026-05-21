import zipfile
from pathlib import Path
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
    mocker.patch(
        "app.tasks.text_task_logic.run_process_texts_pipeline",
        return_value={
            "status": "Concluido",
            "total": 1,
            "processed": 1,
            "failed_files": [],
        },
    )

    task = MagicMock()

    with app.app_context():
        result = run_text_upload_zip_pipeline(task, str(zip_path))

    assert result["result"]["kind"] == "text_upload"
    assert result["result"]["text_ids"] == [11]
    assert result["result"]["processed"] == 1
    assert result["result"]["failed_files"] == []
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
    """Per-file ingestion and processing failures should surface in the final result."""
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
    mocker.patch(
        "app.tasks.text_task_logic.run_process_texts_pipeline",
        return_value={
            "status": "Concluido",
            "total": 2,
            "processed": 1,
            "failed_files": ["good-2.txt"],
        },
    )

    task = MagicMock()

    with app.app_context():
        result = run_text_upload_zip_pipeline(task, str(zip_path))

    assert result["result"]["text_ids"] == [11, 12]
    assert result["result"]["processed"] == 1
    assert result["result"]["failed_files"] == ["bad.txt", "good-2.txt"]
    assert result["failed_files"] == ["bad.txt", "good-2.txt"]
    assert not zip_path.exists()
