import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { candidatePortalApi, type CandidateSubmission } from '@services/candidate-portal-service';
import {
  Loader2,
  ChevronLeft,
  File,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  BarChart3,
  Award,
} from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warning',
  COMPLETED: 'success',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<CandidateSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    candidatePortalApi.getSubmission(id)
      .then(setSubmission)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

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
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/candidate-portal/submissions')}>
          Back to Submissions
        </Button>
      </div>
    );
  }

  const aiAssessment = submission.aiAssessments?.[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/candidate-portal/submissions')}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Submission Details</h1>
            <p className="text-sm text-text-secondary">
              {submission.exam?.title || 'Assessment Submission'}
            </p>
          </div>
        </div>
        <Badge variant={statusVariant[submission.status] || 'neutral'} size="md">
          {submission.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content */}
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
                <p className="text-sm text-text-tertiary py-8 text-center">No content recorded</p>
              )}
            </CardBody>
          </Card>

          {/* Files */}
          {submission.files && submission.files.length > 0 && (
            <Card variant="outlined" padding="md">
              <CardHeader>
                <CardTitle>Attached Files ({submission.files.length})</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {submission.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-secondary"
                    >
                      <div className="flex items-center gap-3">
                        <File className="h-5 w-5 text-text-tertiary" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">{file.fileName}</p>
                          <p className="text-xs text-text-tertiary">{formatFileSize(file.fileSize)}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" icon={<Download className="h-4 w-4" />}>
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status Card */}
          <Card variant="outlined" padding="md">
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Type</span>
                <span className="font-medium text-text-primary">{submission.submissionType}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Status</span>
                <Badge variant={statusVariant[submission.status] || 'neutral'} size="sm">
                  {submission.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Created</span>
                <span className="text-text-primary">{new Date(submission.createdAt).toLocaleDateString()}</span>
              </div>
              {submission.submittedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Submitted</span>
                  <span className="text-text-primary">{new Date(submission.submittedAt).toLocaleDateString()}</span>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Scores Card */}
          <Card variant="outlined" padding="md">
            <CardHeader>
              <CardTitle>Scores</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">AI Score</span>
                <span className="font-semibold text-text-primary">
                  {submission.aiScore !== null ? `${submission.aiScore.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Final Score</span>
                <span className="font-semibold text-text-primary">
                  {submission.finalScore !== null ? `${submission.finalScore.toFixed(1)}%` : 'Pending'}
                </span>
              </div>

              {aiAssessment && (
                <>
                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
                      <BarChart3 className="h-4 w-4" />
                      AI Assessment
                    </div>
                    {aiAssessment.scores?.map((score) => (
                      <div key={score.criterionName} className="flex items-center justify-between text-xs py-1">
                        <span className="text-text-secondary truncate">{score.criterionName}</span>
                        <span className="font-medium text-text-primary">
                          {score.score.toFixed(1)}/{score.maxScore}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm border-t border-border pt-2 mt-2">
                      <span className="text-text-secondary">Overall</span>
                      <span className="font-bold text-primary-600">
                        {aiAssessment.overallScore?.toFixed(1) || '—'}%
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default SubmissionDetailPage;
