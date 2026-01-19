from sqlalchemy import func, select
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import NoResultFound
from sqlalchemy.dialects.postgresql import insert

from app.database.models import Token, User, Text, Normalization, TextsUsers, Suggestion, TokensSuggestions, WhitelistTokens
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
            "id": token.id,
            "text": token.token_text,
            "isWord": token.is_word,
            "position": token.position,
            "candidates": [s.token_text for s in token.suggestions] ,
            "toBeNormalized": token.to_be_normalized,
            "whitespaceAfter": token.whitespace_after,
            "whitelisted" : token.whitelisted
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


def save_normalization(db, text_id, user_id, start_index, end_index, new_token, suggest_for_all=False, autocommit=True):
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

    if suggest_for_all:
        # Get the original token to find its text
        token = db.query(Token).filter_by(text_id=text_id, position=start_index).first()
        if token:
            # Get or Create Suggestion
            suggestion = db.query(Suggestion).filter_by(token_text=new_token).first()
            if not suggestion:
                suggestion = Suggestion(token_text=new_token)
                db.add(suggestion)
                db.flush()
            
            # Find all matching tokens IDs
            matching_token_ids = db.query(Token.id).filter(Token.token_text == token.token_text).all()
            
            if matching_token_ids:
                # Bulk Insert with ON CONFLICT DO NOTHING
                stmt = insert(TokensSuggestions).values(
                    [
                        {"token_id": t_id[0], "suggestion_id": suggestion.id}
                        for t_id in matching_token_ids
                    ]
                )
                
                stmt = stmt.on_conflict_do_nothing(
                    index_elements=['token_id', 'suggestion_id']
                )
                
                db.execute(stmt)

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


def toggle_to_be_normalized(db, token_id: int):
    """
    Toggles the 'to_be_normalized' flag for a specific token.
    """
    token = db.query(Token).filter(Token.id == token_id).first()
    if token:
        token.to_be_normalized = not token.to_be_normalized
        db.commit()
        
def get_whitelist_tokens(db):
    """
    Returns a list of all whitelisted tokens.
    """
    whitelist_entries = db.query(WhitelistTokens).all()
    return [entry.token_text for entry in whitelist_entries]
    
    
def add_whitelist_token(db, token_text: str):
    """
    Adds a token to the whitelist.
    """
    existing_entry = db.query(WhitelistTokens).filter_by(token_text=token_text).first()
    if not existing_entry:
        new_whitelist_entry = WhitelistTokens(token_text=token_text)
        db.add(new_whitelist_entry)
        
        matching_tokens = db.query(Token).filter_by(token_text=token_text).all()
        for token in matching_tokens:
            token.whitelisted = True
            db.add(token)
        
        db.commit()
        
def remove_whitelist_token(db, token_text: str):
    """
    Removes a token from the whitelist.
    """
    whitelist_entry = db.query(WhitelistTokens).filter_by(token_text=token_text).first()
    if whitelist_entry:
        db.delete(whitelist_entry)
        
        matching_tokens = db.query(Token).filter_by(token_text=token_text).all()
        for token in matching_tokens:
            token.whitelisted = False
            db.add(token)
        
        db.commit()

def get_all_users(db):
    """
    Returns a list of all users.
    """
    return db.query(User).order_by(User.id).all()
    
def get_filtered_texts(db, grades:list[int]=None, assigned_users:list[str]=None, user_id:int=None, file_name:str=None):
    texts = db.query(TextsUsers).join(Text).join(User)
    # filter by grades
    if grades:
        texts = texts.filter(Text.grade.in_(grades))
        
    # filter by file name
    if assigned_users:
        texts = texts.filter(User.username.in_(assigned_users), TextsUsers.assigned == True)
        
    # filter by normalized by user
    if user_id is not None:
        texts = texts.filter(TextsUsers.normalized and TextsUsers.user_id == user_id)
        
    # filter by file name
    if file_name:
        # fuzzy search logic
        pattern = '%' + '%'.join(file_name) + '%'
        texts = texts.filter(Text.source_file_name.ilike(pattern))
        
    texts = texts.with_entities(
        Text.id.label("id"),
        Text.grade.label("grade"),
        Text.source_file_name.label("source_file_name"),
        func.array_agg(User.username).label("users_assigned"),
        func.bool_or(TextsUsers.normalized).label("normalized_by_user")
    ).group_by(Text.id)
    
    return texts.all()

def delete_all_normalizations(db, user_id:int, text_id:int):
    """
    Deletes all normalizations made by a specific user in a specific text.
    """
    db.query(Normalization).filter(Normalization.user_id == user_id, Normalization.text_id == text_id).delete()
    db.commit()


def count_admin_users(db):
    """
    Returns the count of users with admin privileges.
    """
    return db.query(func.count(User.id)).filter(User.is_admin == True).scalar()