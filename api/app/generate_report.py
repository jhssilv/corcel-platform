
import csv
import io

from app.database.queries import get_original_text_tokens_by_id, get_normalizations_by_text, get_text_by_id, get_username_by_id
from app.extensions import db

CONTEXT_WINDOW = 5

def generate_report(user_id:int, text_ids:list[int]):
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    username = get_username_by_id(db, user_id)
    
    # Write CSV header
    output.write('\ufeff')  # BOM for UTF-8
    writer.writerow(['Text ID', 'User', 'Previous Tokens', 'Word', 'Subsequent Tokens', 'Normalization'])
    
    for text_id in text_ids:
        tokens = get_original_text_tokens_by_id(db, text_id)        
        tokens.sort(key=lambda token: token.position)
        normalizations = get_normalizations_by_text(db, text_id, user_id)
        text_sourcefilename = get_text_by_id(db, text_id, user_id)['source_file_name']

        for norm in normalizations:
            prev_tokens = tokens[max(0, norm.start_index - CONTEXT_WINDOW):norm.start_index]
            subseq_tokens = tokens[norm.end_index + 1:norm.end_index + 1 + CONTEXT_WINDOW]
            length = norm.end_index - norm.start_index + 1

            writer.writerow([
                text_sourcefilename,
                username,
                " ".join(token.token_text for token in prev_tokens),
                " ".join(token.token_text for token in tokens[norm.start_index:norm.start_index + length]),          
                " ".join(token.token_text for token in subseq_tokens),
                norm.new_token
            ])

    return output.getvalue()