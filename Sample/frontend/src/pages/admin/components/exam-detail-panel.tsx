import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '@components/ui/modal';
import { RichTextView } from '@components/editor/rich-text-view';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import {
  Clock,
  GraduationCap,
  BookOpen,
  Layout,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Send,
  Edit3,
  Trash2,
  FileText,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Users,
  Copy,
} from 'lucide-react';
import { adminService } from '@services/admin-service';
import { formatDate } from '@utils/format';

interface Section {
  id: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  sectionType: string;
  weight: number;
  duration?: number | null;
  questions: Question[];
  rubricCriteria: RubricCriterion[];
}

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  points: number;
  orderIndex: number;
  options: any;
  correctAnswer: string | null;
  expectedOutput: string | null;
  rubricCriteria: RubricCriterion[];
}

interface RubricCriterion {
  id: string;
  criterionName: string;
  description: string | null | undefined;
  maxScore: number;
  weight: number;
  levels: any;
}

interface ExamDetail {
  id: string;
  title: string;
  description?: string | null;
  examType: string;
  status: string;
  tradeId: string;
  tradeName?: string;
  duration: number;
  passingScore: number;
  maxAttempts: number;
  instructions?: string | null;
  allowOralDefense: boolean;
  requireFullScreen: boolean;
  requireWebcam: boolean;
  startAt?: string | null;
  endAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sections: Section[];
}

interface ExamDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string | null;
  onRefresh: () => void;
  onAction: (message: string) => void;
}

const SECTION_TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  ESSAY: 'Essay',
  CODE_WRITING: 'Code Writing',
  SHORT_ANSWER: 'Short Answer',
  FILE_UPLOAD: 'File Upload',
  DATABASE_DESIGN: 'Database Design',
  PRESENTATION: 'Presentation',
  MIXED: 'Mixed',
  ERD_DESIGN: 'ERD Design',
  DFD_DESIGN: 'DFD Design',
  FLOWCHART: 'Flowchart',
  UML_DIAGRAM: 'UML Diagram',
  TOPOLOGY_BUILDER: 'Topology Builder',
  NETWORK_CONFIG: 'Network Config',
  SUBNETTING: 'Subnetting',
  ENVIRONMENT_SETUP: 'Environment Setup',
  PROJECT_CLEANUP: 'Project Cleanup',
  PORTFOLIO: 'Portfolio',
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  ESSAY: 'Essay',
  CODE: 'Code',
  SHORT_ANSWER: 'Short Answer',
  FILE_UPLOAD: 'File Upload',
  DIAGRAM: 'Diagram',
};

