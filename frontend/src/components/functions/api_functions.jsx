const API_CONFIG = {
    headers: { "Content-Type": "application/json" },
    methods: {
        GET: "GET",
        POST: "POST",
        PATCH: "PATCH",
        DELETE: "DELETE",
    },
};

const handleApiError = (error, defaultMessage) => {
    console.error(error);
    return { message: defaultMessage };
};

const apiRequest = async (url, options = {}) => {
    try {
        const response = await fetch(url, {
            headers: API_CONFIG.headers,
            ...options,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        throw error;
    }
};

/**
 * Fetches list of available usernames
 * @returns {Promise<Array<string>>} Array of usernames
 */
async function getUsernames() {
    try {
        return await apiRequest("/api/users", {
            method: API_CONFIG.methods.GET,
        });
    } catch (error) {
        return handleApiError(error, "Error fetching usernames");
    }
}

/**
 * Changes the correction status of a text
 * @param {string|number} textId - The text identifier
 * @param {string|number} userId - The user identifier
 * @returns {Promise<Object>} Response data
 */
async function changeCorrectionStatus(textId, userId) {
    try {
        const payload = { textId, userId };

        return await apiRequest(`/texts/${userId}/${textId}/normalizations`, {
            method: API_CONFIG.methods.PATCH,
            body: JSON.stringify(payload),
        });
    } catch (error) {
        return handleApiError(error, "Error changing normalization status");
    }
}

/**
 * Authenticates user with username and password
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @returns {Promise<Object>} Authentication response
 */
async function authenticateUser(username, password) {
    try {
        const payload = { username, password };

        return await apiRequest("/api/login", {
            method: API_CONFIG.methods.POST,
            body: JSON.stringify(payload),
        });
    } catch (error) {
        return handleApiError(error, "Invalid username or password");
    }
}
/**
 * Gets texts data for a user
 * @param {string} userId - User's ID
 * @returns {Promise<Object>} Texts data
 */
async function getTextsData(userId) {
    try {
        return await apiRequest(`/api/texts/${userId}`, {
            method: API_CONFIG.methods.GET,
        });
    } catch (error) {
        return handleApiError(error, "Error fetching texts data");
    }
}

/**
 * Retrieves text data by ID
 * @param {string|number} textId - The text identifier
 * @param {string|number} userId - The user identifier
 * @returns {Promise<Object>} Text data
 */
async function getTextById(textId, userId) {
    try {
        const data = await apiRequest(`/api/texts/${userId}/${textId}`, {
            method: API_CONFIG.methods.GET,
        });
        return data;
    } catch (error) {
        return handleApiError(error, "Error fetching essay");
    }
}

/**
 * Posts a normalization correction
 * @param {string|number} textId - The text identifier
 * @param {number} wordIndex - Index of the word being corrected
 * @param {string} newToken - The correction text
 * @param {string|number} userId - The user identifier
 * @returns {Promise<void>}
 */
async function postNormalization(textId, firstWordIndex, lastWordIndex, newToken, userId) {
    try {
        const payload = {
            first_index: firstWordIndex,
            last_index: lastWordIndex,
            new_token: newToken,
        };

        await apiRequest(`/api/texts/${userId}/${textId}/normalizations`, {
            method: API_CONFIG.methods.POST,
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error("Error saving correction:", error);
        throw error; // Re-throw to allow caller to handle
    }
}

/**
 * Deletes a normalization correction
 * @param {string|number} textId - The text identifier
 * @param {number} wordIndex - Index of the word being corrected
 * @param {string|number} userId - The user identifier
 * @returns {Promise<void>}
 */
async function deleteNormalization(textId, wordIndex, userId) {
    try {
        const payload = {
            word_index: wordIndex
        };

        await apiRequest(`/api/texts/${userId}/${textId}/normalizations`, {
            method: API_CONFIG.methods.DELETE,
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error("Error deleting correction:", error);
        throw error; // Re-throw to allow caller to handle
    }
}

/**
 * Fetches normalizations for a specific text and user
 * @param {string|number} textId - The text identifier
 * @param {string|number} userId - The user identifier
 * @returns {Promise<Object>} Normalizations data
 */
async function getNormalizationsByText(textId, userId) {
    try {
        return await apiRequest(`/api/texts/${userId}/${textId}/normalizations`, {
            method: API_CONFIG.methods.GET,
        });
    } catch (error) {
        return handleApiError(error, "Error fetching normalizations");
    }
}

async function toggleNormalizedStatus(textId, userId) {
    try {
        return await apiRequest(`/api/texts/${userId}/${textId}/normalizations`, {
            method: API_CONFIG.methods.PATCH,
        });
    } catch (error) {
        return handleApiError(error, "Error toggling normalized status");
    }
}

export {
    getUsernames,
    changeCorrectionStatus,
    authenticateUser,
    getTextsData,
    getTextById,
    postNormalization,
    deleteNormalization,
    getNormalizationsByText,
    toggleNormalizedStatus
};
