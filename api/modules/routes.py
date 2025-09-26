from modules import api, db_access
"""
Module routes — HTTP API endpoints for user authentication and text correction.
# Routes summary:
# - GET /users
#     Returns list of usernames.
# - POST /login
#     Authenticates a user by username/password. Returns message, userId (or null), and timestamp.
# - POST /texts/<user_id:int>
#     Returns texts metadata of all texts for the given user_id [(id, grade, users_who_normalized, normalized_by_user, source_file_name, assigned_to_user)].
# - GET /texts/<user_id:int>/<text_id:int> 
#     Returns a single text's stored data (id, tokens, wordmap, grade, candidates, professorName, normalized_by_user, source_file_name, assigned_to_user).
# - GET /texts/<user_id:int>/<text_id:int>/normalizations
#     Returns all normalizations for a text as a mapping of word_index -> normalized_token.
# - DELETE /texts/<user_id:int>/<text_id:int>/normalizations
#     Deletes a normalization for a given word_index. Expects JSON { "word_index": <int> }.
# - POST /texts/<user_id:int>/<text_id:int>/normalizations
#     Adds/saves a normalization. Expects JSON { "word_index": <int>, "new_token": <str> }.
# - PATCH /texts/<user_id:int>/<text_id:int>/normalizations
#     Toggles the "normalized" status for a text (no body required).

- Returned JSON shapes:
    - /users: [ "username1", "username2", ... ]
    - /login (success): { "message": "Olá, <username>!", "userId": <int>, "timestamp": "<iso-datetime>" }
    - /login (fail): { "message": "Usuário ou Senha incorretos. Tente novamente.", "userId": null, "timestamp": "<iso-datetime>" }
    - /texts/<user_id>: { "textsData": [ ... ] } (empty array if none)
    - /texts/<user_id>/<text_id>: {
          "index": <int>, "tokens": <...>, "word_map": <...>, "candidates": <...>,
          "grade": <...>, "corrections": { ... }, "teacher": <...>, "isCorrected": <bool>,
          "sourceFileName": <str>
    - /normalizations (GET): { "<word_index>": "<corrected_token>", ... }
    - /normalizations DELETE/POST/PATCH: success message JSON or error JSON on failure.
Notes:
- Payload keys expected for POST/DELETE endpoints are documented above; callers should ensure JSON content-type and include required fields.
- Logging, authentication tokens, and more detailed validation are not handled in these routes and should be added as needed.
"""

from datetime import datetime
from flask import request, jsonify

from modules.db_functions import DBFunctions

db_functions = DBFunctions(db_access)

@api.route('/api/users', methods=['GET'])
def getUsernames():
    try:
        usernames = db_functions.get_usernames()
        username_list = [username[0] for username in usernames] if usernames else []
        return jsonify(username_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/api/login', methods=['POST'])
def login():
    data = request.json
    
    if data is None:
        return jsonify({"message": "No data provided"}), 400
    
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"message": "Missing username or password"}), 400

    result = db_functions.authenticate_user(username, password)

    # Extract the boolean value from the result
    # Expected result: [(True, $userId)] or [(False, None)]
    auth = result[0][0] if result and len(result) > 0 and len(result[0]) > 0 else False

    response = {}
    if auth:
        status_code = 200
        response["message"] = f"Olá, {username}!"
        response["userId"] = result[0][1]
    else:
        status_code = 401
        response["userId"] = None
        response["message"] = "Usuário ou Senha incorretos. Tente novamente."
        
    response["timestamp"] = str(datetime.now())
        
    return jsonify(response), status_code


@api.route('/api/texts/<int:user_id>', methods=['GET'])
def get_texts_data(user_id):
    response = {}
    textsData = db_functions.get_texts_data(user_id)
    if textsData:
        response["textsData"] = textsData
    else:
        response["textsData"] = []

    return jsonify(response), 200

@api.route('/api/texts/<int:user_id>/<int:text_id>', methods=['GET'])
def text(user_id, text_id):
    response = {}

    # Gets and organizes the essay table response
    essay = db_functions.get_text_by_id(text_id, user_id)

    (
        index,
        tokens,
        word_map,
        grade,
        candidates,
        teacher,
        isCorrected,
        sourceFileName,
        correctedByUser
    ) = essay[0]

    response = {
        'index': index,
        'tokens': tokens,
        'word_map': word_map,
        'candidates': candidates,
        'grade': grade,
        'corrections': {},
        'teacher': teacher,
        'isCorrected': isCorrected,
        'sourceFileName': sourceFileName,
        'correctedByUser': correctedByUser
    }

    return jsonify(response)

@api.route('/api/texts/<int:user_id>/<int:text_id>/normalizations', methods=['GET'])
def normalizations(user_id, text_id):
    
    data = db_functions.get_normalizations_by_text(textId=text_id, userId=user_id)

    corrections = {}
    for entry in data:
        _, _ ,start_index, normalized_token, _, end_index  = entry
        corrections[start_index] = (normalized_token, end_index)

    return jsonify(corrections), 200

@api.route('/api/texts/<int:user_id>/<int:text_id>/normalizations', methods=['DELETE'])
def delete_normalization(user_id, text_id):
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        word_index = data.get('word_index')
        if text_id is None or word_index is None or user_id is None:
            return jsonify({"error": f"Missing required fields: word_index {word_index}"}), 400

        db_functions.delete_normalization(textId=text_id, userId=user_id, textTokenIndex=word_index)
        return jsonify({"message": "Normalization deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/api/texts/<int:user_id>/<int:text_id>/normalizations', methods=['POST'])
def correction(user_id, text_id):
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        first_word_index = data.get('first_index')
        last_word_index = data.get('last_index')
        new_token = data.get('new_token')

        if text_id is None or first_word_index is None or last_word_index is None or user_id is None:
            return jsonify({"error": f"Missing required fields: ID {text_id}, first_index {first_word_index}, last_index {last_word_index}"}), 400

        db_functions.save_normalization(textId=text_id, userId=user_id, firstIndex=first_word_index, lastIndex=last_word_index, newToken=new_token)
        return jsonify({"message": f"Correction added successfully: {new_token}"}), 200

    except Exception as e:
        print(str(e))
        return jsonify({"error": str(e)}), 500

@api.route('/api/texts/<int:user_id>/<int:text_id>/normalizations', methods=['PATCH'])
def toggleNormalizationStatus(user_id, text_id):
    try:
        db_functions.toggle_normalized(textId=text_id, userId=user_id)

        return jsonify({"message": "Correction status changed successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
