import { create } from 'zustand';
import { authAPI } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  _initialized: false,

  initialize: async () => {
    if (get()._initialized) return;
    set({ _initialized: true });

    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const { data } = await authAPI.me();
      set({ user: data, loading: false });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ user: null, loading: false });
    }
  },

  login: async (username, password) => {
    const { data } = await authAPI.login({ username, password });
    if (data['2fa_required']) {
      return { twoFactorRequired: true, tempToken: data.temp_token };
    }
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    set({ user: data.user });
    return { user: data.user };
  },

  verify2FA: async (tempToken, totpCode) => {
    const { data } = await authAPI.verify2FA({ temp_token: tempToken, totp_code: totpCode });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    set({ user: data.user });
    return data.user;
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, _initialized: false });
  },

  updateUser: (userData) => set({ user: userData }),
}));

export default useAuthStore;
