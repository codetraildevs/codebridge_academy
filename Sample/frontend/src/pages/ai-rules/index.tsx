import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { aiRulesApi, type AiRuleRow } from '@services/ai-rules-service';
import { Bot, Search, Inbox } from 'lucide-react';
import { formatDate } from '@utils/format';

const RULE_TYPES = ['SCORING', 'FEEDBACK', 'PLAGIARISM', 'COMPETENCY_MAPPING', 'SIMILARITY', 'ORAL_EVALUATION'];
const PAGE_SIZE = 20;

function ruleTypeColor(type: string): 'success' | 'warning' | 'info' | 'neutral' | 'error' {
  switch (type) {
    case 'SCORING': return 'success';
    case 'PLAGIARISM':
    case 'SIMILARITY': return 'error';
    case 'ORAL_EVALUATION': return 'warning';
    case 'COMPETENCY_MAPPING': return 'info';
    default: return 'neutral';
  }
}

export function AiRulesPage() {
  const [ruleType, setRuleType] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ai-rules', ruleType, active, page],
    queryFn: () =>
      aiRulesApi.listRules({
        ruleType: ruleType || undefined,
        isActive: active || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      aiRulesApi.updateRule(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-rules'] }),
  });

  const rules = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">AI Evaluation Rules</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Every AI rule configured across all assessments, with its type, weight and status
        </p>
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search rules by name or assessment..."
                aria-label="Search rules"
                className="w-full rounded-lg border border-border py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <select
              value={ruleType}
              onChange={(e) => { setRuleType(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              aria-label="Filter by rule type"
            >
              <option value="">All types</option>
              {RULE_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
            <select
              value={active}
              onChange={(e) => { setActive(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </CardBody>
      </Card>

      <Card className="!p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-text-tertiary">Loading rules...</div>
        ) : isError ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Bot className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">Couldn't load AI evaluation rules.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Inbox className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">No AI evaluation rules found.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              <div className="lg:col-span-4">Rule</div>
              <div className="lg:col-span-3">Assessment</div>
              <div className="lg:col-span-2">Type</div>
              <div className="lg:col-span-1">Weight</div>
              <div className="lg:col-span-1">Active</div>
              <div className="lg:col-span-1">Created</div>
            </div>
            <div className="divide-y divide-border">
              {rules.map((rule: AiRuleRow) => (
                <div key={rule.id} className="grid grid-cols-1 gap-2 px-5 py-3.5 lg:grid-cols-12 lg:gap-4 lg:items-center">
                  <div className="lg:col-span-4 min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{rule.ruleName}</p>
                    {rule.description && (
                      <p className="truncate text-xs text-text-tertiary">{rule.description}</p>
                    )}
                  </div>
                  <div className="lg:col-span-3 truncate text-sm text-text-secondary">{rule.assessment?.title ?? '—'}</div>
                  <div className="lg:col-span-2">
                    <Badge variant={ruleTypeColor(rule.ruleType)} size="sm">
                      {rule.ruleType.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="lg:col-span-1 text-sm text-text-secondary">{rule.weight}</div>
                  <div className="lg:col-span-1">
                    <button
                      onClick={() => toggleMutation.mutate({ id: rule.id, isActive: !rule.isActive })}
                      disabled={toggleMutation.isPending && toggleMutation.variables?.id === rule.id}
                      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50"
                      style={{ backgroundColor: rule.isActive ? '#059669' : '#d1d5db' }}
                      aria-label={`Toggle ${rule.ruleName}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          rule.isActive ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="lg:col-span-1 text-xs text-text-tertiary">
                    {formatDate(rule.createdAt, { year: 'numeric', month: 'short' })}
                  </div>
                </div>
              ))}
            </div>

            {(meta?.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <p className="text-xs text-text-tertiary">
                  Page {meta?.page} of {meta?.totalPages} · {meta?.totalItems} rules
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" disabled={!meta || meta.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Prev
                  </Button>
                  <Button variant="secondary" size="sm" disabled={!meta || meta.page >= meta.totalPages} onClick={() => setPage((p) => Math.min(meta?.totalPages ?? p, p + 1))}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

export default AiRulesPage;
