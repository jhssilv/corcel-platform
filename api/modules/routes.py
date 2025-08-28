from modules import api, db_access
from datetime import datetime
from flask import request, jsonify

from modules.db_functions import DBFunctions

db_functions = DBFunctions(db_access)

# DEFINED ROUTES:
# /api/login: authenticates user login information, updating their 'last seen' status and returns the essay indexes.
# /api/essay: gets a single essay and its corrections.
# /api/correction: posts a single correction into the DB.

# @api.route('/api/normalizedBy', methods=['GET'])
# def getUsersWhoNormalized(textId:int):
#     try:
#         users = db_functions.get_normalizations_by_text(textId, userId=None)
#         user_list = [user[1] for user in users] if users else []
#         return jsonify(user_list), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

@api.route('/api/essays/assignedTo', methods=['GET'])
def getEssaysAssignedTo(userId:int):
    try:
        ids = db_functions.get_essays_assigned_to_user(userId)
        return jsonify(ids), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/api/getUsernames', methods=['GET'])
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

    response = {}

    result = db_functions.authenticate_user(username, password)

    # Extract the boolean value from the result
    # Expected result: [(True, $userId)] or [(False, None)]
    auth = result[0][0] if result and len(result) > 0 and len(result[0]) > 0 else False

    if auth:
        userId:int = result[0][1]
        message:str = "Login Successful"
        essayIndexes = db_functions.get_texts_data(userId)
                
        response["message"] = message
        response["userId"] = userId
        response["essayIndexes"] = essayIndexes
        status_code = 200
    else:
        response["message"] = "Login failed"
        status_code = 401

    response["timestamp"] = str(datetime.now())
    return jsonify(response), status_code


@api.route('/api/essay', methods=['POST'])
def essay():
    data = request.json
    
    if data is None:
        return jsonify({"message": "No data provided"}), 400
    
    essay_id:int = data.get('value')
    userId:int = data.get('userId')
    response = {}

    # Gets and organizes the essay table response
    essay = db_functions.get_text_by_id(essay_id, userId)

    index = essay[0][0]
    tokens = essay[0][1]
    word_map = essay[0][2]
    grade = essay[0][3]
    candidates = essay[0][4]
    teacher = essay[0][5]
    isCorrected = essay[0][6]
    sourceFileName = essay[0][7]
    response={'index':index, 
              'tokens':tokens, 
              'word_map':word_map, 
              'candidates':candidates, 
              'grade': grade, 
              'corrections':{}, 
              'teacher': teacher, 
              'isCorrected': isCorrected,
              'sourceFileName': sourceFileName}

    # Gets and organizes the corrections table response
    corrections = db_functions.get_normalizations_by_text(essay_id, userId=userId)

    # Loop through all corrections and add them to the response
    if corrections:
        for correction in corrections:
            word_index = correction[2]
            correction_text = correction[3]
            response['corrections'][word_index] = correction_text
            
    return jsonify(response)

@api.route('/api/correction', methods=['POST'])
def correction():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        essay_id = data.get('essay_id')
        word_index = data.get('word_index')
        correction = data.get('correction')
        userId = data.get('userId')

        # Check if required fields are present
        if essay_id is None or word_index is None or userId is None:
            return jsonify({"error": f"Missing required fields: ID {essay_id}, word_index {word_index}"}), 400

        # If correction is empty or missing, delete the correction
        if correction == '':
            db_functions.delete_normalization(essay_id, userId, word_index)
            return jsonify({"message": "Correction deleted successfully"}), 200

        # Otherwise, save the correction
        db_functions.save_normalization(essay_id, userId, word_index, correction)
        return jsonify({"message": f"Correction added successfully: {correction}"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/api/changeCorrectionStatus', methods=['POST'])
def changeCorrectionStatus():
    try:
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        textId = data.get('textId')
        userId = data.get('userId')
        
        # Execute the Postgres function to update the correction status
        db_functions.toggle_normalized(textId, userId)

        return jsonify({"message": "Correction status changed successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
