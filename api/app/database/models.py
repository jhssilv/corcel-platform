from app.extensions import bcrypt

from sqlalchemy import (
    CHAR,
    Column,
    Integer,
    String,
    Boolean,
    SmallInteger,
    TIMESTAMP,
    Text as TextType,
    ForeignKey,
    PrimaryKeyConstraint,
    UniqueConstraint,
    func,
    Enum as SQLAlchemyEnum,
    JSON,
)
import enum

class ProcessingStatus(enum.Enum):
    PENDING = 'PENDING'
    PROCESSING = 'PROCESSING'
    READY = 'READY'
    FAILED = 'FAILED'


class TextUploadBatchStatus(enum.Enum):
    IMPORTING = 'IMPORTING'
    QUEUED = 'QUEUED'
    PROCESSING = 'PROCESSING'
    COMPLETED = 'COMPLETED'
    COMPLETED_WITH_ERRORS = 'COMPLETED_WITH_ERRORS'
    FAILED = 'FAILED'


class BackgroundJobKind(enum.Enum):
    TEXT_UPLOAD_IMPORT = 'TEXT_UPLOAD_IMPORT'
    OCR_UPLOAD = 'OCR_UPLOAD'


class BackgroundJobState(enum.Enum):
    PENDING = 'PENDING'
    RUNNING = 'RUNNING'
    SUCCESS = 'SUCCESS'
    FAILURE = 'FAILURE'
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    """
    Model for the 'users' table.
    """
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(30), nullable=False, unique=True)
    hashed_password = Column(String(120), nullable=False)
    last_login = Column(TIMESTAMP, nullable=True)
    is_admin = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)

    normalizations = relationship('Normalization', back_populates='user', cascade="all, delete-orphan")
    texts_association = relationship('TextsUsers', back_populates='user', cascade="all, delete-orphan")
    text_upload_batches = relationship('TextUploadBatch', back_populates='created_by_user', cascade="all, delete-orphan")
    background_jobs = relationship('BackgroundJob', back_populates='created_by_user', cascade="all, delete-orphan")

    def set_password(self, password: str):
        self.hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password: str) -> bool:
        return bcrypt.check_password_hash(self.hashed_password, password)


class Text(Base):
    """
    Model for the 'texts' table.
    Stores the texts, their tokens, and associated metadata.
    """
    __tablename__ = 'texts'

    id = Column(Integer, primary_key=True, autoincrement=True)
    grade = Column(SmallInteger, nullable=True)
    source_file_name = Column(String(255), nullable=True)

    normalizations = relationship('Normalization', back_populates='text', cascade="all, delete-orphan")
    texts_association = relationship('TextsUsers', back_populates='text', cascade="all, delete-orphan")
    tokens = relationship('Token', back_populates='text', cascade="all, delete-orphan", order_by='Token.position')
    upload_batch = relationship('TextUploadBatch', back_populates='texts')
    creation_date = Column(TIMESTAMP, nullable=False, default=func.now())
    processing_status = Column(SQLAlchemyEnum(ProcessingStatus), nullable=False, default=ProcessingStatus.PENDING)
    upload_batch_id = Column(Integer, ForeignKey('text_upload_batches.id', ondelete="SET NULL"), nullable=True, index=True)
    processing_started_at = Column(TIMESTAMP, nullable=True)
    processing_heartbeat_at = Column(TIMESTAMP, nullable=True)
    processing_enqueued_at = Column(TIMESTAMP, nullable=True)
    processing_attempts = Column(Integer, nullable=False, default=0)
    last_processing_error = Column(TextType, nullable=True)
    processing_task_id = Column(String(255), nullable=True)


class TextUploadBatch(Base):
    __tablename__ = 'text_upload_batches'

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_by_user_id = Column(Integer, ForeignKey('users.id', ondelete="CASCADE"), nullable=False, index=True)
    source_file_name = Column(String(255), nullable=True)
    status = Column(
        SQLAlchemyEnum(TextUploadBatchStatus),
        nullable=False,
        default=TextUploadBatchStatus.IMPORTING,
        index=True,
    )
    celery_import_task_id = Column(String(255), nullable=True)
    total_files = Column(Integer, nullable=False, default=0)
    created_texts = Column(Integer, nullable=False, default=0)
    processed_texts = Column(Integer, nullable=False, default=0)
    failed_texts = Column(Integer, nullable=False, default=0)
    failed_files = Column(TextType, nullable=False, default='[]')
    last_error = Column(TextType, nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, default=func.now(), onupdate=func.now())
    import_finished_at = Column(TIMESTAMP, nullable=True)
    processing_started_at = Column(TIMESTAMP, nullable=True)
    processing_finished_at = Column(TIMESTAMP, nullable=True)

    created_by_user = relationship('User', back_populates='text_upload_batches')
    texts = relationship('Text', back_populates='upload_batch')


