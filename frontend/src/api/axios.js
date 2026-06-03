import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && Array.isArray(body.data)) {
      const { data, ...rest } = body;
      response.data = data;
      response.body = body;
      if (Object.keys(rest).length > 0) {
        Object.assign(response, rest);
      }
    }
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;

    if (status === 401 && code === 'TOKEN_EXPIRED') {
      try {
        await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        return api(error.config);
      } catch {
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(new Error('Session expired, please log in again'));
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
