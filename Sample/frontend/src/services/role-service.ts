import { api } from './api';

export interface RolePermission {
  id: string;
  name: string;
  description: string | null;
  module: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: RolePermission[];
}

export const roleService = {
  async list(): Promise<Role[]> {
    const response = await api.get('/roles');
    return response.data.data;
  },
};

export default roleService;
