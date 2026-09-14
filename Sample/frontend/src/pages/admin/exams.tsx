import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { examService } from '@services/exam-service';
import type { Exam } from '@app_types/index';
import {
  FileCheck,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Eye,
  Clock,
  Users,
} from 'lucide-react';

const STATUS_COLORS: Record<string, 'success' | 'info' | 'warning' | 'neutral' | 'error'> = {
  PUBLISHED: 'success',
  DRAFT: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  ARCHIVED: 'neutral',
};

export function AdminExamsListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || '';

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadExams = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await examService.list({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setExams(result.data);
      setTotalPages(result.meta.totalPages);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, [page, statusFilter]);

  const handleSearch = () => {
    setPage(1);
    loadExams();
  };

  const totalQuestions = (exam: Exam) => {
    if (!exam.sections) return '—';
    return exam.sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Exam Management</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Create and manage platform-wide competency assessments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadExams}>
            <RefreshCw className="mr-1 h-3 w-3" /> Refresh
          </Button>
          <Button onClick={() => navigate('/admin/exams/create')}>
            <Plus className="mr-1 h-4 w-4" /> Create Exam
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search exams..."
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <div className="flex gap-1">
          {['', 'DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'ARCHIVED'].map((status) => (
            <button
              key={status}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                if (status) params.set('status', status);
                else params.delete('status');
                navigate(`/admin/exams?${params.toString()}`);
              }}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                statusFilter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary'
              }`}
            >
              {status || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : exams.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
              <FileCheck className="h-8 w-8 text-primary-500" />
            </div>
            <div>
              <p className="text-lg font-medium text-text-primary">No exams yet</p>
              <p className="mt-1 text-sm text-text-secondary">
                Create your first competency assessment to get started
              </p>
            </div>
            <Button onClick={() => navigate('/admin/exams/create')}>
              <Plus className="mr-1 h-4 w-4" /> Create Exam
            </Button>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase text-text-tertiary">Title</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase text-text-tertiary">Type</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase text-text-tertiary">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase text-text-tertiary">Sections</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase text-text-tertiary">Questions</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase text-text-tertiary">Duration</th>
                  <th className="px-5 py-3.5 text-right text-xs font-medium uppercase text-text-tertiary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr
                    key={exam.id}
                    className="border-b border-border last:border-0 hover:bg-surface-secondary transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/exams/${exam.id}`)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
                          <FileCheck className="h-4 w-4 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{exam.title}</p>
                          <p className="text-xs text-text-tertiary">{exam.tradeName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-text-secondary">{exam.examType}</td>
                    <td className="px-5 py-4">
                      <Badge variant={STATUS_COLORS[exam.status] || 'neutral'} size="sm">
                        {exam.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-text-secondary">
                      {exam.sections?.length || '—'}
                    </td>
                    <td className="px-5 py-4 text-sm text-text-secondary">
                      {totalQuestions(exam)}
                    </td>
                    <td className="px-5 py-4 text-sm text-text-secondary">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {exam.duration} min
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/exams/${exam.id}`);
                        }}
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-text-tertiary">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default AdminExamsListPage;
