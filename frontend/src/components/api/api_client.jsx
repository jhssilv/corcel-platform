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