import database_models as models
from database_queries import get_normalizations_by_text
from database_conn import get_db_session
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
            if norm:
                if use_tags:
                    token.token_text = f"{token.token_text}<{norm.new_token}>"
                else:
                    token.token_text = norm.new_token
                texts_tokens[text.source_file_name]['tokens'].append(token)
            else:
                texts_tokens[text.source_file_name]['tokens'].append(token)

    return texts_tokens

def rebuild_text(tokens:list[models.Token]) -> str:
    NO_SPACE_BEFORE = {':', ',', '.', ')', '}', '>', '?', '!', ']', '\n', '\t', ';', ' '}
    NO_SPACE_AFTER = {'{', '(', '<', '[', '#', '\n', '\t', ' '}

    result = ""
    previous_token = None
    
    for token in tokens:
        if not previous_token:
            result += token.token_text
            previous_token = token
        else:
            if (previous_token.token_text in NO_SPACE_AFTER) or (token.token_text in NO_SPACE_BEFORE):
                result += token.token_text
                previous_token = token
            else:
                result += ' ' + token.token_text
                previous_token = token
                
    return result

def save_result(source_file_name:str, user_id:int, text:str, grade:int):
    output_path = f'recovered_texts/{user_id}/NOTA {grade}/{source_file_name}.txt'
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w+') as f:
        f.write(text)

def save_modified_texts(user_id:int, text_ids:list[int], use_tags:bool = False) ->str:
    tokens = get_normalized_tokens(text_ids, user_id, use_tags=use_tags)
    for source_file, data in tokens.items():
        rebuilt_text = rebuild_text(data['tokens'])
        save_result(source_file, user_id, rebuilt_text, data['grade'])

    os.makedirs(os.path.dirname(f'recovered_texts/zip/{user_id}/recovered_texts.zip'), exist_ok=True)
    shutil.make_archive(f'recovered_texts/zip/{user_id}/recovered_texts', 'zip', f'recovered_texts/{user_id}/')

    return f'recovered_texts/zip/{user_id}/recovered_texts.zip'

def delete_saved_files(user_id:int):
    if int(user_id):
        folder_path = f'recovered_texts/{user_id}/'
        zip_path = f'recovered_texts/zip/{user_id}/recovered_texts.zip'
        if os.path.exists(folder_path):
            shutil.rmtree(folder_path)
        if os.path.exists(zip_path):
            os.remove(zip_path)
            
    else:
        print("user_id must be an integer value.")

if __name__ == '__main__':
    
    user_id = 2
    use_tags = True
    text_ids = [i for i in range(3)]

    start_time = time.time()
    save_modified_texts(user_id, text_ids, use_tags=use_tags)
    end_time = time.time()
    print(f"Time taken to save modified texts: {end_time - start_time} seconds") 