import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { candidateService, type AssessmentResult, type SubmittedDesign } from '@services/candidate-service';
import { DiagramWorkspace, type DiagramKind, type DiagramElement } from '@components/workspace/diagram-workspace';
import { formatDate } from '@utils/format';
import {
  BarChart3,
  FileCheck,
  Award,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  GraduationCap,
  Target,
  Eye,
} from 'lucide-react';

const PAGE_SIZE = 10;

export function CandidateResultsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState<AssessmentResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await candidateService.getResults({ page, limit: PAGE_SIZE });
      setResults(result.data);
      setTotalCount(result.meta.totalItems);
      setTotalPages(result.meta.totalPages);
    } catch (err: any) {
      setError('Failed to load results. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  // Open the detail view — the list payload only carries scores, so fetch the
  // full result (submitted designs + saved designs) for the selected exam.
  const openResult = useCallback(async (result: AssessmentResult) => {
    setSelectedResult(result); // render the shell from the list snapshot immediately
    setDetailLoading(true);
    try {
      const detail = await candidateService.getResultDetail(result.id);
      setSelectedResult(detail);
    } catch {
      // Keep the list snapshot — scores still render without the designs.
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const filteredResults = results.filter((r) =>
    !searchQuery ||
    r.examTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.tradeName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatusBadge = (passed: boolean | null) => {
    if (passed === null) return <Badge variant="neutral">Pending Review</Badge>;
    return passed
      ? <Badge variant="success" dot>Passed</Badge>
      : <Badge variant="error" dot>Failed</Badge>;
  };

  const passedCount = results.filter((r) => r.passed === true).length;
  const pendingCount = results.filter((r) => r.passed === null).length;
  const avgScore = results.filter((r) => r.finalScore !== null).reduce((acc, r) => acc + (r.finalScore || 0), 0);
  const avgCount = results.filter((r) => r.finalScore !== null).length;
  const averageScore = avgCount > 0 ? Math.round(avgScore / avgCount) : 0;

  if (selectedResult) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <Button variant="ghost" onClick={() => setSelectedResult(null)} icon={<ChevronLeft className="h-4 w-4" />}>
          Back to Results
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                selectedResult.passed ? 'bg-accent-50' : selectedResult.passed === null ? 'bg-warning-light' : 'bg-error-light'
              }`}>
                {selectedResult.passed ? (
                  <CheckCircle2 className="h-7 w-7 text-accent-600" />
                ) : selectedResult.passed === null ? (
                  <Clock className="h-7 w-7 text-warning" />
                ) : (
                  <XCircle className="h-7 w-7 text-error" />
                )}
              </div>
              <div>
                <CardTitle>{selectedResult.examTitle}</CardTitle>
                <div className="mt-1 flex items-center gap-3 text-sm text-text-secondary">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {selectedResult.tradeName}
                  </span>
                  {selectedResult.organizationName && (
                    <span>{selectedResult.organizationName}</span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface-secondary p-4 text-center">
                <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium">Final Score</p>
                <p className={`mt-1 text-3xl font-bold ${
                  selectedResult.passed ? 'text-accent-600' : selectedResult.passed === null ? 'text-warning' : 'text-error'
                }`}>
                  {selectedResult.finalScore != null ? `${Math.round(selectedResult.finalScore)}%` : '--'}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface-secondary p-4 text-center">
                <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium">AI Score</p>
                <p className="mt-1 text-3xl font-bold text-primary-600">
                  {selectedResult.aiScore != null ? `${Math.round(selectedResult.aiScore)}%` : '--'}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface-secondary p-4 text-center">
                <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium">Assessor Score</p>
                <p className="mt-1 text-3xl font-bold text-secondary-600">
                  {selectedResult.assessorScore != null ? `${Math.round(selectedResult.assessorScore)}%` : '--'}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface-secondary p-4 text-center">
                <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium">Oral Defense</p>
                <p className="mt-1 text-3xl font-bold text-accent-600">
                  {selectedResult.oralDefenseScore != null ? `${Math.round(selectedResult.oralDefenseScore)}%` : '--'}
                </p>
              </div>
            </div>

            {/* Per-section scores */}
            {selectedResult.sectionScores && selectedResult.sectionScores.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-text-primary">Section Breakdown</h3>
                  <span className="text-xs text-text-tertiary">
                    {selectedResult.sectionScores.reduce((sum, s) => sum + (s.weight || 0), 0)}% total weight
                  </span>
                </div>
                <div className="space-y-3">
                  {selectedResult.sectionScores.map((section) => {
                    const partScores = selectedResult.sectionPartScores?.find(
                      (sp) => sp.sectionId === section.sectionId,
                    )?.partScores;
                    return (
                      <div key={section.sectionId} className="rounded-xl border border-border bg-surface-secondary p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-primary">{section.sectionTitle}</p>
                            <p className="text-xs text-text-tertiary">Weight {section.weight}% · {section.maxScore} marks</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold text-primary-600">
                              {Math.round(section.score)}%
                            </p>
                            <p className="text-[11px] text-text-tertiary">
                              contributes {Math.round(section.weightedScore)}%
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
                          <div
                            className="h-full rounded-full bg-accent-500 transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, section.score))}%` }}
                          />
                        </div>
                        {partScores && partScores.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            {partScores.map((ps) => (
                              <span
                                key={ps.part}
                                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-2 py-1 text-[11px] text-text-secondary"
                                title={ps.feedback || `${ps.label || ps.part} part score`}
                              >
                                <span className="font-medium text-text-primary">{ps.label || ps.part}</span>
                                <span className={`font-bold ${ps.score >= 50 ? 'text-accent-600' : 'text-error'}`}>
                                  {Math.round(ps.score)}%
                                </span>
                                <span className="text-text-tertiary">· {ps.fileCount} file{ps.fileCount === 1 ? '' : 's'}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submitted design work — what the candidate actually drew */}
            {(selectedResult.sectionDesigns?.some((s) => s.designs.length > 0) ||
              (selectedResult.savedDesigns && selectedResult.savedDesigns.length > 0)) && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-text-primary">Design Work</h3>
                  {detailLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-text-tertiary" />}
                </div>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  The diagrams submitted with this assessment — shown exactly as the candidate drew them.
                </p>
                <div className="mt-3 space-y-3">
                  {selectedResult.sectionDesigns
                    ?.filter((s) => s.designs.length > 0)
                    .map((section) => (
                      <div key={section.sectionId} className="rounded-xl border border-border bg-surface-secondary p-3">
                        <p className="text-sm font-medium text-text-primary">{section.sectionTitle}</p>
                        <div className="mt-2 space-y-3">
                          {section.designs.map((design) => (
                            <DesignPreview key={design.id} design={design} />
                          ))}
                        </div>
                      </div>
                    ))}
                  {selectedResult.savedDesigns && selectedResult.savedDesigns.length > 0 && (
                    <div className="rounded-xl border border-dashed border-border bg-surface-secondary p-3">
                      <p className="text-sm font-medium text-text-primary">Saved Designs</p>
                      <p className="text-xs text-text-tertiary">Drafts the candidate saved for future use.</p>
                      <div className="mt-2 space-y-3">
                        {selectedResult.savedDesigns.map((design) => (
                          <DesignPreview key={design.id} design={design} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3 pt-6 border-t border-border">
              {selectedResult.certificateId && (
                <Button variant="primary" size="sm" icon={<Award className="h-4 w-4" />}>
                  View Certificate
                </Button>
              )}
              <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />}>
                Download Report
              </Button>
              <Button variant="secondary" size="sm" icon={<Eye className="h-4 w-4" />}>
                View Detailed Feedback
              </Button>
            </div>
          </CardBody>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ── Header ─────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">My Results</h1>
        <p className="mt-1 text-sm text-text-secondary">View your assessment scores and feedback</p>
      </div>

      {/* ── Stats Summary ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card padding="md">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50">
              <CheckCircle2 className="h-6 w-6 text-accent-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Passed</p>
              <p className="text-2xl font-bold text-text-primary">{passedCount}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-light">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Pending Review</p>
              <p className="text-2xl font-bold text-text-primary">{pendingCount}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
              <Target className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Average Score</p>
              <p className="text-2xl font-bold text-text-primary">{avgCount > 0 ? `${averageScore}%` : '--'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Search ──────────────────────────────────── */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search results..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      {/* ── Results List ───────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
          <p className="mt-4 text-sm text-text-secondary">Loading results...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24">
          <AlertCircle className="h-12 w-12 text-error" />
          <h3 className="mt-4 text-lg font-semibold text-text-primary">Error</h3>
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
          <Button variant="primary" className="mt-6" onClick={loadResults}>Try Again</Button>
        </div>
      ) : filteredResults.length === 0 ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center py-16 text-center">
              <BarChart3 className="h-12 w-12 text-text-tertiary" />
              <h3 className="mt-4 text-lg font-medium text-text-primary">
                {searchQuery ? 'No matching results' : 'No results yet'}
              </h3>
              <p className="mt-2 max-w-md text-sm text-text-secondary">
                {searchQuery
                  ? 'Try adjusting your search.'
                  : 'Complete an assessment to see your results here.'}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {filteredResults.map((result, index) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Card
                  padding="md"
                  className="group cursor-pointer transition-all duration-200 hover:shadow-elevation-medium hover:-translate-y-0.5"
                  onClick={() => openResult(result)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                      result.passed ? 'bg-accent-50' : result.passed === null ? 'bg-warning-light' : 'bg-error-light'
                    }`}>
                      {result.passed ? (
                        <CheckCircle2 className="h-6 w-6 text-accent-600" />
                      ) : result.passed === null ? (
                        <Clock className="h-6 w-6 text-warning" />
                      ) : (
                        <XCircle className="h-6 w-6 text-error" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-text-primary">{result.examTitle}</h3>
                        {getStatusBadge(result.passed)}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-tertiary">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          {result.tradeName}
                        </span>
                        {result.submittedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(result.submittedAt)}
                          </span>
                        )}
                        {result.organizationName && <span>{result.organizationName}</span>}
                      </div>
                      {result.sectionScores && result.sectionScores.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          {result.sectionScores.map((s) => (
                            <span
                              key={s.sectionId}
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-secondary px-1.5 py-0.5 text-[11px] text-text-secondary"
                              title={`${s.sectionTitle} — weight ${s.weight}%, ${s.maxScore} marks, contributes ${Math.round(s.weightedScore)}%`}
                            >
                              <span className="max-w-[140px] truncate font-medium text-text-primary">
                                {s.sectionTitle}
                              </span>
                              <span className={`font-bold ${s.score >= 50 ? 'text-accent-600' : 'text-error'}`}>
                                {Math.round(s.score)}%
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right ml-3">
                      {result.finalScore !== null ? (
                        <>
                          <p className={`text-xl font-bold ${
                            result.passed ? 'text-accent-600' : 'text-error'
                          }`}>
                            {Math.round(result.finalScore)}%
                          </p>
                          <p className="text-xs text-text-tertiary">Final Score</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-warning">Pending</p>
                          <p className="text-xs text-text-tertiary">Under review</p>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-text-tertiary">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  icon={<ChevronLeft className="h-4 w-4" />}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  icon={<ChevronRight className="h-4 w-4" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// ── Design preview (read-only review of a submitted diagram) ──

const DIAGRAM_LABELS: Partial<Record<DiagramKind, string>> = {
  ERD: 'ERD Diagram',
  DFD: 'Data Flow Diagram',
  FLOWCHART: 'Flowchart',
  UML: 'UML Diagram',
  TOPOLOGY: 'Network Topology',
  SUBNETTING: 'Subnetting Plan',
  STORYBOARD: 'Storyboard',
  UI_MOCKUP: 'UI Mockup',
};

function DesignPreview({ design }: { design: SubmittedDesign }) {
  const type = design.diagramType as DiagramKind;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-secondary/60 px-3 py-1.5">
        <p className="truncate text-[11px] font-medium text-text-primary">
          {DIAGRAM_LABELS[type] ?? design.diagramType}
          {design.name ? ` · ${design.name}` : ''}
        </p>
        <span className="shrink-0 text-[10px] text-text-tertiary">
          {design.elements.length} element{design.elements.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="h-[420px] overflow-auto">
        <DiagramWorkspace
          value={design.elements as DiagramElement[]}
          onChange={() => {}}
          readOnly
          diagramType={type}
        />
      </div>
    </div>
  );
}

export default CandidateResultsPage;
