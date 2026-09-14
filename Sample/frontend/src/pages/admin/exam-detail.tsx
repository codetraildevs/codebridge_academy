import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Input } from '@components/ui/input';
import { examService } from '@services/exam-service';
import { tradeService } from '@services/trade-service';
import type { Exam, Candidate, Trade } from '@app_types/index';
import { RichTextView } from '@components/editor/rich-text-view';
import { ExamContentEditor } from './components/exam-content-editor';
import {
  WorkspaceToolsEditor,
  effectiveWorkspaceTools,
  sanitizeWorkspaceTools,
  resolveTradeWorkspaceDefaults,
} from './components/workspace-tools-editor';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
  FileCheck,
  Clock,
  GraduationCap,
  X,
  Search,
  Loader2,
  BookOpen,
  PenLine,
  ListChecks,
  Code,
  FileText,
  MessageSquare,
  Layout,
  Database,
  Network,
  Settings2,
  UserPlus,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@utils/cn';

// ── Status color map ──────────────────────────────

const STATUS_COLORS: Record<string, 'success' | 'info' | 'warning' | 'neutral' | 'error'> = {
  PUBLISHED: 'success',
  DRAFT: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  ARCHIVED: 'neutral',
};

const REG_STATUS_COLORS: Record<string, 'success' | 'info' | 'warning' | 'neutral' | 'error'> = {
  REGISTERED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  ABSENT: 'error',
  WITHDRAWN: 'neutral',
};

// ── Section Type Icons ────────────────────────────

const SECTION_ICONS: Record<string, React.ElementType> = {
  ERD_DESIGN: Database,
  DFD_DESIGN: Network,
  FLOWCHART: Network,
  UML_DIAGRAM: Layout,
  CODE_WRITING: Code,
  DATABASE_DESIGN: Database,
  TOPOLOGY_BUILDER: Network,
  NETWORK_CONFIG: Settings2,
  SUBNETTING: Settings2,
  PRESENTATION: MessageSquare,
  PORTFOLIO: BookOpen,
  MULTIPLE_CHOICE: ListChecks,
  ESSAY: PenLine,
  FILE_UPLOAD: FileText,
  MIXED: Layout,
  ENVIRONMENT_SETUP: Settings2,
  PROJECT_CLEANUP: CheckCircle2,
};

// ── Main Component ────────────────────────────────

