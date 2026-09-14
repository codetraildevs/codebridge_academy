import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import type { AiEvaluation } from '@services/ai-evaluation-service';
import {
  Brain,
  CheckCircle2,
  Loader2,
  XCircle,
  BarChart3,
  Target,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface EvaluationResultViewProps {
  evaluation: AiEvaluation;
}

export function EvaluationResultView({ evaluation }: EvaluationResultViewProps) {
  return (
    <Card variant="outlined" padding="md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary-600" />
            AI Evaluation Result
          </CardTitle>
          <StatusBadge status={evaluation.status} />
        </div>
      </CardHeader>
      <CardBody>
        {evaluation.status === 'COMPLETED' ? (
          <CompletedView evaluation={evaluation} />
        ) : evaluation.status === 'FAILED' ? (
          <FailedView evaluation={evaluation} />
        ) : (
          <ProcessingView evaluation={evaluation} />
        )}
      </CardBody>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'COMPLETED':
      return (
        <Badge variant="success" size="sm" className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Completed
        </Badge>
      );
    case 'PROCESSING':
      return (
        <Badge variant="info" size="sm" className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Processing
        </Badge>
      );
    case 'FAILED':
      return (
        <Badge variant="error" size="sm" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" /> Failed
        </Badge>
      );
    default:
      return <Badge variant="neutral" size="sm">Pending</Badge>;
  }
}

function CompletedView({ evaluation }: { evaluation: AiEvaluation }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <MetricBox label="Overall Score" value={`${evaluation.overallScore ?? '—'}%`} color="text-primary-600" />
        <MetricBox label="Confidence" value={`${evaluation.confidenceScore ?? '—'}%`} color="text-accent-600" />
        <MetricBox label="Criteria" value={String(evaluation.scores?.length ?? 0)} color="text-text-primary" />
      </div>

      {evaluation.scores && evaluation.scores.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2 flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            Criterion Scores
          </h4>
          <div className="space-y-1.5">
            {evaluation.scores.map((score) => {
              const pct = (score.score / score.maxScore) * 100;
              return (
                <div key={score.id} className="flex items-center gap-2 text-sm">
                  <span className="text-text-primary w-32 truncate">{score.criterionName}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface-tertiary overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        pct >= 80 ? 'bg-success' : pct >= 60 ? 'bg-accent-500' : pct >= 40 ? 'bg-warning' : 'bg-error'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-text-primary font-medium w-16 text-right">
                    {score.score}/{score.maxScore}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {evaluation.competencyScores && Object.keys(evaluation.competencyScores).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2 flex items-center gap-1">
            <Target className="h-3.5 w-3.5" />
            Competency Mapping
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(evaluation.competencyScores).map(([name, score]) => (
              <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-surface-secondary/50">
                <span className="text-sm text-text-primary">{name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 rounded-full bg-surface-tertiary overflow-hidden">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${score}%` }} />
                  </div>
                  <span className="text-xs font-medium text-text-primary">{Math.round(score)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {evaluation.feedback && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2 flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            Feedback
          </h4>
          <div className="p-3 rounded-xl bg-surface-secondary/50 text-sm text-text-secondary whitespace-pre-wrap">
            {evaluation.feedback}
          </div>
        </div>
      )}

      {evaluation.riskIndicators && Object.keys(evaluation.riskIndicators).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            Risk Indicators
          </h4>
          <div className="p-3 rounded-xl bg-surface-secondary/50 text-sm">
            {Object.entries(evaluation.riskIndicators).map(([key, val]) => (
              <div key={key} className="flex gap-2 text-text-secondary">
                <span className="font-medium text-text-primary min-w-[100px]">{key}:</span>
                <span className="text-xs">{JSON.stringify(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FailedView({ evaluation }: { evaluation: AiEvaluation }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <XCircle className="h-12 w-12 text-error mb-3" />
      <h3 className="text-sm font-medium text-text-primary mb-1">Evaluation Failed</h3>
      <p className="text-sm text-text-secondary max-w-md">
        {evaluation.feedback || 'The AI evaluation encountered an error. Try re-running the evaluation.'}
      </p>
    </div>
  );
}

function ProcessingView({ evaluation }: { evaluation: AiEvaluation }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary-600 mb-3" />
      <h3 className="text-sm font-medium text-text-primary mb-1">Evaluation in Progress</h3>
      <p className="text-sm text-text-secondary">
        The AI is analyzing the submission... This should complete shortly.
      </p>
      {evaluation.createdAt && (
        <p className="text-xs text-text-tertiary mt-2">
          Started {new Date(evaluation.createdAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center p-3 rounded-xl bg-surface-secondary/50">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-text-tertiary mt-1">{label}</div>
    </div>
  );
}

export default EvaluationResultView;
