import { create } from 'zustand';
import { authAPI, hasAuthSessionCookie } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  _initialized: false,

  initialize: async () => {
    if (get()._initialized) return;
    set({ _initialized: true, loading: true });

    if (!hasAuthSessionCookie()) {
      set({ user: null, loading: false });
      return;
    }

    try {
      const { data } = await authAPI.me();
      set({ user: data, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (username, password) => {
    const { data } = await authAPI.login({ username, password });
    if (data['2fa_required']) {
      return { twoFactorRequired: true, tempToken: data.temp_token };
    }
    set({ user: data.user });
    return { user: data.user };
  },

  verify2FA: async (tempToken, totpCode) => {
    const { data } = await authAPI.verify2FA({ temp_token: tempToken, totp_code: totpCode });
    set({ user: data.user });
    return data.user;
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore logout errors
    }
    set({ user: null, loading: false, _initialized: true });
  },

  updateUser: (userData) => set({ user: userData }),
}));

export default useAuthStore;
