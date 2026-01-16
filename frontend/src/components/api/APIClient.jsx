import axios from 'axios';
import Cookies from 'js-cookie';

//////////////////////////////////
// API Client Configuration (JSON)
//////////////////////////////////

// Response handlers for JSON requests
const handleJsonSuccess = (response) => response.data;

// Error handler for JSON requests
const handleJsonError = (error) => {
  console.error('API error:', error);

  if (error.response && error.response.status === 401) {
    window.dispatchEvent(new Event('auth:unauthorized'));
  }

  if (error.response && error.response.data) {
    return Promise.reject(error.response.data);
  }
  return Promise.reject({ error: 'Connection error. Please try again.' });
};

//////////////////////////////////
// API Client Configuration (Blob)
//////////////////////////////////

// Response handlers for Blob requests
const handleBlobSuccess = (response) => response;

const handleBlobError = async (error) => {
  console.error('API blob error:', error);

  if (error.response && error.response.status === 401) {
    window.dispatchEvent(new Event('auth:unauthorized'));
  }

  if (error.response && error.response.data instanceof Blob && error.response.data.type.includes('json')) {
    try {
      const errorJson = JSON.parse(await error.response.data.text());
      return Promise.reject(errorJson); 
    } catch (parseError) {
      console.log(parseError);
    }
  } else if (error.response && error.response.data) {
    return Promise.reject({ error: `Server error: ${error.response.status}`, data: error.response.data });
  }

  return Promise.reject({ error: 'Connection error or invalid response for blob request.' });
};

/////////////////////////
// API Client Instancing 
/////////////////////////

/**
 * Creates a configured axios instance.
 * @param {boolean} options.auth - If true, sends cookies (withCredentials).
 * @param {boolean} options.isBlob - If true, configures for file download and special error handling.
 */
const createClient = ({ auth = false, isBlob = false } = {}) => {
  const instance = axios.create({
    baseURL: '/api',
    headers: isBlob ? {} : { 'Content-Type': 'application/json' },
    withCredentials: auth, 
  });

  if (isBlob) {
    instance.interceptors.response.use(handleBlobSuccess, handleBlobError);
  } else {
    instance.interceptors.response.use(handleJsonSuccess, handleJsonError);
  }

  if(auth) {
    instance.interceptors.request.use((config) => {
      const csrfToken = Cookies.get('csrf_access_token');
      if (csrfToken) {
        config.headers['X-CSRF-TOKEN'] = csrfToken;
      }
      return config;
    });
  }

  return instance;
};

export const apiPublic = createClient({ auth: false });

export const apiPrivate = createClient({ auth: true });

export const apiBlob = createClient({ auth: true, isBlob: true });

export { createClient };