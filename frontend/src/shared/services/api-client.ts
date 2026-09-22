import axios, { type AxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import i18n from '@/i18n/i18n';
import type { AuthResponse } from '@/shared/types/api.types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];
let refreshPromise: Promise<AuthResponse> | null = null;

// Guards signaling a logout across a burst of failing requests so the interceptor
// does not spam toasts / navigations when several requests fail at the same time.
let pendingUnauthorized = false;

// Cross-tab coordination: whenever THIS tab obtains a new access token (login or
// refresh rotation), broadcast it so sibling tabs stop using the now-revoked one.
// This + the backend reuse grace window avoids spurious multi-tab logouts.
let authChannel: BroadcastChannel | null = null;

function initAuthChannel(): void {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    authChannel = new BroadcastChannel('vitaria-auth');
    authChannel.addEventListener('message', (event: MessageEvent) => {
      const msg = (event.data || {}) as { type?: string; access_token?: string };
      if (msg.type === 'auth_token' && typeof msg.access_token === 'string' && msg.access_token !== accessToken) {
        accessToken = msg.access_token;
      }
    });
  }
}

initAuthChannel();

export function setAccessToken(token: string | null) {
  accessToken = token;
  pendingUnauthorized = false;
}

export function announceAccessToken(token: string) {
  setAccessToken(token);
  authChannel?.postMessage({ type: 'auth_token', access_token: token });
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

function getCsrfToken(): string | null {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1] as string);
  }
  return null;
}

export function refreshSession(): Promise<AuthResponse> {
  if (refreshPromise) return refreshPromise;
  const csrfToken = getCsrfToken();
  refreshPromise = axios
    .post<AuthResponse>(
      `${API_BASE_URL}/auth/refresh`,
      {},
      {
        withCredentials: true,
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
      },
    )
    .then(({ data }) => {
      announceAccessToken(data.access_token);
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

  if (config.method && !['get', 'head', 'options'].includes(config.method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
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
        if (!isRefreshCall) toast.error(message || i18n.t('errors:badRequest'));
        break;
      case 401:
        if (!isRefreshCall) {
          // Arrived here only AFTER a refresh+retry failed (the first 401 is handled
          // by the refresh branch above). The session is truly gone: signal a logout
          // so the UI does not stay "logged in" while every request keeps failing.
          if (!pendingUnauthorized) {
            pendingUnauthorized = true;
            toast.error(i18n.t('errors:sessionExpired'));
            onUnauthorized?.();
          }
        }
        break;
      case 403:
        toast.error(i18n.t('errors:accessDenied'));
        break;
      case 404:
        toast.error(i18n.t('errors:notFound'));
        break;
      case 409:
        toast.error(message || i18n.t('errors:conflict'));
        break;
      case 429:
        if (!isRefreshCall) toast.error(i18n.t('errors:rateLimited'));
        break;
      case 500:
        toast.error(i18n.t('errors:serverError'));
        break;
      default:
        if (!status) toast.error(i18n.t('errors:networkError'));
    }

    return Promise.reject(error);
  },
);
