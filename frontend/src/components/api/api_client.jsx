import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const apiClientBlob = axios.create({
  baseURL: '/api',
});


apiClientBlob.interceptors.response.use(
  (response) => {
    // For successful blob responses, return the full response object
    // so the calling function can access headers and data (the blob)
    return response;
  },
  async (error) => { // Make the interceptor async
    console.error('API blob error:', error);

    // Check if the error response itself might contain useful JSON data
    // Blobs often have a 'text()' method that returns a Promise
    if (error.response && error.response.data instanceof Blob && error.response.data.type.includes('json')) {
      try {
        const errorJson = JSON.parse(await error.response.data.text());
        return Promise.reject(errorJson); // Reject with parsed JSON error
      } catch (parseError) {
        console.log(parseError);
      }
    }
    // If response data exists but isn't a helpful blob (e.g., HTML error page)
    else if (error.response && error.response.data) {
        // Return or reject with whatever data is available, might not be structured JSON
        return Promise.reject({ error: `Server error: ${error.response.status}`, data: error.response.data });
    }

    // Default error for network issues etc.
    return Promise.reject({ error: 'Connection error or invalid response for blob request.' });
  }
);

apiClient.interceptors.response.use(
  // If the response is successful, just return the data
  (response) => response.data,
  // If there's an error, we standardize the error object
  (error) => {
    console.error('API error:', error);
    if (error.response && error.response.data) {
      return Promise.reject(error.response.data);
    }
  // If there's no response (network error, timeout, etc.)
    return Promise.reject({ error: 'Connection error. Please try again.' });
  }
);

export { apiClient, apiClientBlob };