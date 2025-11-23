import tempfile
import database.models as models
from database.queries import get_normalizations_by_text
from database.connection import get_db_session
import os
import shutil
import time

db = get_db_session()

def normalizations_to_dict(normalizations):
    return {n.start_index: n for n in normalizations}

def get_normalized_tokens(text_ids:list[int], user_id:int, use_tags=False) -> dict[str, dict]:
    texts = db.query(models.Text).filter(models.Text.id.in_(text_ids)).all()
    texts_tokens = {}
    
    for text in texts:
        texts_tokens[text.source_file_name] = {'grade': text.grade, 'tokens': []}
        
        tokens = db.query(models.Token).filter(models.Token.text_id == text.id).all()
        normalizations = normalizations_to_dict(get_normalizations_by_text(db, text.id, user_id))
        
        for token in tokens:
            norm = normalizations.get(token.position)
            if norm and use_tags:
                token.token_text = f"<norm orig='{token.token_text}'>{norm.new_token}</norm>"
            elif norm and not use_tags:
                token.token_text = norm.new_token

            texts_tokens[text.source_file_name]['tokens'].append(token)

    return texts_tokens

def rebuild_text(tokens:list[models.Token]) -> str:
    # There may be a better way to do this
    NO_SPACE_BEFORE = {':', ',', '.', ')', '}', '?', '!', ']', '\n', '\t', ';', ' '}
    NO_SPACE_AFTER = {'{', '(', '[', '#', '\n', '\t', ' '}

    result = ""
    previous_token = None
    
    for token in tokens:
        # It's the first token
        if not previous_token:
            result += token.token_text
            previous_token = token
        # It's not the first token...
        else:
            # ...and there are rules for no space
            if (previous_token.token_text in NO_SPACE_AFTER) or (token.token_text in NO_SPACE_BEFORE):
                result += token.token_text
                previous_token = token
            # ...and there are NO rules for no space
            else:
                result += ' ' + token.token_text
                previous_token = token
                
    return result

def save_result(base_dir: str, source_file_name: str, text: str, grade: int):
    safe_filename = os.path.basename(source_file_name)
    # Adds 'n' to the end of the filename before the extension ------------\/
    output_path = os.path.join(base_dir, f'NOTA {grade}', f'{safe_filename}n.txt')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f: # Specify UTF-8 encoding
        f.write(text)

def save_modified_texts(user_id: int, text_ids: list[int], use_tags: bool = False) -> str:
    # Create a temporary directory for this operation
    temp_dir = tempfile.mkdtemp(prefix=f'recovered_texts_user_{user_id}_')
    
    txt_output_dir = os.path.join(temp_dir, 'texts')
    os.makedirs(txt_output_dir, exist_ok=True)

    tokens_by_file = get_normalized_tokens(text_ids, user_id, use_tags) 

    for source_file, data in tokens_by_file.items():
        # Rebuild the text from tokens and normalizations
        rebuilt_text = rebuild_text(data['tokens'])
        # Create subdirectory based on grade and save the file
        save_result(txt_output_dir, source_file, rebuilt_text, data.get('grade', 0))

    # Zip the results
    zip_basename = 'recovered_texts'
    zip_path_base = os.path.join(temp_dir, zip_basename)
    shutil.make_archive(zip_path_base, 'zip', txt_output_dir)
    
    return f"{zip_path_base}.zip"


if __name__ == '__main__':
    
    user_id = 1
    use_tags = True
    text_ids = [i for i in range(3)]

    start_time = time.time()
    save_modified_texts(user_id, text_ids, use_tags=use_tags)
    end_time = time.time()
    print(f"Time taken to save modified texts: {end_time - start_time} seconds") 