import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Badge } from '@components/ui/badge';
import { examService, type CreateExamInput, type ParsedExamData } from '@services/exam-service';
import { tradeService } from '@services/trade-service';
import type { Trade } from '@app_types/index';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileCheck,
  FileText,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  X,
  AlertCircle,
  BookOpen,
  Code,
  ListChecks,
  MessageSquare,
  Network,
  Database,
  Layout,
  Settings2,
  PenLine,
  GitBranch,
  Upload,
  FileUp,
  Sparkles,
  Wand2,
  Search,
  Highlighter,
  Wrench,
} from 'lucide-react';
import { cn } from '@utils/cn';
import { RichTextEditor } from '@components/editor/rich-text-editor';
import {
  generateAssessmentChecklist,
  detectQuestionType,
  extractNumberedTasks,
  renormalizeChecklistWeights,
  DEFAULT_CRITERION_MARKS,
  type ChecklistSection,
  type ChecklistCriterion,
} from './components/checklist-generator';
import { htmlToPlainText, richTextPreview } from '@utils/rich-text';
import {
  WorkspaceToolsGrid,
  ALL_WORKSPACE_TOOLS,
  resolveTradeWorkspaceDefaults,
  sanitizeWorkspaceTools,
} from './components/workspace-tools-editor';

// ── Constants ──────────────────────────────────────

const EXAM_TYPES = [
  { value: 'PRACTICAL', label: 'Practical', desc: 'Hands-on assessment with real-world tasks' },
  { value: 'THEORETICAL', label: 'Theoretical', desc: 'Knowledge-based questions and essays' },
  { value: 'MIXED', label: 'Mixed', desc: 'Combination of practical and theoretical' },
];

const SECTION_TYPES = [
  { value: 'ERD_DESIGN', label: 'ERD Design', icon: Database, desc: 'Entity-Relationship Diagram design tasks' },
  { value: 'DFD_DESIGN', label: 'DFD Design', icon: Network, desc: 'Data Flow Diagram creation' },
  { value: 'FLOWCHART', label: 'Flowchart', icon: GitBranch, desc: 'Algorithm and process flowcharting' },
  { value: 'UML_DIAGRAM', label: 'UML Diagram', icon: Layout, desc: 'Unified Modeling Language diagrams' },
  { value: 'CODE_WRITING', label: 'Code Writing', icon: Code, desc: 'Programming and code implementation' },
  { value: 'DATABASE_DESIGN', label: 'Database Design', icon: Database, desc: 'SQL schema and query design' },
  { value: 'TOPOLOGY_BUILDER', label: 'Topology Builder', icon: Network, desc: 'Network topology design' },
  { value: 'NETWORK_CONFIG', label: 'Network Config', icon: Settings2, desc: 'Network device configuration' },
  { value: 'SUBNETTING', label: 'Subnetting', icon: GitBranch, desc: 'IP addressing and subnet calculation' },
  { value: 'PRESENTATION', label: 'Presentation', icon: MessageSquare, desc: 'Oral presentation and demo' },
  { value: 'PORTFOLIO', label: 'Portfolio', icon: BookOpen, desc: 'Portfolio submission and review' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice', icon: ListChecks, desc: 'Multiple choice questions' },
  { value: 'ESSAY', label: 'Essay', icon: PenLine, desc: 'Written essay responses' },
  { value: 'FILE_UPLOAD', label: 'File Upload', icon: FileText, desc: 'File/document submission' },
  { value: 'MIXED', label: 'Mixed', icon: Layout, desc: 'Combination of section types' },
  { value: 'ENVIRONMENT_SETUP', label: 'Environment Setup', icon: Settings2, desc: 'Development environment setup' },
  { value: 'PROJECT_CLEANUP', label: 'Project Cleanup', icon: CheckCircle2, desc: 'Project cleanup activities' },
];

// ── Types ──────────────────────────────────────────

interface TaskForm {
  tempId: string;
  text: string;
  questionType?: string;
  options?: Array<{ text: string; isCorrect: boolean }>;
  expectedOutput?: string;
}

type CreationMode = 'choose' | 'upload' | 'manual';

/**
 * Convert the AI-parsed document into the same editing model the manual flow
 * uses: a flat task list (from every section's questions) plus ONE flat
 * assessment checklist. The document's TVET section grouping (Preliminary /
 * Process / Presentation / Closing) is intentionally dropped — these are
 * practical assessments (design + code tasks), so every extracted indicator
 * lands in a single "Practical Assessment" section holding all tasks.
 */
function parsedToUploadModel(
  parsed: ParsedExamData,
  tempIdFn: () => string,
): { tasks: TaskForm[]; checklist: ChecklistSection[] } {
  const tasks: TaskForm[] = [];

  (parsed.sections || []).forEach((section) => {
    (section.questions || []).forEach((q) => {
      tasks.push({
        tempId: tempIdFn(),
        text: q.questionText,
        questionType: q.questionType,
        options: q.options,
        expectedOutput: q.expectedOutput,
      });
    });
  });

  // Flatten every extracted indicator into one checklist.
  const criteria: ChecklistCriterion[] = [];
  (parsed.sections || []).forEach((section) => {
    (section.rubricCriteria || []).forEach((rc) => {
      criteria.push({
        criterionName: rc.criterionName,
        description: rc.description || '',
        maxScore: rc.maxScore,
      });
    });
  });

  const checklist: ChecklistSection[] = [
    {
      title: 'Practical Assessment',
      sectionType: 'MIXED',
      weight: 100,
      criteria,
      taskIndexes: tasks.map((_, i) => i),
    },
  ];

  return { tasks, checklist };
}

/** Serialize tasks back into the single-editor format (numbered lines). */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Build highlighted HTML for the tasks editor: every detected task is wrapped
 * in a <mark> so the tasks the candidate must complete are visually highlighted
 * right inside the editor (bold/marker styling). TinyMCE keeps <mark> in its
 * HTML5 schema, and the highlight is stripped back to plain text on save
 * (htmlToPlainText), so it never reaches the stored exam.
 */
function tasksToHighlightedHtml(tasks: TaskForm[]): string {
  return tasks
    .map((t, i) => `<p><mark>${i + 1}. ${escapeHtml(htmlToPlainText(t.text))}</mark></p>`)
    .join('');
}

/**
 * Re-assign every task to the single flat upload checklist after the user
 * edits the tasks working area (the uploaded exam is one practical section).
 */
function assignTasksToUploadSections(
  tasks: TaskForm[],
  sections: ChecklistSection[],
): ChecklistSection[] {
  if (sections.length === 0) return sections;
  return sections.map((s, i) => ({ ...s, taskIndexes: i === 0 ? tasks.map((_, idx) => idx) : [] }));
}

// ── Stepper Component ──────────────────────────────

function Stepper({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all',
                  index < currentStep
                    ? 'bg-accent-500 text-white'
                    : index === currentStep
                      ? 'bg-primary-600 text-white ring-2 ring-primary-200'
                      : 'bg-surface-tertiary text-text-tertiary',
                )}
              >
                {index < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  'hidden text-sm font-medium sm:inline',
                  index <= currentStep ? 'text-text-primary' : 'text-text-tertiary',
                )}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'mx-3 h-0.5 w-12 sm:w-20',
                  index < currentStep ? 'bg-accent-500' : 'bg-surface-tertiary',
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────

