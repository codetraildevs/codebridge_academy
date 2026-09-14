import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { assessmentBuilderApi, type Assessment } from '@services/assessment-builder-service';
import { RichTextRenderer } from '@components/assessment-builder/rich-text-renderer';
import { Plus, FileEdit, Trash2, Eye, Archive, Loader2 } from 'lucide-react';

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  IN_PROGRESS: 'info',
  COMPLETED: 'info',
  ARCHIVED: 'error',
};

const difficultyBadgeVariant: Record<string, 'info' | 'warning' | 'error' | 'success'> = {
  BEGINNER: 'success',
  INTERMEDIATE: 'info',
  ADVANCED: 'warning',
  EXPERT: 'error',
};

export function AssessmentBuilderPage() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchAssessments = useCallback(async (currentPage: number) => {
    setLoading(true);
    try {
      const result = await assessmentBuilderApi.list({
        page: currentPage,
        limit: 20,
      });
      setAssessments(result.data);
      setTotalPages(result.meta.totalPages);
    } catch (err) {
      console.error('Failed to fetch assessments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on page change
  useEffect(() => {
    fetchAssessments(page);
  }, [page, fetchAssessments]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) return;
    setDeleting(id);
    try {
      await assessmentBuilderApi.delete(id);
      setAssessments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(null);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await assessmentBuilderApi.archive(id);
      fetchAssessments(page);
    } catch (err) {
      console.error('Failed to archive:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Assessment Builder</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Create and manage configurable assessments with tasks, checklists, AI rules, and workspace modules
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      )}

      {/* Empty State */}
      {!loading && assessments.length === 0 && (
        <Card variant="outlined" padding="lg">
          <div className="flex flex-col items-center py-16 text-center">
            <FileEdit className="h-16 w-16 text-text-tertiary" />
            <h3 className="mt-4 text-lg font-medium text-text-primary">No assessments yet</h3>
            <p className="mt-2 max-w-md text-sm text-text-secondary">
              Create your first assessment to start building tasks, checklists, and AI evaluation rules.
            </p>
            <Button
              className="mt-6"
              onClick={() => navigate('/assessment-builder/new')}
              icon={<Plus className="h-4 w-4" />}
            >
              Create Assessment
            </Button>
          </div>
        </Card>
      )}

      {/* Assessment List */}
      {!loading && assessments.length > 0 && (
        <div className="grid gap-4">
          {assessments.map((assessment) => (
            <Card key={assessment.id} variant="outlined" padding="md" interactive>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3
                      className="text-base font-semibold text-text-primary truncate cursor-pointer hover:text-primary-600"
                      onClick={() => navigate(`/assessment-builder/${assessment.id}`)}
                    >
                      {assessment.title}
                    </h3>
                    <Badge variant={statusBadgeVariant[assessment.status] || 'neutral'} size="sm">
                      {assessment.status}
                    </Badge>
                    {assessment.difficulty && (
                      <Badge variant={difficultyBadgeVariant[assessment.difficulty] || 'info'} size="sm">
                        {assessment.difficulty}
                      </Badge>
                    )}
                  </div>
                  {assessment.description && (
                    <RichTextRenderer
                      html={assessment.description}
                      className="mt-1 line-clamp-2"
                    />
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-text-tertiary">
                    {assessment.field && (
                      <span>{assessment.field.name}</span>
                    )}
                    {assessment.organization && (
                      <span>{assessment.organization.name}</span>
                    )}
                    <span>{assessment.assessmentType}</span>
                    <span>{assessment.durationMinutes} min</span>
                    {assessment._count && (
                      <>
                        <span>{assessment._count.tasks} tasks</span>
                        <span>{assessment._count.checklistItems} checklist items</span>
                        <span>{assessment._count.aiRules} AI rules</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    onClick={() => navigate(`/assessment-builder/${assessment.id}`)}
                    aria-label="View assessment"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    onClick={() => navigate(`/assessment-builder/${assessment.id}/edit`)}
                    aria-label="Edit assessment"
                  >
                    <FileEdit className="h-4 w-4" />
                  </Button>
                  {assessment.status === 'PUBLISHED' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => handleArchive(assessment.id)}
                      aria-label="Archive"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                  {assessment.status === 'DRAFT' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => handleDelete(assessment.id)}
                      loading={deleting === assessment.id}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-error" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-text-secondary">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default AssessmentBuilderPage;
