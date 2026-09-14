import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { candidateService } from '@services/candidate-service';
import { api } from '@services/api';
import { RichTextView } from '@components/editor/rich-text-view';
import { richTextPreview } from '@utils/rich-text';
import { ProjectSetupWizard } from './components/project-setup-wizard';
import { ProjectOverviewPanel } from './components/project-overview-panel';
import {
  filterFilesForSection,
  sectionOverlapsParts,
  partsForSections,
  countFilesPerPart,
  deliverableFoldersForSection,
  type ProjectPartId,
} from '@lib/project-structure';
import {
  CodeWorkspace,
  EssayWorkspace,
  MultipleChoiceWorkspace,
  FileUploadWorkspace,
  DiagramWorkspace,
  ShortAnswerWorkspace,
  DynamicWorkspace,
} from '@components/workspace';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileCheck,
  Loader2,
  Send,
  AlertTriangle,
  BookOpen,
  FileText,
  Code,
  ListChecks,
  MessageSquare,
  PenLine,
  Database,
  Network,
  Layout,
  Settings2,
  X,
  Menu,
  CheckSquare,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@utils/cn';

// ── Types ──────────────────────────────────────────

interface SessionQuestion {
  id: string;
  questionText: string;
  questionType: string;
  options: any;
  points: number;
  orderIndex: number;
  expectedOutput: string | null;
  rubricCriteria: Array<{
    id: string;
    criterionName: string;
    description: string | null;
    maxScore: number;
    weight: number;
  }>;
  savedAnswer: { submissionId: string; content: any } | null;
}

interface SessionSection {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  sectionType: string;
  weight: number;
  duration: number | null;
  rubricCriteria: Array<{
    id: string;
    criterionName: string;
    description: string | null;
    maxScore: number;
    weight: number;
  }>;
  questions: SessionQuestion[];
}

interface SessionExam {
  id: string;
  title: string;
  description: string | null;
  tradeName: string;
  tradeCode?: string;
  examType: string;
  duration: number;
  passingScore: number;
  instructions: string | null;
  registrationId: string;
  registrationStatus: string;
  sessionId: string | null;
  sessionStartedAt: string | null;
  // Workspace tools enabled for this exam — unselected tools are hidden in the
  // candidate workspace. Empty/absent means all tools (legacy exams).
  workspaceTools?: string[];
  // Tools locked by the platform owner — candidates cannot turn these off.
  lockedWorkspaceTools?: string[];
  sections: SessionSection[];
}

// ── Helper: Restore workspace files from saved flattened format ──
interface VFSNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string;
  size?: number;
  children?: VFSNode[];
  language?: string;
  lastModified: number;
}

function restoreFlattenedFiles(value: any): VFSNode[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  
  // Check if it's already in VFSNode[] format (only real file/directory nodes)
  if ((value[0] as any)?.type === 'file' || (value[0] as any)?.type === 'directory') {
    return value as VFSNode[];
  }
  
  // Convert flat {path, content}[] to VFSNode[]
  interface FlatFile { path: string; content: string; }
  const files = value as FlatFile[];
  const root: VFSNode[] = [];
  
  // Helper to detect language from file extension
  const langMap: Record<string, string> = {
    js: 'javascript', ts: 'typescript', tsx: 'typescript', jsx: 'javascript',
    py: 'python', rb: 'ruby', java: 'java', cpp: 'cpp', cs: 'csharp',
    go: 'go', rs: 'rust', php: 'php', html: 'html', css: 'css',
    json: 'json', xml: 'xml', md: 'markdown', sql: 'sql', sh: 'bash',
    yaml: 'yaml', yml: 'yaml', txt: 'plaintext',
  };
  const detectLang = (name: string): string => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return langMap[ext] || 'plaintext';
  };
  
  for (const file of files) {
    // Skip entries that are not flattened files (e.g. legacy diagram-node answers)
    if (typeof file?.path !== 'string' || !file.path) continue;
    const parts = file.path.split('/').filter(Boolean);
    let current = root;
    const now = Date.now();
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const isLast = i === parts.length - 1;
      const nodePath = '/' + parts.slice(0, i + 1).join('/');
      const existing = current.find((n) => n.name === part);
      
      if (isLast) {
        if (!existing) {
          current.push({
            name: part,
            path: nodePath,
            type: 'file',
            content: file.content,
            size: file.content.length,
            language: detectLang(part),
            lastModified: now,
          } as VFSNode);
        }
      } else {
        if (existing && existing.type === 'directory' && existing.children) {
          current = existing.children;
        } else if (!existing) {
          const newDir: VFSNode = {
            name: part,
            path: nodePath,
            type: 'directory',
            children: [],
            lastModified: now,
          };
          current.push(newDir);
          current = newDir.children!;
        }
      }
    }
  }
  
  return root;
}

// ── Section Type Info ──────────────────────────────

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

