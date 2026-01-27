import { z } from 'zod';
import { apiBlob, apiPublic, apiPrivate } from './APIClient';
import * as schemas from './Schemas.jsx';
import { saveAs } from 'file-saver';

/**
 * Lida com erros da API e de validação, retornando um objeto de erro padronizado.
 */
const handleApiError = (error, defaultMessage) => {
  if (error instanceof z.ZodError) {
    console.error('Erro de validação Zod:', error.issues);

    const formattedErrors = error.issues.map(issue => {
      // Ex: "Field: 'username': The field is required."
      return `Field: '${issue.path.join('.')}': ${issue.message}`;
    }).join('\n');

    return { error: `Invalid data received from API:\n${formattedErrors}` };
  }

  // Error coming from the API (already formatted by the Axios interceptor)
  if (error && error.details) {
    const formattedDetails = error.details.map(d => `${d.field}: ${d.message}`).join(', ');
    return { error: `API error: ${formattedDetails}` };
  }

  // Generic error
  return { error: error.error || error.message || defaultMessage };
};


/**
 * Fetches the list of available usernames.
 */
export async function getUsernames() {
  const data = await apiPublic.get('/users');
  return schemas.UsernamesResponseSchema.parse(data);
}

/**
 * Authenticates the user with username and password.
 */
export async function authenticateUser(username, password) {
  const response = await apiPublic.post('/login', { username, password });
  return schemas.LoginResponseSchema.parse(response.data || response);
}

export async function logoutUser() {
  const response = await apiPrivate.get('/logout');
  return schemas.MessageResponseSchema.parse(response.data || response);
}

/**
 * Fetches the metadata of all texts for a user.
 */
export async function getTextsData() {
  const data = await apiPrivate.get(`/texts/`);
  return schemas.TextsDataResponseSchema.parse(data.textsData);
}

/**
 * Fetches the metadata of all raw texts (OCR module).
 */
export async function getRawTextsData() {
  const data = await apiPrivate.get(`/raw-texts/`);
  return data.textsData; // Simple array of {id, sourceFileName}
}

/**
 * Fetches the detailed data of a specific text.
 */
export async function getTextById(textId) {
  const data = await apiPrivate.get(`/texts/${textId}`);
  // BROKEN: find a fix later
  // return schemas.TextDetailResponseSchema.parse(data);
  return data;
}

/**
 * Fetches the detailed data of a specific raw text.
 */
export async function getRawTextById(textId) {
  const data = await apiPrivate.get(`/raw-texts/${textId}`);
  return data;
}

/**
 * Updates the text content of a raw text.
 */
export async function updateRawText(textId, textContent) {
  const payload = { text_content: textContent };
  const response = await apiPrivate.put(`/raw-texts/${textId}`, payload);
  return response.data || response;
}

/**
 * Finalizes a raw text by processing it into tokens/suggestions.
 */
export async function finalizeRawText(textId, sourceFileName = null) {
  const payload = sourceFileName ? { source_file_name: sourceFileName } : {};
  const response = await apiPrivate.post(`/raw-texts/${textId}/finalize`, payload);
  return response.data;
}

/**
 * Fetches the normalizations (corrections) for a text.
 */
export async function getNormalizationsByText(textId) {
  const data = await apiPrivate.get(`/texts/${textId}/normalizations`);
  return schemas.NormalizationsGetResponseSchema.parse(data);
}

/**
 * Saves a new normalization (correction).
 * Throws an error in case of failure so that the component can react (e.g., not closing a modal).
 */
export async function postNormalization(textId, firstWordIndex, lastWordIndex, newToken, suggestForAll = false) {
  const payload = {
    first_index: firstWordIndex,
    last_index: lastWordIndex,
    new_token: newToken,
    suggest_for_all: suggestForAll,
  };
  schemas.NormalizationCreateRequestSchema.parse(payload);

  return apiPrivate.post(`/texts/${textId}/normalizations`, payload);
}

/**
 * Deletes a Normalization.
 * Throws an error in case of failure.
 */
export async function deleteNormalization(textId, wordIndex) {
  const payload = { word_index: wordIndex };
  schemas.NormalizationDeleteRequestSchema.parse(payload);

  return apiPrivate.delete(`/texts/${textId}/normalizations`, { data: payload });
}

/**
 * Toggles the "normalized" status of a text.
 */
