from sqlalchemy import func, select
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import NoResultFound

from app.database.models import Token, User, Text, Normalization, TextsUsers, Suggestion, TokensSuggestions
from app.extensions import db

from psycopg2.errors import UniqueViolation



def authenticate_user(db, username, password):
    """
    Authenticate an user. Returns (True, user_id) in case of success,
    or (False, None) in case of failure.
    """
    try:
        user = db.query(User).filter(User.username == username).one()

        if user.password == password:
            user.lastlogin = func.now()
            db.commit()
            return True, user.id
        else:
            # Incorrect password
            return False, None
    except NoResultFound:
        # User not found
        return False, None

def get_texts_data(db, user_id):
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
    
    result = db.query(
        func.coalesce(normalized_subquery).label("normalized_by_user"),
        users_agg_subquery.label("users_assigned"),
        Text.id.label("id"),
        Text.grade.label("grade"),
        Text.source_file_name.label("source_file_name")
    ).all()

    return result
    
def get_text_by_id(db, text_id, user_id):
    """
    Fetch a specific text by its ID.
    """
    text_info = (
        db.query(Text)
        .filter(Text.id == text_id)
        .options(
            joinedload(Text.tokens).joinedload(Token.suggestions) 
        )
        .first()
    )

    if not text_info:
        return None
    
    assoc = db.query(TextsUsers).filter_by(text_id=text_id, user_id=user_id).first()

    
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


def get_original_text_tokens_by_id(db, text_id:int):
    """
    Returns all tokens of a text without any normalization applied.
    """
    return sorted(db.query(Token).filter(Token.text_id == text_id).all(), key=lambda t: t.position)


def get_normalizations_by_text(db, text_id, user_id):
    """
    Returns all normalizations made by a user on a specific text.
    """
    return db.query(Normalization).filter(
        Normalization.text_id == text_id,
        Normalization.user_id == user_id
    ).all()


def assign_text_to_user(db, text_id, user_id):
    """
    Assigns a text to a user.
    """
    assoc = db.query(TextsUsers).filter_by(text_id=text_id, user_id=user_id).first()
    if assoc:
        assoc.assigned = True
    else:
        new_assoc = TextsUsers(text_id=text_id, user_id=user_id, assigned=True, normalized=False)
        db.add(new_assoc)
    db.commit()


def save_normalization(db, text_id, user_id, start_index, end_index, new_token, autocommit=True):
    """
    Saves or updates a normalization.
    """
    # Verifies if the normalization already exists
    existing_norm = db.query(Normalization).filter_by(text_id=text_id, user_id=user_id, start_index=start_index).first()

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
        
        db.add(new_norm)

    if autocommit:
        db.commit()


def delete_normalization(db, text_id, user_id, start_index):
    """
    Deletes a specific normalization.
    """
    norm_to_delete = db.query(Normalization).filter_by(text_id=text_id, user_id=user_id, start_index=start_index).first()
    if norm_to_delete:
        db.delete(norm_to_delete)
        db.commit()


def toggle_normalized(db, text_id, user_id):
    """
    Adds or removes an entry in the 'normalized_texts_users' table.
    """
    assoc = db.query(TextsUsers).filter_by(text_id=text_id, user_id=user_id).first()
    if assoc:
        assoc.normalized = not assoc.normalized
    else:
        new_assoc = TextsUsers(text_id=text_id, user_id=user_id, assigned=False, normalized=True)
        db.add(new_assoc)
    db.commit()


def get_usernames(db):
    """
    Returns a list of all usernames.
    """
    return db.query(User.username).all()

def get_username_by_id(db, user_id:int) -> str:
    """
    Returns the username for a given user ID.
    """
    user = db.query(User).filter(User.id == user_id).first()
    return user.username if user else None

def add_suggestion(text_id: int, token_id: int, text: str, db):
    suggestion = db.query(Suggestion).filter_by(token_text=text).first()

    if not suggestion:
        suggestion = Suggestion(token_text=text)
        db.add(suggestion)
        db.flush()

    link_exists = db.query(TokensSuggestions).filter_by(
        token_id=token_id,
        suggestion_id=suggestion.id
    ).first()

    if not link_exists:
        try:
            new_link = TokensSuggestions(
                token_id=token_id,
                suggestion_id=suggestion.id
            )
            db.add(new_link)
            # Flush to ensure subsequent queries in the same transaction see this link
            db.flush()
        except UniqueViolation:
            pass

def add_text(text_obj: Text, tokens_with_candidates: list[tuple[Token, list[str]]], db=db):
    """
    Adds a new text and its associated tokens to the database.
    
    Args:
        db: The SQLAlchemy database session.
        text_obj: An instance of the Text model (without ID).
        tokens_with_candidates: A list of tuples, where each tuple contains a Token model instance 
                                (without IDs or text_id) and a list of candidate strings.
    Returns:
        The ID of the newly created text.
    """
    try:
        db.add(text_obj)        
        db.flush()
        
        for token, candidates in tokens_with_candidates:
            token.text_id = text_obj.id
            db.add(token)
            db.flush() # Flush to generate token.id
            
            # Deduplicate candidates to avoid UniqueViolation in TokensSuggestions
            unique_candidates = list(set(candidates))
            
            for candidate in unique_candidates:
                add_suggestion(text_obj.id, token.id, candidate, db)

        db.commit()
        
        return text_obj.id

    except Exception as e:
        db.rollback()
        print(f"Error adding text: {e}")
        raise e
    
def get_user_by_username(db, username: str):
    """
    Fetch a user by their username.
    """
    return db.query(User).filter(User.username == username).first()