from sqlalchemy import func, select
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import NoResultFound

from app.database.models import Token, User, Text, Normalization, TextsUsers
from app.database.connection import get_db_session

db_session = get_db_session()

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
    # Subquery that checks if the text was normalized by the user
    normalized_subquery = select(TextsUsers.normalized).where(
        TextsUsers.text_id == Text.id, 
        TextsUsers.user_id == user_id
    ).scalar_subquery()
    
    users_agg_subquery = (
        select(func.array_agg(User.username))
        .join(TextsUsers, User.id == TextsUsers.user_id)
        .where(TextsUsers.text_id == Text.id, TextsUsers.assigned == True)
        .correlate(Text)  
        .scalar_subquery()
    )
    
    result = db_session.query(
        func.coalesce(normalized_subquery).label("normalized_by_user"),
        users_agg_subquery.label("users_assigned"),
        Text.id.label("id"),
        Text.grade.label("grade"),
        Text.source_file_name.label("source_file_name")
    ).all()

    return result
    
def get_text_by_id(db_session, text_id, user_id):
    """
    Fetch a specific text by its ID.
    """
    text_info = (
        db_session.query(Text)
        .filter(Text.id == text_id)
        .options(
            joinedload(Text.tokens).joinedload(Token.suggestions) 
        )
        .first()
    )

    if not text_info:
        return None
    
    assoc = db_session.query(TextsUsers).filter_by(text_id=text_id, user_id=user_id).first()

    
    tokens_data = [
        {
            "text": token.token_text,
            "isWord": token.is_word,
            "position": token.position,
            "candidates": [s.token_text for s in token.suggestions] ,
            "toBeNormalized": token.to_be_normalized
        }
        for token in text_info.tokens]

    response_dict = {
        'id': text_info.id,
        'grade': text_info.grade,
        'tokens': tokens_data, 
        'normalized_by_user': assoc.normalized if assoc else False,
        'source_file_name': text_info.source_file_name,
        'assigned_to_user': assoc.assigned if assoc else False,
    }
    return response_dict


def get_original_text_tokens_by_id(db_session, text_id:int):
    """
    Returns all tokens of a text without any normalization applied.
    """
    return db_session.query(Token).filter(Token.text_id == text_id).all()


def get_normalizations_by_text(db_session, text_id, user_id):
    """
    Returns all normalizations made by a user on a specific text.
    """
    return db_session.query(Normalization).filter(
        Normalization.text_id == text_id,
        Normalization.user_id == user_id
    ).all()


def assign_text_to_user(db_session, text_id, user_id):
    """
    Assigns a text to a user.
    """
    assoc = db_session.query(TextsUsers).filter_by(text_id=text_id, user_id=user_id).first()
    if assoc:
        assoc.assigned = True
    else:
        new_assoc = TextsUsers(text_id=text_id, user_id=user_id, assigned=True, normalized=False)
        db_session.add(new_assoc)
    db_session.commit()


def save_normalization(db_session, text_id, user_id, start_index, end_index, new_token, autocommit=True):
    """
    Saves or updates a normalization.
    """
    # Verifies if the normalization already exists
    existing_norm = db_session.query(Normalization).filter_by(text_id=text_id, user_id=user_id, start_index=start_index).first()

    if existing_norm:
        # (ON CONFLICT ... DO UPDATE)
        existing_norm.end_index = end_index
        existing_norm.new_token = new_token
        existing_norm.creation_time = func.now()
    else:
        # no conflict (normalization does not exist, insert new)
        new_norm = Normalization(
            text_id=text_id,
            user_id=user_id,
            start_index=start_index,
            end_index=end_index,
            new_token=new_token,
            creation_time=func.now()
        )
        
        db_session.add(new_norm)

    if autocommit:
        db_session.commit()


def delete_normalization(db_session, text_id, user_id, start_index):
    """
    Deletes a specific normalization.
    """
    norm_to_delete = db_session.query(Normalization).filter_by(text_id=text_id, user_id=user_id, start_index=start_index).first()
    if norm_to_delete:
        db_session.delete(norm_to_delete)
        db_session.commit()


def toggle_normalized(db_session, text_id, user_id):
    """
    Adds or removes an entry in the 'normalized_texts_users' table.
    """
    assoc = db_session.query(TextsUsers).filter_by(text_id=text_id, user_id=user_id).first()
    if assoc:
        assoc.normalized = not assoc.normalized
    else:
        new_assoc = TextsUsers(text_id=text_id, user_id=user_id, assigned=False, normalized=True)
        db_session.add(new_assoc)
    db_session.commit()


def get_usernames(db_session):
    """
    Returns a list of all usernames.
    """
    return db_session.query(User.username).all()

def get_username_by_id(db_session, user_id:int) -> str:
    """
    Returns the username for a given user ID.
    """
    user = db_session.query(User).filter(User.id == user_id).first()
    return user.username if user else None