import { api } from './api';
import type { ApiResponse, Trade } from '@app_types/index';

export const tradeService = {
  async listTrades(): Promise<Trade[]> {
    const response = await api.get<ApiResponse<Trade[]>>('/admin/trades');
    return response.data.data;
  },

  /** Update a trade's default working environment (workspace tools + locks). */
  async updateTrade(
    tradeId: string,
    data: { workspaceTools: string[]; lockedWorkspaceTools?: string[] },
  ): Promise<Trade> {
    const response = await api.put<ApiResponse<Trade>>(`/admin/trades/${tradeId}`, data);
    return response.data.data;
  },
};

export default tradeService;
