import axios from 'axios';
import toast from 'react-hot-toast';
import i18n from '@/i18n/i18n';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Login central del Core. Es una navegación completa (no XHR): el backend
 * responde con un 302 al SSO central y vuelve con la cookie `app_session`.
 */
export const CORE_LOGIN_URL = `${API_BASE_URL}/auth/login`;

let onUnauthorized: (() => void) | null = null;

// Guarda para que una ráfaga de 401 simultáneos no dispare múltiples
// redirecciones/toasts al login central.
let pendingUnauthorized = false;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
  pendingUnauthorized = false;
}

function getCsrfToken(): string | null {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1] as string);
  }
  return null;
}

/**
 * Cliente HTTP de la app.
 *
 * La autenticación la posee el Core: la sesión viaja en la cookie firmada
 * `app_session` (misma origin) y el backend resuelve la identidad desde ella.
 * Por eso no hay Bearer ni refresh propio; cuando el servidor responde 401 la
 * sesión dejó de existir y se redirige al login central.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  if (config.method && !['get', 'head', 'options'].includes(config.method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error) || (error as { code?: string }).code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    const status = error.response?.status as number | undefined;
    const message = (error.response?.data as { error?: string } | undefined)?.error;

    if (status === 401) {
      // La sesión del Core ya no es válida: señal única para redirigir al login
      // central sin spamear navegaciones ni toasts en una ráfaga de requests.
      if (!pendingUnauthorized) {
        pendingUnauthorized = true;
        toast.error(i18n.t('errors:sessionExpired'));
        onUnauthorized?.();
      }
      return Promise.reject(error);
    }

    switch (status) {
      case 400:
        toast.error(message || i18n.t('errors:badRequest'));
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
        toast.error(i18n.t('errors:rateLimited'));
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
