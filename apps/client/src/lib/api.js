import axios from 'axios';
import { getCachedSession, hydrateSessionFromStorage } from '../features/auth/sessionCache';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const resolveSession = () => getCachedSession() ?? hydrateSessionFromStorage();

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const session = resolveSession();

    if (session?.access_token) {
      if (!config.headers) {
        config.headers = {};
      }
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      console.error('Unauthorized - please log in');
    }
    return Promise.reject(error);
  }
);

export default api;
