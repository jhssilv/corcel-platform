const API_CONFIG = {
  headers: { "Content-Type": "application/json" },
  methods: {
    GET: "GET",
    POST: "POST",
  },
}

const handleApiError = (error, defaultMessage) => {
  console.error(error)
  return { message: defaultMessage }
}

const apiRequest = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: API_CONFIG.headers,
      ...options,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    throw error
  }
}

/**
 * Fetches list of available usernames
 * @returns {Promise<Array<string>>} Array of usernames
 */
async function getUsernames() {
  try {
    return await apiRequest("/api/getUsernames", {
      method: API_CONFIG.methods.GET,
    })
  } catch (error) {
    return handleApiError(error, "Error fetching usernames")
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
    const payload = { textId, userId }

    return await apiRequest("/api/changeCorrectionStatus", {
      method: API_CONFIG.methods.POST,
      body: JSON.stringify(payload),
    })
  } catch (error) {
    return handleApiError(error, "Error changing correction status")
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
    const payload = { username, password }

    return await apiRequest("/api/login", {
      method: API_CONFIG.methods.POST,
      body: JSON.stringify(payload),
    })
  } catch (error) {
    return handleApiError(error, "Invalid username or password")
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
    const payload = { value: textId, userId }

    const data = await apiRequest("/api/essay", {
      method: API_CONFIG.methods.POST,
      body: JSON.stringify(payload),
    })

    console.log(data)
    return data
  } catch (error) {
    return handleApiError(error, "Error fetching essay")
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
async function postNormalization(textId, wordIndex, newToken, userId) {
  try {
    const payload = {
      essay_id: textId,
      word_index: wordIndex,
      correction: newToken,
      userId,
    }

    await apiRequest("/api/correction", {
      method: API_CONFIG.methods.POST,
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.error("Error saving correction:", error)
    throw error // Re-throw to allow caller to handle
  }
}

export { getUsernames, changeCorrectionStatus, authenticateUser, getTextById, postNormalization }
