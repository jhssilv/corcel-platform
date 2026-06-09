from sqlalchemy import inspect, text

from .models import Base

SCHEMA_BOOTSTRAP_LOCK_KEY = 483021541


TEXTS_COLUMNS = {
    'upload_batch_id': 'INTEGER',
    'processing_started_at': 'TIMESTAMP',
    'processing_heartbeat_at': 'TIMESTAMP',
    'processing_attempts': 'INTEGER NOT NULL DEFAULT 0',
    'last_processing_error': 'TEXT',
}

TEXTS_INDEXES = {
    'ix_texts_upload_batch_id': 'CREATE INDEX ix_texts_upload_batch_id ON texts (upload_batch_id)',
}

TEXTS_FOREIGN_KEYS = {
    'fk_texts_upload_batch_id': (
        'ALTER TABLE texts '
        'ADD CONSTRAINT fk_texts_upload_batch_id '
        'FOREIGN KEY (upload_batch_id) REFERENCES text_upload_batches (id) ON DELETE SET NULL'
    ),
}

TEXTSUSERS_BACKFILL_STATEMENTS = (
    "UPDATE textsusers SET assigned = FALSE WHERE assigned IS NULL",
    "UPDATE textsusers SET normalized = FALSE WHERE normalized IS NULL",
)

POSTGRESQL_TOKEN_COLUMN_MIGRATIONS = (
    "ALTER TABLE tokens ALTER COLUMN whitespace_after TYPE TEXT USING whitespace_after::text",
)


def ensure_database_schema(engine) -> None:
    with engine.begin() as connection:
        if engine.dialect.name == 'postgresql':
            connection.execute(
                text('SELECT pg_advisory_xact_lock(:lock_key)'),
                {'lock_key': SCHEMA_BOOTSTRAP_LOCK_KEY},
            )

        Base.metadata.create_all(bind=connection)

        inspector = inspect(connection)
        if 'texts' not in inspector.get_table_names():
            return

        existing_columns = {column['name'] for column in inspector.get_columns('texts')}
        for column_name, column_type in TEXTS_COLUMNS.items():
            if column_name in existing_columns:
                continue
            connection.execute(text(f'ALTER TABLE texts ADD COLUMN {column_name} {column_type}'))

        existing_indexes = {index['name'] for index in inspector.get_indexes('texts')}
        for index_name, create_index_sql in TEXTS_INDEXES.items():
            if index_name in existing_indexes:
                continue
            connection.execute(text(create_index_sql))

        if engine.dialect.name == 'postgresql' and 'text_upload_batches' in inspector.get_table_names():
            existing_foreign_keys = {
                foreign_key.get('name')
                for foreign_key in inspector.get_foreign_keys('texts')
            }
            for constraint_name, add_foreign_key_sql in TEXTS_FOREIGN_KEYS.items():
                if constraint_name in existing_foreign_keys:
                    continue
                connection.execute(text(add_foreign_key_sql))

        if engine.dialect.name == 'postgresql' and 'tokens' in inspector.get_table_names():
            token_columns = {
                column['name']: column
                for column in inspector.get_columns('tokens')
            }
            whitespace_after = token_columns.get('whitespace_after')
            if whitespace_after is not None and str(whitespace_after['type']).lower() != 'text':
                for statement in POSTGRESQL_TOKEN_COLUMN_MIGRATIONS:
                    connection.execute(text(statement))

        if 'textsusers' in inspector.get_table_names():
            for statement in TEXTSUSERS_BACKFILL_STATEMENTS:
                connection.execute(text(statement))

            if engine.dialect.name == 'postgresql':
                connection.execute(text("ALTER TABLE textsusers ALTER COLUMN assigned SET DEFAULT FALSE"))
                connection.execute(text("ALTER TABLE textsusers ALTER COLUMN normalized SET DEFAULT FALSE"))
                connection.execute(text("ALTER TABLE textsusers ALTER COLUMN assigned SET NOT NULL"))
                connection.execute(text("ALTER TABLE textsusers ALTER COLUMN normalized SET NOT NULL"))
