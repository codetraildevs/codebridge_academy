import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { adminService, type AssessmentReport, type CandidateReport } from '@services/admin-service';
import { formatDate } from '@utils/format';
import {
  BarChart3,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  Users,
  FileCheck,
  Award,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Activity,
} from 'lucide-react';

const PAGE_SIZE = 10;

type ReportTab = 'assessments' | 'candidates';

export function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('assessments');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assessmentReports, setAssessmentReports] = useState<AssessmentReport[]>([]);
  const [candidateReports, setCandidateReports] = useState<CandidateReport[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'assessments') {
        const result = await adminService.getAssessmentReports({ page, limit: PAGE_SIZE });
        setAssessmentReports(result.data);
        setTotalCount(result.meta.totalItems);
        setTotalPages(result.meta.totalPages);
      } else {
        const result = await adminService.getCandidateReports({ page, limit: PAGE_SIZE });
        setCandidateReports(result.data);
        setTotalCount(result.meta.totalItems);
        setTotalPages(result.meta.totalPages);
      }
    } catch (err: any) {
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setPage(1); }, [activeTab]);

  const tabs = [
    { id: 'assessments' as ReportTab, label: 'Assessment Reports', icon: FileCheck },
    { id: 'candidates' as ReportTab, label: 'Candidate Reports', icon: Users },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-text-secondary">
            View performance reports and candidate analytics
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={loadData}>
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-surface-tertiary p-1 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
          <p className="mt-4 text-sm text-text-secondary">Loading reports...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24">
          <AlertCircle className="h-12 w-12 text-error" />
          <h3 className="mt-4 text-lg font-semibold text-text-primary">Error</h3>
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
          <Button variant="primary" className="mt-6" onClick={loadData}>Try Again</Button>
        </div>
      ) : activeTab === 'assessments' ? (
        assessmentReports.length === 0 ? (
          <Card>
            <CardBody>
              <div className="flex flex-col items-center py-16 text-center">
                <BarChart3 className="h-12 w-12 text-text-tertiary" />
                <h3 className="mt-4 text-lg font-medium text-text-primary">No assessment reports</h3>
                <p className="mt-2 text-sm text-text-secondary">Complete some assessments to see reports here.</p>
              </div>
            </CardBody>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {assessmentReports.map((report) => {
                const passRateColor = report.passRate >= 70 ? 'text-success' : report.passRate >= 50 ? 'text-warning' : 'text-error';
                const avgColor = report.averageScore >= 70 ? 'text-success' : report.averageScore >= 50 ? 'text-warning' : 'text-error';

                return (
                  <Card key={report.id} padding="md" className="transition-all hover:shadow-elevation-medium">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-text-primary">{report.title}</h3>
                        <div className="mt-1 flex items-center gap-3 text-xs text-text-tertiary">
                          <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{report.tradeName}</span>
                          <span>{report.examType}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className={`text-lg font-bold ${passRateColor}`}>{report.passRate}%</p>
                          <p className="text-xs text-text-tertiary">Pass Rate</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-lg font-bold ${avgColor}`}>{report.averageScore}%</p>
                          <p className="text-xs text-text-tertiary">Avg Score</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-text-tertiary">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{report.totalRegistered} registered</span>
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-success" />{report.totalCompleted} completed</span>
                      <span className="flex items-center gap-1"><Award className="h-3.5 w-3.5 text-warning" />{report.totalPassed} passed</span>
                    </div>
                  </Card>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-text-tertiary">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    icon={<ChevronLeft className="h-4 w-4" />}>Previous</Button>
                  <Button variant="ghost" size="sm" disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    icon={<ChevronRight className="h-4 w-4" />}>Next</Button>
                </div>
              </div>
            )}
          </>
        )
      ) : (
        candidateReports.length === 0 ? (
          <Card>
            <CardBody>
              <div className="flex flex-col items-center py-16 text-center">
                <Users className="h-12 w-12 text-text-tertiary" />
                <h3 className="mt-4 text-lg font-medium text-text-primary">No candidate reports</h3>
                <p className="mt-2 text-sm text-text-secondary">Candidates need to complete assessments to see reports.</p>
              </div>
            </CardBody>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {candidateReports.map((report) => {
                const scoreColor = report.averageScore !== null
                  ? (report.averageScore >= 70 ? 'text-success' : report.averageScore >= 50 ? 'text-warning' : 'text-error')
                  : 'text-text-tertiary';

                return (
                  <Card key={report.id} padding="md" className="transition-all hover:shadow-elevation-medium">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700">
                        {report.firstName[0]}{report.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-text-primary">{report.firstName} {report.lastName}</h3>
                          {report.trade && <span className="text-xs text-text-tertiary">{report.trade}</span>}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-text-tertiary">
                          <span className="flex items-center gap-1"><FileCheck className="h-3 w-3" />{report.completedAssessments} completed</span>
                          {report.averageScore !== null && (
                            <span className="flex items-center gap-1"><TrendingUp className={`h-3 w-3 ${scoreColor}`} />Avg: <strong className={scoreColor}>{report.averageScore}%</strong></span>
                          )}
                          {report.competencyScore !== null && (
                            <span className="flex items-center gap-1"><Activity className="h-3 w-3" />Competency: {report.competencyScore}%</span>
                          )}
                          <span className="flex items-center gap-1"><Award className="h-3 w-3" />{report.certificatesCount} cert(s)</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-text-tertiary">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    icon={<ChevronLeft className="h-4 w-4" />}>Previous</Button>
                  <Button variant="ghost" size="sm" disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    icon={<ChevronRight className="h-4 w-4" />}>Next</Button>
                </div>
              </div>
            )}
          </>
        )
      )}
    </motion.div>
  );
}

export default AdminReportsPage;
