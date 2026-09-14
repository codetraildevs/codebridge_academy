import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { candidatePortalApi, type CandidateSubmission } from '@services/candidate-portal-service';
import {
  FileText,
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  ChevronRight,
  File,
  ExternalLink,
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

export function SubmissionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Sidebar "My Results" deep-links to ?status=completed to surface final scores.
  const resultsOnly = searchParams.get('status') === 'completed';
  const [submissions, setSubmissions] = useState<CandidateSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    candidatePortalApi.listSubmissions()
      .then(setSubmissions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = (search
    ? submissions.filter((s) =>
        s.exam?.title?.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase()),
      )
    : submissions
  ).filter((s) => !resultsOnly || s.status === 'COMPLETED');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{resultsOnly ? 'My Results' : 'My Submissions'}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {resultsOnly ? 'Completed assessments with final scores' : 'View all your submissions across assessments'}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => navigate('/candidate-portal')}
          icon={<ExternalLink className="h-4 w-4" />}
        >
          Assessment Dashboard
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search submissions by exam title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-white py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      {/* Submissions List */}
      {filtered.length === 0 ? (
        <Card variant="outlined" padding="lg">
          <div className="flex flex-col items-center py-12 text-center">
            <FileText className="h-16 w-16 text-text-tertiary" />
            <h3 className="mt-4 text-lg font-medium text-text-primary">No {resultsOnly ? 'completed results' : 'submissions found'}</h3>
            <p className="mt-2 max-w-md text-sm text-text-secondary">
              {search
                ? 'No submissions match your search. Try a different term.'
                : resultsOnly
                  ? 'Completed assessments with final scores will appear here.'
                  : 'You haven\'t made any submissions yet. Register for an assessment to get started.'}
            </p>
            {!search && (
              <Button className="mt-6" onClick={() => navigate('/candidate-portal')}>
                Browse Assessments
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((submission) => (
            <Card key={submission.id} variant="outlined" padding="md" interactive>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      submission.status === 'DRAFT' ? 'bg-neutral-50 text-text-tertiary' :
                      submission.status === 'COMPLETED' ? 'bg-green-50 text-success' :
                      'bg-blue-50 text-primary-600'
                    }`}>
                      <File className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">
                        {submission.exam?.title || 'Assessment Submission'}
                      </h3>
                      <p className="text-xs text-text-tertiary">
                        Submitted {submission.submittedAt
                          ? new Date(submission.submittedAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                            })
                          : new Date(submission.createdAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-tertiary">
                    <Badge variant={statusVariant[submission.status] || 'neutral'} size="sm">
                      {submission.status === 'DRAFT' ? (
                        <Clock className="h-3 w-3 mr-1 inline" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                      )}
                      {submission.status.replace(/_/g, ' ')}
                    </Badge>
                    <span>{submission.submissionType}</span>
                    {submission.aiScore !== null && (
                      <span>AI Score: {submission.aiScore.toFixed(1)}%</span>
                    )}
                    {submission.finalScore !== null && (
                      <span>Final Score: {submission.finalScore.toFixed(1)}%</span>
                    )}
                    {submission.files?.length > 0 && (
                      <span>{submission.files.length} file(s)</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/candidate-portal/submissions/${submission.id}`)}
                  aria-label="View submission"
                  iconOnly
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default SubmissionsPage;
