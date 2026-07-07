import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';

if (!import.meta.env.VITE_API_URL) {
  throw new Error('VITE_API_URL environment variable is required');
}

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const csrfHeader = response.headers['x-csrf-token'];
    if (csrfHeader) {
      localStorage.setItem('csrf_token', csrfHeader as string);
    }
    return response;
  },
  async (error: AxiosError) => {
    if (axios.isCancel(error)) return Promise.reject(error);

    const status = error.response?.status;
    const code = (error.response?.data as Record<string, unknown>)?.code;

    if (status === 401 && code === 'TOKEN_EXPIRED') {
      try {
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        error.config!.headers = { ...error.config!.headers, Authorization: 'Bearer ' + (data as Record<string, string>).access_token };
        return api(error.config!);
      } catch (refreshError) {
        localStorage.removeItem('user');
        localStorage.removeItem('tenant_id');
        window.dispatchEvent(new CustomEvent('auth:expired', { detail: { reason: 'refresh_failed' } }));
        return Promise.reject(refreshError || new Error('Session expired, please log in again'));
      }
    }

    if (status === 401) {
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:expired'));
      return Promise.reject(new Error('Unauthorized'));
    }

    return Promise.reject(error);
  }
);

export default api;
