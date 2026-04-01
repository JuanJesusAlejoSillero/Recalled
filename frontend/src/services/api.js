import axios from 'axios';

// Get API URL from runtime config (injected by env.sh) or build-time env
const API_URL = window.ENV?.VITE_API_URL || import.meta.env.VITE_API_URL || '/api/v1';
const CSRF_HEADER_NAME = 'X-CSRF-TOKEN';
const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

function getCookie(name) {
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.split('=').slice(1).join('='));
}

function getCsrfToken(url, method) {
  if (!method || !MUTATING_METHODS.has(method.toLowerCase())) {
    return null;
  }

  const cookieName = url?.includes('/auth/refresh')
    ? 'csrf_refresh_token'
    : 'csrf_access_token';

  return getCookie(cookieName);
}

function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

async function refreshSession() {
  const csrfToken = getCookie('csrf_refresh_token');
  if (!csrfToken) {
    throw new Error('No refresh token cookie available');
  }

  return axios.post(`${API_URL}/auth/refresh`, null, {
    withCredentials: true,
    headers: { [CSRF_HEADER_NAME]: csrfToken },
  });
}

export function hasAuthSessionCookie() {
  return Boolean(getCookie('csrf_access_token') || getCookie('csrf_refresh_token'));
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach CSRF token for cookie-based auth
api.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken(config.url, config.method);
  if (csrfToken) {
    config.headers[CSRF_HEADER_NAME] = csrfToken;
  }
  return config;
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // No interceptar 401 del login ni del refresh (solo de endpoints protegidos)
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login')
      || originalRequest.url?.includes('/auth/refresh')
      || originalRequest.url?.includes('/auth/2fa/verify');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      if (hasAuthSessionCookie()) {
        try {
          await refreshSession();
          return api(originalRequest);
        } catch {
          redirectToLogin();
        }
      }

      redirectToLogin();
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