class BackgroundJob(Base):
    __tablename__ = 'background_jobs'

    id = Column(String(36), primary_key=True)
    kind = Column(SQLAlchemyEnum(BackgroundJobKind), nullable=False, index=True)
    state = Column(
        SQLAlchemyEnum(BackgroundJobState),
        nullable=False,
        default=BackgroundJobState.PENDING,
        index=True,
    )
    created_by_user_id = Column(Integer, ForeignKey('users.id', ondelete="CASCADE"), nullable=False, index=True)
    payload_json = Column(JSON, nullable=False, default=dict)
    result_json = Column(JSON, nullable=True)
    current = Column(Integer, nullable=True)
    total = Column(Integer, nullable=True)
    status_message = Column(String(255), nullable=False, default='Waiting...')
    error_message = Column(TextType, nullable=True)
    attempts = Column(Integer, nullable=False, default=0)
    claimed_at = Column(TIMESTAMP, nullable=True)
    claimed_by = Column(String(255), nullable=True)
    heartbeat_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, default=func.now(), onupdate=func.now())
    started_at = Column(TIMESTAMP, nullable=True)
    finished_at = Column(TIMESTAMP, nullable=True)

    created_by_user = relationship('User', back_populates='background_jobs')

class RawText(Base):
    """
    Model for the 'raw_texts' table.
    Stores the original raw text content before any processing.
    """
    __tablename__ = 'raw_texts'

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_file_name = Column(String(255), nullable=True)
    text_content = Column(TextType, nullable=False)
    image_path = Column(String(255), nullable=True)


class Token(Base):
    __tablename__ = 'tokens'

    id = Column(Integer, primary_key=True, autoincrement=True)
    text_id = Column(Integer, ForeignKey('texts.id', ondelete="CASCADE"), nullable=False, index=True)
    token_text = Column(String(64), nullable=False)
    is_word = Column(Boolean, nullable=False)
    position = Column(Integer, nullable=False)
    to_be_normalized = Column(Boolean, nullable=True, )
    whitespace_after = Column(CHAR(1), nullable=True, default='')
    whitelisted = Column(Boolean, nullable=False, default=False)

    __table_args__ = (
        UniqueConstraint('text_id', 'position', name='uq_text_position'), 
    )

    text = relationship('Text', back_populates='tokens')
    
    suggestions = relationship(
        'Suggestion',
        secondary='tokenssuggestions',
        backref='tokens',
        order_by='Suggestion.token_text'
    )
    
class Normalization(Base):
    """
    Model for the 'normalizations' table.
    Stores the normalizations (corrections) made by users on texts.
    """
    __tablename__ = 'normalizations'

    text_id = Column(Integer, ForeignKey('texts.id', ondelete="CASCADE"), primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete="CASCADE"), primary_key=True)
    start_index = Column(Integer, primary_key=True)       # Substitutes tokens from start_index to end_index (inclusive)
    end_index = Column(Integer, nullable=True)
    new_token = Column(String(64), nullable=False)
    creation_time = Column(TIMESTAMP, nullable=False)

    user = relationship('User', back_populates='normalizations')
    text = relationship('Text', back_populates='normalizations')


class TextsUsers(Base):
    """
    Model for the 'textsusers' table.
    Association table to track which texts have been assigned to which users.
    """
    __tablename__ = 'textsusers'

    text_id = Column(Integer, ForeignKey('texts.id', ondelete="CASCADE"), primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete="CASCADE"), primary_key=True)
    assigned = Column(Boolean, nullable=False, default=False)
    normalized = Column(Boolean, nullable=False, default=False)

    user = relationship('User', back_populates='texts_association')
    text = relationship('Text', back_populates='texts_association')

class Suggestion(Base):
    """
    Model for the 'suggestions' table.
    Stores suggestions for token normalizations.
    """
    __tablename__ = 'suggestions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    token_text = Column(String(64), nullable=False, unique=True)
    
class TokensSuggestions(Base):
    """
    Model for the 'tokenssuggestions' table.
    Association table to link tokens with their suggestions.
    """
    __tablename__ = 'tokenssuggestions'
    token_id = Column(Integer, ForeignKey('tokens.id', ondelete="CASCADE"), primary_key=True)
    suggestion_id = Column(Integer, ForeignKey('suggestions.id', ondelete="CASCADE"), primary_key=True)
    
    
class WhitelistTokens(Base):
    """
    Model for the 'whitelist_tokens' table.
    Stores tokens that are whitelisted.
    """
    __tablename__ = 'whitelist_tokens'

    id = Column(Integer, primary_key=True, autoincrement=True)
    token_text = Column(String(64), nullable=False, unique=True)
    
