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
    PrimaryKeyConstraint
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
    lastlogin = Column(TIMESTAMP, nullable=True)

    normalizations = relationship('Normalization', back_populates='user', cascade="all, delete-orphan")
    assignments = relationship('TextsAssignment', back_populates='user', cascade="all, delete-orphan")


class Text(Base):
    """
    Model for the 'texts' table.
    Stores the texts, their tokens, and associated metadata.
    """
    __tablename__ = 'texts'

    id = Column(Integer, primary_key=True, autoincrement=True)
    tokens = Column(ARRAY(Text), nullable=True)
    wordmap = Column(ARRAY(Boolean), nullable=True)
    grade = Column(SmallInteger, nullable=True)
    candidates = Column(JSONB, nullable=True)
    professorname = Column(String(30), nullable=True)
    isnormalized = Column(Boolean, nullable=True)
    sourcefilename = Column(String(30), nullable=True)

    normalizations = relationship('Normalization', back_populates='text', cascade="all, delete-orphan")
    assignments = relationship('TextsAssignment', back_populates='text', cascade="all, delete-orphan")


class Normalization(Base):
    """
    Model for the 'normalizations' table.
    Stores the normalizations (corrections) made by users on texts.
    """
    __tablename__ = 'normalizations'

    textid = Column(Integer, ForeignKey('texts.id', ondelete="CASCADE"), primary_key=True)
    userid = Column(Integer, ForeignKey('users.id', ondelete="CASCADE"), primary_key=True)
    startindex = Column(Integer, primary_key=True)
    endindex = Column(Integer, nullable=True)
    newtoken = Column(String(64), nullable=False)
    creationtime = Column(TIMESTAMP, nullable=False)

    # Relacionamentos
    user = relationship('User', back_populates='normalizations')
    text = relationship('Text', back_populates='normalizations')


class TextsAssignment(Base):
    """
    Model for the 'textsassignments' table.
    Association table that assigns texts to users for normalization.
    """
    __tablename__ = 'textsassignments'

    textid = Column(Integer, ForeignKey('texts.id', ondelete="CASCADE"), primary_key=True)
    userid = Column(Integer, ForeignKey('users.id', ondelete="CASCADE"), primary_key=True)
    done = Column(Boolean, nullable=False, default=False)

    user = relationship('User', back_populates='assignments')
    text = relationship('Text', back_populates='assignments')


class NormalizedTextsUsers(Base):
    """
    Model for the 'normalizedtextsusers' table.
    Association table to mark when a user has completed the
    normalization of a text.
    """
    __tablename__ = 'normalizedtextsusers'

    textid = Column(Integer, ForeignKey('texts.id', ondelete="CASCADE"))
    userid = Column(Integer, ForeignKey('users.id', ondelete="CASCADE"))

    __table_args__ = (
        PrimaryKeyConstraint('textid', 'userid'),
    )
