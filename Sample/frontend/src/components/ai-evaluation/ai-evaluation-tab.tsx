import { useState, useEffect } from 'react';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { EvaluationPanel } from './evaluation-panel';
import { EvaluationSummaryCard } from './evaluation-summary-card';
import { assessmentBuilderApi, type SubmissionSummary } from '@services/assessment-builder-service';
import { Brain, BarChart3, Loader2, AlertCircle, FileText, User, Calendar, CheckCircle2, XCircle } from 'lucide-react';

interface AiEvaluationTabProps {
  assessmentId: string;
}

type ViewMode = 'evaluate' | 'summary';

export function AiEvaluationTab({ assessmentId }: AiEvaluationTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('evaluate');
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionSummary | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualSubmissionId, setManualSubmissionId] = useState('');
  const [manualExamRegId, setManualExamRegId] = useState('');
  const [manualCandidateId, setManualCandidateId] = useState('');

  useEffect(() => {
    loadSubmissions();
  }, [assessmentId]);

  const loadSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assessmentBuilderApi.listSubmissions(assessmentId);
      setSubmissions(data);
      if (data.length > 0 && !selectedSubmission) {
        setSelectedSubmission(data[0] ?? null);
      }
    } catch {
      setError('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEvaluation = () => {
    if (!selectedSubmission) return;
    setShowPanel(true);
  };

  const handleReset = () => {
    setShowPanel(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
      case 'COMPLETED':
        return <Badge variant="success" size="sm"><CheckCircle2 className="h-3 w-3 mr-1" /> {status.replace(/_/g, ' ')}</Badge>;
      case 'DRAFT':
        return <Badge variant="neutral" size="sm"><FileText className="h-3 w-3 mr-1" /> Draft</Badge>;
      default:
        return <Badge variant="info" size="sm">{status.replace(/_/g, ' ')}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setViewMode('evaluate')}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            viewMode === 'evaluate'
              ? 'bg-primary-50 text-primary-700'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
          }`}
        >
          <Brain className="h-4 w-4" />
          Evaluate Submission
        </button>
        <button
          onClick={() => setViewMode('summary')}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            viewMode === 'summary'
              ? 'bg-primary-50 text-primary-700'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Evaluation Summary
        </button>
      </div>

      {viewMode === 'evaluate' && (
        <div className="space-y-4">
          {!showPanel ? (
            <>
              {/* Submission Selector */}
              <Card variant="outlined" padding="lg">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Run AI Evaluation</h2>
                <p className="text-sm text-text-secondary mb-6">
                  Select a submission to trigger an AI-powered evaluation. The system will analyze the
                  submission using all active AI evaluation rules configured for this assessment.
                </p>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <AlertCircle className="h-10 w-10 text-error mb-3" />
                    <p className="text-sm text-text-secondary mb-4">{error}</p>
                    <Button variant="secondary" size="sm" onClick={loadSubmissions}>Retry</Button>
                  </div>
                ) : submissions.length === 0 && !showManualEntry ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <FileText className="h-12 w-12 text-text-tertiary mb-3" />
                    <h3 className="text-sm font-medium text-text-primary mb-1">No Submissions Found</h3>
                    <p className="text-sm text-text-secondary max-w-md">
                      This assessment has no submissions yet. Submissions appear here when candidates
                      complete and submit their work.
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => setShowManualEntry(true)} className="mt-4">
                      Enter Submission IDs Manually
                    </Button>
                  </div>
                ) : showManualEntry ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-text-primary">Manual UUID Entry</h3>
                      {submissions.length > 0 && (
                        <Button variant="ghost" size="xs" onClick={() => setShowManualEntry(false)}>
                          Back to submissions list
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-text-secondary">Submission ID *</label>
                        <input
                          value={manualSubmissionId}
                          onChange={(e) => setManualSubmissionId(e.target.value)}
                          placeholder="UUID"
                          className="block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-text-secondary">Exam Registration ID *</label>
                        <input
                          value={manualExamRegId}
                          onChange={(e) => setManualExamRegId(e.target.value)}
                          placeholder="UUID"
                          className="block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-text-secondary">Candidate ID *</label>
                        <input
                          value={manualCandidateId}
                          onChange={(e) => setManualCandidateId(e.target.value)}
                          placeholder="UUID"
                          className="block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={() => setShowPanel(true)}
                        icon={<Brain className="h-4 w-4" />}
                        disabled={!manualSubmissionId || !manualExamRegId || !manualCandidateId}
                      >
                        Start Evaluation
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Submission List */}
                    <div className="space-y-2 mb-6">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                        Select a Submission ({submissions.length})
                      </h3>
                      {submissions.map((sub) => {
                        const isSelected = selectedSubmission?.id === sub.id;
                        const candidate = sub.candidate;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => setSelectedSubmission(sub)}
                            className={`w-full text-left p-3 rounded-xl border transition-all ${
                              isSelected
                                ? 'border-primary-500 bg-primary-50/30 ring-1 ring-primary-500'
                                : 'border-border hover:border-primary-200 hover:bg-surface-secondary/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <User className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
                                  <span className="text-sm font-medium text-text-primary truncate">
                                    {candidate
                                      ? `${candidate.firstName} ${candidate.lastName}`
                                      : 'Unknown Candidate'}
                                  </span>
                                  {candidate?.registrationNumber && (
                                    <span className="text-xs text-text-tertiary font-mono">
                                      #{candidate.registrationNumber}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-text-tertiary">
                                  <span className="flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    {sub.submissionType.replace(/_/g, ' ')}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(sub.createdAt)}
                                  </span>
                                  {sub.files && sub.files.length > 0 && (
                                    <span>{sub.files.length} file(s)</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {getStatusBadge(sub.status)}
                                {sub.aiScore !== null && (
                                  <span className="text-xs font-medium text-primary-600">
                                    AI: {sub.aiScore}%
                                  </span>
                                )}
                                {isSelected && (
                                  <div className="h-5 w-5 rounded-full bg-primary-600 flex items-center justify-center">
                                    <CheckCircle2 className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Start Button */}
                    <div className="flex justify-end">
                      <Button
                        onClick={handleStartEvaluation}
                        icon={<Brain className="h-4 w-4" />}
                        disabled={!selectedSubmission}
                      >
                        Evaluate Selected Submission
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            </>
          ) : (
            <>
              {/* Context Banner */}
              <Card variant="outlined" padding="sm" className="border-primary-200 bg-primary-50/30">
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-primary-600" />
                  <span className="text-text-primary font-medium">
                    {selectedSubmission
                      ? (selectedSubmission.candidate
                          ? `${selectedSubmission.candidate.firstName} ${selectedSubmission.candidate.lastName}`
                          : manualSubmissionId.slice(0, 8) + '...')
                      : manualSubmissionId.slice(0, 8) + '...'}
                    {selectedSubmission?.candidate?.registrationNumber &&
                      <> · #{selectedSubmission.candidate.registrationNumber}</>}
                  </span>
                  <span className="text-text-tertiary">|</span>
                  <FileText className="h-4 w-4 text-text-tertiary" />
                  <span className="text-text-secondary">
                    {selectedSubmission?.submissionType.replace(/_/g, '') || 'Manual Entry'}
                  </span>
                  <span className="text-text-tertiary">|</span>
                  <span className="text-text-secondary text-xs">
                    {selectedSubmission ? `Submitted ${formatDate(selectedSubmission.createdAt)}` : 'Manual UUID'}
                  </span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleReset}
                    className="ml-auto"
                  >
                    Change Submission
                  </Button>
                </div>
              </Card>

              {/* Evaluation Panel */}
              {selectedSubmission ? (
                <EvaluationPanel
                  assessmentId={assessmentId}
                  submissionId={selectedSubmission.id}
                  examRegistrationId={selectedSubmission.examRegistrationId}
                  candidateId={selectedSubmission.candidateId}
                />
              ) : (
                <EvaluationPanel
                  assessmentId={assessmentId}
                  submissionId={manualSubmissionId}
                  examRegistrationId={manualExamRegId}
                  candidateId={manualCandidateId}
                />
              )}
            </>
          )}
        </div>
      )}

      {viewMode === 'summary' && (
        <EvaluationSummaryCard assessmentId={assessmentId} />
      )}
    </div>
  );
}

export default AiEvaluationTab;
