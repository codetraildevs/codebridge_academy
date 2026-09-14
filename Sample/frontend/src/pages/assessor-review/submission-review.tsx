import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { assessorReviewApi, type SubmissionReviewDetail } from '@services/assessor-review-service';
import { useAuth } from '@hooks/use-auth';
import { sanitizeFilename } from '@utils/format';
import { RubricScoring } from '@components/assessor-review/rubric-scoring';
import {
  Loader2,
  ChevronLeft,
  Save,
  Send,
  AlertTriangle,
  CheckCircle2,
  Brain,
  UserCheck,
  FileText,
  Download,
  MessageSquare,
  Flag,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Printer,
  ClipboardList,
} from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warning',
  COMPLETED: 'success',
};

function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function ScoreBar({ label, score, maxScore = 100, color = 'bg-primary-500' }: { label: string; score: number | null; maxScore?: number; color?: string }) {
  const pct = score !== null ? Math.min((score / maxScore) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className="font-semibold text-text-primary">{score !== null ? `${score.toFixed(1)}%` : '—'}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function SubmissionReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submission, setSubmission] = useState<SubmissionReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewScore, setReviewScore] = useState<number | ''>('');
  const [finalScore, setFinalScore] = useState<number | ''>('');
  const [feedback, setFeedback] = useState('');
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'ai' | 'rubric' | 'review'>('content');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    assessorReviewApi.getSubmission(id)
      .then((data) => {
        setSubmission(data);
        // Pre-fill from existing review
        if (data.existingReview) {
          setReviewScore(data.existingReview.score ?? '');
          setFeedback(data.existingReview.feedback || '');
          setRubricScores((data.existingReview.rubricScores ?? {}) as Record<string, number>);
        }
        setFinalScore(data.finalScore ?? '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  /** Download a blank marking sheet pre-filled with this candidate's details. */
  const handleExportChecklist = async () => {
    if (!submission) return;
    setExporting(true);
    try {
      const blob = await assessorReviewApi.downloadChecklistPdf(
        submission.exam.id,
        {
          name: `${submission.candidate.firstName} ${submission.candidate.lastName}`,
          registrationNumber: submission.candidate.registrationNumber,
        },
        user ? `${user.firstName} ${user.lastName}` : undefined,
        // Pre-fill the Scored column from the existing review (if any) — the
        // backend loads the rubricScores for this review id.
        submission.existingReview?.id ?? null,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `marking-sheet-${sanitizeFilename(
        submission.candidate.lastName || submission.candidate.registrationNumber,
        'candidate',
      )}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export marking sheet:', err);
    } finally {
      setExporting(false);
    }
  };

  /**
   * Live rubric scoring — commits one indicator at a time and keeps the
   * Assessor Score (0-100%) in sync with the rubric total, so the marks on
   * the sheet drive the percentage. The score field stays editable for a
   * final override.
   */
  const handleRubricScoreChange = (itemId: string, score: number | null) => {
    const next = { ...rubricScores };
    if (score === null) delete next[itemId];
    else next[itemId] = score;
    setRubricScores(next);

    // Derive the Assessor Score from the marks entered for KNOWN checklist
    // items only (legacy criteria/title keys in a pre-existing review never
    // count), matching the total shown in the Rubric tab.
    const items = submission?.exam.checklistItems ?? [];
    const maxTotal = items.reduce((s, i) => s + (Number(i.weight) || 0), 0);
    const hasEntered = items.some((i) => next[i.id] !== undefined);
    if (maxTotal > 0 && hasEntered) {
      const total = items.reduce((s, i) => s + (next[i.id] ?? 0), 0);
      setReviewScore(Math.round((total / maxTotal) * 1000) / 10);
    }
  };

  const handleSaveReview = async (submitAsComplete: boolean) => {
    if (!id || !submission) return;
    setSaving(true);
    try {
      const review = await assessorReviewApi.upsertReview(id, {
        score: reviewScore !== '' ? Number(reviewScore) : undefined,
        feedback: feedback || undefined,
        // Always send the record — an empty {} intentionally clears previously
        // stored scores (the backend only updates when the key is present).
        rubricScores,
        status: submitAsComplete ? 'COMPLETED' : 'IN_REVIEW',
      });

      // If completing review, also update final score
      if (submitAsComplete && finalScore !== '') {
        await assessorReviewApi.updateSubmissionScore(id, {
          assessorScore: reviewScore !== '' ? Number(reviewScore) : undefined,
          finalScore: Number(finalScore),
        });
      }

      setSavedMessage(submitAsComplete ? 'Review submitted successfully!' : 'Review saved as draft');
      setTimeout(() => setSavedMessage(null), 3000);

      // Refresh
      const updated = await assessorReviewApi.getSubmission(id);
      setSubmission(updated);
    } catch (err) {
      console.error('Save failed:', err);
      setSavedMessage('Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <AlertTriangle className="h-16 w-16 text-text-tertiary" />
        <h3 className="mt-4 text-lg font-medium text-text-primary">Submission not found</h3>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/assessor-review')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const aiAssessments = submission.aiAssessments || [];
  const latestAi = aiAssessments[0] || null;
  const existingReview = submission.existingReview;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/assessor-review')}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Submission Review</h1>
            <p className="text-sm text-text-secondary">{submission.exam.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportChecklist}
            loading={exporting}
            icon={<Printer className="h-4 w-4" />}
            title="Download a blank marking sheet pre-filled with this candidate's details"
          >
            Export Marking Sheet
          </Button>
          {savedMessage && (
            <Badge variant={savedMessage.includes('Failed') ? 'error' : 'success'} size="sm">
              {savedMessage.includes('Failed') ? (
                <AlertTriangle className="h-3 w-3 mr-1 inline" />
              ) : (
                <CheckCircle2 className="h-3 w-3 mr-1 inline" />
              )}
              {savedMessage}
            </Badge>
          )}
          {existingReview?.status === 'COMPLETED' && (
            <Badge variant="success" size="sm">
              <CheckCircle2 className="h-3 w-3 mr-1 inline" />
              Reviewed
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Candidate & Submission Info */}
        <div className="space-y-4">
          {/* Candidate Card */}
          <Card variant="outlined" padding="md">
            <CardHeader>
              <CardTitle>Candidate</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700">
                  {submission.candidate.firstName[0]}{submission.candidate.lastName[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {submission.candidate.firstName} {submission.candidate.lastName}
                  </p>
                  <p className="text-xs text-text-tertiary">{submission.candidate.email}</p>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Registration:</span>
                  <span className="font-medium text-text-primary">{submission.candidate.registrationNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Status:</span>
                  <Badge variant={statusVariant[submission.status] || 'neutral'} size="sm">
                    {submission.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Submitted:</span>
                  <span className="text-text-primary">{formatDate(submission.submittedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Type:</span>
                  <span className="text-text-primary">{submission.submissionType}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Score Comparison */}
          <Card variant="outlined" padding="md">
            <CardHeader>
              <CardTitle>Score Comparison</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <ScoreBar
                label="AI Score"
                score={submission.aiScore}
                color="bg-blue-500"
              />
              <ScoreBar
                label="Assessor Score"
                score={submission.assessorScore}
                color="bg-primary-500"
              />
              <ScoreBar
                label="Final Score"
                score={submission.finalScore ?? submission.assessorScore ?? submission.aiScore}
                color="bg-green-500"
              />

              {latestAi && (
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
                    <Brain className="h-4 w-4 text-blue-500" />
                    AI Assessment Details
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Confidence:</span>
                      <span className="font-medium text-text-primary">
                        {latestAi.confidenceScore !== null ? `${latestAi.confidenceScore.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Status:</span>
                      <span>{latestAi.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Evaluated:</span>
                      <span className="text-text-primary">{formatDate(latestAi.evaluatedAt)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Files */}
          {submission.files.length > 0 && (
            <Card variant="outlined" padding="md">
              <CardHeader>
                <CardTitle>Submission Files ({submission.files.length})</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                {submission.files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface-secondary">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-text-tertiary shrink-0" />
                      <span className="text-sm text-text-primary truncate">{file.fileName}</span>
                    </div>
                    <Button variant="ghost" size="xs" iconOnly>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right Column — Content & Review */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-border">
            {(['content', 'ai', 'rubric', 'review'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab === 'content' && <FileText className="h-4 w-4 inline mr-1.5" />}
                {tab === 'ai' && <Brain className="h-4 w-4 inline mr-1.5" />}
                {tab === 'rubric' && <ClipboardList className="h-4 w-4 inline mr-1.5" />}
                {tab === 'review' && <UserCheck className="h-4 w-4 inline mr-1.5" />}
                {tab}
              </button>
            ))}
          </div>

          {/* Tab: Content */}
          {activeTab === 'content' && (
            <Card variant="outlined" padding="md">
              <CardHeader>
                <CardTitle>Submission Content</CardTitle>
              </CardHeader>
              <CardBody>
                {submission.content ? (
                  <pre className="whitespace-pre-wrap text-sm text-text-primary bg-surface-secondary p-4 rounded-lg border border-border overflow-auto max-h-96">
                    {typeof submission.content === 'string'
                      ? submission.content
                      : JSON.stringify(submission.content, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-text-tertiary py-8 text-center">No content in this submission</p>
                )}
              </CardBody>
            </Card>
          )}

          {/* Tab: AI Evaluation */}
          {activeTab === 'ai' && (
            <Card variant="outlined" padding="md">
              <CardHeader>
                <CardTitle>AI Evaluation</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                {latestAi ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-blue-50 text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {latestAi.overallScore?.toFixed(1) || '—'}%
                        </p>
                        <p className="text-xs text-blue-700 mt-1">Overall Score</p>
                      </div>
                      <div className="p-4 rounded-lg bg-purple-50 text-center">
                        <p className="text-2xl font-bold text-purple-600">
                          {latestAi.confidenceScore?.toFixed(1) || '—'}%
                        </p>
                        <p className="text-xs text-purple-700 mt-1">Confidence</p>
                      </div>
                    </div>

                    {/* Criterion Scores */}
                    {latestAi.scores.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-text-primary mb-3">Criterion Scores</h4>
                        <div className="space-y-2">
                          {latestAi.scores.map((score) => (
                            <div key={score.id} className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-text-secondary">{score.criterionName}</span>
                                  <span className="font-medium text-text-primary">
                                    {score.score.toFixed(1)}/{score.maxScore}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
                                  <div
                                    className="h-full rounded-full bg-blue-400"
                                    style={{ width: `${(score.score / score.maxScore) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {latestAi.feedback && (
                      <div>
                        <h4 className="text-sm font-medium text-text-primary mb-2">AI Feedback</h4>
                        <div className="p-3 rounded-lg bg-surface-secondary border border-border text-sm text-text-primary whitespace-pre-wrap">
                          {latestAi.feedback}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Brain className="h-12 w-12 text-text-tertiary" />
                    <p className="mt-3 text-sm text-text-secondary">No AI assessment available for this submission</p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Tab: Rubric Scoring (per-indicator marks) */}
          {activeTab === 'rubric' && (
            <Card variant="outlined" padding="md">
              <CardHeader>
                <CardTitle>Rubric Scoring</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <p className="text-sm text-text-secondary">
                  Enter marks for each indicator (0 – max). The total and percentage update
                  live, and the <strong>Assessor Score</strong> in the Review tab is derived
                  from this total — save them with your review to pre-fill the printed marking
                  sheet.
                </p>
                <RubricScoring
                  items={submission.exam.checklistItems ?? []}
                  scores={rubricScores}
                  onScoreChange={handleRubricScoreChange}
                />
              </CardBody>
            </Card>
          )}

          {/* Tab: Review (Score & Feedback) */}
          {activeTab === 'review' && (
            <Card variant="outlined" padding="md">
              <CardHeader>
                <CardTitle>Your Review</CardTitle>
              </CardHeader>
              <CardBody className="space-y-5">
                {/* Assessor Score */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Assessor Score (0-100%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={reviewScore}
                      onChange={(e) => setReviewScore(e.target.value ? Number(e.target.value) : '')}
                      className="w-24 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary text-center focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="—"
                    />
                    <span className="text-sm text-text-secondary">/ 100</span>
                  </div>
                </div>

                {/* Final Score */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Final Score (overrides all other scores)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={finalScore}
                      onChange={(e) => setFinalScore(e.target.value ? Number(e.target.value) : '')}
                      className="w-24 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary text-center focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="—"
                    />
                    <span className="text-sm text-text-secondary">/ 100</span>
                  </div>
                </div>

                {/* Feedback */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    <MessageSquare className="h-4 w-4 inline mr-1.5" />
                    Assessor Feedback
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={6}
                    className="w-full rounded-lg border border-border bg-white p-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="Provide detailed feedback on the candidate's submission..."
                  />
                </div>

                {/* Comparison indicator */}
                {submission.aiScore !== null && reviewScore !== '' && (
                  <div className="p-3 rounded-lg border border-border bg-surface-secondary">
                    <div className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
                      <BarChart3 className="h-4 w-4" />
                      Score Comparison
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-text-tertiary">AI Score</p>
                        <p className="text-lg font-bold text-blue-600">{submission.aiScore.toFixed(1)}%</p>
                      </div>
                      <div className="flex items-center">
                        {Number(reviewScore) > submission.aiScore ? (
                          <ThumbsUp className="h-5 w-5 text-success" />
                        ) : Number(reviewScore) < submission.aiScore ? (
                          <ThumbsDown className="h-5 w-5 text-error" />
                        ) : (
                          <Minus className="h-5 w-5 text-text-tertiary" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-text-tertiary">Your Score</p>
                        <p className="text-lg font-bold text-primary-600">{Number(reviewScore).toFixed(1)}%</p>
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {Math.abs(Number(reviewScore) - submission.aiScore).toFixed(1)}% difference
                      </div>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Save actions — visible on every tab so rubric marks can be saved
              without leaving the scoring view */}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSaveReview(false)}
              loading={saving}
              icon={<Save className="h-4 w-4" />}
            >
              Save Draft
            </Button>
            <Button
              size="sm"
              onClick={() => handleSaveReview(true)}
              loading={saving}
              icon={<Send className="h-4 w-4" />}
            >
              Submit Review
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubmissionReviewPage;
