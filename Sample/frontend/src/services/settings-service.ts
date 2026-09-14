import { api } from './api';

export interface UserSessionInfo {
  id: string;
  device: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  location: string | null;
  isCurrent: boolean;
  lastActiveAt: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  examPublished: boolean;
  examReminders: boolean;
  submissionUpdates: boolean;
  resultsReleased: boolean;
  certificates: boolean;
  assessmentReviews: boolean;
  systemAnnouncements: boolean;
  securityAlerts: boolean;
  marketing: boolean;
}

export interface SettingsBundle {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  userType: string;
  organizationId: string | null;
  organizationName: string | null;
  candidateId: string | null;
  mfaEnabled: boolean;
  organization: { name: string; type: string; code: string } | null;
  candidate: { id: string; registrationNumber: string | null; tradeId: string | null } | null;
  subscriptionPlan: { id: string; name: string; planType: string } | null;
  notificationPreferences: NotificationPreferences;
  security: {
    mfaEnabled: boolean;
    activeSessions: number;
    activeMfaDevices: number;
  };
}

export const settingsService = {
  async getSettings(): Promise<SettingsBundle> {
    const { data } = await api.get('/settings');
    return data.data;
  },

  async updateProfile(input: { firstName?: string; lastName?: string; phone?: string | null }) {
    const { data } = await api.patch('/settings/profile', input);
    return data.data;
  },

  async updateNotificationPreferences(input: Partial<NotificationPreferences>) {
    const { data } = await api.patch('/settings/notifications', input);
    return data.data;
  },

  async deleteAccount(password: string) {
    const { data } = await api.delete('/settings/account', { data: { password } });
    return data;
  },

  async sendOtp(
    purpose: 'EMAIL_CHANGE' | 'EMAIL_VERIFICATION' | 'MFA_SETUP' | 'MFA_DISABLE' | 'SENSITIVE_ACTION',
    email?: string,
  ): Promise<{ channel: 'EMAIL' | 'CONSOLE'; maskedEmail?: string; devCode?: string }> {
    const { data } = await api.post('/auth/otp/send', { purpose, email });
    return data.data;
  },

  async changeEmail(newEmail: string, code: string) {
    const { data } = await api.post('/auth/change-email', { newEmail, code });
    return data.data;
  },

  async startMfaSetup(password: string): Promise<{ secret: string; otpauthUrl: string; qrCode: string }> {
    const { data } = await api.post('/auth/mfa/setup', { password });
    return data.data;
  },

  async verifyMfaSetup(code: string) {
    const { data } = await api.post('/auth/mfa/verify-setup', { code });
    return data;
  },

  async disableMfa(password: string, code: string) {
    const { data } = await api.post('/auth/mfa/disable', { password, code });
    return data;
  },

  async getSessions(): Promise<UserSessionInfo[]> {
    const { data } = await api.get('/auth/sessions');
    return data.data;
  },

  async revokeSession(id: string) {
    const { data } = await api.delete(`/auth/sessions/${id}`);
    return data;
  },

  async revokeAllSessions() {
    const { data } = await api.post('/auth/sessions/all/revoke', {});
    return data;
  },
};

export default settingsService;