// ── Workspace-backed sections/questions ─────────────
// Section types (and generic question types) that open the full VS Code-style
// workspace. Mirrors the backend sandbox starter folders and DynamicWorkspace.
const WORKSPACE_SECTION_TYPES = [
  'CODE_WRITING',
  'ENVIRONMENT_SETUP',
  'PROJECT_CLEANUP',
  'ERD_DESIGN',
  'DFD_DESIGN',
  'FLOWCHART',
  'UML_DIAGRAM',
  'TOPOLOGY_BUILDER',
  'SUBNETTING',
  'DATABASE_DESIGN',
  'NETWORK_CONFIG',
  'PRESENTATION',
  'PORTFOLIO',
  'MIXED',
];
const WORKSPACE_QUESTION_TYPES = ['CODE_WRITING', 'MIXED', 'ENVIRONMENT_SETUP', 'PROJECT_CLEANUP'];

/** True when the section's questions are answered in the full workspace. */
function sectionUsesWorkspace(section: SessionSection): boolean {
  return (
    WORKSPACE_SECTION_TYPES.includes(section.sectionType) ||
    section.questions.some((q) => WORKSPACE_QUESTION_TYPES.includes(q.questionType))
  );
}

// ── Main Component ─────────────────────────────────

export function AssessmentSessionPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<SessionExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timeUp, setTimeUp] = useState(false);

  // Project workspace state (practical exams with a sandbox session).
  // `configured` means the setup wizard has already scaffolded the project
  // folders for this session — the wizard is only shown before that happens.
  const [projectConfigured, setProjectConfigured] = useState(false);
  const [projectParts, setProjectParts] = useState<ProjectPartId[]>([]);
  const [showProjectWizard, setShowProjectWizard] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  // Bumped whenever the project structure changes (wizard re-run) so the
  // workspace remounts and re-fetches the tree — new folders appear instantly
  // without waiting for a file-watcher event.
  const [projectVersion, setProjectVersion] = useState(0);
  // True once the project-status check has finished (success OR failure) for
  // practical sandbox exams. The workspace is NOT rendered before this so the
  // sandbox FS never initialises with the wrong mode (stage folders on top of
  // the persistent project).
  const [projectStatusResolved, setProjectStatusResolved] = useState(false);

  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const submitQueue = useRef<Array<{ sectionId: string; questionId: string; content: any }>>([]);
  const isProcessingQueue = useRef(false);
  const startedRef = useRef(false);
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const currentSection = exam?.sections[currentSectionIdx] ?? null;
  const currentQuestion = currentSection?.questions[currentQuestionIdx] ?? null;

  // ── Load exam session data ────────────────────
  useEffect(() => {
    if (!assessmentId || startedRef.current) return;
    startedRef.current = true;
    loadSession();
  }, [assessmentId]);

  const loadSession = async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError('');
    try {
      const data = await candidateService.getSessionExam(assessmentId);
      setExam(data);

      // Initialize answers from saved answers
      const initialAnswers: Record<string, any> = {};
      for (const section of data.sections) {
        for (const question of section.questions) {
          if (question.savedAnswer) {
            initialAnswers[question.id] = question.savedAnswer.content;
          }
        }
      }
      setAnswers(initialAnswers);

      // Calculate elapsed time
      if (data.sessionStartedAt) {
        const started = new Date(data.sessionStartedAt).getTime();
        setElapsed(Math.floor((Date.now() - started) / 1000));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load assessment session');
    } finally {
      setLoading(false);
    }
  };

  // ── Timer ─────────────────────────────────────
  useEffect(() => {
    if (!exam || timeUp) return;
    const interval = setInterval(() => {
      setElapsed((prev) => {
        const totalSeconds = exam.duration * 60;
        const newElapsed = prev + 1;
        if (newElapsed >= totalSeconds) {
          setTimeUp(true);
          clearInterval(interval);
          return totalSeconds;
        }
        return newElapsed;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [exam, timeUp]);

  // ── Project workspace status ─────────────────
  // Practical exams with a real sandbox session use ONE persistent project
  // workspace. On load we ask the backend whether the setup wizard has already
  // run for this session; if not, the wizard is shown before any question is
  // answered (the workspace cannot be used until the structure is scaffolded).
  useEffect(() => {
    if (!exam || exam.examType !== 'PRACTICAL' || !exam.sessionId) {
      // Not a project exam — nothing to resolve, the workspace can render now.
      setProjectStatusResolved(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/sandbox/workspace/${exam.sessionId}/project`);
        const data = res.data?.data;
        if (cancelled) return;
        const configured = !!data?.configured;
        setProjectConfigured(configured);
        setProjectParts(configured && Array.isArray(data?.parts) ? (data.parts as ProjectPartId[]) : []);
        if (!configured) setShowProjectWizard(true);
      } catch {
        // Sandbox backend unavailable — fall back to the legacy per-stage
        // workspace so the candidate can still work.
        if (!cancelled) setProjectConfigured(false);
      } finally {
        if (!cancelled) setProjectStatusResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exam]);

  // ── Create / update project workspace (wizard confirm) ─
  // Used both on first setup and when the candidate re-opens the wizard to add
  // parts — the backend is idempotent and only creates missing folders.
  const handleCreateProjectWorkspace = useCallback(
    async (parts: ProjectPartId[]) => {
      if (!exam?.sessionId || timeUp) return;
      setCreatingProject(true);
      try {
        await api.post(`/sandbox/workspace/${exam.sessionId}/project`, { parts });
        setProjectParts(parts);
        setProjectConfigured(true);
        setShowProjectWizard(false);
        setProjectVersion((v) => v + 1);
      } catch {
        setError('Could not update the project workspace. Please try again.');
      } finally {
        setCreatingProject(false);
      }
    },
    [exam?.sessionId, timeUp],
  );

  // Re-open the setup wizard mid-exam (from the overview panel) so the
  // candidate can add more parts to their structure.
  const handleEditProjectStructure = useCallback(() => {
    if (!exam?.sessionId || timeUp) return;
    setShowProjectWizard(true);
  }, [exam?.sessionId, timeUp]);

  // ── Auto-save queue processor ─────────────────
  useEffect(() => {
    const processQueue = async () => {
      if (isProcessingQueue.current || submitQueue.current.length === 0) return;
      isProcessingQueue.current = true;

      while (submitQueue.current.length > 0) {
        const item = submitQueue.current.shift();
        if (!item || !assessmentId) continue;
        try {
          await candidateService.submitAnswer(assessmentId, item.sectionId, item.questionId, item.content);
        } catch {
          // Re-queue on failure
          submitQueue.current.push(item);
          break;
        }
      }

      isProcessingQueue.current = false;
    };

    if (submitQueue.current.length > 0) {
      processQueue();
    }
  }, [answers, assessmentId]);

  // ── Auto-save every 30 seconds ────────────────
  useEffect(() => {
    const saveAllDrafts = () => {
      if (!assessmentId || !exam) return;
      const currentAnswers = answersRef.current;
      for (const section of exam.sections) {
        for (const question of section.questions) {
          const content = currentAnswers[question.id];
          if (content !== undefined && content !== null && content !== '') {
            submitQueue.current.push({
              sectionId: section.id,
              questionId: question.id,
              content,
            });
          }
        }
      }
    };

    autoSaveTimer.current = setInterval(saveAllDrafts, 30000);
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [exam, assessmentId]);

  // ── Save answer ───────────────────────────────
  const handleAnswerChange = useCallback((questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const saveCurrentAnswer = useCallback(async () => {
    if (!assessmentId || !currentQuestion || !currentSection) return;
    const content = answers[currentQuestion.id];
    if (content === undefined || content === null) return;

    setSavingId(currentQuestion.id);
    try {
      await candidateService.submitAnswer(assessmentId, currentSection.id, currentQuestion.id, content);
    } catch {
      // Queue for retry
      submitQueue.current.push({
        sectionId: currentSection.id,
        questionId: currentQuestion.id,
        content,
      });
    } finally {
      setSavingId(null);
    }
  }, [assessmentId, currentQuestion, currentSection, answers]);

  // ── Navigate questions ────────────────────────
  const goToQuestion = async (sectionIdx: number, questionIdx: number) => {
    await saveCurrentAnswer();
    setCurrentSectionIdx(sectionIdx);
    setCurrentQuestionIdx(questionIdx);
  };

  const goNext = async () => {
    if (!exam) return;
    await saveCurrentAnswer();
    if (currentQuestionIdx < (currentSection?.questions.length ?? 1) - 1) {
      setCurrentQuestionIdx((i) => i + 1);
    } else if (currentSectionIdx < exam.sections.length - 1) {
      setCurrentSectionIdx((i) => i + 1);
      setCurrentQuestionIdx(0);
    }
  };

  const goPrev = async () => {
    if (!exam) return;
    await saveCurrentAnswer();
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx((i) => i - 1);
    } else if (currentSectionIdx > 0) {
      const prevSection = exam.sections[currentSectionIdx - 1];
      if (prevSection) {
        setCurrentSectionIdx((i) => i - 1);
        setCurrentQuestionIdx(prevSection.questions.length - 1);
      }
    }
  };

  // ── Finalize assessment ───────────────────────
  const handleFinalize = async () => {
    if (!assessmentId) return;
    setFinalizing(true);
    setError('');
    try {
      // Save the current answer (per-question flow) or flush every section's
      // answer (unified workspace flow) before finalizing.
      if (exam && exam.sections.length > 0 && exam.sections.every(sectionUsesWorkspace)) {
        await flushAllAnswers();
      } else {
        await saveCurrentAnswer();
      }
      // Then finalize
      await candidateService.finalizeAssessment(assessmentId);
      navigate(`/candidate/results`, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit assessment');
    } finally {
      setFinalizing(false);
    }
  };

  // ── Format timer ──────────────────────────────
  const formatTime = (seconds: number) => {
    const totalSeconds = (exam?.duration ?? 0) * 60;
    const remaining = Math.max(0, totalSeconds - seconds);
    const hrs = Math.floor(remaining / 3600);
    const mins = Math.floor((remaining % 3600) / 60);
    const secs = remaining % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const timerPercent = exam ? (elapsed / (exam.duration * 60)) * 100 : 0;
  const isLowTime = exam && elapsed > (exam.duration * 60) * 0.8;

  // ── Stats ─────────────────────────────────────
  const totalQuestions = exam?.sections.reduce((s, sec) => s + sec.questions.length, 0) ?? 0;
  const answeredCount = Object.keys(answers).filter((k) => {
    const v = answers[k];
    return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
  }).length;

  // ── Project overview data ─────────────────────
  // Flatten every saved answer into one deduplicated file list (each section
  // saves its own part of the project), then count files per part so the
  // overview panel shows live progress at a glance.
  const allProjectFiles = useMemo(() => {
    const byPath = new Map<string, { path: string; content: string }>();
    for (const section of exam?.sections ?? []) {
      for (const question of section.questions) {
        const value = answers[question.id];
        if (!Array.isArray(value)) continue;
        for (const file of value) {
          if (file && typeof file.path === 'string') {
            byPath.set(file.path, file);
          }
        }
      }
    }
    return [...byPath.values()];
  }, [answers, exam]);

  const projectFileCounts = useMemo(
    () => countFilesPerPart(allProjectFiles, projectParts),
    [allProjectFiles, projectParts],
  );

  // ── Flattened task list (unified workspace view) ──
  // The unified layout pins the exam scenario and EVERY task above the single
  // workspace, so the candidate sees the whole brief without question-by-
  // question navigation. Each task keeps its section label for context.
  const taskList = useMemo(() => {
    const out: Array<{
      id: string;
      questionText: string;
      sectionId: string;
      sectionTitle: string;
      sectionIndex: number;
      points: number;
    }> = [];
    for (const [sectionIndex, section] of (exam?.sections ?? []).entries()) {
      for (const question of section.questions) {
        out.push({
          id: question.id,
          questionText: question.questionText,
          sectionId: section.id,
          sectionTitle: section.title,
          sectionIndex,
          points: question.points,
        });
      }
    }
    return out;
  }, [exam]);

  // ── Unified workspace (whole-exam workspace) ──────
  // Practical exams where EVERY section is answered in the full workspace
  // render a single page: the exam scenario + all tasks pinned at the top,
  // then ONE workspace below (no per-question navigation, no checklist).
  // Theoretical sections (MCQ/essay) fall back to the per-question flow.
  const usesUnifiedWorkspace =
    !!exam &&
    exam.sections.length > 0 &&
    exam.sections.every(sectionUsesWorkspace);

  // The unified workspace spans every section, so use a generic MIXED type
  // unless the whole exam is a single section type (e.g. an ERD-only exam
  // still auto-opens its diagram canvas).
  const unifiedSectionType =
    exam && exam.sections.length === 1 && exam.sections[0]
      ? exam.sections[0].sectionType
      : 'MIXED';

  // Distribute the single workspace's files into each section's answers
  // (per-section deliverables), so scoring keeps working exactly as before.
  const handleUnifiedWorkspaceChange = useCallback(
    (files: Array<{ path: string; content: string }>) => {
      if (!exam) return;
      setAnswers((prev) => {
        const next = { ...prev };
        for (const section of exam.sections) {
          const sectionFiles =
            projectConfigured && sectionOverlapsParts(section.sectionType, projectParts)
              ? filterFilesForSection(files, section.sectionType)
              : files;
          for (const question of section.questions) {
            next[question.id] = sectionFiles;
          }
        }
        return next;
      });
    },
    [exam, projectConfigured, projectParts],
  );

  // Flush every non-empty answer to the backend. Used on finalize in unified
  // mode, where there is no single "current question" to save.
  const flushAllAnswers = useCallback(async () => {
    if (!exam || !assessmentId) return;
    const current = answersRef.current;
    for (const section of exam.sections) {
      for (const question of section.questions) {
        const content = current[question.id];
        if (content === undefined || content === null || content === '') continue;
        try {
          await candidateService.submitAnswer(assessmentId, section.id, question.id, content);
        } catch {
          submitQueue.current.push({ sectionId: section.id, questionId: question.id, content });
        }
      }
    }
  }, [exam, assessmentId]);

  // Jump from the overview panel to the section that owns a part. Prefer a
  // section with dedicated folders for the part (e.g. the code section owns
  // frontend/ + backend/); a whole-project section (MIXED) is only used as a
  // fallback so flat exams still have somewhere to jump.
  const handleSelectProjectPart = useCallback(
    (part: ProjectPartId) => {
      if (!exam) return;
      const findSection = (withDedicated: boolean) =>
        exam.sections.findIndex(
          (s) =>
            (!withDedicated || deliverableFoldersForSection(s.sectionType).length > 0) &&
            sectionOverlapsParts(s.sectionType, [part]),
        );
      let sectionIdx = findSection(true);
      if (sectionIdx < 0) sectionIdx = findSection(false);
      if (sectionIdx >= 0) {
        goToQuestion(sectionIdx, 0);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exam, goToQuestion],
  );

  // ── Loading state ─────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-primary">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary-500" />
          <p className="mt-4 text-sm text-text-secondary">Preparing your assessment workspace...</p>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────
  if (error && !exam) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface-primary">
        <AlertCircle className="h-12 w-12 text-error" />
        <h3 className="mt-4 text-lg font-semibold text-text-primary">Cannot load assessment</h3>
        <p className="mt-2 text-sm text-text-secondary">{error}</p>
        <div className="mt-6 flex gap-3">
          <Button variant="ghost" onClick={() => navigate('/candidate/assessments')}>
            Back to Assessments
          </Button>
          <Button variant="primary" onClick={loadSession}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!exam || !currentSection || !currentQuestion) return null;

  const sec = currentSection;
  const q = currentQuestion;

  // Practical exams with a real sandbox session: wait for the project-status
  // check before mounting the workspace, so the sandbox FS is created with the
  // correct mode (otherwise it would scaffold per-stage folders on top of the
  // persistent project workspace). While the setup wizard is on screen the
  // workspace is held back too — once confirmed, projectConfigured flips and the
  // workspace mounts fresh in project mode.
  const isProjectExam = exam.examType === 'PRACTICAL' && !!exam.sessionId;
  const showWorkspaceLoader =
    isProjectExam &&
    (!projectStatusResolved || (showProjectWizard && !projectConfigured));

  // Section-level assessment checklist (may be absent on older responses).
  const sectionCriteria = sec.rubricCriteria || [];

  // Flat imported exams have exactly one section — show its full assessment
  // checklist open by default so candidates see the rubric right away.
  const isFlatExam = exam.sections.length === 1;

  const isLastQuestion =
    currentSectionIdx === exam.sections.length - 1 &&
    currentQuestionIdx === sec.questions.length - 1;

  return (
    <div className="flex h-screen bg-surface-primary overflow-hidden">
      {/* ── Sidebar ─────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex flex-col border-r border-border bg-white shrink-0 overflow-hidden"
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-text-primary truncate">{exam.title}</p>
                <p className="text-xs text-text-tertiary">{exam.tradeName}</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="ml-2 rounded-md p-1 text-text-tertiary hover:bg-surface-secondary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between text-xs text-text-tertiary mb-1.5">
                <span>Progress</span>
                <span>{answeredCount}/{totalQuestions}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-tertiary overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-500 transition-all duration-500"
                  style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Project overview — only in project mode (parts chosen) */}
            {projectConfigured && projectParts.length > 0 && (
              <ProjectOverviewPanel
                parts={projectParts}
                fileCounts={projectFileCounts}
                currentSectionType={currentSection?.sectionType}
                onSelectPart={handleSelectProjectPart}
                onEditStructure={handleEditProjectStructure}
              />
            )}

            {/* Section/Question navigation */}
            <div className="flex-1 overflow-y-auto">
              {exam.sections.map((section, sIdx) => (
                <div key={section.id} className="border-b border-border last:border-0">
                  <div className={cn(
                    'px-4 py-2.5 text-xs font-semibold uppercase tracking-wider flex items-center gap-2',
                    sIdx === currentSectionIdx
                      ? 'bg-primary-50 text-primary-700'
                      : 'bg-surface-secondary text-text-tertiary',
                  )}>
                    {SECTION_ICONS[section.sectionType] && (() => {
                      const Icon = SECTION_ICONS[section.sectionType]!;
                      return (
                        <span className="flex h-5 w-5 items-center justify-center">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                      );
                    })()}
                    <span className="truncate">{section.title}</span>
                    <span className="ml-auto text-[10px] opacity-60">{section.weight}%</span>
                  </div>
                  <div className="py-1">
                    {section.questions.map((question, qIdx) => {
                      const isActive = sIdx === currentSectionIdx && qIdx === currentQuestionIdx;
                      const isAnswered = answers[question.id] !== undefined &&
                        answers[question.id] !== null &&
                        answers[question.id] !== '' &&
                        !(Array.isArray(answers[question.id]) && answers[question.id].length === 0);

                      return (
                        <button
                          key={question.id}
                          onClick={() => goToQuestion(sIdx, qIdx)}
                          className={cn(
                            'flex w-full items-center gap-2 px-4 py-2 text-left text-xs transition-colors',
                            isActive
                              ? 'bg-primary-50 text-primary-700 font-medium'
                              : 'text-text-secondary hover:bg-surface-secondary',
                          )}
                        >
                          <span className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium',
                            isAnswered
                              ? 'bg-accent-100 text-accent-700'
                              : 'bg-surface-tertiary text-text-tertiary',
                            isActive && isAnswered && 'ring-2 ring-accent-300',
                          )}>
                            {isAnswered ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              qIdx + 1
                            )}
                          </span>
                          <span className="truncate">{richTextPreview(question.questionText, 40)}</span>
                          {question.points > 0 && (
                            <span className="ml-auto text-[10px] text-text-tertiary">{question.points}pt</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main Content ────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-border bg-white px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-md p-1.5 text-text-tertiary hover:bg-surface-secondary transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <FileCheck className="h-4 w-4 text-primary-500" />
              <span className="font-medium text-text-primary">{exam.title}</span>
              {!sidebarOpen && (
                <span className="text-text-tertiary text-xs">
                  &middot; {answeredCount}/{totalQuestions} answered
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Saving indicator */}
            {savingId && (
              <span className="flex items-center gap-1 text-xs text-accent-600">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving...
              </span>
            )}

            {/* Timer */}
            <div className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-mono font-bold transition-colors',
              isLowTime
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-surface-secondary text-text-primary',
              timeUp && 'animate-pulse bg-red-100 text-red-800',
            )}>
              <Clock className={cn('h-4 w-4', isLowTime ? 'text-red-500' : 'text-text-tertiary')} />
              {formatTime(elapsed)}
            </div>

            {/* Submit button */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setConfirmSubmit(true)}
              disabled={timeUp}
            >
              <Send className="mr-1 h-4 w-4" /> Submit
            </Button>
          </div>
        </header>

        {/* Timer bar */}
        <div className="h-1 w-full bg-surface-tertiary shrink-0">
          <div
            className={cn(
              'h-full transition-all duration-1000',
              isLowTime ? 'bg-error' : 'bg-accent-500',
            )}
            style={{ width: `${Math.min(100, timerPercent)}%` }}
          />
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 px-4 py-2 text-xs text-red-800 shrink-0">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Question area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {usesUnifiedWorkspace ? (
            <UnifiedWorkspaceView
              exam={exam}
              taskList={taskList}
              showWorkspaceLoader={showWorkspaceLoader}
              projectVersion={projectVersion}
              projectMode={projectConfigured}
              initialFiles={restoreFlattenedFiles(allProjectFiles)}
              onFilesChange={handleUnifiedWorkspaceChange}
              sectionType={unifiedSectionType}
            />
          ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${sec.id}-${q.id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mx-auto max-w-4xl"
            >
              {/* Question header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 text-xs text-text-tertiary mb-2">
                  <span className="font-medium text-primary-600">
                    Section {currentSectionIdx + 1}: {sec.title}
                  </span>
                  <span>&middot;</span>
                  <span>Question {currentQuestionIdx + 1} of {sec.questions.length}</span>
                  {q.points > 0 && (
                    <>
                      <span>&middot;</span>
                      <span>{q.points} points</span>
                    </>
                  )}
                  <Badge variant="info" size="sm">{q.questionType}</Badge>
                  {q.savedAnswer && (
                    <Badge variant="success" size="sm">Draft Saved</Badge>
                  )}
                </div>

                <RichTextView html={q.questionText} className="text-lg font-semibold leading-relaxed" />

                {q.expectedOutput && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-text-tertiary hover:text-text-secondary">
                      <HelpCircle className="inline h-3 w-3 mr-1" /> Expected output guidelines
                    </summary>
                    <p className="mt-1 rounded-lg bg-surface-secondary p-3 text-xs text-text-secondary">
                      {q.expectedOutput}
                    </p>
                  </details>
                )}
              </div>

              {/* Workspace */}
              <div className="mb-6">
                {showWorkspaceLoader ? (
                  // Project status is being checked — the workspace must not
                  // mount yet (its sandbox FS mode depends on the outcome).
                  <div className="flex h-[600px] flex-col items-center justify-center rounded-xl border border-border bg-surface-secondary">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                    <p className="mt-3 text-sm text-text-secondary">Preparing your project workspace...</p>
                  </div>
                ) : (
                  <QuestionWorkspace
                    key={`${projectVersion}-${q.id}`}
                    questionType={q.questionType}
                    sectionType={sec.sectionType}
                    value={answers[q.id]}
                    onChange={(value: any) => handleAnswerChange(q.id, value)}
                    options={q.options}
                    sessionId={exam.sessionId}
                    tradeCode={exam.tradeCode}
                    tradeName={exam.tradeName}
                    workspaceTools={exam.workspaceTools}
                    lockedWorkspaceTools={exam.lockedWorkspaceTools}
                    projectMode={projectConfigured}
                    projectParts={projectParts}
                  />
                )}
              </div>

              {/* Assessment checklist (informational) — the section's indicators,
                  rendered as one flat list exactly like the admin review screen */}
              {sectionCriteria.length > 0 && (
                <details className="mb-6" open={isFlatExam}>
                  <summary className="cursor-pointer text-xs text-text-tertiary hover:text-text-secondary">
                    <ListChecks className="inline h-3 w-3 mr-1" /> Assessment Checklist ({sectionCriteria.length} indicator{sectionCriteria.length === 1 ? '' : 's'} ·{' '}
                    {sectionCriteria.reduce((s, c) => s + c.maxScore, 0)} marks)
                  </summary>
                  <div className="mt-2 rounded-lg border border-accent-200 bg-accent-50/30 p-3">
                    <div className="space-y-1.5">
                      {sectionCriteria.map((criterion, cIndex) => (
                        <div
                          key={criterion.id}
                          className="flex items-start gap-3 rounded-lg border border-accent-100 bg-white p-2.5"
                        >
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-700">
                            {cIndex + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-text-primary">{criterion.criterionName}</p>
                            {criterion.description && (
                              <p className="text-[11px] text-text-tertiary">{criterion.description}</p>
                            )}
                          </div>
                          <span className="shrink-0 text-xs font-medium text-text-tertiary">{criterion.maxScore} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}

              {/* Rubric criteria (informational) */}
              {q.rubricCriteria.length > 0 && (
                <details className="mb-6">
                  <summary className="cursor-pointer text-xs text-text-tertiary hover:text-text-secondary">
                    <CheckSquare className="inline h-3 w-3 mr-1" /> Rubric criteria ({q.rubricCriteria.length})
                  </summary>
                  <div className="mt-2 space-y-1.5">
                    {q.rubricCriteria.map((criterion) => (
                      <div
                        key={criterion.id}
                        className="flex items-center justify-between rounded-lg bg-surface-secondary px-3 py-2"
                      >
                        <div>
                          <p className="text-xs font-medium text-text-primary">{criterion.criterionName}</p>
                          {criterion.description && (
                            <p className="text-[11px] text-text-tertiary">{criterion.description}</p>
                          )}
                        </div>
                        <span className="text-xs font-medium text-text-tertiary">{criterion.maxScore} pts</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </motion.div>
          </AnimatePresence>
          )}
        </div>

        {/* Bottom navigation — hidden in the unified workspace layout (no
            question-by-question navigation; everything is on one page) */}
        {!usesUnifiedWorkspace && (
        <div className="flex items-center justify-between border-t border-border bg-white px-4 py-3 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={goPrev}
            disabled={currentSectionIdx === 0 && currentQuestionIdx === 0}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Previous
          </Button>

          <div className="flex items-center gap-1 text-xs text-text-tertiary">
            <span className="font-medium text-text-primary">{currentSectionIdx + 1}.{currentQuestionIdx + 1}</span>
            <span>/ {exam.sections.length}.{sec.questions.length}</span>
          </div>

          {isLastQuestion ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setConfirmSubmit(true)}
              icon={<Send className="h-4 w-4" />}
            >
              Submit All
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={goNext}
              icon={<ChevronRight className="h-4 w-4" />}
            >
              Next
            </Button>
          )}
        </div>
        )}
      </div>

      {/* ── Submit Confirmation Modal ───────────── */}
      <AnimatePresence>
        {confirmSubmit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setConfirmSubmit(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning-light mb-4">
                  <AlertTriangle className="h-7 w-7 text-warning" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">Submit Assessment?</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  You have answered <strong>{answeredCount}</strong> of <strong>{totalQuestions}</strong> questions.
                </p>
                {answeredCount < totalQuestions && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{totalQuestions - answeredCount} unanswered question(s) will be marked as incomplete.</span>
                  </div>
                )}
                <p className="mt-2 text-xs text-text-tertiary">
                  This action cannot be undone.
                </p>
              </div>
              <div className="mt-6 flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setConfirmSubmit(false)}
                >
                  <X className="mr-1 h-4 w-4" /> Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleFinalize}
                  loading={finalizing}
                >
                  <Send className="mr-1 h-4 w-4" /> Submit Now
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Project Setup Wizard ────────────────── */}
      {/* Practical exams scaffold ONE persistent project workspace before the
          candidate can work. On first entry the wizard is required (no cancel);
          mid-exam it can be re-opened from the overview panel to add parts —
          then it pre-selects the existing parts and allows cancelling. */}
      <AnimatePresence>
        {showProjectWizard && exam?.sessionId && !timeUp && (
          <ProjectSetupWizard
            examTitle={exam.title}
            suggestedParts={partsForSections(exam.sections)}
            initialParts={projectConfigured ? projectParts : undefined}
            creating={creatingProject}
            onCreate={handleCreateProjectWorkspace}
            onCancel={projectConfigured ? () => setShowProjectWizard(false) : undefined}
            isEdit={projectConfigured}
          />
        )}
      </AnimatePresence>

      {/* ── Time's Up Modal ─────────────────────── */}
      <AnimatePresence>
        {timeUp && !confirmSubmit && !finalizing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 mx-auto mb-4">
                <Clock className="h-7 w-7 text-error" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">Time's Up!</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Your assessment time has expired. Your answers will be submitted automatically.
              </p>
              <Button
                variant="primary"
                className="mt-6 w-full"
                onClick={handleFinalize}
                loading={finalizing}
              >
                <Send className="mr-1 h-4 w-4" /> Submit Answers
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Unified Workspace View (whole-exam workspace) ──
// Practical exams show the exam scenario + every task pinned at the top, then
// ONE workspace below — the candidate creates directories/files, draws ERD /
// DFD diagrams, runs SQL, and codes frontend + backend all in the same
// workspace without question-by-question navigation. Files change is
// distributed to each section's answer (per-section deliverables) so scoring
// keeps working exactly as before. Workspace content is persisted by the
// sandbox backend per session, so a candidate who logs out and returns finds
// their work intact.

interface UnifiedWorkspaceViewProps {
  exam: SessionExam;
  taskList: Array<{
    id: string;
    questionText: string;
    sectionId: string;
    sectionTitle: string;
    sectionIndex: number;
    points: number;
  }>;
  showWorkspaceLoader: boolean;
  projectVersion: number;
  projectMode: boolean;
  initialFiles?: VFSNode[];
  onFilesChange: (files: Array<{ path: string; content: string }>) => void;
  sectionType: string;
}

function UnifiedWorkspaceView({
  exam,
  taskList,
  showWorkspaceLoader,
  projectVersion,
  projectMode,
  initialFiles,
  onFilesChange,
  sectionType,
}: UnifiedWorkspaceViewProps) {
  return (
    <div className="mx-auto max-w-5xl">
      {/* Scenario — the exam brief, pinned at the top */}
      {exam.description && (
        <div className="mb-6 rounded-xl border border-border bg-white p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-tertiary">
            Scenario
          </p>
          <RichTextView html={exam.description} className="text-sm" />
        </div>
      )}

      {/* Tasks — every task, numbered, no checklist */}
      <div className="mb-6 rounded-xl border border-border bg-white p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-tertiary">
          Tasks ({taskList.length})
        </p>
        <div className="space-y-3">
          {taskList.map((task, index) => {
            // Section header (first task of each section)
            const isFirstInSection =
              index === 0 || taskList[index - 1]!.sectionIndex !== task.sectionIndex;
            return (
              <div key={task.id}>
                {isFirstInSection && (
                  <p className="mb-1.5 text-xs font-semibold text-primary-600">
                    Section {task.sectionIndex + 1}: {task.sectionTitle}
                  </p>
                )}
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <RichTextView html={task.questionText} className="text-sm" />
                    {task.points > 0 && (
                      <p className="mt-0.5 text-[11px] text-text-tertiary">{task.points} pts</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workspace — ONE workspace for the whole exam */}
      <div className="mb-6">
        {showWorkspaceLoader ? (
          <div className="flex h-[600px] flex-col items-center justify-center rounded-xl border border-border bg-surface-secondary">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="mt-3 text-sm text-text-secondary">Preparing your project workspace...</p>
          </div>
        ) : (
          <DynamicWorkspace
            key={`unified-${projectVersion}`}
            examTitle={exam.title}
            readOnly={false}
            initialFiles={initialFiles}
            onFilesChange={onFilesChange}
            sessionId={exam.sessionId}
            sectionType={sectionType}
            tradeCode={exam.tradeCode}
            tradeName={exam.tradeName}
            workspaceTools={exam.workspaceTools}
            lockedWorkspaceTools={exam.lockedWorkspaceTools}
            projectMode={projectMode}
          />
        )}
      </div>
    </div>
  );
}

// ── Question Workspace Router ──────────────────────

interface QuestionWorkspaceProps {
  questionType: string;
  sectionType: string;
  value: any;
  onChange: (value: any) => void;
  options?: any;
  sessionId?: string | null;
  tradeCode?: string;
  tradeName?: string;
  workspaceTools?: string[];
  lockedWorkspaceTools?: string[];
  projectMode?: boolean;
  projectParts?: ProjectPartId[];
}

function QuestionWorkspace({ questionType, sectionType, value, onChange, options, sessionId, tradeCode, tradeName, workspaceTools, lockedWorkspaceTools, projectMode = false, projectParts = [] }: QuestionWorkspaceProps) {
  // Workspace-backed sections (full file tree, real terminal, and the in-tab
  // browser preview with Start Server) are decided by the SECTION type.
  // Questions inside these sections are typed generically (e.g. CODE), so
  // routing purely on questionType would never reach DynamicWorkspace.
  // This list mirrors the section types the backend sandbox scaffolds starter
  // folders for (backend sandbox.service.ts STAGE_STARTER_FOLDERS) and that
  // DynamicWorkspace renders (frontend/src/lib/workspace-tools STAGE_HINTS):
  // design stages (ERD/DFD/FLOWCHART/UML), NET trade stages (topology /
  // subnetting), code/database/network stages, presentation/portfolio, and
  // MIXED — flat imported exams (single practical section covering the whole
  // project) so the candidate works in ONE VS Code-style workspace where they
  // can create folders/files and write freely.
  const workspaceSectionTypes = [
    'CODE_WRITING',
    'ENVIRONMENT_SETUP',
    'PROJECT_CLEANUP',
    'ERD_DESIGN',
    'DFD_DESIGN',
    'FLOWCHART',
    'UML_DIAGRAM',
    'TOPOLOGY_BUILDER',
    'SUBNETTING',
    'DATABASE_DESIGN',
    'NETWORK_CONFIG',
    'PRESENTATION',
    'PORTFOLIO',
    'MIXED',
  ];
  const workspaceQuestionTypes = ['CODE_WRITING', 'MIXED', 'ENVIRONMENT_SETUP', 'PROJECT_CLEANUP'];
  const usesDynamicWorkspace =
    workspaceSectionTypes.includes(sectionType) || workspaceQuestionTypes.includes(questionType);

  if (usesDynamicWorkspace) {
    // Restore workspace from saved flattened files
    const savedWsFiles = restoreFlattenedFiles(value);

    return (
      <div className="h-[600px]">
        <DynamicWorkspace
          examTitle="Assessment Workspace"
          readOnly={false}
          initialFiles={savedWsFiles}
          onFilesChange={(files) => {
            // Per-section deliverables: in project mode each section only saves
            // the files under ITS part of the project (database/sql for the DB
            // section, frontend/ + backend/ for the code section, ...). When the
            // candidate's chosen parts don't cover this section's folders (e.g.
            // they deselected the part), fall back to the whole project so the
            // answer is never silently empty.
            onChange(
              projectMode && sectionOverlapsParts(sectionType, projectParts)
                ? filterFilesForSection(files, sectionType)
                : files,
            );
          }}
          sessionId={sessionId}
          sectionType={sectionType}
          tradeCode={tradeCode}
          tradeName={tradeName}
          workspaceTools={workspaceTools}
          lockedWorkspaceTools={lockedWorkspaceTools}
          projectMode={projectMode}
        />
      </div>
    );
  }

  switch (questionType) {
    case 'CODE':
      return (
        <CodeWorkspace
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
        />
      );

    case 'ESSAY':
      return (
        <EssayWorkspace
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
        />
      );

    case 'MULTIPLE_CHOICE':
      return (
        <MultipleChoiceWorkspace
          options={options && Array.isArray(options) ? options : []}
          value={value || ''}
          onChange={onChange}
        />
      );

    case 'DIAGRAM':
      return (
        <DiagramWorkspace
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
        />
      );

    case 'FILE_UPLOAD':
      return (
        <FileUploadWorkspace
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
        />
      );

    case 'SHORT_ANSWER':
      return (
        <ShortAnswerWorkspace
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
        />
      );

    default:
      return (
        <EssayWorkspace
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
        />
      );
  }
}

export default AssessmentSessionPage;
