import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { tradeService } from '@services/trade-service';
import { WorkspaceToolsGrid, resolveTradeWorkspaceDefaults, defaultWorkspaceToolsForTrade } from './components/workspace-tools-editor';
import type { Trade } from '@app_types/index';
import {
  Wrench,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Save,
  RotateCcw,
  GraduationCap,
} from 'lucide-react';

export function AdminTradeEnvironmentsPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  // Per-trade drafts keyed by trade id — undefined means unchanged from the
  // currently known value (loaded from the API).
  interface TradeEnvDraft {
    tools: string[];
    locked: string[];
  }
  const [drafts, setDrafts] = useState<Record<string, TradeEnvDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadTrades = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await tradeService.listTrades();
      setTrades(data);
      setDrafts({});
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load trades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  const getDraft = (trade: Trade): TradeEnvDraft => {
    if (trade.id in drafts) return drafts[trade.id]!;
    // Initialise from the DB value if set, otherwise the built-in defaults.
    return {
      tools: resolveTradeWorkspaceDefaults(trade),
      locked: Array.isArray(trade.lockedWorkspaceTools) ? trade.lockedWorkspaceTools : [],
    };
  };

  const setDraft = (tradeId: string, draft: TradeEnvDraft) => {
    setDrafts((prev) => ({ ...prev, [tradeId]: draft }));
  };

  const handleSave = async (trade: Trade) => {
    const draft = getDraft(trade);
    setSavingId(trade.id);
    setError('');
    setSuccess('');
    try {
      const updated = await tradeService.updateTrade(trade.id, {
        // Empty selections store the full list (explicit all tools) so the DB
        // value round-trips correctly and never looks "not configured".
        workspaceTools:
          draft.tools.length > 0 ? draft.tools : [...resolveTradeWorkspaceDefaults(trade)],
        lockedWorkspaceTools: draft.locked,
      });
      setTrades((prev) => prev.map((t) => (t.id === trade.id ? updated : t)));
      // Clear draft — now the API value matches
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[trade.id];
        return next;
      });
      setSuccess(`"${trade.name}" working environment saved`);
    } catch (err: any) {
      setError(err?.response?.data?.message || `Failed to save "${trade.name}"`);
    } finally {
      setSavingId(null);
    }
  };

  const handleReset = (trade: Trade) => {
    // Built-in defaults carry no locks.
    setDraft(trade.id, {
      tools: defaultWorkspaceToolsForTrade(trade.code),
      locked: [],
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Trade Environments</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Configure the default working environment (workspace tools) for each trade.
          These pre-fill the exam workspace when an admin creates an exam for that trade.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {trades.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center">
            <p className="text-text-tertiary">No trades found.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-5">
          {trades.map((trade) => {
            const draft = getDraft(trade);
            const isDirty = trade.id in drafts;
            const isSaving = savingId === trade.id;

            return (
              <Card key={trade.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
                        <Wrench className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {trade.name}
                          <Badge variant="neutral" size="sm">{trade.code}</Badge>
                        </CardTitle>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-text-tertiary">
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            {(trade as any)._count?.competencies ?? 0} competencies
                          </span>
                          {!isDirty && (
                            <span className="flex items-center gap-1 text-accent-600">
                              <CheckCircle2 className="h-3 w-3" /> Saved
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReset(trade)}
                        disabled={isSaving}
                        title="Reset to built-in default for this trade"
                      >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(trade)}
                        loading={isSaving}
                      >
                        <Save className="mr-1 h-3.5 w-3.5" /> Save
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  <WorkspaceToolsGrid
                    tools={draft.tools}
                    onChange={(tools) => setDraft(trade.id, { ...draft, tools })}
                    lockedTools={draft.locked}
                    onChangeLocked={(locked) => setDraft(trade.id, { ...draft, locked })}
                  />
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminTradeEnvironmentsPage;