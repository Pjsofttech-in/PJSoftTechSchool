import axios from 'axios';
import {clearSession, getSession} from '@utils/storage';
import useAuthStore from '@store/authStore';

const BASE_URL = 'https://pjsofttech.in:54443';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach token to every request
api.interceptors.request.use(
  config => {
    let token = getSession()?.token || useAuthStore.getState().token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  error => Promise.reject(error),
);

// Response interceptor — handle all errors globally
api.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;
    const isLoginRequest = error.config?.url?.includes('Login');

    switch (status) {
      case 400:
        error.message = serverMessage || 'Invalid request. Please check your details.';
        break;

      case 401:
        if (isLoginRequest) {
          error.message = serverMessage || 'Invalid credentials. Please try again.';
        } else {
          error.message = 'Session expired. Please login again.';
          clearSession();
          useAuthStore.getState().logout();
        }
        break;

      case 403:
        error.message = serverMessage || 'Access denied. Contact your administrator.';
        break;

      case 404:
        error.message = serverMessage || 'Resource not found.';
        break;

      case 500:
        error.message = serverMessage || 'Server error. Please try again later.';
        break;

      case 503:
        error.message = serverMessage || 'Service unavailable. Please try again later.';
        break;

      default:
        if (!error.response) {
          error.message = 'Network error. Please check your connection.';
        } else {
          error.message = serverMessage || 'Something went wrong. Please try again.';
        }
    }

    return Promise.reject(error);
  },
);

export default api;