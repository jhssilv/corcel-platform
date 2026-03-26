import axios, {
    AxiosHeaders,
    type AxiosError,
    type AxiosInstance,
    type AxiosResponse,
    type InternalAxiosRequestConfig,
} from 'axios';
import Cookies from 'js-cookie';

interface ApiErrorPayload {
    error?: string;
    details?: unknown;
}

const handleJsonSuccess = <T>(response: AxiosResponse<T>): T => response.data;

const handleJsonError = (error: AxiosError<ApiErrorPayload>): Promise<never> => {
    console.error('API error:', error);

    if (error.response?.data) {
        return Promise.reject(error.response.data);
    }

    return Promise.reject({ error: 'Connection error. Please try again.' });
};

const handleBlobSuccess = (response: AxiosResponse<Blob>): AxiosResponse<Blob> => response;

const handleBlobError = async (error: AxiosError<Blob | ApiErrorPayload>): Promise<never> => {
    console.error('API blob error:', error);

    const data = error.response?.data;

    if (data instanceof Blob && data.type.includes('json')) {
        try {
            const errorJson = JSON.parse(await data.text()) as ApiErrorPayload;
            return Promise.reject(errorJson);
        } catch (parseError) {
            console.log(parseError);
        }
    } else if (data) {
        return Promise.reject({ error: `Server error: ${error.response?.status}`, data });
    }

    return Promise.reject({ error: 'Connection error or invalid response for blob request.' });
};

interface CreateClientOptions {
    auth?: boolean;
    isBlob?: boolean;
}

const createClient = ({ auth = false, isBlob = false }: CreateClientOptions = {}): AxiosInstance => {
    const instance = axios.create({
        baseURL: '/api',
        headers: isBlob ? {} : { 'Content-Type': 'application/json' },
        withCredentials: auth,
    });

    if (isBlob) {
        instance.interceptors.response.use(handleBlobSuccess, handleBlobError);
    } else {
        instance.interceptors.response.use(handleJsonSuccess, (error) => {
            if (auth && error.response?.status === 401) {
                window.dispatchEvent(new Event('auth:unauthorized'));
            }

            return handleJsonError(error);
        });
    }

    if (auth) {
        instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
            const csrfToken = Cookies.get('csrf_access_token');

            if (csrfToken) {
                if (!(config.headers instanceof AxiosHeaders)) {
                    config.headers = new AxiosHeaders(config.headers);
                }

                config.headers.set('X-CSRF-TOKEN', csrfToken);
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
