import { api } from './api';

export interface Field {
  id: string;
  name: string;
  code: string;
  description: string | null;
  iconUrl: string | null;
  isActive: boolean;
  _count?: { assessments: number; exams: number; candidates: number };
  createdAt: string;
}

export const fieldService = {
  async list(): Promise<Field[]> {
    const response = await api.get('/fields');
    return response.data.data;
  },
};

export default fieldService;
