from sqlalchemy import func, select
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import NoResultFound, IntegrityError
from sqlalchemy.dialects.postgresql import insert

from app.database.models import Token, User, Text, Normalization, TextsUsers, Suggestion, TokensSuggestions, WhitelistTokens, RawText
from app.extensions import db



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

def get_raw_texts(db):
    """
    Fetch a list of all raw texts (no user association).
    """
    result = db.query(
        RawText.id.label("id"),
        RawText.source_file_name.label("source_file_name")
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

def get_raw_text_by_id(db, text_id):
    """
    Fetch a specific raw text by its ID.
    """
    raw_text = db.query(RawText).filter(RawText.id == text_id).first()
    
    if not raw_text:
        return None
    
    return {
        'id': raw_text.id,
        'source_file_name': raw_text.source_file_name,
        'text_content': raw_text.text_content,
        'image_path': raw_text.image_path
    }

def update_raw_text_content(db, text_id, new_content):
    """
    Update the text content of a raw text by its ID.
    Returns True if successful, False if text not found.
    """
    raw_text = db.query(RawText).filter(RawText.id == text_id).first()
    
    if not raw_text:
        return False
    
    raw_text.text_content = new_content
    db.commit()
    return True


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
    # print(f"DEBUG: add_suggestion '{text}' for token {token_id}")
    # Handle both db extension and session objects
    session = db.session if hasattr(db, 'session') else db
    
    suggestion = session.query(Suggestion).filter_by(token_text=text).first()

    if not suggestion:
        try:
            with session.begin_nested():
                suggestion = Suggestion(token_text=text)
                session.add(suggestion)
                session.flush()
        except IntegrityError as e:
            # print(f"DEBUG: IntegrityError creating user suggestion: {e}")
            # Could have been added by a concurrent transaction
            suggestion = session.query(Suggestion).filter_by(token_text=text).first()
        except Exception as e:
            print(f"DEBUG: Unexpected error creating suggestion '{text}': {e}")
            raise e
    
    if not suggestion:
        print(f"DEBUG: Failed to get/create suggestion for '{text}'")
        return

    link_exists = session.query(TokensSuggestions).filter_by(
        token_id=token_id,
        suggestion_id=suggestion.id
    ).first()

    if not link_exists:
        try:
            with session.begin_nested():
                new_link = TokensSuggestions(
                    token_id=token_id,
                    suggestion_id=suggestion.id
                )
                session.add(new_link)
                session.flush()
        except IntegrityError:
            pass
        except Exception as e:
            print(f"DEBUG: Error linking suggestion: {e}")
            # Don't raise, just skip link
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

def add_raw_text(db, tokens: list[Token], source_file_name: str ):
    """
    Adds a new raw text and its associated tokens to the database.
    
    Args:
        db: The SQLAlchemy database session.
        tokens: A list of Token model instances (without IDs or text_id).
        source_file_name: The source file name of the text.
    Returns:
        The ID of the newly created text.
    """
    try:
        text_obj = Text(source_file_name=source_file_name)
        db.add(text_obj)        
        db.flush()
        
        for token in tokens:
            token.text_id = text_obj.id
            db.add(token)

        db.commit()
        
        return text_obj.id

    except Exception as e:
        db.rollback()
        print(f"Error adding raw text: {e}")
        raise e



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
    """
    Fetch filtered texts with optional filter criteria.
    Uses LEFT JOINs to include all texts, even those without assignments.
    """
    from sqlalchemy import select
    from sqlalchemy.orm import aliased
    
    # Subquery for aggregating assigned usernames
    users_agg_subquery = (
        select(func.array_agg(User.username))
        .join(TextsUsers, User.id == TextsUsers.user_id)
        .where(TextsUsers.text_id == Text.id, TextsUsers.assigned == True)
        .correlate(Text)
        .scalar_subquery()
    )
    
    # Subquery for normalized status (any user normalized)
    normalized_subquery = (
        select(func.bool_or(TextsUsers.normalized))
        .where(TextsUsers.text_id == Text.id)
        .correlate(Text)
        .scalar_subquery()
    )
    
    # Start query from Text table
    query = db.query(
        Text.id.label("id"),
        Text.grade.label("grade"),
        Text.source_file_name.label("source_file_name"),
        users_agg_subquery.label("users_assigned"),
        func.coalesce(normalized_subquery, False).label("normalized_by_user")
    )
    
    # Filter by grades
    if grades:
        query = query.filter(Text.grade.in_(grades))
    
    # Filter by assigned users - need a subquery check
    if assigned_users:
        assigned_subquery = (
            select(TextsUsers.text_id)
            .join(User, User.id == TextsUsers.user_id)
            .where(User.username.in_(assigned_users), TextsUsers.assigned == True)
        )
        query = query.filter(Text.id.in_(assigned_subquery))
    
    # Filter by normalized status
    if user_id is not None:
        normalized_check = (
            select(TextsUsers.text_id)
            .where(TextsUsers.user_id == user_id, TextsUsers.normalized == True)
        )
        query = query.filter(Text.id.in_(normalized_check))
        
    # Filter by file name
    if file_name:
        # fuzzy search logic: split by spaces, add wildcards between terms
        # "20152 t4" becomes "%20152%t4%" to match "20152t4p4363n3r.docx"
        terms = file_name.split()
        pattern = '%' + '%'.join(terms) + '%'
        query = query.filter(Text.source_file_name.ilike(pattern))
    
    return query.all()

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


def get_user_ids_by_usernames(db, usernames: list[str]) -> list[int]:
    """
    Returns a list of user IDs for the given usernames.
    Preserves the order of input usernames.
    """
    # Get all matching users
    users = db.query(User.id, User.username).filter(User.username.in_(usernames)).all()
    # Create a mapping from username to user_id
    username_to_id = {user.username: user.id for user in users}
    # Return IDs in the same order as input usernames, skipping duplicates
    seen = set()
    result = []
    for username in usernames:
        if username in username_to_id and username not in seen:
            result.append(username_to_id[username])
            seen.add(username)
    return result


def bulk_assign_texts(db, text_ids: list[int], user_ids: list[int]):
    """
    Assigns texts to users using round-robin distribution.
    Distributes texts evenly among the selected users.
    
    Args:
        db: Database session
        text_ids: List of text IDs to assign
        user_ids: List of user IDs to assign texts to
    
    Returns:
        dict: Mapping of user_id to count of assigned texts
    """
    if not text_ids or not user_ids:
        return {}
    
    # Deduplicate text_ids while preserving order
    seen_texts = set()
    unique_text_ids = []
    for text_id in text_ids:
        if text_id not in seen_texts:
            unique_text_ids.append(text_id)
            seen_texts.add(text_id)
    
    assignment_counts = {user_id: 0 for user_id in user_ids}
    
    for idx, text_id in enumerate(unique_text_ids):
        user_id = user_ids[idx % len(user_ids)]
        
        # Check if association already exists
        assoc = db.query(TextsUsers).filter_by(text_id=text_id, user_id=user_id).first()
        if assoc:
            assoc.assigned = True
        else:
            new_assoc = TextsUsers(text_id=text_id, user_id=user_id, assigned=True, normalized=False)
            db.add(new_assoc)
        
        assignment_counts[user_id] += 1
    
    db.commit()
    return assignment_counts