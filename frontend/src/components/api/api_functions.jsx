import { z } from 'zod';
import {apiClient, apiClientBlob} from './api_client';
import * as schemas from './schemas';
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
  try {
    const data = await apiClient.get('/users');
    // Validates the response structure
    return schemas.UsernamesResponseSchema.parse(data); 
  } catch (error) {
    return handleApiError(error, 'Error fetching usernames.');
  }
}

/**
 * Authenticates the user with username and password.
 */
export async function authenticateUser(username, password) {
  try {
    const data = await apiClient.post('/login', { username, password });
    // Validates the login response object
    return schemas.LoginResponseSchema.parse(data);
  } catch (error) {
    return handleApiError(error, 'Invalid username or password.');
  }
}

/**
 * Fetches the metadata of all texts for a user.
 */
export async function getTextsData(userId) {
  try {
    const data = await apiClient.get(`/texts/${userId}`);
    // Validates the response structure with the list of texts
    return schemas.TextsDataResponseSchema.parse(data.textsData);
  } catch (error) {
    return handleApiError(error, 'Error fetching texts data.');
  }
}

/**
 * Fetches the detailed data of a specific text.
 */
export async function getTextById(textId, userId) {
  try {
    const data = await apiClient.get(`/texts/${userId}/${textId}`);
    // Validates the complete structure of the text details
    
    // BROKEN: find a fix later
    // return schemas.TextDetailResponseSchema.parse(data);
    return data;
    
  } catch (error) {
    return handleApiError(error, 'Error fetching text details.');
  }
}

/**
 * Fetches the normalizations (corrections) for a text.
 */
export async function getNormalizationsByText(textId, userId) {
  try {
    const data = await apiClient.get(`/texts/${userId}/${textId}/normalizations`);
    // Validates the normalizations object
    return schemas.NormalizationsGetResponseSchema.parse(data);
  } catch (error) {
    return handleApiError(error, 'Error fetching normalizations.');
  }
}

/**
 * Saves a new normalization (correction).
 * Throws an error in case of failure so that the component can react (e.g., not closing a modal).
 */
export async function postNormalization(textId, firstWordIndex, lastWordIndex, newToken, userId) {
  const payload = {
    first_index: firstWordIndex,
    last_index: lastWordIndex,
    new_token: newToken,
  };
  // Validates the payload BEFORE sending to the API
  schemas.NormalizationCreateRequestSchema.parse(payload);
  
  return apiClient.post(`/texts/${userId}/${textId}/normalizations`, payload);
}

/**
 * Deletes a Normalization.
 * Throws an error in case of failure.
 */
export async function deleteNormalization(textId, wordIndex, userId) {
  const payload = { word_index: wordIndex };
  // Validates the payload BEFORE sending to the API
  schemas.NormalizationDeleteRequestSchema.parse(payload);
  
  return apiClient.delete(`/texts/${userId}/${textId}/normalizations`, { data: payload });
}
  
/**
 * Toggles the "normalized" status of a text.
 */
export async function toggleNormalizedStatus(textId, userId) {
  try {
    const data = await apiClient.patch(`/texts/${userId}/${textId}/normalizations`);
    return schemas.MessageResponseSchema.parse(data);
  } catch (error) {
    return handleApiError(error, 'Erro ao alterar o status da normalização.');
  }
}

/**
 * Lets the user download the normalized texts.
 */
export async function requestDownload(textIds, useTags, userId) {
  try {
    const payload = {
      text_ids: textIds,
      use_tags: useTags
    };

    const response = await apiClientBlob.post(`/download/${userId}`, payload, {
      responseType: 'blob',
    });

    let filename = 'normalized_texts.zip'; // Default filename
    
    saveAs(response.data, filename);

    return { success: true, filename: filename };

  } catch (error) {
    console.error("Download request failed:", error);
    return handleApiError(error, 'Error requesting download.');
  }
}

export async function requestReport(userId, textIds) {
  try {
    const payload = {
      text_ids: textIds
    };

    const response = await apiClientBlob.post(`/report/${userId}`, payload, {
      responseType: 'blob'
    });

    saveAs(response.data, 'report.csv');


  } catch (error) {
    console.error("Report request failed:", error);
    return handleApiError(error, 'Error requesting report.');
  }
}