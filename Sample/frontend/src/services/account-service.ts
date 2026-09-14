import { api } from './api';

export const accountApi = {
  async updateProfile(input: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
  }) {
    const { data } = await api.patch('/auth/me', input);
    return data.data;
  },

  async changePassword(input: { currentPassword: string; newPassword: string }) {
    const { data } = await api.post('/auth/change-password', input);
    return data;
  },

  async toggleMfa(enabled: boolean): Promise<{ mfaEnabled: boolean }> {
    const { data } = await api.post('/auth/mfa/toggle', { enabled });
    return data.data;
  },
};

export default accountApi;
