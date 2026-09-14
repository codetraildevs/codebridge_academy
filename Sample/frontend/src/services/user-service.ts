import { api } from './api';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  /** PLATFORM | ORGANIZATION | INDIVIDUAL — individuals self-register and appear here too. */
  userType?: string;
  organizationId: string | null;
  phone: string | null;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export const userService = {
  async listUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<{ data: UserProfile[]; meta: PaginationMeta }> {
    const { data } = await api.get('/users', { params });
    return data;
  },

  async createUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string;
    organizationId?: string;
    organization?: {
      name: string;
      code: string;
      organizationType?: string;
      email?: string;
      phone?: string;
      website?: string;
      address?: string;
    };
  }): Promise<UserProfile & { temporaryPassword?: string }> {
    const { data: res } = await api.post<
      { success: boolean; data: UserProfile & { temporaryPassword?: string } }
    >('/users', data);
    return res.data;
  },
};

export default userService;
