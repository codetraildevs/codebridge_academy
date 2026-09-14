import { useState, useEffect } from 'react';
import { Card } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { aiEvaluationService, type AiEvaluation, type AiScore } from '@services/ai-evaluation-service';
import {
  Brain,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BarChart3,
  FileText,
  RefreshCw,
  Target,
} from 'lucide-react';

interface EvaluationPanelProps {
  assessmentId: string;
  submissionId: string;
  examRegistrationId: string;
  candidateId: string;
}

export function EvaluationPanel({ assessmentId, submissionId, examRegistrationId, candidateId }: EvaluationPanelProps) {
  const [evaluations, setEvaluations] = useState<AiEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEval, setSelectedEval] = useState<AiEvaluation | null>(null);

  const loadEvaluations = async () => {
    setLoading(true);
    try {
      const data = await aiEvaluationService.listBySubmission(submissionId);
      setEvaluations(data);
      if (data.length > 0 && !selectedEval) {
        setSelectedEval(data[0] ?? null);
      }
    } catch (err) {
      setError('Failed to load evaluations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvaluations();
  }, [submissionId]);

  const handleTriggerEvaluation = async () => {
    setTriggering(true);
    setError(null);
    try {
      const result = await aiEvaluationService.trigger({
        assessmentId,
        submissionId,
        examRegistrationId,
        candidateId,
      });
      // Reload evaluations after triggering and select the new one
      const freshData = await aiEvaluationService.listBySubmission(submissionId);
      setEvaluations(freshData);
      const selected = freshData.find((e) => e.id === result.id);
      setSelectedEval(selected ? selected : null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to trigger evaluation');
    } finally {
      setTriggering(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success" size="sm"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
      case 'PROCESSING':
        return <Badge variant="info" size="sm"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing</Badge>;
      case 'FAILED':
        return <Badge variant="error" size="sm"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-text-primary">AI Evaluation</h2>
        </div>
        <Button
          size="sm"
          onClick={handleTriggerEvaluation}
          loading={triggering}
          icon={<RefreshCw className="h-4 w-4" />}
          disabled={loading}
        >
          {evaluations.length > 0 ? 'Re-evaluate' : 'Run Evaluation'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card variant="outlined" padding="sm" className="border-error bg-error-light/10">
          <div className="flex items-center gap-2 text-error text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      )}

      {/* Empty State */}
      {!loading && evaluations.length === 0 && (
        <Card variant="outlined" padding="lg">
          <div className="flex flex-col items-center py-8 text-center">
            <Brain className="h-12 w-12 text-text-tertiary mb-3" />
            <h3 className="text-sm font-medium text-text-primary mb-1">No Evaluations Yet</h3>
            <p className="text-sm text-text-secondary mb-4">
              Run an AI evaluation to automatically score and analyze this submission.
            </p>
            <Button onClick={handleTriggerEvaluation} loading={triggering} icon={<Brain className="h-4 w-4" />}>
              Run Evaluation
            </Button>
          </div>
        </Card>
      )}

      {/* Evaluation List */}
      {!loading && evaluations.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Sidebar — evaluation history */}
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Evaluation History</h3>
            {evaluations.map((ev) => (
              <button
                key={ev.id}
                onClick={() => setSelectedEval(ev)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedEval?.id === ev.id
                    ? 'border-primary-500 bg-primary-50/30 ring-1 ring-primary-500'
                    : 'border-border hover:border-primary-200 hover:bg-surface-secondary/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-text-tertiary">{ev.id.slice(0, 8)}...</span>
                  {getStatusBadge(ev.status)}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-3.5 w-3.5 text-text-tertiary" />
                  <span className="font-medium text-text-primary">{ev.overallScore ?? '—'}%</span>
                  {ev.confidenceScore && (
                    <span className="text-xs text-text-tertiary">conf: {ev.confidenceScore}%</span>
                  )}
                </div>
                {ev.evaluatedAt && (
                  <p className="text-xs text-text-tertiary mt-1">
                    {new Date(ev.evaluatedAt).toLocaleDateString()}
                  </p>
                )}
              </button>
            ))}
          </div>

          {/* Detail panel */}
          {selectedEval && (
            <div className="lg:col-span-2 space-y-4">
              {/* Score Overview */}
              <Card variant="outlined" padding="md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-text-primary">Evaluation Results</h3>
                  {getStatusBadge(selectedEval.status)}
                </div>

                {selectedEval.status === 'COMPLETED' ? (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 rounded-xl bg-surface-secondary/50">
                        <div className="text-2xl font-bold text-primary-600">{selectedEval.overallScore ?? '—'}</div>
                        <div className="text-xs text-text-tertiary mt-1">Overall Score</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-surface-secondary/50">
                        <div className="text-2xl font-bold text-accent-600">{selectedEval.confidenceScore ?? '—'}</div>
                        <div className="text-xs text-text-tertiary mt-1">Confidence</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-surface-secondary/50">
                        <div className="text-2xl font-bold text-text-primary">{selectedEval.scores?.length ?? 0}</div>
                        <div className="text-xs text-text-tertiary mt-1">Criteria Scored</div>
                      </div>
                    </div>

                    {/* Criterion Scores */}
                    {selectedEval.scores && selectedEval.scores.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-1">
                          <BarChart3 className="h-3.5 w-3.5" />
                          Criterion Scores
                        </h4>
                        {selectedEval.scores.map((score) => (
                          <ScoreBar key={score.id} score={score} />
                        ))}
                      </div>
                    )}

                    {/* Competency Scores */}
                    {selectedEval.competencyScores && Object.keys(selectedEval.competencyScores).length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-1">
                          <Target className="h-3.5 w-3.5" />
                          Competency Scores
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(selectedEval.competencyScores).map(([name, score]) => (
                            <div
                              key={name}
                              className="flex items-center justify-between p-2 rounded-lg bg-surface-secondary/50"
                            >
                              <span className="text-sm text-text-primary">{name}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-2 rounded-full bg-surface-tertiary overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-primary-500 transition-all"
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-text-primary">{Math.round(score)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Feedback */}
                    {selectedEval.feedback && (
                      <div className="mt-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2 flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          Feedback
                        </h4>
                        <div className="p-3 rounded-xl bg-surface-secondary/50 text-sm text-text-secondary whitespace-pre-wrap">
                          {selectedEval.feedback}
                        </div>
                      </div>
                    )}

                    {/* Risk Indicators */}
                    {selectedEval.riskIndicators && Object.keys(selectedEval.riskIndicators).length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Risk Indicators
                        </h4>
                        <div className="p-3 rounded-xl bg-surface-secondary/50 text-sm">
                          {Object.entries(selectedEval.riskIndicators).map(([key, val]) => (
                            <div key={key} className="flex items-start gap-2 text-text-secondary">
                              <span className="text-xs font-medium text-text-primary min-w-[100px]">{key}:</span>
                              <span className="text-xs">{JSON.stringify(val)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : selectedEval.status === 'FAILED' ? (
                  <div className="flex flex-col items-center py-6 text-center">
                    <XCircle className="h-10 w-10 text-error mb-2" />
                    <p className="text-sm text-text-secondary">{selectedEval.feedback || 'Evaluation failed'}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary-600 mb-2" />
                    <p className="text-sm text-text-secondary">Evaluation in progress...</p>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Score Bar Sub-component ────────────────────

function ScoreBar({ score }: { score: AiScore }) {
  const percentage = (score.score / score.maxScore) * 100;
  const barColor = percentage >= 80 ? 'bg-success' : percentage >= 60 ? 'bg-accent-500' : percentage >= 40 ? 'bg-warning' : 'bg-error';

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-primary w-32 truncate flex-shrink-0" title={score.criterionName}>
        {score.criterionName}
      </span>
      <div className="flex-1 h-2.5 rounded-full bg-surface-tertiary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-text-primary w-16 text-right flex-shrink-0">
        {score.score}/{score.maxScore}
      </span>
      {score.feedback && (
        <span className="text-xs text-text-tertiary w-40 truncate hidden lg:block" title={score.feedback}>
          {score.feedback}
        </span>
      )}
    </div>
  );
}

export default EvaluationPanel;
