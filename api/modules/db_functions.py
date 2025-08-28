import psycopg2

class DBFunctions:
    _db_access = None
    
    def __init__(self, db_access):
        self._db_access = db_access

    def get_essays_assigned_to_user(self, userId:int):
        params = (userId,)
        return self._db_access.execute_function('get_texts_assigned_to_user', params)

    def authenticate_user(self, username:str, password:str):
        params = (username, password)
        return self._db_access.execute_function('authenticate_user', params)

    def get_texts_data(self, userId:int):
        params = (userId,)
        return self._db_access.execute_function('get_texts_data', params)

    def get_text_by_id(self, textId:int, userId:int):
        params = (textId, userId)
        return self._db_access.execute_function('get_text_by_id', params)
    
    def save_normalization(self, textId:int, userId:int, textTokenIndex:int, newToken:str):
        params = (textId, userId, textTokenIndex, newToken)
        return self._db_access.execute_function('save_normalization', params)
    
    def get_normalizations_by_text(self, textId, userId):
        params = (textId, userId)
        return self._db_access.execute_function('get_normalizations_by_text', params)
    
    def delete_normalization(self, textId:int, userId:int, textTokenIndex:int):
        params = (textId, userId, textTokenIndex)
        return self._db_access.execute_function('delete_normalization', params)
    
    def toggle_normalized(self, textId:int, userId:int):
        params = (textId,userId)
        return self._db_access.execute_function('toggle_normalized', params)
    
    def get_usernames(self):
        return self._db_access.execute_function('get_usernames')