import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@stores/auth-store';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;

          // Update store with BOTH new tokens (fix: refresh token also rotates)
          const currentUser = useAuthStore.getState().user;
          if (currentUser) {
            useAuthStore.getState().setAuth(currentUser, newAccessToken, newRefreshToken ?? refreshToken);
          }

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return api(originalRequest);
        } catch {
          // Refresh failed — logout
          useAuthStore.getState().logout();
        }
      } else {
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(error);
  },
);

export default api;
