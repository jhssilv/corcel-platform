from sqlalchemy import create_engine, func, literal, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import NoResultFound
from sqlalchemy.exc import OperationalError
import os

from database_models import User, Text, Normalization, TextsAssignment, NormalizedTextsUsers

# --- Configuração da Conexão e Sessão ---

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

# --- Funções de Query Equivalentes ---

def authenticate_user(db_session, username, password):
    """
    Authenticate an user. Returns (True, user_id) in case of success,
    or (False, None) in case of failure.
    """
    try:
        user = db_session.query(User).filter(User.username == username).one()

        if user.password == password:
            user.lastlogin = func.now()
            db_session.commit()
            return True, user.id
        else:
            # Incorrect password
            return False, None
    except NoResultFound:
        # User not found
        return False, None

def get_texts_data(db_session, user_id):
    """
    Fetch a list of all texts with relevant metadata.
    """
    # Subquery that checks if the text is assigned to the user
    assigned_subquery = (
        select(literal(True))
        .where(TextsAssignment.textid == Text.id, TextsAssignment.userid == user_id)
        .exists()
    )

    # Subquery that checks if the text has been normalized by the user
    normalized_subquery = (
        select(literal(True))
        .where(NormalizedTextsUsers.textid == Text.id, NormalizedTextsUsers.userid == user_id)
        .exists()
    )

    # Subquery that get the list of usernames from users that normalized the text.
    users_subquery = (
        select(User.username)
        .join(TextsAssignment, User.id == TextsAssignment.userid)
        .where(TextsAssignment.textid == Text.id)
    )

    users_normalized_array = func.array(users_subquery).label("userswhonormalized")
    
    return db_session.query(
        Text.id,
        Text.grade,
        users_normalized_array,
        normalized_subquery.label("normalizedbyuser"),
        Text.sourcefilename,
        assigned_subquery.label("assignedtouser")
    ).all()
    
def get_text_by_id(db_session, text_id, user_id):
    """
    Fetch a specific text by its ID.
    """
    # Subquery that checks if the text is assigned to the user
    assigned_subquery = (
        db_session.query(literal(True))
        .filter(TextsAssignment.textid == text_id, TextsAssignment.userid == user_id)
        .exists()
    )

    # Subquery that checks if the text has been normalized by the user
    normalized_subquery = (
        db_session.query(literal(True))
        .filter(NormalizedTextsUsers.textid == text_id, NormalizedTextsUsers.userid == user_id)
        .exists()
    )

    return db_session.query(
        Text.id,                                       # id in the database     
        Text.tokens,                                   # tokens array           
        Text.wordmap,                                  # word_map array - wordmap[i] = tokens[i].isalpha()
        Text.grade,                                    # (usually) Found in the sourcefilename file, can be null
        Text.candidates,                               # json for the replacements candidates
        Text.professorname.label("teacher"),           # professor name - to be removed in future versions
        normalized_subquery.label("normalizedbyuser"), # isCorrected
        Text.sourcefilename,                           # name of the file the text came from
        assigned_subquery.label("assignedtouser")      # if there is an entry in texts_assignments for this user and text
    ).filter(Text.id == text_id).first()


def get_normalizations_by_text(db_session, text_id, user_id):
    """
    Returns all normalizations made by a user on a specific text.
    """
    return db_session.query(Normalization).filter(
        Normalization.textid == text_id,
        Normalization.userid == user_id
    ).all()


def assign_text_to_user(db_session, text_id, user_id):
    """
    Assigns a text to a user.
    """
    assignment = TextsAssignment(textid=text_id, userid=user_id, done=False)
    db_session.add(assignment)
    db_session.commit()


def save_normalization(db_session, text_id, user_id, start_index, end_index, new_token, autocommit=True):
    """
    Saves or updates a normalization.
    """
    # Verifies if the normalization already exists
    existing_norm = db_session.query(Normalization).filter_by(
        textid=text_id,
        userid=user_id,
        startindex=start_index
    ).first()

    if existing_norm:
        # (ON CONFLICT ... DO UPDATE)
        existing_norm.endindex = end_index
        existing_norm.newtoken = new_token
        existing_norm.creationtime = func.now()
    else:
        # no conflict (normalization does not exist, insert new)
        new_norm = Normalization(
            textid=text_id,
            userid=user_id,
            startindex=start_index,
            endindex=end_index,
            newtoken=new_token,
            creationtime=func.now()
        )
        db_session.add(new_norm)

    if autocommit:
        db_session.commit()


def delete_normalization(db_session, text_id, user_id, start_index, autocommit=True):
    """
    Deletes a specific normalization.
    """
    norm_to_delete = db_session.query(Normalization).filter_by(
        textid=text_id,
        userid=user_id,
        startindex=start_index
    ).first()

    if norm_to_delete:
        db_session.delete(norm_to_delete)
        if autocommit:
            db_session.commit()


def toggle_normalized(db_session, text_id, user_id, autocommit=True):
    """
    Adds or removes an entry in the 'normalized_texts_users' table.
    """
    existing_entry = db_session.query(NormalizedTextsUsers).filter_by(
        textid=text_id,
        userid=user_id
    ).first()

    if existing_entry:
        # If exists, delete it
        db_session.delete(existing_entry)
    else:
        # If not exists, insert it
        new_entry = NormalizedTextsUsers(textid=text_id, userid=user_id)
        db_session.add(new_entry)

    if autocommit:
        db_session.commit()


def get_usernames(db_session):
    """
    Returns a list of all usernames.
    """
    return db_session.query(User.username).all()

