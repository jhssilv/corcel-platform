
import psycopg2
import re
import os

# Functions to access and manipulate the database

def execute_function(function_name, params=None):
    """
    Executes a PostgreSQL function and fetches the return value.
    """

    connection = psycopg2.connect(os.getenv("DATABASE_URL"))
    connection.set_session(autocommit=True)
    cursor = connection.cursor()
    try:
        # Construct the function call query
        if params:
            placeholders = ', '.join(['%s'] * len(params))
            query = f"SELECT * from {function_name}({placeholders})"
        else:
            query = f"SELECT * from {function_name}()"
        
        # Execute the function call
        cursor.execute(query, params)
        
        # Fetch results
        if cursor.description:  # Check if the query returned rows
            result = cursor.fetchall()
        else:
            result = None
        return result
    except Exception as e:
        print(f"Error: {e}")
        return None
    finally:
        cursor.close()
        connection.close()

# Built functions and their parameters
functions = [
    'get_essay_by_id',          # (essay_id)
    'get_corrections_by_id',    # (essay_id)
    'get_essay_indexes',        # ()
    'save_correction',          # (essay_id,word_index,correction,author)
    'authenticate_user'         # (username,password)
]

# # # Using execute_function for a function with parameters
# auth_result = execute_function("authenticate_user", ("admin", "12345"))
# print("Authentication Result:", auth_result[0][0])
