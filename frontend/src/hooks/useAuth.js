import { useEffect } from 'react';
import useAuthStore from '../context/AuthContext';

export function useAuth() {
  const { user, loading, initialize, login, logout, verify2FA, updateUser } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return { user, loading, login, logout, verify2FA, updateUser };
}
