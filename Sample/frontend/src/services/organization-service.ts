import { api } from './api';
import type { Organization } from '../types';

export interface ListOrganizationsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
}

export interface OrganizationListResponse {
  data: Organization[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export const organizationService = {
  async list(params?: ListOrganizationsParams): Promise<OrganizationListResponse> {
    const response = await api.get('/organizations', { params });
    return response.data;
  },

  async getById(organizationId: string): Promise<Organization> {
    const response = await api.get(`/organizations/${organizationId}`);
    return response.data.data;
  },

  /** Own organization profile for org users (includes maxCandidates quota). */
  async getProfile(): Promise<Organization> {
    const response = await api.get('/organizations/profile');
    return response.data.data;
  },

  async create(data: {
    name: string;
    code: string;
    organizationType?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    district?: string;
    province?: string;
    country?: string;
  }): Promise<Organization> {
    const response = await api.post('/organizations', data);
    return response.data.data;
  },

  async update(organizationId: string, data: Partial<Organization>): Promise<Organization> {
    const response = await api.put(`/organizations/${organizationId}`, data);
    return response.data.data;
  },

  async deactivate(organizationId: string): Promise<void> {
    await api.delete(`/organizations/${organizationId}`);
  },
};

export default organizationService;
