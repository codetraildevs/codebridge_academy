import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { aiEvaluationService, type EvaluationSummary } from '@services/ai-evaluation-service';
import { Button } from '@components/ui/button';
import {
  Brain,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface EvaluationSummaryCardProps {
  assessmentId: string;
}

export function EvaluationSummaryCard({ assessmentId }: EvaluationSummaryCardProps) {
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiEvaluationService.getAssessmentSummary(assessmentId);
      setSummary(data);
    } catch {
      setError('Failed to load evaluation summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [assessmentId]);

  if (loading) {
    return (
      <Card variant="outlined" padding="md">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="outlined" padding="md" className="border-error">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-error text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={loadSummary} icon={<RefreshCw className="h-4 w-4" />}>
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <Card variant="outlined" padding="md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary-600" />
          AI Evaluation Summary
        </CardTitle>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 rounded-xl bg-surface-secondary/50">
            <div className="text-xl font-bold text-primary-600">{summary.averageScore}%</div>
            <div className="text-xs text-text-tertiary mt-1">Avg Score</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-surface-secondary/50">
            <div className="text-xl font-bold text-accent-600">{summary.averageConfidence}%</div>
            <div className="text-xs text-text-tertiary mt-1">Avg Confidence</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-surface-secondary/50">
            <div className="text-xl font-bold text-text-primary">{summary.totalEvaluations}</div>
            <div className="text-xs text-text-tertiary mt-1">Evaluations</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-surface-secondary/50">
            <div className="text-xl font-bold text-text-primary">{summary.totalSubmissions}</div>
            <div className="text-xs text-text-tertiary mt-1">Submissions</div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Status Breakdown</h4>
          <div className="flex gap-3">
            <StatusStat
              label="Completed"
              count={summary.statusBreakdown.completed}
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              color="text-success"
            />
            <StatusStat
              label="Failed"
              count={summary.statusBreakdown.failed}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              color="text-error"
            />
            <StatusStat
              label="Processing"
              count={summary.statusBreakdown.processing}
              icon={<Loader2 className="h-3.5 w-3.5 animate-spin" />}
              color="text-accent-600"
            />
            <StatusStat
              label="Pending"
              count={summary.statusBreakdown.pending}
              icon={<Clock className="h-3.5 w-3.5" />}
              color="text-text-tertiary"
            />
          </div>
        </div>

        {/* Recent Evaluations */}
        {summary.recentEvaluations.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Recent Evaluations</h4>
            <div className="space-y-1">
              {summary.recentEvaluations.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-secondary/50 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={ev.status === 'COMPLETED' ? 'success' : ev.status === 'FAILED' ? 'error' : 'info'}
                      size="sm"
                    >
                      {ev.status}
                    </Badge>
                    <span className="text-xs font-mono text-text-tertiary">{ev.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-text-primary">{ev.overallScore ?? '—'}%</span>
                    {ev.evaluatedAt && (
                      <span className="text-xs text-text-tertiary">{new Date(ev.evaluatedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function StatusStat({ label, count, icon, color }: { label: string; count: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={color}>{icon}</span>
      <span className="font-medium text-text-primary">{count}</span>
      <span className="text-text-tertiary">{label}</span>
    </div>
  );
}

export default EvaluationSummaryCard;
