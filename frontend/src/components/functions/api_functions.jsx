
const DEFAULT_HEADERS  = {'Content-Type': 'application/json',};
const METHOD_GET = 'GET'
const METHOD_POST = 'POST'

async function getUsernames() {
    try{
        const response = await fetch('/api/getUsernames', {
            method: METHOD_GET,
            headers: DEFAULT_HEADERS,
        });

        if (!response.ok) {
            throw new Error('Error fetching usernames');
        }

        const data = await response.json();
        return data; 
    } catch (error) {
        console.error(error);
        return {message: "Error fetching usernames" };
    }
}

async function changeCorrectionStatus(textId, userId){
   
    const payload = JSON.stringify({
        textId : textId,
        userId: userId
    });
   
    try {
        const response = await fetch('/api/changeCorrectionStatus', {
            method: METHOD_POST,
            headers: DEFAULT_HEADERS,
            body: payload,
        });
    
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error(error);
        return {message: "Error changing correction status" };
    }
};

async function authenticateUser(username, password){
    const payload = JSON.stringify({
        username: username,
        password: password,
    });

    try{
        const response = await fetch('/api/login',{
            method: METHOD_POST,
            headers: DEFAULT_HEADERS,
            body: payload
        })
    
    const data = await response.json();
    return data;

    }
    catch (error){
        console.error(error);
        return {message: "Invalid username or password"};
    }
};

async function getTextById(textId, userId){
    const payload = JSON.stringify({
        value : textId,
        userId: userId
    });

    try {
        const response = await fetch('/api/essay', {
            method: METHOD_POST,
            headers: DEFAULT_HEADERS,
            body: payload,
        });
    
        if (!response.ok) {
            throw new Error('Error fetching essay');
        }
    
        const data = await response.json();
        console.log(data);
        return data;
    
    } catch (error) {
        console.error(error);
        return {message: "Error fetching essay" };
    }

}

async function postNormalization(textId, wordIndex, newToken, userId){
    
    const payload = JSON.stringify({
        essay_id: textId,
        word_index: wordIndex,
        correction: newToken,
        userId: userId
    });

    try {
        const response = await fetch('/api/correction', {
            method: METHOD_POST,
            headers: DEFAULT_HEADERS,
            body: payload,
        });

        if (!response.ok) {
            console.error('Failed to save correction:', await response.text());
        }
    } catch (error) {
        console.error('Error saving correction:', error);
    }
}

export { getUsernames, changeCorrectionStatus, authenticateUser,
         getTextById, postNormalization
        };