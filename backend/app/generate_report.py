from app.database.queries import get_original_text_tokens_by_id, get_normalizations_by_text, get_text_by_id, get_username_by_id
from app.database.connection import get_db_session

import csv
import io

CONTEXT_WINDOW = 5

session = get_db_session()

def generate_report(user_id:int, text_ids:list[int]):
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    username = get_username_by_id(session, user_id)
    
    # Write CSV header
    output.write('\ufeff')  # BOM for UTF-8
    writer.writerow(['Text ID', 'User', 'Previous Tokens', 'Word', 'Subsequent Tokens', 'Normalization'])
    
    
    for text_id in text_ids:
        tokens = get_original_text_tokens_by_id(session, text_id)        
        normalizations = get_normalizations_by_text(session, text_id, user_id)
        text_sourcefilename = get_text_by_id(session, text_id, user_id)['source_file_name']

        for norm in normalizations:
            prev_tokens = tokens[max(0, norm.start_index - CONTEXT_WINDOW):norm.start_index]
            subseq_tokens = tokens[norm.end_index + 1:norm.end_index + 1 + CONTEXT_WINDOW]

            writer.writerow([
                text_sourcefilename,
                username,
                " ".join(token.token_text for token in prev_tokens),
                " ".join(token.token_text for token in tokens[norm.start_index:norm.end_index + 1]),    
                " ".join(token.token_text for token in subseq_tokens),
                norm.new_token
            ])

    return output.getvalue()