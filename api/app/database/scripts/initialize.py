from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

from app.database.models import Base, User


def init_empty_db(engine: create_engine, session: sessionmaker):
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    if tables:
        print("Database already initialized. Skipping.")
        return

    Base.metadata.create_all(bind=engine)

    db = session()
    try:
        admin_user = User(username="admin", is_admin=True)
        admin_user.set_password("admin")
        db.add(admin_user)
        db.commit()
    finally:
        db.close()

    print("Database initialized.")
