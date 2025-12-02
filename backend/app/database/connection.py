from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base
import os

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL is None:
    from dotenv import load_dotenv
    from pathlib import Path
    current_file_path = Path(__file__).resolve()
    root_path = current_file_path.parent.parent.parent
    dotenv_path = root_path / '.env'
    load_dotenv(dotenv_path=dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db_session() -> sessionmaker | None:
    """Database session creator."""
    db = SessionLocal()
    try:
        return db
    finally:
        pass

if __name__ == '__main__':
    Base.metadata.create_all(bind=engine)