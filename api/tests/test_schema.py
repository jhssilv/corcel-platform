from sqlalchemy import create_engine, inspect, text

from app.database.schema import ensure_database_schema


def test_ensure_database_schema_adds_text_upload_columns_and_index():
    engine = create_engine("sqlite:///:memory:")

    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR(255))"))
        connection.execute(text("CREATE TABLE text_upload_batches (id INTEGER PRIMARY KEY, created_by_user_id INTEGER NOT NULL)"))
        connection.execute(text("CREATE TABLE texts (id INTEGER PRIMARY KEY, processing_status VARCHAR(32))"))
        connection.execute(text("CREATE TABLE textsusers (text_id INTEGER, user_id INTEGER, assigned BOOLEAN, normalized BOOLEAN)"))
        connection.execute(text("INSERT INTO textsusers (text_id, user_id, assigned, normalized) VALUES (1, 1, NULL, NULL)"))

    ensure_database_schema(engine)

    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("texts")}
    indexes = {index["name"] for index in inspector.get_indexes("texts")}
    with engine.begin() as connection:
        textsusers_row = connection.execute(
            text("SELECT assigned, normalized FROM textsusers WHERE text_id = 1 AND user_id = 1")
        ).one()

    assert "upload_batch_id" in columns
    assert "processing_started_at" in columns
    assert "processing_heartbeat_at" in columns
    assert "processing_enqueued_at" in columns
    assert "processing_attempts" in columns
    assert "last_processing_error" in columns
    assert "processing_task_id" in columns
    assert "ix_texts_upload_batch_id" in indexes
    assert textsusers_row.assigned in (0, False)
    assert textsusers_row.normalized in (0, False)
