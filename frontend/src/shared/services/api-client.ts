import axios, { type AxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import type { AuthResponse } from '@/shared/types/api.types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];
let refreshPromise: Promise<AuthResponse> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export function refreshSession(): Promise<AuthResponse> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = axios
    .post<AuthResponse>(
      `${API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    )
    .then(({ data }) => {
      setAccessToken(data.access_token);
      return data;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const tenantId = localStorage.getItem('tenant_id');
  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId;
  }

  if (config.method && !['get', 'head', 'options'].includes(config.method)) {
    const csrfToken = localStorage.getItem('csrf_token');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const csrfHeader = response.headers['x-csrf-token'];
    if (csrfHeader) {
      localStorage.setItem('csrf_token', csrfHeader as string);
    }
    const tenantHeader = response.headers['x-tenant-id'];
    if (tenantHeader) {
      localStorage.setItem('tenant_id', tenantHeader as string);
    }
    return response;
  },
  async (error) => {
    if (axios.isCancel(error) || (error as { code?: string }).code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    const originalRequest = error.config as { _retry?: boolean; headers?: Record<string, string> };

    const isRefreshCall = error.config?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshCall) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshSubscribers.push((token: string | null) => {
            if (token) {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest as AxiosRequestConfig));
            } else {
              reject(error);
            }
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const data = await refreshSession();
        refreshSubscribers.forEach((cb) => cb(data.access_token));
        refreshSubscribers = [];
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        }
        return apiClient(originalRequest as AxiosRequestConfig);
      } catch {
        setAccessToken(null);
        const failedSubscribers = refreshSubscribers;
        refreshSubscribers = [];
        failedSubscribers.forEach((cb) => cb(null));
        onUnauthorized?.();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    const status = error.response?.status as number | undefined;
    const message = (error.response?.data as { error?: string } | undefined)?.error;

    switch (status) {
      case 400:
        if (!isRefreshCall) toast.error(message || 'Datos inválidos');
        break;
      case 401:
        if (!isRefreshCall) toast.error('Sesión expirada. Inicia sesión nuevamente.');
        break;
      case 403:
        toast.error('No tienes permisos para esta acción');
        break;
      case 404:
        toast.error('Recurso no encontrado');
        break;
      case 409:
        toast.error(message || 'Conflicto con datos existentes');
        break;
      case 429:
        if (!isRefreshCall) toast.error('Demasiadas solicitudes. Espera un momento.');
        break;
      case 500:
        toast.error('Error del servidor. Intenta más tarde.');
        break;
      default:
        if (!status) toast.error('Error de conexión');
    }

    return Promise.reject(error);
  },
);