export function ExamDetailPanel({ isOpen, onClose, examId, onRefresh, onAction }: ExamDetailPanelProps) {
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && examId) {
      loadExam();
    } else {
      setExam(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, examId]);

  const loadExam = async () => {
    if (!examId) return;
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getExamDetail(examId);
      setExam(data as unknown as ExamDetail);
    } catch (err: any) {
      setError('Failed to load exam details');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const handlePublish = async () => {
    if (!examId) return;
    setActionLoading('publish');
    try {
      await adminService.publishExam(examId);
      onAction('Exam published successfully!');
      onRefresh();
      loadExam();
    } catch (err: any) {
      onAction(err?.response?.data?.message || 'Failed to publish exam');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!examId || !window.confirm('Are you sure you want to archive this exam?')) return;
    setActionLoading('delete');
    try {
      await adminService.deleteExam(examId);
      onAction('Exam archived successfully!');
      onRefresh();
      onClose();
    } catch (err: any) {
      onAction(err?.response?.data?.message || 'Failed to archive exam');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPoints = exam?.sections?.reduce(
    (sum, s) => sum + s.questions.reduce((qs, q) => qs + q.points, 0),
    0,
  ) ?? 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="neutral">Draft</Badge>;
      case 'PUBLISHED': return <Badge variant="success">Published</Badge>;
      case 'IN_PROGRESS': return <Badge variant="warning">In Progress</Badge>;
      case 'COMPLETED': return <Badge variant="info">Completed</Badge>;
      case 'ARCHIVED': return <Badge variant="error">Archived</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={exam?.title || 'Exam Details'}
      description={exam ? `Created ${formatDate(exam.createdAt)}` : 'Loading...'}
      size="xl"
      showCloseButton={!loading}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <p className="mt-3 text-sm text-text-tertiary">Loading exam details...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="h-10 w-10 text-error" />
          <p className="mt-3 text-sm text-text-secondary">{error}</p>
          <Button variant="ghost" size="sm" className="mt-4" onClick={loadExam}>
            Retry
          </Button>
        </div>
      ) : exam ? (
        <div className="space-y-6">
          {/* Status Bar + Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusBadge(exam.status)}
              {exam.status === 'DRAFT' && (
                <Button
                  size="xs"
                  variant="primary"
                  loading={actionLoading === 'publish'}
                  onClick={handlePublish}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Publish
                </Button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="xs"
                variant="ghost"
                disabled={actionLoading === 'delete'}
                onClick={handleDelete}
                className="text-error hover:text-error"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Archive
              </Button>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-surface-secondary p-3">
              <div className="flex items-center gap-2 text-xs text-text-tertiary mb-1">
                <Clock className="h-3.5 w-3.5" />
                Duration
              </div>
              <p className="text-sm font-semibold text-text-primary">{exam.duration} min</p>
            </div>
            <div className="rounded-xl bg-surface-secondary p-3">
              <div className="flex items-center gap-2 text-xs text-text-tertiary mb-1">
                <GraduationCap className="h-3.5 w-3.5" />
                Passing Score
              </div>
              <p className="text-sm font-semibold text-text-primary">{exam.passingScore}%</p>
            </div>
            <div className="rounded-xl bg-surface-secondary p-3">
              <div className="flex items-center gap-2 text-xs text-text-tertiary mb-1">
                <Layout className="h-3.5 w-3.5" />
                Sections
              </div>
              <p className="text-sm font-semibold text-text-primary">{exam.sections?.length ?? 0}</p>
            </div>
            <div className="rounded-xl bg-surface-secondary p-3">
              <div className="flex items-center gap-2 text-xs text-text-tertiary mb-1">
                <FileText className="h-3.5 w-3.5" />
                Total Points
              </div>
              <p className="text-sm font-semibold text-text-primary">{totalPoints}</p>
            </div>
          </div>

          {/* Scenario & Instructions */}
          {exam.description && (
            <div>
              <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">
                Scenario
              </h4>
              <RichTextView html={exam.description} className="text-sm text-text-secondary" />
            </div>
          )}
          {exam.instructions && (
            <div>
              <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">
                Instructions
              </h4>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{exam.instructions}</p>
            </div>
          )}

          {/* Settings flags */}
          <div className="flex flex-wrap gap-4">
            {exam.allowOralDefense && (
              <span className="flex items-center gap-1 text-xs text-text-tertiary">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Oral Defense
              </span>
            )}
            {exam.requireFullScreen && (
              <span className="flex items-center gap-1 text-xs text-text-tertiary">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Full Screen
              </span>
            )}
            {exam.requireWebcam && (
              <span className="flex items-center gap-1 text-xs text-text-tertiary">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Webcam Required
              </span>
            )}
            {exam.maxAttempts > 1 && (
              <span className="flex items-center gap-1 text-xs text-text-tertiary">
                <Copy className="h-3.5 w-3.5" /> Max {exam.maxAttempts} attempts
              </span>
            )}
          </div>

          {/* Sections */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3">
              Sections & Questions
            </h4>
            {exam.sections && exam.sections.length > 0 ? (
              <div className="space-y-3">
                {exam.sections
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((section) => {
                    const isExpanded = expandedSections.has(section.id);
                    return (
                      <div
                        key={section.id}
                        className="rounded-xl border border-border overflow-hidden"
                      >
                        {/* Section Header */}
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="flex w-full items-center justify-between bg-surface-secondary px-4 py-3 text-left transition-colors hover:bg-surface-tertiary"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Layout className="h-4 w-4 text-primary-600 shrink-0" />
                            <span className="text-sm font-medium text-text-primary truncate">
                              {section.title}
                            </span>
                            <span className="text-xs text-text-tertiary bg-white px-1.5 py-0.5 rounded shrink-0">
                              {SECTION_TYPE_LABELS[section.sectionType] || section.sectionType}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs text-text-tertiary">
                              {section.questions.length} Q · W:{section.weight} · {section.duration || '-'}min
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-text-tertiary" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-text-tertiary" />
                            )}
                          </div>
                        </button>

                        {/* Section Content */}
                        {isExpanded && (
                          <div className="divide-y divide-border">
                            {section.description && (
                              <div className="px-4 py-2 bg-white">
                                <p className="text-xs text-text-tertiary">{section.description}</p>
                              </div>
                            )}

                            {section.questions.length === 0 ? (
                              <div className="px-4 py-4 text-center">
                                <p className="text-xs text-text-tertiary">No questions in this section</p>
                              </div>
                            ) : (
                              section.questions
                                .sort((a, b) => a.orderIndex - b.orderIndex)
                                .map((question, qi) => (
                                  <div key={question.id} className="bg-white px-4 py-3">
                                    <div className="flex items-start gap-2">
                                      <HelpCircle className="h-4 w-4 text-text-tertiary shrink-0 mt-0.5" />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-start gap-1 text-sm text-text-primary">
                                          <span className="font-medium shrink-0">Q{qi + 1}.</span>
                                          <RichTextView html={question.questionText} className="min-w-0 flex-1" />
                                        </div>
                                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                                          <span className="text-xs text-text-tertiary bg-surface-tertiary px-1.5 py-0.5 rounded">
                                            {QUESTION_TYPE_LABELS[question.questionType] || question.questionType}
                                          </span>
                                          <span className="text-xs font-medium text-primary-600">
                                            {question.points} pts
                                          </span>
                                          {question.correctAnswer && question.questionType === 'MULTIPLE_CHOICE' && (
                                            <span className="text-xs text-success flex items-center gap-1">
                                              <CheckCircle2 className="h-3 w-3" />
                                              Answer: {question.correctAnswer}
                                            </span>
                                          )}
                                        </div>

                                        {/* Multiple Choice Options */}
                                        {question.options && Array.isArray(question.options) && question.options.length > 0 && (
                                          <div className="mt-2 space-y-1">
                                            {question.options.map((opt: string, oi: number) => (
                                              <div
                                                key={oi}
                                                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${
                                                  opt === question.correctAnswer
                                                    ? 'bg-success-light text-success-dark'
                                                    : 'bg-surface-secondary text-text-secondary'
                                                }`}
                                              >
                                                <span className="w-4 font-medium">{String.fromCharCode(65 + oi)}.</span>
                                                <span>{opt}</span>
                                                {opt === question.correctAnswer && (
                                                  <CheckCircle2 className="h-3 w-3 ml-auto shrink-0" />
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Rubric Criteria */}
                                        {question.rubricCriteria && question.rubricCriteria.length > 0 && (
                                          <div className="mt-2 flex flex-wrap gap-1">
                                            {question.rubricCriteria.map((rc) => (
                                              <span
                                                key={rc.id}
                                                className="text-[10px] bg-info-light text-info-dark px-1.5 py-0.5 rounded"
                                                title={rc.description || rc.criterionName}
                                              >
                                                {rc.criterionName}: {rc.maxScore}pts (W:{rc.weight})
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))
                            )}

                            {/* Section-level Rubric Criteria */}
                            {section.rubricCriteria && section.rubricCriteria.length > 0 && (
                              <div className="bg-surface-secondary px-4 py-2">
                                <p className="text-xs font-medium text-text-tertiary mb-1">
                                  Section Rubric Criteria
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {section.rubricCriteria.map((rc) => (
                                    <span
                                      key={rc.id}
                                      className="text-[10px] bg-white text-text-secondary px-1.5 py-0.5 rounded border border-border"
                                      title={rc.description || rc.criterionName}
                                    >
                                      {rc.criterionName}: {rc.maxScore}pts
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <Layout className="h-8 w-8 text-text-tertiary mb-2" />
                <p className="text-sm text-text-tertiary">No sections defined yet</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

export default ExamDetailPanel;
