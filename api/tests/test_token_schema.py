from sqlalchemy.dialects import postgresql

from app.database.models import Token


def test_token_whitespace_after_uses_text_type_for_postgresql():
    column_type = Token.__table__.c.whitespace_after.type

    assert column_type.compile(dialect=postgresql.dialect()) == "TEXT"
