import { api } from './api';

export interface AiRuleRow {
  id: string;
  assessmentId: string;
  ruleName: string;
  description: string | null;
  ruleType: string;
  config: Record<string, unknown> | null;
  weight: number;
  isActive: boolean;
  orderIndex: number;
  createdAt: string;
  assessment: { id: string; title: string; status: string };
}

export interface GeneratedQuestionRow {
  id: string;
  assessmentId: string;
  questionText: string;
  questionType: string;
  category: string | null;
  orderIndex: number;
  timeLimitSeconds: number | null;
  passingScore: number | null;
  createdAt: string;
  assessment: { id: string; title: string; status: string };
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export const aiRulesApi = {
  async listRules(params?: {
    ruleType?: string;
    isActive?: string;
    assessmentId?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<AiRuleRow>> {
    const { data } = await api.get('/ai-evaluations/rules', { params });
    return data;
  },

  async updateRule(
    id: string,
    input: Partial<{
      ruleName: string;
      description: string | null;
      config: Record<string, unknown>;
      weight: number;
      isActive: boolean;
      orderIndex: number;
    }>,
  ): Promise<AiRuleRow> {
    const { data } = await api.patch(`/ai-evaluations/rules/${id}`, input);
    return data.data;
  },

  async listGeneratedQuestions(params?: {
    assessmentId?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<GeneratedQuestionRow>> {
    const { data } = await api.get('/ai-evaluations/generated-questions', { params });
    return data;
  },
};

export default aiRulesApi;
