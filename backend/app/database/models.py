import sqlalchemy

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    SmallInteger,
    TIMESTAMP,
    Text,
    ForeignKey,
    PrimaryKeyConstraint,
    UniqueConstraint
)
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
    password = Column(String(30), nullable=False)
    last_login = Column(TIMESTAMP, nullable=True)

    normalizations = relationship('Normalization', back_populates='user', cascade="all, delete-orphan")
    texts_association = relationship('TextsUsers', back_populates='user', cascade="all, delete-orphan")


class Text(Base):
    """
    Model for the 'texts' table.
    Stores the texts, their tokens, and associated metadata.
    """
    __tablename__ = 'texts'

    id = Column(Integer, primary_key=True, autoincrement=True)
    grade = Column(SmallInteger, nullable=True)
    source_file_name = Column(String(30), nullable=True)

    normalizations = relationship('Normalization', back_populates='text', cascade="all, delete-orphan")
    texts_association = relationship('TextsUsers', back_populates='text', cascade="all, delete-orphan")
    tokens = relationship('Token', back_populates='text', cascade="all, delete-orphan", order_by='Token.position')

class Token(Base):
    """
    Model for the 'tokens' table.
    Stores individual tokens extracted from texts.
    """
    __tablename__ = 'tokens'

    id = Column(Integer, primary_key=True, autoincrement=True)
    text_id = Column(Integer, ForeignKey('texts.id', ondelete="CASCADE"), nullable=False, index=True)
    
    token_text = Column(String(64), nullable=False)
    is_word = Column(Boolean, nullable=False)
    position = Column(Integer, nullable=False)
    to_be_normalized = Column(Boolean, nullable=False, default=False)
    
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