export async function toggleNormalizedStatus(textId) {
  const data = await apiPrivate.patch(`/texts/${textId}/normalizations`);
  return schemas.MessageResponseSchema.parse(data);
}

/**
 * Lets the user download the normalized texts.
 */
export async function requestDownload(textIds, useTags) {
  const payload = {
    text_ids: textIds,
    use_tags: useTags
  };

  const response = await apiBlob.post(`/download/`, payload, {
    responseType: 'blob',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  let filename = 'normalized_texts.zip'; // Default filename

  saveAs(response.data, filename);

  return { success: true, filename: filename };

}

export async function requestReport(textIds) {
  const payload = {
    text_ids: textIds
  };
  const response = await apiBlob.post(`/report/`, payload, {
    responseType: 'blob',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  saveAs(response.data, 'report.csv');
}

/**
 * Sends a zip file for processing,
 * Returning a task id for monitoring.
 */
export async function uploadTextArchive(file) {
  const formData = new FormData();
  formData.append('file', file);

  const data = await apiPrivate.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return schemas.UploadResponseSchema.parse(data);
}

/**
 * Verify the status of the task with polling.
 */
export async function getTaskStatus(taskId) {
  const data = await apiPrivate.get(`/status/${taskId}`);
  return schemas.TaskStatusResponseSchema.parse(data);
}

export async function toggleToBeNormalized(tokenId) {
  const payload = {
    token_id: tokenId
  };
  await apiPrivate.patch(`/tokens/${tokenId}/suggestions/toggle`, payload);
}


export async function addToWhitelist(tokenText) {
  const payload = {
    token_text: tokenText,
    action: 'add'
  };
  await apiPrivate.post(`/whitelist/`, payload);
}

export async function removeFromWhitelist(tokenText) {
  const payload = {
    token_text: tokenText,
    action: 'remove'
  };
  await apiPrivate.delete(`/whitelist/`, { data: payload });
}

export async function getWhitelist() {
  const data = await apiPrivate.get(`/whitelist/`);
  return schemas.WhitelistTokensResponseSchema.parse(data);
}
/**
 * Registers a new user (Admin only).
 */
export async function registerUser(username) {
  const response = await apiPrivate.post('/register', { username });
  // Returns { message }
  return response.data || response;
}

/**
 * Activates a user account.
 */
export async function activateUser(username, password) {
  const response = await apiPublic.post('/activate', {
    username,
    password
  });
  return schemas.MessageResponseSchema.parse(response.data || response);
}

export async function getUsersData() {
  const data = await apiPrivate.get('/users/data');
  return data.usersData;
}

export async function toggleUserActive(username) {
  const response = await apiPrivate.patch('/users/toggleActive', { username });
  return response.data || response;
}

export async function toggleUserAdmin(username) {
  const response = await apiPrivate.patch('/users/changePassword', { username });
  return response.data || response;
}

export async function deleteAllNormalizations(textId) {
  const response = await apiPrivate.delete(`/texts/${textId}/normalizations/all`);
  return response.data || response;

}

// --- OCR Functions ---

/**
 * Uploads a ZIP file containing images for OCR.
 */
export async function uploadOCRArchive(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiPrivate.post('/ocr/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 300000, // 5 minutes
  });
  return response;
}

/**
 * Fetches the image associated with a text.
 */
export async function getTextImage(textId) {
  try {
    const response = await apiPrivate.get(`/ocr/texts/${textId}/image`, { responseType: 'blob' });
    // Handle case where interceptor returns data directly or full response
    const blob = response.data || response;
    if (!(blob instanceof Blob)) {
      console.warn("Response is not a blob", blob);
      return null;
    }
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn("Could not fetch image for text", textId, e);
    return null;
  }
}
/**
 * Fetches the image associated with a raw text.
 */
export async function getRawTextImage(textId) {
  try {
    const response = await apiPrivate.get(`/ocr/raw-texts/${textId}/image`, { responseType: 'blob' });
    const blob = response.data || response;
    if (!(blob instanceof Blob)) {
      console.warn("Response is not a blob", blob);
      return null;
    }
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Error fetching raw text image:", e);
    return null;
  }
}
/**
 * Updates a token's text value (OCR correction).
 */
export async function updateToken(textId, tokenId, newValue) {
  const payload = {
    token_id: tokenId,
    new_value: newValue
  };
  return apiPrivate.post(`/ocr/texts/${textId}/tokens`, payload);
}
