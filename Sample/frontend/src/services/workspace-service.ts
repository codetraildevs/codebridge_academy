import { api } from './api';

export interface WorkspaceModule {
  id: string;
  moduleKey: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  configSchema: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  usageCount: number;
}

export interface WorkspaceModuleConfigRow {
  id: string;
  moduleKey: string;
  name: string;
  description: string | null;
  configSchema: Record<string, unknown> | null;
  isActive: boolean;
  assessments: Array<{
    id: string;
    title: string;
    status: string;
    orderIndex: number;
    config: Record<string, unknown> | null;
  }>;
}

export const workspaceApi = {
  async listModules(): Promise<WorkspaceModule[]> {
    const { data } = await api.get('/workspace/modules');
    return data.data;
  },

  async getConfiguration(): Promise<WorkspaceModuleConfigRow[]> {
    const { data } = await api.get('/workspace/configuration');
    return data.data;
  },

  async createModule(input: {
    moduleKey: string;
    name: string;
    description?: string;
    iconUrl?: string | null;
    configSchema?: Record<string, unknown>;
  }): Promise<WorkspaceModule> {
    const { data } = await api.post('/workspace/modules', input);
    return data.data;
  },

  async updateModule(
    id: string,
    input: Partial<{
      name: string;
      description: string | null;
      iconUrl: string | null;
      configSchema: Record<string, unknown>;
      isActive: boolean;
    }>,
  ): Promise<WorkspaceModule> {
    const { data } = await api.patch(`/workspace/modules/${id}`, input);
    return data.data;
  },
};

export default workspaceApi;