export function AdminExamCreatePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Debounce timer for auto-generating the checklist while the author types.
  const checklistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Creation mode
  const [creationMode, setCreationMode] = useState<CreationMode>('choose');

  // Shared state
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedTradeId, setSelectedTradeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Manual creation state ───────────────────────
  const [currentStep, setCurrentStep] = useState(0);
  const [createdExamId, setCreatedExamId] = useState<string | null>(null);

  const [examForm, setExamForm] = useState<CreateExamInput>({
    title: '',
    description: '',
    tradeId: '',
    examType: 'PRACTICAL',
    duration: 120,
    passingScore: 50,
    maxAttempts: 1,
    instructions: '',
    allowOralDefense: true,
    requireFullScreen: true,
    requireWebcam: false,
  });

  const [tasks, setTasks] = useState<TaskForm[]>([]);
  const [tasksText, setTasksText] = useState('');
  const [checklist, setChecklist] = useState<ChecklistSection[]>([]);
  const [checklistGenerated, setChecklistGenerated] = useState(false);

  // Clear the debounce timer on unmount so a pending generation never fires
  // after the page is gone.
  useEffect(() => () => {
    if (checklistTimer.current) clearTimeout(checklistTimer.current);
  }, []);

  // ── Upload creation state ────────────────────
  const [uploadStep, setUploadStep] = useState(0); // 0: upload, 1: parse/review, 2: complete
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [editableParsed, setEditableParsed] = useState<ParsedExamData | null>(null);

  // Tasks + checklist for the parsed document — same editing model as manual.
  const [uploadTasks, setUploadTasks] = useState<TaskForm[]>([]);
  const [uploadTasksText, setUploadTasksText] = useState('');
  const [uploadChecklist, setUploadChecklist] = useState<ChecklistSection[]>([]);

  // Workspace tools chosen on the create/upload review screens (all by default).
  const [workspaceTools, setWorkspaceTools] = useState<string[]>([...ALL_WORKSPACE_TOOLS]);
  // Tools locked by the platform owner — candidates cannot turn these off.
  const [lockedTools, setLockedTools] = useState<string[]>([]);
  // Tracks whether the admin has manually toggled any workspace tool (as opposed to
  // the programmatic auto-set from the trade). When true, switching trades prompts
  // for confirmation before discarding the custom selection.
  const [toolsCustomized, setToolsCustomized] = useState(false);

  /** User-initiated change to the workspace tools — marks the selection as custom. */
  const handleWorkspaceToolsChange = (tools: string[]) => {
    setWorkspaceTools(tools);
    setToolsCustomized(true);
  };

  // ── Load trades on mount ──────────────────────
  useEffect(() => {
    const loadTrades = async () => {
      try {
        const data = await tradeService.listTrades();
        setTrades(data);
      } catch {
        setError('Failed to load trades. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    loadTrades();
  }, []);

  // ── Helpers ───────────────────────────────────
  const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  /** Apply the selected trade's default working environment to the exam.
   *  Uses the trade's DB-configured environment when set (admin-editable),
   *  otherwise the built-in per-trade defaults. Still editable on the review
   *  screens via the "<Trade> default" chip. Resets the customization flag
   *  since the new defaults become the baseline. */
  const applyTradeWorkspaceDefault = (tradeId: string) => {
    const trade = trades.find((t) => t.id === tradeId);
    setWorkspaceTools(resolveTradeWorkspaceDefaults(trade));
    // Inherit the trade's locked tools — candidates cannot turn these off.
    setLockedTools(sanitizeWorkspaceTools(trade?.lockedWorkspaceTools));
    setToolsCustomized(false);
  };

  /** Build the checklist from a task list and store it (auto-generation). */
  const buildChecklistFromTasks = (taskList: TaskForm[]) => {
    const generated = generateAssessmentChecklist(taskList);
    setChecklist(generated);
    setChecklistGenerated(generated.length > 0);
    return generated;
  };

  /** Tasks are written in ONE working area (like the sample exam document) and
   *  parsed into the task list used by the checklist generator + submit flow.
   *  The standard TVET assessment checklist (Preliminary / Process /
   *  Presentation / Closing with the full sample-exam indicators) is
   *  regenerated automatically as the author types. */
  const handleTasksChange = (html: string) => {
    setTasksText(html);
    const nextTasks = extractNumberedTasks(html).map((text) => ({ tempId: generateTempId(), text }));
    setTasks(nextTasks);
    if (checklistTimer.current) clearTimeout(checklistTimer.current);
    checklistTimer.current = setTimeout(() => {
      buildChecklistFromTasks(nextTasks);
    }, 350);
  };

  /** Manual "Regenerate" — re-derive the checklist from the current tasks. */
  const generateChecklist = () => {
    // A pending auto-generation must not fire later and wipe this result.
    if (checklistTimer.current) clearTimeout(checklistTimer.current);
    if (tasks.length === 0) {
      setError('Add at least one task before generating the checklist.');
      return;
    }
    buildChecklistFromTasks(tasks);
    setError('');
  };

  // ── Generic checklist editors (shared by the manual + upload flows) ──
  const updateSectionField = (
    setter: Dispatch<SetStateAction<ChecklistSection[]>>,
    index: number,
    field: keyof ChecklistSection,
    value: any,
  ) => setter((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));

  const updateCriterionField = (
    setter: Dispatch<SetStateAction<ChecklistSection[]>>,
    sIndex: number,
    cIndex: number,
    field: keyof ChecklistCriterion,
    value: any,
  ) =>
    setter((prev) =>
      prev.map((s, i) =>
        i === sIndex
          ? { ...s, criteria: s.criteria.map((c, j) => (j === cIndex ? { ...c, [field]: value } : c)) }
          : s,
      ),
    );

  const addCriterionToSection = (
    setter: Dispatch<SetStateAction<ChecklistSection[]>>,
    sIndex: number,
  ) =>
    setter((prev) =>
      prev.map((s, i) =>
        i === sIndex
          ? { ...s, criteria: [...s.criteria, { criterionName: '', description: '', maxScore: DEFAULT_CRITERION_MARKS }] }
          : s,
      ),
    );

  const removeCriterionFromSection = (
    setter: Dispatch<SetStateAction<ChecklistSection[]>>,
    sIndex: number,
    cIndex: number,
  ) =>
    setter((prev) =>
      prev.map((s, i) => (i === sIndex ? { ...s, criteria: s.criteria.filter((_, j) => j !== cIndex) } : s)),
    );

  const removeChecklistSection = (index: number) => {
    const remaining = checklist.filter((_, i) => i !== index);
    if (remaining.length === 0) {
      setChecklist([]);
      setChecklistGenerated(false);
      return;
    }
    // Re-distribute the removed section's weight across the rest.
    setChecklist(renormalizeChecklistWeights(remaining));
  };

  // ── Manual Validation ──────────────────────────
  const validateStep = (step: number): boolean => {
    setError('');
    if (step === 0) {
      if (!examForm.title.trim()) { setError('Exam title is required'); return false; }
      if (!examForm.tradeId) { setError('Please select a trade'); return false; }
      if (!examForm.duration || examForm.duration < 1) { setError('Duration must be at least 1 minute'); return false; }
      return true;
    }
    if (step === 1) {
      if (!htmlToPlainText(examForm.description).trim()) { setError('Scenario is required — describe the situation for candidates'); return false; }
      if (tasks.length === 0) { setError('Write at least one task in the tasks area'); return false; }
      for (const task of tasks) {
        if (!htmlToPlainText(task.text).trim()) { setError('Every task needs content'); return false; }
      }
      return true;
    }
    if (step === 2) {
      if (!checklistGenerated || checklist.length === 0) { setError('Generate the assessment checklist first'); return false; }
      const totalWeight = checklist.reduce((sum, s) => sum + s.weight, 0);
      if (totalWeight !== 100) { setError(`Total section weight is ${totalWeight}%, must equal 100%`); return false; }
      for (const s of checklist) {
        if (!s.title.trim()) { setError('Every checklist section needs a title'); return false; }
        if (s.weight <= 0) { setError(`Section "${s.title}" must have a weight > 0%`); return false; }
        for (const c of s.criteria) {
          if (!c.criterionName.trim()) { setError('Every indicator needs a name'); return false; }
          if (c.maxScore <= 0) { setError('Every indicator needs a max score > 0'); return false; }
        }
      }
      return true;
    }
    return true;
  };

  // ── Manual Submit ──────────────────────────────
  const handleManualSubmit = async () => {
    if (!validateStep(2)) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Instructions are derived from the scenario + checklist guidance.
      const plainScenario = htmlToPlainText(examForm.description);
      const exam = await examService.create({
        ...examForm,
        workspaceTools,
        lockedWorkspaceTools: lockedTools,
        instructions: plainScenario
          ? `${plainScenario}\n\nComplete all tasks according to the assessment criteria.`
          : 'Complete all tasks according to the assessment criteria.',
      });
      const examId = exam.id;
      setCreatedExamId(examId);

      let sectionsCreated = 0;
      let questionsCreated = 0;
      let criteriaCreated = 0;

      for (const section of checklist) {
        const createdSection = await examService.createSection(examId, {
          title: section.title,
          orderIndex: sectionsCreated,
          sectionType: section.sectionType,
          weight: section.weight,
        });
        sectionsCreated++;

        // Assessment checklist rows become section-level rubric criteria.
        for (const criterion of section.criteria) {
          await examService.createRubricCriterion(createdSection.id, {
            criterionName: criterion.criterionName,
            description: criterion.description || undefined,
            maxScore: criterion.maxScore,
          });
          criteriaCreated++;
        }

        // Tasks become questions — no marks, scored via the checklist.
        const sectionTasks = section.taskIndexes
          .map((idx) => tasks[idx])
          .filter((t): t is TaskForm => Boolean(t));
        if (sectionTasks.length === 0) {
          await examService.createQuestion(createdSection.id, {
            questionText: `Complete the tasks for ${section.title}`,
            questionType: 'ESSAY',
            points: 0,
            orderIndex: 0,
          });
          questionsCreated++;
        } else {
          for (const [qi, task] of sectionTasks.entries()) {
            await examService.createQuestion(createdSection.id, {
              questionText: task.text || 'Task',
              questionType: detectQuestionType(task.text),
              points: 0,
              orderIndex: qi,
            });
            questionsCreated++;
          }
        }
      }

      if (questionsCreated > 0) {
        await examService.publish(examId);
      }

      setSuccess(
        `Exam "${exam.title}" created successfully! ${sectionsCreated} checklist sections, ${criteriaCreated} indicators, and ${questionsCreated} tasks saved.`,
      );
      setTimeout(() => navigate(`/admin/exams/${examId}`), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create exam');
    } finally {
      setSaving(false);
    }
  };

  // ── Upload Flow ────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.toLowerCase().split('.').pop();
      if (!['pdf', 'docx', 'doc', 'txt'].includes(ext || '')) {
        setError('Please upload a PDF, Word document (.docx/.doc), or text file.');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUploadAndParse = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }
    if (!selectedTradeId) {
      setError('Please select a trade for this exam.');
      return;
    }

    setIsParsing(true);
    setError('');

    try {
      const result = await examService.uploadAndParse(
        selectedFile,
        selectedTradeId,
        (progress) => setUploadProgress(progress),
      );
      // Deep clone for editing + build the same tasks/checklist model the
      // manual flow uses (Title / Scenario / Tasks / Assessment Checklist).
      const cloned = JSON.parse(JSON.stringify(result.parsedData)) as ParsedExamData;
      const model = parsedToUploadModel(cloned, generateTempId);
      setEditableParsed(cloned);
      setUploadTasks(model.tasks);
      // Open the tasks editor with every detected task marker-highlighted.
      setUploadTasksText(tasksToHighlightedHtml(model.tasks));
      setUploadChecklist(renormalizeChecklistWeights(model.checklist));
      setUploadStep(1);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to parse document');
    } finally {
      setIsParsing(false);
    }
  };

  const handleUpdateParsedField = (path: string[], value: any) => {
    if (!editableParsed) return;
    const updated = JSON.parse(JSON.stringify(editableParsed));
    let obj: any = updated;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i]!;
      if (obj && typeof obj === 'object' && key in obj) {
        obj = obj[key];
      } else {
        return;
      }
    }
    const lastKey = path[path.length - 1]!;
    if (obj && typeof obj === 'object') {
      obj[lastKey] = value;
    }
    setEditableParsed(updated);
  };

  /** Tasks are edited in ONE working area (like manual); re-detect tasks and
   *  re-assign them to the extracted checklist sections on every change. */
  const handleUploadTasksChange = (html: string) => {
    setUploadTasksText(html);
    const nextTasks = extractNumberedTasks(html).map((text) => ({ tempId: generateTempId(), text }));
    setUploadTasks(nextTasks);
    setUploadChecklist((prev) => assignTasksToUploadSections(nextTasks, prev));
  };

  /** Re-apply the marker highlight around the currently detected tasks after
   *  the author edits the tasks area (newly typed tasks get highlighted too). */
  const rehighlightUploadTasks = () => {
    if (uploadTasks.length === 0) return;
    setUploadTasksText(tasksToHighlightedHtml(uploadTasks));
  };

  const handleConfirmImport = async () => {
    if (!editableParsed) return;
    setError('');
    if (!editableParsed.title.trim()) { setError('Exam title is required'); return; }
    if (!htmlToPlainText(editableParsed.description || '').trim()) { setError('Scenario is required'); return; }
    if (uploadTasks.length === 0) { setError('Write at least one task in the tasks area'); return; }
    const flat = uploadChecklist[0];
    if (!flat || flat.criteria.length === 0) { setError('The assessment checklist is empty'); return; }
    for (const c of flat.criteria) {
      if (!c.criterionName.trim()) { setError('Every indicator needs a name'); return; }
      if (c.maxScore <= 0) { setError('Every indicator needs a max score > 0'); return; }
    }

    setSaving(true);
    setSuccess('');

    try {
      // Rebuild the parsed-document contract from the edited Title / Scenario /
      // Tasks / Assessment Checklist model. The uploaded exam is ONE practical
      // section: every task and every indicator lives there. Tasks carry NO
      // marks — all marks live on the assessment checklist (rubric criteria).
      const flat = uploadChecklist[0]!;
      const payload: ParsedExamData = {
        ...editableParsed,
        title: editableParsed.title,
        description: editableParsed.description,
        sections: [
          {
            title: flat.title || 'Practical Assessment',
            sectionType: flat.sectionType,
            weight: flat.weight || 100,
            rubricCriteria: flat.criteria.map((c) => ({
              criterionName: c.criterionName,
              description: c.description || undefined,
              maxScore: c.maxScore,
            })),
            questions: uploadTasks.map((t, qi) => ({
              questionText: t.text,
              questionType: t.questionType || detectQuestionType(t.text),
              points: 0,
              orderIndex: qi,
              options: t.options && t.options.length > 0 ? t.options : undefined,
              expectedOutput: t.expectedOutput,
            })),
          },
        ],
      };
      const result = await examService.confirmImport(
        payload,
        selectedTradeId,
        workspaceTools,
        lockedTools,
      );
      setUploadStep(2);
      setSuccess(
        `Exam "${result.exam.title}" created with ${result.stats.questionsCreated} tasks and ${result.stats.rubricCriteriaCreated} checklist indicators!`,
      );
      setTimeout(() => navigate(`/admin/exams/${result.exam.id}`), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create exam');
    } finally {
      setSaving(false);
    }
  };

  const resetToChoice = () => {
    setCreationMode('choose');
    setCurrentStep(0);
    setUploadStep(0);
    setSelectedFile(null);
    setEditableParsed(null);
    setUploadTasks([]);
    setUploadTasksText('');
    setUploadChecklist([]);
    setUploadProgress(0);
    setWorkspaceTools([...ALL_WORKSPACE_TOOLS]);
    setLockedTools([]);
    setToolsCustomized(false);
    setError('');
    setSuccess('');
  };

  /** Go back to the upload step and forget the parsed document. */
  const resetUploadParse = () => {
    setUploadStep(0);
    setEditableParsed(null);
    setUploadTasks([]);
    setUploadTasksText('');
    setUploadChecklist([]);
    setUploadProgress(0);
    setError('');
  };

  // ── Render ────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary-500" />
          <p className="mt-3 text-sm text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  //  CREATION MODE CHOICE SCREEN
  // ═══════════════════════════════════════════════
  if (creationMode === 'choose') {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/exams')}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Create New Exam</h1>
            <p className="mt-1 text-sm text-text-secondary">Choose how you want to create your exam</p>
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Upload Document Card */}
          <div
            onClick={() => setCreationMode('upload')}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-border bg-white p-8 transition-all hover:border-primary-400 hover:shadow-elevation-medium"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative z-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 shadow-sm">
                <Upload className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-text-primary">Upload Document</h3>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                Upload a PDF, Word document, or text file. Our AI will automatically extract and organize questions, sections, and scoring criteria.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  { icon: FileText, text: 'Supports PDF, DOCX, DOC, TXT' },
                  { icon: Sparkles, text: 'AI-powered extraction & structuring' },
                  { icon: PenLine, text: 'Review & edit before publishing' },
                  { icon: Wand2, text: 'Auto-detects sections, tasks & checklist marks' },
                ].map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-50">
                      <f.icon className="h-3.5 w-3.5 text-primary-600" />
                    </div>
                    <span className="text-sm text-text-secondary">{f.text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button fullWidth size="lg" icon={<FileUp className="h-4 w-4" />}>
                  Upload & Parse Document
                </Button>
              </div>
            </div>
          </div>

          {/* Create Manually Card */}
          <div
            onClick={() => setCreationMode('manual')}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-border bg-white p-8 transition-all hover:border-secondary-400 hover:shadow-elevation-medium"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-secondary-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative z-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary-100 to-secondary-50 shadow-sm">
                <PenLine className="h-8 w-8 text-secondary-600" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-text-primary">Create Manually</h3>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                Build your exam from scratch — write the scenario and tasks in a rich-text editor, and we'll auto-generate the assessment checklist in the standard format.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  { icon: PenLine, text: 'Rich-text scenario & tasks editor' },
                  { icon: ListChecks, text: 'Auto-generated assessment checklist' },
                  { icon: Layout, text: 'Standard TVET checklist format' },
                  { icon: Settings2, text: 'Full exam configuration' },
                ].map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary-50">
                      <f.icon className="h-3.5 w-3.5 text-secondary-600" />
                    </div>
                    <span className="text-sm text-text-secondary">{f.text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button variant="secondary" fullWidth size="lg" icon={<PenLine className="h-4 w-4" />}>
                  Create from Scratch
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  //  UPLOAD & PARSE FLOW
  // ═══════════════════════════════════════════════
  if (creationMode === 'upload') {
    // Trade whose default working environment pre-fills the candidate workspace
    const uploadTrade = trades.find((t) => t.id === selectedTradeId);
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={resetToChoice}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                {uploadStep === 0 ? 'Upload Document' : uploadStep === 1 ? 'Review Parsed Content' : 'Import Complete'}
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                {uploadStep === 0
                  ? 'Upload an exam document to automatically extract questions'
                  : uploadStep === 1
                    ? 'Review, edit, and confirm the AI-extracted content'
                    : 'Exam has been created successfully'}
              </p>
            </div>
          </div>
          <Badge variant="info" size="md">Import</Badge>
        </div>

        {/* Stepper */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {[
              { label: 'Upload', icon: Upload },
              { label: 'Review', icon: Search },
              { label: 'Complete', icon: Check },
            ].map((step, index) => (
              <div key={step.label} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all',
                      index < uploadStep
                        ? 'bg-accent-500 text-white'
                        : index === uploadStep
                          ? 'bg-primary-600 text-white ring-2 ring-primary-200'
                          : 'bg-surface-tertiary text-text-tertiary',
                    )}
                  >
                    {index < uploadStep ? <Check className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
                  </div>
                  <span
                    className={cn(
                      'hidden text-sm font-medium sm:inline',
                      index <= uploadStep ? 'text-text-primary' : 'text-text-tertiary',
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < 2 && (
                  <div
                    className={cn(
                      'mx-3 h-0.5 w-12 sm:w-20',
                      index < uploadStep ? 'bg-accent-500' : 'bg-surface-tertiary',
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" /><span>{success}</span>
          </div>
        )}

        {/* ── Step 0: Upload ──────────────────── */}
        {uploadStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary-500" />
                Select Document to Import
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              {/* Trade selection */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  Trade <span className="text-error">*</span>
                </label>
                <select
                  value={selectedTradeId}
                  onChange={(e) => {
                    const tradeId = e.target.value;
                    // Ask for confirmation before discarding a custom tool selection
                    if (tradeId && toolsCustomized) {
                      const trade = trades.find((t) => t.id === tradeId);
                      const confirmed = window.confirm(
                        `Change the working environment? Changing the trade to "${trade?.name || tradeId}" will reset the workspace tools to the trade's default environment. Any custom tool selection will be lost.`,
                      );
                      if (!confirmed) return;
                    }
                    setSelectedTradeId(tradeId);
                    applyTradeWorkspaceDefault(tradeId);
                  }}
                  className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 hover:border-border-hover"
                >
                  <option value="">Select a trade...</option>
                  {trades.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* File upload zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border bg-surface-secondary p-12 transition-all hover:border-primary-400 hover:bg-primary-50/30"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 shadow-sm">
                  <Upload className="h-8 w-8 text-primary-600" />
                </div>
                <div className="text-center">
                  <p className="text-base font-medium text-text-primary">
                    {selectedFile ? selectedFile.name : 'Drag & drop your exam document here'}
                  </p>
                  <p className="mt-1 text-sm text-text-tertiary">
                    {selectedFile
                      ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`
                      : 'or click to browse - PDF, DOCX, DOC, TXT (max 20MB)'}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Selected file info */}
              {selectedFile && (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{selectedFile.name}</p>
                    <p className="text-xs text-text-tertiary">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                      {' · '}
                      {selectedFile.name.endsWith('.pdf')
                        ? 'PDF'
                        : selectedFile.name.endsWith('.docx') || selectedFile.name.endsWith('.doc')
                          ? 'Word Document'
                          : 'Text File'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="rounded-md p-1 text-text-tertiary hover:bg-red-50 hover:text-error"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Upload progress */}
              {isParsing && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary-500" />
                    <span>
                      {uploadProgress < 100
                        ? `Uploading... ${uploadProgress}%`
                        : 'Parsing document with AI...'}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all duration-500"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </CardBody>
            <CardFooter>
              <Button
                onClick={handleUploadAndParse}
                disabled={!selectedFile || !selectedTradeId || isParsing}
                loading={isParsing}
                size="lg"
              >
                {isParsing ? (
                  <>
                    <RefreshCw className="mr-1 h-4 w-4 animate-spin" /> Parsing Document...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1 h-4 w-4" /> Upload & Parse with AI
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* ── Step 1: Review & Edit (Title / Scenario / Tasks / Checklist) ── */}
        {uploadStep === 1 && editableParsed && (
          <div className="space-y-6">
            {/* Exam Title */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-primary-500" />
                  Exam Title
                </CardTitle>
              </CardHeader>
              <CardBody>
                <Input
                  label="Exam Title"
                  value={editableParsed.title}
                  onChange={(e) => handleUpdateParsedField(['title'], e.target.value)}
                  icon={<FileCheck className="h-4 w-4" />}
                  required
                />
              </CardBody>
            </Card>

            {/* Scenario */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary-500" />
                  Scenario
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-sm font-medium text-text-primary">
                      Scenario <span className="text-error">*</span>
                    </label>
                    <span className="text-xs text-text-tertiary">
                      The integrated situation presented to the candidate
                    </span>
                  </div>
                  <RichTextEditor
                    value={editableParsed.description || ''}
                    onChange={(html) => handleUpdateParsedField(['description'], html)}
                    placeholder="Scenario / integrated situation presented to the candidate..."
                    minHeight={220}
                  />
                </div>
              </CardBody>
            </Card>

            {/* Tasks — one working area, as in the sample exam document */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary-500" />
                  Tasks
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className="block text-sm font-medium text-text-primary">
                      Tasks <span className="text-error">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {uploadTasks.length > 0 && (
                        <Badge variant="info" size="md">
                          {uploadTasks.length} {uploadTasks.length === 1 ? 'task' : 'tasks'} detected
                        </Badge>
                      )}
                      {uploadTasks.length > 0 && (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={rehighlightUploadTasks}
                          title="Re-apply the marker highlight around the detected tasks"
                        >
                          <Highlighter className="mr-1 h-3 w-3" /> Re-highlight
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="mb-3 text-xs text-text-tertiary">
                    All the tasks the candidate must complete, numbered exactly as in the extracted document.
                    Each detected task is highlighted in the editor — edit freely, then use “Re-highlight”
                    to refresh the markers.
                  </p>

                  <RichTextEditor
                    value={uploadTasksText}
                    onChange={handleUploadTasksChange}
                    placeholder={`1. Using attributes provided below, design an Entity Relationship Diagram (ERD)...\n2. Creating database called EPMS with Employee, Department and Salary tables...`}
                    minHeight={340}
                  />

                  {uploadTasks.length === 0 && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-warning">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      No tasks detected — start each task on its own line with a number (1., 2., 3. …)
                    </p>
                  )}

                  {uploadTasks.length > 0 && (
                    <div className="mt-3 rounded-xl border border-border bg-surface-secondary p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                          Detected tasks
                        </span>
                        <span className="text-xs text-text-tertiary">Used for the assessment checklist</span>
                      </div>
                      <ol className="space-y-1.5">
                        {uploadTasks.map((task, index) => (
                          <li key={task.tempId} className="flex items-start gap-2.5 text-sm">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-semibold text-primary-700">
                              {index + 1}
                            </span>
                            <span className="min-w-0 flex-1 text-text-secondary">
                              {htmlToPlainText(task.text)}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Assessment Checklist (extracted from the document, editable) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary-500" />
                  Assessment Checklist
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-surface-secondary p-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {uploadChecklist[0]!.criteria.length} indicators ·{' '}
                      {uploadChecklist[0]!.criteria.reduce((cs, c) => cs + c.maxScore, 0)} total marks
                    </p>
                    <p className="text-xs text-text-tertiary">
                      Extracted from the document — adjust indicators and marks as needed
                    </p>
                  </div>
                </div>

                {/* One flat indicators list — the document's TVET section
                    grouping is dropped for these practical design/code exams */}
                <div className="rounded-lg border border-accent-200 bg-accent-50/30 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-accent-600" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-accent-700">Indicators</span>
                    <Badge size="sm" variant="success">
                      {uploadChecklist[0]!.criteria.reduce((sum, rc) => sum + rc.maxScore, 0)} marks
                    </Badge>
                    <Button size="xs" variant="ghost" className="ml-auto" onClick={() => addCriterionToSection(setUploadChecklist, 0)}>
                      <Plus className="mr-1 h-3 w-3" /> Add Indicator
                    </Button>
                  </div>
                  {uploadChecklist[0]!.criteria.length === 0 ? (
                    <p className="py-4 text-center text-sm text-text-tertiary">
                      No indicators were extracted from this document — add them below to build the assessment checklist.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {uploadChecklist[0]!.criteria.map((criterion, cIndex) => (
                        <div key={cIndex} className="flex items-start gap-3 rounded-lg border border-accent-100 bg-white p-2.5">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-700">
                            {cIndex + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <input
                                className="min-w-0 flex-1 rounded border border-border bg-white px-2 py-1 text-xs font-medium text-text-primary"
                                value={criterion.criterionName}
                                onChange={(e) => updateCriterionField(setUploadChecklist, 0, cIndex, 'criterionName', e.target.value)}
                                placeholder="Indicator name"
                              />
                              <div className="flex shrink-0 items-center gap-1">
                                <input
                                  className="w-14 rounded border border-border px-2 py-1 text-center text-xs"
                                  type="number"
                                  value={criterion.maxScore}
                                  onChange={(e) => updateCriterionField(setUploadChecklist, 0, cIndex, 'maxScore', Number(e.target.value))}
                                />
                                <span className="text-xs text-text-tertiary">pts</span>
                                <button
                                  onClick={() => removeCriterionFromSection(setUploadChecklist, 0, cIndex)}
                                  className="ml-1 rounded-md p-1 text-text-tertiary hover:bg-red-50 hover:text-error"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            <textarea
                              className="mt-1 w-full rounded border border-border bg-white px-2 py-1 text-xs text-text-secondary"
                              rows={1}
                              value={criterion.description}
                              onChange={(e) => updateCriterionField(setUploadChecklist, 0, cIndex, 'description', e.target.value)}
                              placeholder="Indicator description..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Workspace Tools — pre-set from the selected trade, editable before create */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary-500" />
                  Workspace Tools
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-xs text-text-tertiary">
                  Working environment pre-set from the{' '}
                  <strong>{uploadTrade ? uploadTrade.name : 'selected'}</strong> trade — adjust
                  the candidate's workspace below.
                </p>
                <WorkspaceToolsGrid
                  tools={workspaceTools}
                  onChange={handleWorkspaceToolsChange}
                  lockedTools={lockedTools}
                  onChangeLocked={setLockedTools}
                  tradeDefaultTools={
                    uploadTrade ? resolveTradeWorkspaceDefaults(uploadTrade) : undefined
                  }
                  tradeDefaultLabel={uploadTrade ? `${uploadTrade.name} default` : undefined}
                />
              </CardBody>
            </Card>

            {/* Action buttons */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-white p-4">
              <Button variant="secondary" onClick={resetToChoice}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Cancel
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={resetUploadParse}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Upload Different
                </Button>
                <Button onClick={handleConfirmImport} loading={saving} size="lg">
                  {saving ? (
                    <><RefreshCw className="mr-1 h-4 w-4 animate-spin" /> Creating...</>
                  ) : (
                    <><CheckCircle2 className="mr-1 h-4 w-4" /> Create Exam from Parsed Data</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Complete ─────────────── */}
        {uploadStep === 2 && (
          <Card>
            <CardBody className="py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-50">
                <CheckCircle2 className="h-8 w-8 text-accent-600" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-text-primary">Exam Created Successfully!</h2>
              <p className="mt-2 text-sm text-text-secondary">{success}</p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button variant="secondary" onClick={resetToChoice}>
                  Create Another Exam
                </Button>
                <Button onClick={() => navigate('/admin/exams')}>
                  Go to Exams <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  //  MANUAL CREATION FLOW (existing)
  // ═══════════════════════════════════════════════
  const manualSteps = ['Exam Details', 'Scenario & Tasks', 'Assessment Checklist', 'Review & Publish'];
  // Trade whose default working environment pre-fills the candidate workspace
  const manualTrade = trades.find((t) => t.id === examForm.tradeId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={resetToChoice}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Create New Exam</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Design a comprehensive competency assessment
            </p>
          </div>
        </div>
        <Badge variant="info" size="md">Manual</Badge>
      </div>

      {/* Stepper */}
      <Stepper steps={manualSteps} currentStep={currentStep} />

      {/* Error / Success */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /><span>{success}</span>
        </div>
      )}

      {/* ──── STEP 0: Exam Details ──────────────── */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary-500" />
              Basic Exam Information
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Exam Title"
                  placeholder="e.g. Software Development Final Assessment"
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  icon={<FileCheck className="h-4 w-4" />}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  Trade <span className="text-error">*</span>
                </label>
                <select
                  value={examForm.tradeId}
                  onChange={(e) => {
                    const tradeId = e.target.value;
                    // Ask for confirmation before discarding a custom tool selection
                    if (tradeId && toolsCustomized) {
                      const trade = trades.find((t) => t.id === tradeId);
                      const confirmed = window.confirm(
                        `Change the working environment? Changing the trade to "${trade?.name || tradeId}" will reset the workspace tools to the trade's default environment. Any custom tool selection will be lost.`,
                      );
                      if (!confirmed) return;
                    }
                    setExamForm({ ...examForm, tradeId });
                    applyTradeWorkspaceDefault(tradeId);
                  }}
                  className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 hover:border-border-hover"
                >
                  <option value="">Select a trade...</option>
                  {trades.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  Exam Type <span className="text-error">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {EXAM_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setExamForm({ ...examForm, examType: type.value as any })}
                      className={cn(
                        'rounded-xl border p-3 text-left transition-all',
                        examForm.examType === type.value
                          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                          : 'border-border bg-white hover:border-primary-200 hover:bg-surface-secondary',
                      )}
                    >
                      <div className="text-sm font-medium">{type.label}</div>
                      <div className="mt-0.5 text-xs text-text-tertiary">{type.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Duration (minutes)"
                type="number"
                value={examForm.duration}
                onChange={(e) => setExamForm({ ...examForm, duration: Number(e.target.value) })}
                suffix="min"
                required
              />

              <Input
                label="Passing Score (%)"
                type="number"
                value={examForm.passingScore}
                onChange={(e) => setExamForm({ ...examForm, passingScore: Number(e.target.value) })}
                suffix="%"
              />

              <Input
                label="Max Attempts"
                type="number"
                value={examForm.maxAttempts}
                onChange={(e) => setExamForm({ ...examForm, maxAttempts: Number(e.target.value) })}
              />

              <div className="space-y-3">
                <label className="block text-sm font-medium text-text-primary">Exam Settings</label>
                <div className="space-y-2">
                  {[
                    { key: 'allowOralDefense', label: 'Allow Oral Defense', desc: 'Candidates can present and defend their work' },
                    { key: 'requireFullScreen', label: 'Require Full Screen', desc: 'Lock full-screen mode during exam' },
                    { key: 'requireWebcam', label: 'Require Webcam', desc: 'Enable webcam proctoring' },
                  ].map((setting) => (
                    <label key={setting.key} className="flex items-start gap-3 rounded-lg border border-border bg-white p-3 cursor-pointer hover:bg-surface-secondary transition-colors">
                      <input
                        type="checkbox"
                        checked={(examForm as any)[setting.key]}
                        onChange={(e) => setExamForm({ ...examForm, [setting.key]: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <div className="text-sm font-medium text-text-primary">{setting.label}</div>
                        <div className="text-xs text-text-tertiary">{setting.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
          <CardFooter>
            <Button onClick={() => { if (validateStep(0)) setCurrentStep(1); }}>
              Next: Scenario & Tasks <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ──── STEP 1: Scenario & Tasks ───────────── */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary-500" />
              Scenario & Tasks
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-6">
            {/* Scenario */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-text-primary">
                  Scenario <span className="text-error">*</span>
                </label>
                <span className="text-xs text-text-tertiary">
                  The integrated situation presented to the candidate
                </span>
              </div>
              <RichTextEditor
                value={examForm.description || ''}
                onChange={(html) => setExamForm({ ...examForm, description: html })}
                placeholder="e.g. SmartPark is a company located in Rubavu District... It needs a system to manage employees, departments, and salaries."
                minHeight={220}
              />
            </div>

            {/* Tasks — one working area, as in the sample exam document */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-text-primary">
                  Tasks <span className="text-error">*</span>
                </label>
                {tasks.length > 0 && (
                  <Badge variant="info" size="md">
                    {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} detected
                  </Badge>
                )}
              </div>
              <p className="mb-3 text-xs text-text-tertiary">
                Write all the tasks the candidate must complete in this single working area — numbered,
                exactly as in the exam document. The standard TVET assessment checklist is generated
                automatically from your tasks.
              </p>

              <RichTextEditor
                value={tasksText}
                onChange={handleTasksChange}
                placeholder={`1. Using attributes provided below, design an Entity Relationship Diagram (ERD)...\n2. Creating database called EPMS with Employee, Department and Salary tables...`}
                minHeight={340}
              />

              {tasks.length === 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-warning">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  No tasks detected yet — start each task on its own line with a number (1., 2., 3. …)
                </p>
              )}

              {tasks.length > 0 && (
                <div className="mt-3 rounded-xl border border-border bg-surface-secondary p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Detected tasks
                    </span>
                    <span className="text-xs text-text-tertiary">Used for the assessment checklist</span>
                  </div>
                  <ol className="space-y-1.5">
                    {tasks.map((task, index) => (
                      <li key={task.tempId} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-semibold text-primary-700">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 text-text-secondary">
                          {htmlToPlainText(task.text)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </CardBody>
          <CardFooter className="justify-between">
            <Button variant="secondary" onClick={() => setCurrentStep(0)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back: Exam Details
            </Button>
            <Button
              onClick={() => {
                if (!validateStep(1)) return;
                // Cancel any pending auto-generation so a stale debounce can't
                // overwrite checklist edits made after this step, then ensure
                // the checklist exists before advancing.
                if (checklistTimer.current) clearTimeout(checklistTimer.current);
                if (!checklistGenerated || checklist.length === 0) {
                  buildChecklistFromTasks(tasks);
                }
                setCurrentStep(2);
              }}
            >
              Next: Assessment Checklist <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ──── STEP 2: Assessment Checklist ──────── */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary-500" />
              Assessment Checklist
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {!checklistGenerated || checklist.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-accent-200 bg-accent-50/30 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-100 to-accent-50">
                  <Wand2 className="h-7 w-7 text-accent-600" />
                </div>
                <div>
                  <p className="text-base font-semibold text-text-primary">Assessment Checklist</p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-text-secondary">
                    The standard TVET checklist (Preliminary, Process, Presentation and Closing — with all the
                    sample-exam indicators) is generated automatically from your tasks.
                    Add at least one task in the <strong>Scenario &amp; Tasks</strong> step to build it.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg bg-surface-secondary p-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Total Weight: <strong>{checklist.reduce((sum, s) => sum + s.weight, 0)}%</strong> ·{' '}
                      {checklist.reduce((sum, s) => sum + s.criteria.length, 0)} indicators ·{' '}
                      {checklist.reduce((sum, s) => sum + s.criteria.reduce((cs, c) => cs + c.maxScore, 0), 0)} total marks
                    </p>
                    <p className="text-xs text-text-tertiary">
                      Auto-generated from the standard TVET checklist and your tasks — adjust weights, indicators, and marks as needed
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={generateChecklist}>
                    <RefreshCw className="mr-1 h-3.5 w-3.5" /> Regenerate
                  </Button>
                </div>

                {checklist.map((section, sIndex) => (
                  <div key={sIndex} className="rounded-xl border border-border bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-text-tertiary uppercase shrink-0">
                        Section {sIndex + 1}
                      </span>
                      <input
                        className="min-w-40 flex-1 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium text-text-primary"
                        value={section.title}
                        onChange={(e) => updateSectionField(setChecklist, sIndex, 'title', e.target.value)}
                        placeholder="Section title"
                      />
                      <select
                        value={section.sectionType}
                        onChange={(e) => updateSectionField(setChecklist, sIndex, 'sectionType', e.target.value)}
                        className="rounded-lg border border-border bg-white px-2 py-1.5 text-xs"
                      >
                        {SECTION_TYPES.map((st) => (
                          <option key={st.value} value={st.value}>{st.label}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <input
                          className="w-16 rounded-lg border border-border px-2 py-1.5 text-center text-xs"
                          type="number"
                          value={section.weight}
                          onChange={(e) => updateSectionField(setChecklist, sIndex, 'weight', Number(e.target.value))}
                        />
                        <span className="text-xs text-text-tertiary">%</span>
                      </div>
                      <button
                        onClick={() => removeChecklistSection(sIndex)}
                        className="rounded-md p-1 text-text-tertiary hover:bg-red-50 hover:text-error"
                        title="Remove section"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Assigned tasks */}
                    {section.taskIndexes.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {section.taskIndexes.map((taskIdx, ti) => {
                          const task = tasks[taskIdx];
                          if (!task) return null;
                          return (
                            <div key={ti} className="flex items-start gap-2 rounded-lg bg-surface-secondary px-3 py-2 text-xs text-text-secondary">
                              <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500" />
                              <span className="min-w-0 flex-1">{richTextPreview(task.text, 140)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Indicators */}
                    <div className="mt-3 rounded-lg border border-accent-200 bg-accent-50/30 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-accent-600" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-accent-700">Indicators</span>
                        <Badge size="sm" variant="success">
                          {section.criteria.reduce((sum, rc) => sum + rc.maxScore, 0)} marks
                        </Badge>
                        <Button size="xs" variant="ghost" className="ml-auto" onClick={() => addCriterionToSection(setChecklist, sIndex)}>
                          <Plus className="mr-1 h-3 w-3" /> Add Indicator
                        </Button>
                      </div>
                      <div className="space-y-1.5">
                        {section.criteria.map((criterion, cIndex) => (
                          <div key={cIndex} className="flex items-start gap-3 rounded-lg border border-accent-100 bg-white p-2.5">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-700">
                              {cIndex + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <input
                                  className="min-w-0 flex-1 rounded border border-border bg-white px-2 py-1 text-xs font-medium text-text-primary"
                                  value={criterion.criterionName}
                                  onChange={(e) => updateCriterionField(setChecklist, sIndex, cIndex, 'criterionName', e.target.value)}
                                  placeholder="Indicator name"
                                />
                                <div className="flex shrink-0 items-center gap-1">
                                  <input
                                    className="w-14 rounded border border-border px-2 py-1 text-center text-xs"
                                    type="number"
                                    value={criterion.maxScore}
                                    onChange={(e) => updateCriterionField(setChecklist, sIndex, cIndex, 'maxScore', Number(e.target.value))}
                                  />
                                  <span className="text-xs text-text-tertiary">pts</span>
                                  <button
                                    onClick={() => removeCriterionFromSection(setChecklist, sIndex, cIndex)}
                                    className="ml-1 rounded-md p-1 text-text-tertiary hover:bg-red-50 hover:text-error"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                              <textarea
                                className="mt-1 w-full rounded border border-border bg-white px-2 py-1 text-xs text-text-secondary"
                                rows={1}
                                value={criterion.description}
                                onChange={(e) => updateCriterionField(setChecklist, sIndex, cIndex, 'description', e.target.value)}
                                placeholder="Indicator description..."
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </CardBody>
          <CardFooter className="justify-between">
            <Button variant="secondary" onClick={() => setCurrentStep(1)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back: Scenario & Tasks
            </Button>
            <Button onClick={() => { if (validateStep(2)) setCurrentStep(3); }}>
              Review & Publish <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ──── STEP 3: Review & Publish ─────────── */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary-500" />
              Review & Publish
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="rounded-lg bg-surface-secondary p-4">
              <h3 className="text-lg font-semibold text-text-primary">{examForm.title || 'Untitled Exam'}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <ReviewField label="Trade" value={trades.find((t) => t.id === examForm.tradeId)?.name || 'Not selected'} />
                  <ReviewField label="Type" value={EXAM_TYPES.find((t) => t.value === examForm.examType)?.label || ''} />
                  <ReviewField label="Duration" value={`${examForm.duration} minutes`} />
                  <ReviewField label="Passing Score" value={`${examForm.passingScore}%`} />
                </div>
                <div className="space-y-2">
                  <ReviewField label="Max Attempts" value={String(examForm.maxAttempts)} />
                  <ReviewField label="Oral Defense" value={examForm.allowOralDefense ? 'Yes' : 'No'} />
                  <ReviewField label="Full Screen" value={examForm.requireFullScreen ? 'Required' : 'Optional'} />
                  <ReviewField label="Webcam" value={examForm.requireWebcam ? 'Required' : 'Optional'} />
                </div>
              </div>
            </div>

            {/* Scenario preview */}
            {htmlToPlainText(examForm.description) && (
              <div className="rounded-lg border border-border bg-white p-3">
                <p className="mb-1 text-xs font-medium uppercase text-text-tertiary">Scenario</p>
                <p className="whitespace-pre-wrap text-sm text-text-secondary">
                  {htmlToPlainText(examForm.description)}
                </p>
              </div>
            )}

            {/* Tasks preview */}
            {tasks.length > 0 && (
              <div className="rounded-lg border border-border bg-white p-3">
                <p className="mb-2 text-xs font-medium uppercase text-text-tertiary">Tasks ({tasks.length})</p>
                <div className="space-y-1.5">
                  {tasks.map((task, index) => (
                    <div key={task.tempId} className="flex items-start gap-2 text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-semibold text-primary-700">
                        {index + 1}
                      </span>
                      <span className="text-text-primary">{htmlToPlainText(task.text) || '(empty)'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist summary */}
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="mb-2 text-xs font-medium uppercase text-text-tertiary">Assessment Checklist</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-surface-secondary p-3">
                  <p className="text-xs text-text-tertiary">Sections</p>
                  <p className="text-xl font-bold text-text-primary">{checklist.length}</p>
                </div>
                <div className="rounded-lg bg-surface-secondary p-3">
                  <p className="text-xs text-text-tertiary">Indicators</p>
                  <p className="text-xl font-bold text-text-primary">
                    {checklist.reduce((sum, s) => sum + s.criteria.length, 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-secondary p-3">
                  <p className="text-xs text-text-tertiary">Total Marks</p>
                  <p className="text-xl font-bold text-text-primary">
                    {checklist.reduce((sum, s) => sum + s.criteria.reduce((cs, c) => cs + c.maxScore, 0), 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-secondary p-3">
                  <p className="text-xs text-text-tertiary">Total Weight</p>
                  <p className="text-xl font-bold text-text-primary">
                    {checklist.reduce((sum, s) => sum + s.weight, 0)}%
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {checklist.map((section, sIndex) => (
                  <div key={sIndex} className="flex items-center justify-between rounded-lg bg-surface-secondary px-3 py-1.5 text-xs">
                    <span className="font-medium text-text-primary">Section {sIndex + 1}: {section.title}</span>
                    <span className="text-text-tertiary">{section.weight}% · {section.criteria.length} indicators</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Workspace Tools — pre-set from the selected trade, editable before publish */}
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="mb-3 text-xs font-medium uppercase text-text-tertiary">Workspace Tools</p>
              <p className="mb-3 -mt-1 text-xs text-text-tertiary">
                Working environment pre-set from the{' '}
                <strong>{manualTrade ? manualTrade.name : 'selected'}</strong> trade.
              </p>
              <WorkspaceToolsGrid
                tools={workspaceTools}
                onChange={handleWorkspaceToolsChange}
                lockedTools={lockedTools}
                onChangeLocked={setLockedTools}
                tradeDefaultTools={
                  manualTrade ? resolveTradeWorkspaceDefaults(manualTrade) : undefined
                }
                tradeDefaultLabel={manualTrade ? `${manualTrade.name} default` : undefined}
              />
            </div>
          </CardBody>
          <CardFooter className="justify-between">
            <Button variant="secondary" onClick={() => setCurrentStep(2)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back: Checklist
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => navigate('/admin/exams')}>Cancel</Button>
              <Button onClick={handleManualSubmit} loading={saving}>
                {saving ? (
                  <><RefreshCw className="mr-1 h-4 w-4 animate-spin" /> Creating...</>
                ) : (
                  <><Send className="mr-1 h-4 w-4" /> Create & Publish Exam</>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

// ── Helper Components ──────────────────────────────

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-tertiary">{label}</span>
      <span className="text-xs font-medium text-text-primary">{value}</span>
    </div>
  );
}

export default AdminExamCreatePage;
