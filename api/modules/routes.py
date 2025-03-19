from modules import api, db_access
from datetime import datetime
from flask import request, jsonify

# DEFINED ROUTES:
# /api/login: authenticates user login information, updating their 'last seen' status and returns the essay indexes.
# /api/essay: gets a single essay and its corrections.
# /api/correction: posts a single correction into the DB.

@api.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"message": "Missing username or password"}), 400

    response = {}

    result = db_access.execute_function('authenticate_user', (username, password))
    print("DEBUG: DB result:", result)

    # Extract the boolean value from the result
    # Expected result: [(True,)] or [(False,)]
    auth = result[0][0] if result and len(result) > 0 and len(result[0]) > 0 else False

    if auth:
        response["message"] = "Login successful"
        response["essayIndexes"] = db_access.execute_function('get_essay_indexes')
        status_code = 200
    else:
        response["message"] = "Login failed"
        status_code = 401

    response["timestamp"] = str(datetime.now())
    return jsonify(response), status_code


@api.route('/api/essay', methods=['POST'])
def essay():
    data = request.json
    essay_id = [data.get('value')]
    response = {}

    # Gets and organizes the essay table response
    essay = db_access.execute_function('get_essay_by_id',essay_id)

    index = essay[0][0]
    tokens = essay[0][1]
    word_map = essay[0][2]
    grade = essay[0][3]
    candidates = essay[0][4]
    teacher = essay[0][5]
    isCorrected = essay[0][6]
    response={'index':index, 
              'tokens':tokens, 
              'word_map':word_map, 
              'candidates':candidates, 
              'grade': grade, 
              'corrections':{}, 
              'teacher': teacher, 
              'isCorrected': isCorrected}

    # Gets and organizes the corrections table response
    corrections = db_access.execute_function('get_corrections_by_id',essay_id)

    # Loop through all corrections and add them to the response
    if corrections:
        for correction in corrections:
            word_index = correction[0]  # Assuming word_index is the first element
            correction_text = correction[1]  # Assuming the correction is the second element
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
        author = data.get('author')

        # Check if required fields are present
        if essay_id is None or word_index is None or author is None:
            return jsonify({"error": f"Missing required fields: ID {essay_id}, word_index {word_index}"}), 400

        # If correction is empty or missing, delete the correction
        if correction == '':
            db_access.execute_function('delete_correction', (essay_id, word_index, author))
            return jsonify({"message": "Correction deleted successfully"}), 200

        # Otherwise, save the correction
        db_access.execute_function('save_correction', (essay_id, word_index, correction, author))
        return jsonify({"message": f"Correction added successfully: {correction}"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/api/changeCorrectionStatus', methods=['POST'])
def changeCorrectionStatus():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        essay_id = data.get('essay_id')
        correctionStatus = data.get('correctionStatus')

        # Validate that required fields are not None
        if essay_id is None or correctionStatus is None:
            return jsonify({"error": "Missing required fields"}), 400

        # Execute the Postgres function to update the correction status
        db_access.execute_function('change_correction_status', (essay_id, correctionStatus))

        return jsonify({"message": "Correction status changed successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
