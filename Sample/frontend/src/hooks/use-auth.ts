import { useAuthStore } from '@stores/auth-store';
import { authService } from '@services/auth-service';
import { useCallback } from 'react';
import type { LoginRequest } from '@services/auth-service';

export function useAuth() {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  const login = useCallback(async (params: LoginRequest) => {
    return authService.login(params);
  }, []);

  const verifyMfa = useCallback(async (mfaToken: string, code: string) => {
    return authService.verifyMfaLogin(mfaToken, code);
  }, []);

  const logout = useCallback(async () => {
    return authService.logout();
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    verifyMfa,
    logout,
  };
}

export default useAuth;
