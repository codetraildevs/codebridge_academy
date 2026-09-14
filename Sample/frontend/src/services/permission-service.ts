import { api } from './api';
import type { Permission } from '../types/permissions';

export const permissionService = {
  /**
   * Fetch the current user's permissions (based on their role).
   * GET /api/auth/permissions
   */
  async getMyPermissions(): Promise<Permission[]> {
    const response = await api.get('/auth/permissions');
    return response.data.data;
  },
};

export default permissionService;
