import { api } from './api';
import { useAuthStore } from '@stores/auth-store';

export interface LoginRequest {
  email: string;
  password: string;
  organizationCode?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId?: string;
  phone?: string;
}

export interface RegisterOrganizationRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  orgName: string;
  orgCode: string;
  orgType?: string;
  address?: string;
  contactPhone?: string;
  phone?: string;
  website?: string;
}

export const authService = {
  async login(params: LoginRequest) {
    const response = await api.post('/auth/login', params);
    const data = response.data.data;
    if (data.mfaRequired) {
      // Step 1 of MFA login — return the challenge without persisting auth state.
      return data;
    }
    const { user, accessToken, refreshToken } = data;
    useAuthStore.getState().setAuth(user, accessToken, refreshToken);
    return data;
  },

  async verifyMfaLogin(mfaToken: string, code: string) {
    const response = await api.post('/auth/mfa/verify-login', { mfaToken, code });
    const { user, accessToken, refreshToken } = response.data.data;
    useAuthStore.getState().setAuth(user, accessToken, refreshToken);
    return response.data.data;
  },

  async register(params: RegisterRequest) {
    // Individual signup — the backend exposes /auth/register/individual
    // (there is no generic /auth/register route).
    const response = await api.post('/auth/register/individual', params);
    return response.data;
  },

  async registerOrganization(params: RegisterOrganizationRequest) {
    const response = await api.post('/auth/register/organization', params);
    return response.data;
  },

  async logout() {
    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      await api.post('/auth/logout', { refreshToken });
    } finally {
      useAuthStore.getState().logout();
    }
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data.data;
  },

  async forgotPassword(email: string) {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, password: string) {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },
};

export default authService;
