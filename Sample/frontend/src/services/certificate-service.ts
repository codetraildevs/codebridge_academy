import { api } from './api';

export interface Certificate {
  id: string;
  certificateNumber: string;
  candidateId: string;
  organizationId: string | null;
  examId: string;
  fieldId: string | null;
  overallScore: number | null;
  competencySummary: Record<string, number> | null;
  qrCodeUrl: string | null;
  pdfUrl: string | null;
  verificationUrl: string | null;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  issueDate: string;
  expiryDate: string | null;
  createdAt: string;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    registrationNumber: string;
    email: string;
    photoUrl?: string;
  };
  exam: {
    id: string;
    title: string;
    description?: string;
    passingScore: number;
  };
  organization?: {
    id: string;
    name: string;
    logoUrl?: string;
  };
}

export interface CertificateVerification {
  valid: boolean;
  status: string;
  certificateNumber: string;
  candidateName: string;
  registrationNumber: string;
  examTitle: string;
  organizationName: string | null;
  issueDate: string;
  expiryDate: string | null;
  overallScore: number | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface CertificateStats {
  total: number;
  active: number;
  revoked: number;
  expired: number;
}

export const certificateApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<PaginatedResponse<Certificate>> {
    const { data } = await api.get('/certificates', { params });
    return data;
  },

  async getById(id: string): Promise<Certificate> {
    const { data } = await api.get(`/certificates/${id}`);
    return data;
  },

  async issue(input: {
    candidateId: string;
    examId: string;
    overallScore?: number;
    competencySummary?: Record<string, number>;
  }): Promise<Certificate> {
    const { data } = await api.post('/certificates', input);
    return data;
  },

  async downloadPdf(id: string): Promise<Blob> {
    const { data } = await api.get(`/certificates/${id}/download`, {
      responseType: 'blob',
    });
    return data;
  },

  async revoke(id: string): Promise<Certificate> {
    const { data } = await api.put(`/certificates/${id}/revoke`);
    return data;
  },

  async getStats(): Promise<CertificateStats> {
    const { data } = await api.get('/certificates/stats');
    return data;
  },

  async verifyByNumber(certificateNumber: string): Promise<CertificateVerification> {
    const { data } = await api.get(`/certificates/verify/${encodeURIComponent(certificateNumber)}`);
    return data;
  },
};

export default certificateApi;
