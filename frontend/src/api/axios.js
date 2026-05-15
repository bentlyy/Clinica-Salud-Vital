import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// ✅ Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Global response interceptor
// - Expired token → clear storage and dispatch event for AuthContext
// - Auto-unwrap paginated responses: { data, pagination } → data
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && Array.isArray(body.data) && body.pagination) {
      response.data = body.data;
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const code   = error.response?.data?.code;

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:expired'));
      return Promise.reject(new Error(code === 'TOKEN_EXPIRED' ? 'Session expired, please log in again' : 'Unauthorized'));
    }

    return Promise.reject(error);
  }
);

export default api;