export function AdminExamDetailPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  // Exam state
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Registration state
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);

  // Publish state
  const [publishing, setPublishing] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Candidate assignment state
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [individualCandidates, setIndividualCandidates] = useState<Candidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState('');
  const [assignError, setAssignError] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // Workspace tools state (draft list + save feedback)
  const [toolsDraft, setToolsDraft] = useState<string[]>([]);
  // Tools locked by the platform owner — candidates cannot turn these off
  const [lockedToolsDraft, setLockedToolsDraft] = useState<string[]>([]);
  const [toolsSaving, setToolsSaving] = useState(false);
  const [toolsError, setToolsError] = useState('');
  const [toolsSuccess, setToolsSuccess] = useState('');

  // Trades loaded for the trade-default working environment chip
  const [trades, setTrades] = useState<Trade[]>([]);

  // ── Load exam (and trades, for the trade-default environment) ──
  const loadExam = useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    setError('');
    try {
      const [data, tradesData] = await Promise.all([
        examService.getById(examId),
        tradeService.listTrades(),
      ]);
      setExam(data);
      setTrades(tradesData);
      // Seed the workspace-tools draft from the exam (empty = all tools)
      setToolsDraft(effectiveWorkspaceTools(data.workspaceTools));
      // Seed the locked-tools draft (empty = none locked)
      setLockedToolsDraft(sanitizeWorkspaceTools(data.lockedWorkspaceTools));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load exam');
    } finally {
      setLoading(false);
    }
  }, [examId]);

  // ── Publish Exam ────────────────────────────────
  const handlePublish = async () => {
    if (!examId) return;
    setPublishing(true);
    setError('');
    try {
      const publishedExam = await examService.publish(examId);
      setExam(publishedExam);
      setAssignSuccess('Exam published successfully! Candidates can now be assigned.');
      setTimeout(() => setAssignSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to publish exam');
    } finally {
      setPublishing(false);
    }
  };

  // ── Archive Exam ────────────────────────────────
  const handleArchive = async () => {
    if (!examId) return;
    if (!window.confirm('Are you sure you want to archive this exam? This will hide it from candidates.')) return;
    setArchiving(true);
    setError('');
    try {
      const archivedExam = await examService.archive(examId);
      setExam(archivedExam);
      setAssignSuccess('Exam archived successfully.');
      setTimeout(() => setAssignSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to archive exam');
    } finally {
      setArchiving(false);
    }
  };

  // ── Load registrations for this exam ────────────
  const loadRegistrations = useCallback(async () => {
    if (!examId) return;
    setRegistrationsLoading(true);
    try {
      const result = await examService.getRegistrations(examId);
      setRegistrations(result.data);
    } catch {
      // silently fail
    } finally {
      setRegistrationsLoading(false);
    }
  }, [examId]);

  // ── Load individual candidates ──────────────────
  const loadIndividualCandidates = useCallback(async (search?: string) => {
    setCandidatesLoading(true);
    try {
      const data = await examService.getIndividualCandidates(search);
      setIndividualCandidates(data);
    } catch {
      // silently fail
    } finally {
      setCandidatesLoading(false);
    }
  }, []);

  // ── Initial loads ──────────────────────────────
  useEffect(() => {
    loadExam();
    loadRegistrations();
  }, [loadExam, loadRegistrations]);

  // ── Assign candidate to exam ────────────────────
  const handleAssignCandidate = async (candidateId: string) => {
    if (!examId) return;
    setAssigning(true);
    setAssignError('');
    setAssignSuccess('');
    try {
      await examService.registerCandidate(examId, candidateId);
      setAssignSuccess('Candidate assigned successfully!');
      // Reload registrations
      loadRegistrations();
      // Close panel after short delay
      setTimeout(() => {
        setShowAssignPanel(false);
        setAssignSuccess('');
      }, 2000);
    } catch (err: any) {
      setAssignError(err?.response?.data?.message || 'Failed to assign candidate');
    } finally {
      setAssigning(false);
    }
  };

  // ── Save workspace tools ───────────────────────
  // An empty selection is valid and means "all tools" (legacy behavior).
  const handleSaveTools = async () => {
    if (!examId) return;
    setToolsSaving(true);
    setToolsError('');
    setToolsSuccess('');
    try {
      const updated = await examService.update(examId, {
        workspaceTools: toolsDraft,
        lockedWorkspaceTools: lockedToolsDraft,
      });
      setExam(updated);
      setToolsSuccess(
        toolsDraft.length === 0
          ? 'Workspace tools saved — all tools are available (empty selection).'
          : 'Workspace tools saved — candidates will get these tools in their workspace.',
      );
      setTimeout(() => setToolsSuccess(''), 4000);
    } catch (err: any) {
      setToolsError(err?.response?.data?.message || 'Failed to save workspace tools');
    } finally {
      setToolsSaving(false);
    }
  };

  // ── Open assign panel ──────────────────────────
  const openAssignPanel = () => {
    setShowAssignPanel(true);
    setCandidateSearch('');
    setIndividualCandidates([]);
    loadIndividualCandidates();
  };

  // ── Loading state ──────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-500" />
          <p className="mt-3 text-sm text-text-secondary">Loading exam...</p>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────
  if (error && !exam) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-error" />
        <h3 className="mt-4 text-lg font-semibold text-text-primary">Something went wrong</h3>
        <p className="mt-2 text-sm text-text-secondary">{error}</p>
        <div className="mt-6 flex gap-3">
          <Button variant="ghost" onClick={() => navigate('/admin/exams')}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Exams
          </Button>
          <Button variant="primary" onClick={loadExam}>
            <RefreshCw className="mr-1 h-4 w-4" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  const totalWeight = exam.sections?.reduce((sum, s) => sum + s.weight, 0) ?? 0;
  const totalQuestions = exam.sections?.reduce((sum, s) => sum + (s.questions?.length || 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/exams')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{exam.title}</h1>
            <p className="mt-1 text-sm text-text-tertiary flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5" />
              {exam.tradeName}
              <span className="text-border">|</span>
              <span>{exam.examType}</span>
              <Badge variant={STATUS_COLORS[exam.status] || 'neutral'} size="sm">
                {exam.status}
              </Badge>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {exam.status === 'DRAFT' && (
            <>
              <Button
                variant="success"
                size="sm"
                onClick={handlePublish}
                loading={publishing}
              >
                {publishing ? (
                  <><RefreshCw className="mr-1 h-3 w-3 animate-spin" /> Publishing...</>
                ) : (
                  <><CheckCircle2 className="mr-1 h-3 w-3" /> Publish Exam</>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleArchive}
                loading={archiving}
              >
                Archive
              </Button>
            </>
          )}
          {exam.status === 'PUBLISHED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleArchive}
              loading={archiving}
              className="text-error hover:bg-error-light/10"
            >
              Archive
            </Button>
          )}
          {exam.status === 'DRAFT' && !editing && (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <PenLine className="mr-1 h-3 w-3" /> Edit Content
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => { loadExam(); loadRegistrations(); }}>
            <RefreshCw className="mr-1 h-3 w-3" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Error / Success Messages ───────────────── */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-4 text-sm text-red-800 shadow-sm" role="alert">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="font-semibold">Failed to publish exam</p>
            <p className="mt-0.5 text-red-700">{error}</p>
          </div>
          <button onClick={() => setError('')} className="rounded-lg p-1 hover:bg-red-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {assignSuccess && !showAssignPanel && (
        <div className="flex items-start gap-3 rounded-xl border-2 border-green-300 bg-green-50 p-4 text-sm text-green-800 shadow-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
          <div className="flex-1">
            <p className="font-semibold">Success</p>
            <p className="mt-0.5 text-green-700">{assignSuccess}</p>
          </div>
        </div>
      )}

      {/* ── Stats Grid ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary-500" />
            <div>
              <p className="text-xs text-text-tertiary">Duration</p>
              <p className="text-lg font-bold">{exam.duration} min</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <Layout className="h-5 w-5 text-secondary-500" />
            <div>
              <p className="text-xs text-text-tertiary">Sections</p>
              <p className="text-lg font-bold">{exam.sections?.length ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <ListChecks className="h-5 w-5 text-accent-500" />
            <div>
              <p className="text-xs text-text-tertiary">Questions</p>
              <p className="text-lg font-bold">{totalQuestions}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-warning" />
            <div>
              <p className="text-xs text-text-tertiary">Candidates</p>
              <p className="text-lg font-bold">{registrations.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Exam Details ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Exam Info */}
        <div className="space-y-6 lg:col-span-2">
          {editing ? (
            <ExamContentEditor
              exam={exam}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                loadExam();
              }}
            />
          ) : (
          <>
          {/* Exam Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary-500" />
                Exam Information
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {exam.description && (
                <div>
                  <p className="text-xs font-medium text-text-tertiary uppercase">Scenario</p>
                  <RichTextView html={exam.description} className="mt-1" />
                </div>
              )}
              {exam.instructions && (
                <div>
                  <p className="text-xs font-medium text-text-tertiary uppercase">Instructions</p>
                  <p className="mt-1 text-sm text-text-primary whitespace-pre-wrap">{exam.instructions}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-surface-secondary p-3">
                  <p className="text-xs text-text-tertiary">Passing Score</p>
                  <p className="mt-1 text-lg font-bold text-accent-600">{exam.passingScore}%</p>
                </div>
                <div className="rounded-lg bg-surface-secondary p-3">
                  <p className="text-xs text-text-tertiary">Max Attempts</p>
                  <p className="mt-1 text-lg font-bold">{exam.maxAttempts}</p>
                </div>
                <div className="rounded-lg bg-surface-secondary p-3">
                  <p className="text-xs text-text-tertiary">Trade</p>
                  <p className="mt-1 text-lg font-bold">{exam.tradeName}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Workspace Tools — configure the candidate workspace tools */}
          <WorkspaceToolsEditor
            tools={toolsDraft}
            onChange={setToolsDraft}
            lockedTools={lockedToolsDraft}
            onChangeLocked={setLockedToolsDraft}
            onSave={handleSaveTools}
            saving={toolsSaving}
            error={toolsError}
            success={toolsSuccess}
            tradeDefaultTools={
              (() => {
                const trade = trades.find((t) => t.code === exam.tradeCode);
                return trade ? resolveTradeWorkspaceDefaults(trade) : undefined;
              })()
            }
            tradeDefaultLabel={exam.tradeCode ? `${exam.tradeName} default` : undefined}
          />

          {/* Sections & Questions */}
          {exam.sections && exam.sections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5 text-primary-500" />
                  Sections & Questions
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                {exam.sections.map((section) => {
                  const SectionIcon = SECTION_ICONS[section.sectionType] || Layout;
                  const isExpanded = expandedSection === section.id;
                  return (
                    <Card key={section.id} variant="outlined" padding="sm">
                      <div className="space-y-3">
                        {/* Section Header */}
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                              <SectionIcon className="h-4 w-4 text-primary-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-text-primary">
                                {section.title}
                              </p>
                              <p className="text-xs text-text-tertiary">
                                {section.sectionType} &middot; {section.weight}% weight &middot;{' '}
                                {section.duration ? `${section.duration} min` : 'No time limit'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-text-tertiary">
                              {section.questions?.length || 0} questions
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-text-tertiary" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-text-tertiary" />
                            )}
                          </div>
                        </div>

                        {/* Questions */}
                        {isExpanded && section.questions && section.questions.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-border">
                            {section.questions.map((question, idx) => (
                              <div
                                key={question.id}
                                className="flex items-start gap-3 rounded-lg bg-surface-secondary p-3"
                              >
                                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <RichTextView html={question.questionText} className="text-sm" />
                                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-tertiary">
                                    <span>{question.questionType}</span>
                                    <span>{question.points} pts</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {isExpanded && (!section.questions || section.questions.length === 0) && (
                          <p className="py-2 text-sm text-text-tertiary text-center">
                            No questions in this section
                          </p>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </CardBody>
            </Card>
          )}
          </>
          )}
        </div>

        {/* Right Column: Candidate Management */}
        <div className="space-y-6">
          {/* Assign Candidate Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary-500" />
                Assign to Candidate
              </CardTitle>
            </CardHeader>
            <CardBody>
              {!showAssignPanel ? (
                <div>
                  <p className="text-sm text-text-secondary mb-4">
                    Assign this exam to individual candidates. They will see it on their dashboard.
                  </p>
                  <Button
                    className="w-full"
                    onClick={openAssignPanel}
                    disabled={exam.status !== 'PUBLISHED'}
                  >
                    <UserPlus className="mr-1 h-4 w-4" /> Assign Candidate
                  </Button>
                  {exam.status !== 'PUBLISHED' && (
                    <p className="mt-2 text-xs text-warning flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Exam must be published before assigning candidates
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                    <input
                      type="text"
                      placeholder="Search candidates..."
                      value={candidateSearch}
                      onChange={(e) => {
                        setCandidateSearch(e.target.value);
                        loadIndividualCandidates(e.target.value || undefined);
                      }}
                      className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                    />
                  </div>

                  {/* Assign Error / Success */}
                  {assignError && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-800">
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>{assignError}</span>
                    </div>
                  )}
                  {assignSuccess && (
                    <div className="flex items-center gap-2 rounded-lg bg-green-50 p-2 text-xs text-green-800">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      <span>{assignSuccess}</span>
                    </div>
                  )}

                  {/* Candidate List */}
                  {candidatesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
                    </div>
                  ) : individualCandidates.length === 0 ? (
                    <div className="py-6 text-center">
                      <Users className="mx-auto h-8 w-8 text-text-tertiary" />
                      <p className="mt-2 text-sm text-text-tertiary">
                        {candidateSearch
                          ? 'No candidates found'
                          : 'No individual candidates available'}
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-60 space-y-1 overflow-y-auto">
                      {individualCandidates
                        .filter(
                          (c) =>
                            !candidateSearch ||
                            c.firstName.toLowerCase().includes(candidateSearch.toLowerCase()) ||
                            c.lastName.toLowerCase().includes(candidateSearch.toLowerCase()) ||
                            c.email.toLowerCase().includes(candidateSearch.toLowerCase()) ||
                            c.registrationNumber.toLowerCase().includes(candidateSearch.toLowerCase()),
                        )
                        .map((candidate) => {
                          const alreadyAssigned = registrations.some(
                            (r) => r.candidate?.id === candidate.id || r.candidateId === candidate.id,
                          );
                          return (
                            <div
                              key={candidate.id}
                              className="flex items-center justify-between rounded-lg border border-border p-2.5 transition-all hover:bg-surface-secondary"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-text-primary truncate">
                                  {candidate.firstName} {candidate.lastName}
                                </p>
                                <p className="text-xs text-text-tertiary truncate">
                                  {candidate.email} &middot; {candidate.registrationNumber}
                                </p>
                              </div>
                              <Button
                                size="xs"
                                variant={alreadyAssigned ? 'success' : 'primary'}
                                disabled={alreadyAssigned || assigning}
                                onClick={() => handleAssignCandidate(candidate.id)}
                                loading={assigning}
                                className="ml-2 shrink-0"
                              >
                                {alreadyAssigned ? (
                                  <><UserCheck className="mr-1 h-3 w-3" /> Assigned</>
                                ) : (
                                  <><UserPlus className="mr-1 h-3 w-3" /> Assign</>
                                )}
                              </Button>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setShowAssignPanel(false)}>
                      <X className="mr-1 h-3 w-3" /> Close
                    </Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Registered Candidates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary-500" />
                Registered Candidates
                <span className="ml-1 text-sm font-normal text-text-tertiary">
                  ({registrations.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardBody>
              {registrationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
                </div>
              ) : registrations.length === 0 ? (
                <div className="py-6 text-center">
                  <Users className="mx-auto h-8 w-8 text-text-tertiary" />
                  <p className="mt-2 text-sm text-text-tertiary">
                    No candidates assigned yet
                  </p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Assign candidates using the panel above
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {registrations.map((reg: any) => {
                    const candidate = reg.candidate || reg;
                    const name = candidate.firstName
                      ? `${candidate.firstName} ${candidate.lastName}`
                      : candidate.email || 'Unknown';
                    return (
                      <div
                        key={reg.id}
                        className="flex items-center justify-between rounded-lg border border-border p-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {name}
                          </p>
                          <p className="text-xs text-text-tertiary">
                            {candidate.email} &middot; {candidate.registrationNumber || ''}
                          </p>
                        </div>
                        <Badge
                          variant={REG_STATUS_COLORS[reg.status] || 'neutral'}
                          size="sm"
                          className="ml-2 shrink-0"
                        >
                          {reg.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdminExamDetailPage;
