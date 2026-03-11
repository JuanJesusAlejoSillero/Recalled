import axios from 'axios';

// Get API URL from runtime config (injected by env.sh) or build-time env
const API_URL = window.ENV?.VITE_API_URL || import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // No interceptar 401 del login ni del refresh (solo de endpoints protegidos)
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login')
      || originalRequest.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, null, {
            headers: { Authorization: `Bearer ${refreshToken}` },
          });
          localStorage.setItem('access_token', data.access_token);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// --- Auth ---
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  verify2FA: (data) => api.post('/auth/2fa/verify', data),
  setup2FA: () => api.post('/auth/2fa/setup'),
  confirmSetup2FA: (data) => api.post('/auth/2fa/confirm-setup', data),
  disable2FA: (data) => api.post('/auth/2fa/disable', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  deleteAccount: (data) => api.post('/auth/delete-account', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// --- Version ---
export const versionAPI = {
  get: () => api.get('/version'),
};

// --- Users ---
export const usersAPI = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// --- Places ---
export const placesAPI = {
  list: (params) => api.get('/places', { params }),
  get: (id) => api.get(`/places/${id}`),
  create: (data) => api.post('/places', data),
  update: (id, data) => api.put(`/places/${id}`, data),
  delete: (id) => api.delete(`/places/${id}`),
  reviews: (id, params) => api.get(`/places/${id}/reviews`, { params }),
};

// --- Reviews ---
export const reviewsAPI = {
  list: (params) => api.get('/reviews', { params }),
  get: (id) => api.get(`/reviews/${id}`),
  create: (data) => api.post('/reviews', data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
  uploadPhotos: (reviewId, formData) =>
    api.post(`/reviews/${reviewId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deletePhoto: (reviewId, photoId) =>
    api.delete(`/reviews/${reviewId}/photos/${photoId}`),
};

// --- Stats ---
export const statsAPI = {
  user: (userId) => api.get(`/stats/user/${userId}`),
  topPlaces: () => api.get('/stats/places'),
};

export default api;
