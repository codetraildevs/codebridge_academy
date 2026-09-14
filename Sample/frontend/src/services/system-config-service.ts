import { api } from './api';

export interface SystemSettingRow {
  id: string;
  key: string;
  value: unknown;
  category: string;
  label: string;
  description: string | null;
  isPublic: boolean;
  updatedAt: string;
}

export type SystemSettingsGrouped = Record<string, SystemSettingRow[]>;

export const systemConfigApi = {
  async getSettings(): Promise<SystemSettingsGrouped> {
    const { data } = await api.get('/system-config');
    return data.data;
  },

  async updateSettings(settings: Array<{ key: string; value: unknown }>) {
    const { data } = await api.put('/system-config', { settings });
    return data.data;
  },
};

export default systemConfigApi;
