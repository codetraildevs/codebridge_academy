/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Badge } from '@components/ui/badge';
import {
  assessmentBuilderApi,
  type Assessment,
  type AssessmentTask,
  type AssessmentChecklistItem,
  type EvidenceRequirement,
  type AiEvaluationRule,
  type OralDefenseQuestion,
  type WorkspaceModule,
} from '@services/assessment-builder-service';

import { WorkspaceEngine, type AssignedModule } from '@components/workspace/workspace-engine';
import { AiEvaluationTab } from '@components/ai-evaluation/ai-evaluation-tab';
import { ImportAssessmentWizard } from '@components/assessment-builder/import-assessment-wizard';
import { AutoConfigPanel } from '@components/assessment-builder/auto-config-panel';
import { RichTextEditor, hasRichTextContent } from '@components/assessment-builder/rich-text-editor';
import { RichTextRenderer } from '@components/assessment-builder/rich-text-renderer';
import {
  CHECKLIST_SECTIONS,
  DEFAULT_CHECKLIST_SECTION,
} from '@components/assessment-builder/checklist-sections';
import { ChecklistTable } from '@components/assessment-builder/checklist-table';
import { AssessmentQuotaBanner } from '@components/subscription/assessment-quota-banner';
import { useOrgUsage } from '@hooks/use-org-usage';
import { sanitizeFilename } from '@utils/format';
import { fieldService, type Field } from '@services/field-service';
import { organizationService } from '@services/organization-service';
import type { Organization } from '../../types';
import {
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Send,
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  FileText,
  ClipboardCheck,
  FileSearch,
  Brain,
  MessageSquare,
  Puzzle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Play,
  Archive,
  Monitor,
  UploadCloud,
  PencilLine,
  ArrowRight,
  Download,
  Sparkles,
  Wand2,
} from 'lucide-react';

// ── Tabs ────────────────────────────────────────

type Tab = 'basic' | 'tasks' | 'checklist' | 'evidence' | 'ai-rules' | 'oral-questions' | 'workspace' | 'ai-evaluation';

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'basic', label: 'Basic Info', icon: FileText },
  { key: 'tasks', label: 'Tasks', icon: ClipboardCheck },
  { key: 'checklist', label: 'Checklist', icon: Check },
  { key: 'evidence', label: 'Evidence', icon: FileSearch },
  { key: 'ai-rules', label: 'AI Rules', icon: Brain },
  { key: 'oral-questions', label: 'Oral Defense', icon: MessageSquare },
  { key: 'workspace', label: 'Workspace', icon: Puzzle },
  { key: 'ai-evaluation', label: 'AI Evaluation', icon: Brain },
];

// ── Form field types ───────────────────────────

const ASSESSMENT_TYPES = ['PRACTICAL', 'THEORETICAL', 'MIXED'];
const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
const TASK_TYPES = ['CODE', 'DIAGRAM', 'ESSAY', 'FILE_UPLOAD', 'MULTIPLE_CHOICE', 'SHORT_ANSWER', 'SQL', 'DATABASE_DESIGN', 'NETWORK_CONFIG', 'PRESENTATION', 'PORTFOLIO', 'ORAL_DEFENSE'];
const CHECKLIST_METHODS = ['AUTOMATIC', 'MANUAL', 'ASSESSOR_REVIEW', 'AI_REVIEW'];
const EVIDENCE_TYPES = ['FILE', 'SCREENSHOT', 'VIDEO', 'AUDIO', 'CODE', 'TEXT', 'IMAGE'];
const AI_RULE_TYPES = ['SCORING', 'FEEDBACK', 'PLAGIARISM', 'COMPETENCY_MAPPING', 'SIMILARITY', 'ORAL_EVALUATION'];
const ORAL_QUESTION_TYPES = ['AI_GENERATED', 'MANUAL', 'FROM_BANK'];

// ── Utility Components ─────────────────────────

function SelectField({
  label,
  value,
  options,
  onChange,
  required,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-text-primary">
        {label}
        {required && <span className="ml-0.5 text-error">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  required,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  required?: boolean;
}) {
  return (
    <Input
      label={label}
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      required={required}
      fullWidth
    />
  );
}

// ── Main Page ──────────────────────────────────

export function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNew = id === 'new';
  // "choose" → pick creation method; "manual" → existing form; "import" → upload
  // & convert. The sidebar's "Import Assessment" item deep-links to
  // /assessment-builder/new?mode=import, which skips the chooser entirely.
  const [creationMode, setCreationMode] = useState<'choose' | 'manual' | 'import'>(() => {
    const mode = searchParams.get('mode');
    if (mode === 'import') return 'import';
    if (mode === 'manual') return 'manual';
    return 'choose';
  });
  const [activeTab, setActiveTab] = useState<Tab>('basic');

  // ── State ──────────────────────────────────────
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Org assessment-volume quota (plan.maxAssessments) — shown to org staff so
  // enrollment limits are visible before bulk-enrolling candidates.
  const orgUsage = useOrgUsage();

  // Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fieldId, setFieldId] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [fieldsList, setFieldsList] = useState<Field[]>([]);
  const [orgsList, setOrgsList] = useState<Organization[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [assessmentType, setAssessmentType] = useState('PRACTICAL');
  const [difficulty, setDifficulty] = useState('INTERMEDIATE');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passingScore, setPassingScore] = useState(50);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [allowOralDefense, setAllowOralDefense] = useState(true);
  const [requireFullScreen, setRequireFullScreen] = useState(true);
  const [requireWebcam, setRequireWebcam] = useState(false);

  // Sub-resources
  const [tasks, setTasks] = useState<AssessmentTask[]>([]);
  const [checklistItems, setChecklistItems] = useState<AssessmentChecklistItem[]>([]);
  const [evidenceReqs, setEvidenceReqs] = useState<EvidenceRequirement[]>([]);
  const [aiRules, setAiRules] = useState<AiEvaluationRule[]>([]);
  const [oralQuestions, setOralQuestions] = useState<OralDefenseQuestion[]>([]);
  const [workspaceModules, setWorkspaceModules] = useState<WorkspaceModule[]>([]);
  const [assignedModules, setAssignedModules] = useState<AssignedModule[]>([]);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());

  // New item form state
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState('CODE');
  const [newTaskPoints, setNewTaskPoints] = useState(10);
  const [newTaskDescription, setNewTaskDescription] = useState('');

  const [showNewChecklist, setShowNewChecklist] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistMethod, setNewChecklistMethod] = useState('AUTOMATIC');
  const [newChecklistSection, setNewChecklistSection] = useState(DEFAULT_CHECKLIST_SECTION);
  const [newChecklistDescription, setNewChecklistDescription] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showAutoConfig, setShowAutoConfig] = useState(false);

  const [showNewEvidence, setShowNewEvidence] = useState(false);
  const [newEvidenceTitle, setNewEvidenceTitle] = useState('');
  const [newEvidenceType, setNewEvidenceType] = useState('FILE');

  const [showNewAiRule, setShowNewAiRule] = useState(false);
  const [newAiRuleName, setNewAiRuleName] = useState('');
  const [newAiRuleType, setNewAiRuleType] = useState('SCORING');

  const [showNewOralQ, setShowNewOralQ] = useState(false);
  const [newOralQuestionText, setNewOralQuestionText] = useState('');
  const [newOralQType, setNewOralQType] = useState('MANUAL');

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState('');
  const [editingExpectedOutputTaskId, setEditingExpectedOutputTaskId] = useState<string | null>(null);
  const [editingExpectedOutput, setEditingExpectedOutput] = useState('');

  // ── Load Assessment ────────────────────────────

  const loadAssessment = useCallback(async () => {
    if (isNew || !id) return;
    setLoading(true);
    try {
      const data = await assessmentBuilderApi.getById(id);
      setAssessment(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setFieldId(data.fieldId || '');
      setOrganizationId(data.organizationId || '');
      setAssessmentType(data.assessmentType);
      setDifficulty(data.difficulty);
      setDurationMinutes(data.durationMinutes);
      setPassingScore(data.passingScore);
      setMaxAttempts(data.maxAttempts);
      setAllowOralDefense(data.allowOralDefense);
      setRequireFullScreen(data.requireFullScreen);
      setRequireWebcam(data.requireWebcam);
      setTasks(data.tasks || []);
      setChecklistItems(data.checklistItems || []);
      setEvidenceReqs(data.evidenceReqs || []);
      setAiRules(data.aiRules || []);
      setOralQuestions(data.oralQuestions || []);
    } catch (err) {
      setError('Failed to load assessment');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    loadAssessment();
  }, [loadAssessment]);

  // Load workspace modules, fields, and organizations
  useEffect(() => {
    assessmentBuilderApi.listWorkspaceModules().then(setWorkspaceModules).catch(() => {});

    setLoadingFields(true);
    fieldService.list().then(setFieldsList).catch(() => {}).finally(() => setLoadingFields(false));

    setLoadingOrgs(true);
    organizationService.list({ limit: 100 }).then((res) => setOrgsList(res.data)).catch(() => {}).finally(() => setLoadingOrgs(false));
  }, []);

  // Load assigned modules from assessment
  useEffect(() => {
    if (assessment?.workspaceModules) {
      setAssignedModules(assessment.workspaceModules as unknown as AssignedModule[]);
      setSelectedModules(new Set(assessment.workspaceModules.map((m: any) => m.workspaceModuleId)));
    }
  }, [assessment]);

  // ── Save Assessment ────────────────────────────

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (isNew && !fieldId) {
      setError('Please select a field for this assessment');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (isNew) {
        const created = await assessmentBuilderApi.create({
          title,
          description: hasRichTextContent(description) ? description : undefined,
          assessmentType,
          difficulty,
          durationMinutes,
          passingScore,
          maxAttempts,
          allowOralDefense,
          requireFullScreen,
          requireWebcam,
          fieldId,
          organizationId: organizationId || undefined,
        });
        navigate(`/assessment-builder/${created.id}`, { replace: true });
      } else if (id) {
        const updated = await assessmentBuilderApi.update(id, {
          title,
          // null explicitly clears a previously saved description
          description: hasRichTextContent(description) ? description : null,
          assessmentType,
          difficulty,
          durationMinutes,
          passingScore,
          maxAttempts,
          allowOralDefense,
          requireFullScreen,
          requireWebcam,
          fieldId: fieldId || undefined,
          organizationId: organizationId || undefined,
        });
        setAssessment(updated);
        setSuccess('Assessment saved successfully!');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  // ── Auto-Configuration (Analyze & Configure) ──

  /** Content-defined auto-config is only meaningful once the core sections exist. */
  const canAutoConfigure = !isNew && !!id && (tasks.length > 0 || checklistItems.length > 0);

  /** Everything is still manually empty → offer the guided flow. */
  const isUnconfigured =
    !isNew &&
    !!id &&
    evidenceReqs.length === 0 &&
    aiRules.length === 0 &&
    oralQuestions.length === 0 &&
    assignedModules.length === 0;

  const handleOpenAutoConfig = async () => {
    setShowAutoConfig(true);
  };

  const handlePublish = async () => {
    if (!id) return;
    try {
      await assessmentBuilderApi.publish(id);
      loadAssessment();
      setSuccess('Assessment published!');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to publish');
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    try {
      await assessmentBuilderApi.archive(id);
      loadAssessment();
      setSuccess('Assessment archived.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to archive');
    }
  };

  // ── Task CRUD ──────────────────────────────────

  const addTask = async () => {
    if (!id || !newTaskTitle.trim()) return;
    try {
      const task = await assessmentBuilderApi.addTask(id, {
        title: newTaskTitle,
        description: hasRichTextContent(newTaskDescription) ? newTaskDescription : undefined,
        taskType: newTaskType,
        points: newTaskPoints,
        orderIndex: tasks.length,
        assessmentId: id,
      } as any);
      setTasks((prev) => [...prev, task]);
      setShowNewTask(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const saveTaskDescription = async (taskId: string) => {
    try {
      const updated = await assessmentBuilderApi.updateTask(taskId, {
        description: hasRichTextContent(editingDescription) ? editingDescription : null,
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)));
      setEditingTaskId(null);
    } catch (err) {
      console.error('Failed to update task description:', err);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await assessmentBuilderApi.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const saveTaskExpectedOutput = async (taskId: string) => {
    try {
      const updated = await assessmentBuilderApi.updateTask(taskId, {
        // null explicitly clears a previously-saved expected output
        expectedOutput: hasRichTextContent(editingExpectedOutput) ? editingExpectedOutput : null,
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)));
      setEditingExpectedOutputTaskId(null);
    } catch (err) {
      console.error('Failed to update expected output:', err);
    }
  };

  // ── Checklist CRUD ─────────────────────────────

  const addChecklistItem = async () => {
    if (!id || !newChecklistTitle.trim()) return;
    try {
      const item = await assessmentBuilderApi.addChecklistItem(id, {
        title: newChecklistTitle,
        description: newChecklistDescription.trim() || undefined,
        section: newChecklistSection,
        assessmentMethod: newChecklistMethod,
        orderIndex: checklistItems.length,
        assessmentId: id,
      } as any);
      setChecklistItems((prev) => [...prev, item]);
      setShowNewChecklist(false);
      setNewChecklistTitle('');
      setNewChecklistDescription('');
    } catch (err) {
      console.error('Failed to add checklist item:', err);
    }
  };

  /**
   * Saves criteria text for one checklist item. ChecklistTable fires this once
   * per item in a merged criteria block, so every indicator row keeps the same
   * criteria and the block stays merged.
   */
  const updateChecklistCriteria = async (itemId: string, html: string) => {
    try {
      const updated = await assessmentBuilderApi.updateChecklistItem(itemId, {
        // null explicitly clears a previously-saved criteria
        description: hasRichTextContent(html) ? html : null,
      });
      setChecklistItems((prev) => prev.map((c) => (c.id === itemId ? { ...c, ...updated } : c)));
    } catch (err) {
      console.error('Failed to update checklist criteria:', err);
    }
  };

  /** Auto-saves an edited indicator — the item keeps its id and block membership. */
  const updateChecklistTitle = async (itemId: string, title: string) => {
    try {
      const updated = await assessmentBuilderApi.updateChecklistItem(itemId, { title });
      setChecklistItems((prev) => prev.map((c) => (c.id === itemId ? { ...c, ...updated } : c)));
    } catch (err) {
      console.error('Failed to update checklist indicator:', err);
    }
  };

  /** Downloads the checklist as a printable marking-sheet PDF. */
  const handleExportPdf = async () => {
    if (!id || checklistItems.length === 0 || exportingPdf) return;
    setExportingPdf(true);
    try {
      const blob = await assessmentBuilderApi.downloadChecklistPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `checklist-${sanitizeFilename(assessment?.title || id, 'assessment', 60)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export checklist PDF:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  const deleteChecklistItem = async (itemId: string) => {
    try {
      await assessmentBuilderApi.deleteChecklistItem(itemId);
      setChecklistItems((prev) => prev.filter((c) => c.id !== itemId));
    } catch (err) {
      console.error('Failed to delete checklist item:', err);
    }
  };

  const updateChecklistWeight = async (itemId: string, weight: number) => {
    try {
      const updated = await assessmentBuilderApi.updateChecklistItem(itemId, { weight });
      setChecklistItems((prev) => prev.map((c) => (c.id === itemId ? { ...c, ...updated } : c)));
    } catch (err) {
      console.error('Failed to update checklist weight:', err);
    }
  };

  const updateChecklistSection = async (fromSection: string, toSection: string) => {
    if (fromSection === toSection) return;
    const affected = checklistItems.filter((c) => c.section === fromSection);
    if (affected.length === 0) return;
    try {
      const updated = await Promise.all(
        affected.map((c) => assessmentBuilderApi.updateChecklistItem(c.id, { section: toSection })),
      );
      const byId = new Map(updated.map((u) => [u.id, u]));
      setChecklistItems((prev) => prev.map((c) => byId.get(c.id) || c));
    } catch (err) {
      console.error('Failed to move checklist section:', err);
    }
  };

  // ── Evidence CRUD ──────────────────────────────

  const addEvidenceRequirement = async () => {
    if (!id || !newEvidenceTitle.trim()) return;
    try {
      const ev = await assessmentBuilderApi.addEvidenceRequirement(id, {
        title: newEvidenceTitle,
        evidenceType: newEvidenceType,
        orderIndex: evidenceReqs.length,
        assessmentId: id,
      } as any);
      setEvidenceReqs((prev) => [...prev, ev]);
      setShowNewEvidence(false);
      setNewEvidenceTitle('');
    } catch (err) {
      console.error('Failed to add evidence requirement:', err);
    }
  };

  const deleteEvidence = async (evidenceId: string) => {
    try {
      await assessmentBuilderApi.deleteEvidenceRequirement(evidenceId);
      setEvidenceReqs((prev) => prev.filter((e) => e.id !== evidenceId));
    } catch (err) {
      console.error('Failed to delete evidence:', err);
    }
  };

  // ── AI Rule CRUD ───────────────────────────────

  const addAiRule = async () => {
    if (!id || !newAiRuleName.trim()) return;
    try {
      const rule = await assessmentBuilderApi.addAiRule(id, {
        ruleName: newAiRuleName,
        ruleType: newAiRuleType,
        orderIndex: aiRules.length,
        assessmentId: id,
      } as any);
      setAiRules((prev) => [...prev, rule]);
      setShowNewAiRule(false);
      setNewAiRuleName('');
    } catch (err) {
      console.error('Failed to add AI rule:', err);
    }
  };

  const deleteAiRule = async (ruleId: string) => {
    try {
      await assessmentBuilderApi.deleteAiRule(ruleId);
      setAiRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err) {
      console.error('Failed to delete AI rule:', err);
    }
  };

  // ── Oral Question CRUD ─────────────────────────

  const addOralQuestion = async () => {
    if (!id || !newOralQuestionText.trim()) return;
    try {
      const q = await assessmentBuilderApi.addOralQuestion(id, {
        questionText: newOralQuestionText,
        questionType: newOralQType,
        orderIndex: oralQuestions.length,
        assessmentId: id,
      } as any);
      setOralQuestions((prev) => [...prev, q]);
      setShowNewOralQ(false);
      setNewOralQuestionText('');
    } catch (err) {
      console.error('Failed to add oral question:', err);
    }
  };

  const deleteOralQuestion = async (questionId: string) => {
    try {
      await assessmentBuilderApi.deleteOralQuestion(questionId);
      setOralQuestions((prev) => prev.filter((q) => q.id !== questionId));
    } catch (err) {
      console.error('Failed to delete oral question:', err);
    }
  };

  // ── Loading ─────────────────────────────────────

  // ── Creation-method chooser (only for /assessment-builder/new) ──
  if (isNew && creationMode === 'choose') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" iconOnly onClick={() => navigate('/assessment-builder')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Create Assessment</h1>
            <p className="mt-1 text-sm text-text-secondary">Choose how you want to build your assessment</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Upload & Convert */}
          <button
            onClick={() => setCreationMode('import')}
            className="group relative flex flex-col items-start rounded-2xl border-2 border-dashed border-primary-300 bg-gradient-to-br from-primary-50/60 to-white p-7 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-500 hover:shadow-elevation-medium focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white shadow-lg shadow-primary-600/25 transition-transform duration-200 group-hover:scale-105">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-text-primary">Upload & Convert</h3>
            <p className="mt-1.5 text-sm text-text-secondary">
              Upload a <strong>PDF, Word or text</strong> exam document. We extract it into editable{" "}
              <strong>Scenario</strong>, <strong>Tasks</strong> and <strong>Assessment Checklist</strong>{" "}
              sections you can refine with a rich text editor — then publish.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['PDF', 'DOCX', 'TXT'].map((t) => (
                <span key={t} className="rounded-md bg-primary-100 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-primary-600 opacity-0 transition-all duration-200 group-hover:opacity-100">
              Import document <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </button>

          {/* Build Manually */}
          <button
            onClick={() => setCreationMode('manual')}
            className="group relative flex flex-col items-start rounded-2xl border-2 border-border bg-white p-7 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-secondary-400 hover:shadow-elevation-medium focus:outline-none focus:ring-2 focus:ring-secondary-500/30"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-600 text-white shadow-lg shadow-secondary-600/25 transition-transform duration-200 group-hover:scale-105">
              <PencilLine className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-text-primary">Build Manually</h3>
            <p className="mt-1.5 text-sm text-text-secondary">
              Create the assessment from scratch — enter the title and details, then add tasks,
              checklist items, evidence requirements, AI rules and workspace modules step by step.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Tasks', 'Checklist', 'AI Rules', 'Workspace'].map((t) => (
                <span key={t} className="rounded-md bg-secondary-100 px-2 py-0.5 text-[11px] font-medium text-secondary-700">
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-secondary-600 opacity-0 transition-all duration-200 group-hover:opacity-100">
              Start building <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ── Import wizard (upload & convert) ────────────
  if (isNew && creationMode === 'import') {
    return <ImportAssessmentWizard />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────

  const toggleExpand = (set: Set<string>, key: string) => {
    const newSet = new Set(set);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    return newSet;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" iconOnly onClick={() => navigate('/assessment-builder')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {isNew ? 'Create Assessment' : assessment?.title || 'Assessment'}
            </h1>
            {assessment && (
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={assessment.status === 'PUBLISHED' ? 'success' : assessment.status === 'ARCHIVED' ? 'error' : 'neutral'} size="sm">
                  {assessment.status}
                </Badge>
                <span className="text-xs text-text-tertiary">{assessment.assessmentType}</span>
                <span className="text-xs text-text-tertiary">{assessment.durationMinutes} min</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canAutoConfigure && (
            <Button
              variant="primary"
              onClick={handleOpenAutoConfig}
              icon={<Sparkles className="h-4 w-4" />}
              title="Generate Evidence, AI Rules, Oral Defense & Workspace from this assessment for review"
            >
              Analyze & Configure
            </Button>
          )}
          <Button variant="secondary" onClick={handleSave} loading={saving} icon={<Save className="h-4 w-4" />}>
            Save
          </Button>
          {assessment?.status === 'DRAFT' && (
            <Button variant="success" onClick={handlePublish} icon={<Send className="h-4 w-4" />}>
              Publish
            </Button>
          )}
          {assessment?.status === 'PUBLISHED' && (
            <Button variant="ghost" onClick={handleArchive} icon={<Archive className="h-4 w-4" />}>
              Archive
            </Button>
          )}
        </div>
      </div>

      {/* Org assessment-volume quota banner */}
      <AssessmentQuotaBanner usage={orgUsage} />

      {/* Auto-configuration guidance banner */}
      {isUnconfigured && !showAutoConfig && (
        <Card
          variant="default"
          padding="md"
          className="border-primary-200 bg-gradient-to-r from-primary-50/70 via-white to-accent-50/60"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 text-white shadow-lg shadow-primary-600/20">
              <Wand2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-text-primary">Configure this assessment automatically</h3>
              <p className="mt-0.5 text-sm text-text-secondary">
                Generate <strong>Evidence Requirements</strong>, <strong>AI Evaluation Rules</strong>,{" "}
                <strong>Oral Defense Questions</strong> and <strong>Workspace Modules</strong> from your{" "}
                {assessment?.field?.name || 'field'}, scenario, tasks and checklist — then review, edit and apply
                before publishing.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleOpenAutoConfig}
              icon={<Sparkles className="h-4 w-4" />}
              disabled={!canAutoConfigure}
            >
              Analyze Assessment & Configure
            </Button>
          </div>
          {!canAutoConfigure && (
            <p className="mt-3 text-xs text-text-tertiary">
              Add at least one task or checklist item first — the generator needs real content to work from.
            </p>
          )}
        </Card>
      )}

      {/* Messages */}
      {error && (
        <Card variant="outlined" padding="sm" className="border-error bg-error-light/10">
          <div className="flex items-center gap-2 text-error">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        </Card>
      )}
      {success && (
        <Card variant="outlined" padding="sm" className="border-accent-600 bg-accent-600/10">
          <div className="flex items-center gap-2 text-accent-700">
            <Check className="h-4 w-4" />
            <span className="text-sm">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Basic Info ───────────────────────── */}
      {activeTab === 'basic' && (
        <Card variant="outlined" padding="lg">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Software Development Final Assessment"
                required
                fullWidth
              />
            </div>
            <div className="md:col-span-2">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Description</label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Describe the assessment purpose and goals (optional)"
                  minHeight={120}
                />
                <p className="text-xs text-text-tertiary">
                  Supports rich formatting — candidates see this on the assessment card.
                </p>
              </div>
            </div>
            {/* Field Selector */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                Field <span className="ml-0.5 text-error">*</span>
              </label>
              <select
                value={fieldId}
                onChange={(e) => setFieldId(e.target.value)}
                className="block w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loadingFields}
              >
                <option value="">Select a field...</option>
                {fieldsList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.code})
                  </option>
                ))}
              </select>
              {loadingFields && <p className="text-xs text-text-tertiary">Loading fields...</p>}
            </div>

            {/* Organization Selector */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                Organization <span className="text-xs text-text-tertiary">(optional)</span>
              </label>
              <select
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="block w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loadingOrgs}
              >
                <option value="">No organization (general assessment)...</option>
                {orgsList.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.code})
                  </option>
                ))}
              </select>
              {loadingOrgs && <p className="text-xs text-text-tertiary">Loading organizations...</p>}
            </div>

            <SelectField label="Assessment Type" value={assessmentType} options={ASSESSMENT_TYPES} onChange={setAssessmentType} required />
            <SelectField label="Difficulty" value={difficulty} options={DIFFICULTIES} onChange={setDifficulty} required />
            <NumberField label="Duration (minutes)" value={durationMinutes} onChange={setDurationMinutes} min={5} max={480} />
            <NumberField label="Passing Score (%)" value={passingScore} onChange={setPassingScore} min={0} max={100} />
            <NumberField label="Max Attempts" value={maxAttempts} onChange={setMaxAttempts} min={1} max={10} />

            <div className="md:col-span-2 space-y-3">
              <label className="block text-sm font-medium text-text-primary">Options</label>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowOralDefense}
                    onChange={(e) => setAllowOralDefense(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-text-primary">Allow Oral Defense</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireFullScreen}
                    onChange={(e) => setRequireFullScreen(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-text-primary">Require Full Screen</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireWebcam}
                    onChange={(e) => setRequireWebcam(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-text-primary">Require Webcam</span>
                </label>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── TAB: Tasks ──────────────────────────── */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Assessment Tasks ({tasks.length})</h2>
            <Button size="sm" onClick={() => setShowNewTask(true)} icon={<Plus className="h-4 w-4" />}>
              Add Task
            </Button>
          </div>

          {/* New Task Form */}
          {showNewTask && (
            <Card variant="outlined" padding="md">
              <div className="grid gap-3 md:grid-cols-3">
                <Input label="Task Title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="e.g., Build ER Diagram" fullWidth />
                <SelectField label="Task Type" value={newTaskType} options={TASK_TYPES} onChange={setNewTaskType} />
                <NumberField label="Points" value={newTaskPoints} onChange={setNewTaskPoints} min={1} />
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-text-primary mb-1.5">Task Description</label>
                <RichTextEditor
                  value={newTaskDescription}
                  onChange={setNewTaskDescription}
                  placeholder="Describe what the candidate must do... (optional)"
                  minHeight={120}
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" size="sm" onClick={() => setShowNewTask(false)}>Cancel</Button>
                <Button size="sm" onClick={addTask}>Add Task</Button>
              </div>
            </Card>
          )}

          {/* Task List */}
          {tasks.length === 0 && !showNewTask && (
            <Card variant="outlined" padding="lg">
              <div className="flex flex-col items-center py-8 text-center">
                <ClipboardCheck className="h-12 w-12 text-text-tertiary" />
                <p className="mt-2 text-sm text-text-secondary">No tasks added yet. Add assessment tasks for candidates to complete.</p>
              </div>
            </Card>
          )}

          {tasks.map((task, idx) => (
            <Card key={task.id} variant="outlined" padding="md">
              <div className="flex items-start gap-3">
                <div className="mt-1 text-text-tertiary cursor-move">
                  <GripVertical className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => {
                      // Collapsing a task closes its (possibly unsaved) editors
                      if (expandedTasks.has(task.id)) {
                        setEditingTaskId(null);
                        setEditingExpectedOutputTaskId(null);
                      }
                      setExpandedTasks(toggleExpand(expandedTasks, task.id));
                    }}
                    className="flex items-center gap-2 w-full text-left"
                  >
                    <span className="text-xs text-text-tertiary font-mono">#{idx + 1}</span>
                    <h3 className="text-sm font-medium text-text-primary">{task.title}</h3>
                    <Badge size="sm" variant="info">{task.taskType.replace(/_/g, ' ')}</Badge>
                    <span className="text-xs text-text-tertiary ml-auto">{task.points} pts</span>
                    {expandedTasks.has(task.id) ? <ChevronUp className="h-4 w-4 text-text-tertiary" /> : <ChevronDown className="h-4 w-4 text-text-tertiary" />}
                  </button>
                  {expandedTasks.has(task.id) && (
                    <div className="mt-3 space-y-3 pl-4 border-l-2 border-border">
                      {/* Task description */}
                      {editingTaskId === task.id ? (
                        <div className="space-y-2">
                          <label className="block text-xs font-medium uppercase tracking-wider text-text-tertiary">
                            Task description
                          </label>
                          <RichTextEditor
                            value={editingDescription}
                            onChange={setEditingDescription}
                            placeholder="Describe what the candidate must do..."
                            minHeight={120}
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingTaskId(null)}>Cancel</Button>
                            <Button size="sm" onClick={() => saveTaskDescription(task.id)}>Save Description</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium uppercase tracking-wider text-text-tertiary">
                            Task description
                          </label>
                          {task.description ? (
                            <RichTextRenderer html={task.description} className="text-text-secondary" />
                          ) : (
                            <p className="text-sm italic text-text-tertiary">No description yet.</p>
                          )}
                          <button
                            onClick={() => {
                              setEditingTaskId(task.id);
                              setEditingDescription(task.description || '');
                            }}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700"
                          >
                            {task.description ? 'Edit description' : 'Add description'}
                          </button>
                        </div>
                      )}

                      {/* Expected output (rich text) */}
                      {editingExpectedOutputTaskId === task.id ? (
                        <div className="space-y-2">
                          <label className="block text-xs font-medium uppercase tracking-wider text-text-tertiary">
                            Expected output
                          </label>
                          <RichTextEditor
                            value={editingExpectedOutput}
                            onChange={setEditingExpectedOutput}
                            placeholder="Describe the expected result / final output..."
                            minHeight={100}
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingExpectedOutputTaskId(null)}>Cancel</Button>
                            <Button size="sm" onClick={() => saveTaskExpectedOutput(task.id)}>Save Expected Output</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium uppercase tracking-wider text-text-tertiary">
                            Expected output
                          </label>
                          {task.expectedOutput ? (
                            <RichTextRenderer html={task.expectedOutput} className="text-text-secondary" />
                          ) : (
                            <p className="text-sm italic text-text-tertiary">No expected output yet.</p>
                          )}
                          <button
                            onClick={() => {
                              setEditingExpectedOutputTaskId(task.id);
                              setEditingExpectedOutput(task.expectedOutput || '');
                            }}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700"
                          >
                            {task.expectedOutput ? 'Edit expected output' : 'Add expected output'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" iconOnly onClick={() => deleteTask(task.id)}>
                  <Trash2 className="h-4 w-4 text-error" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── TAB: Checklist ──────────────────────── */}
      {activeTab === 'checklist' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-text-primary">Checklist Items ({checklistItems.length})</h2>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportPdf}
                loading={exportingPdf}
                disabled={checklistItems.length === 0}
                icon={<Download className="h-4 w-4" />}
                title="Download the checklist as a printable marking sheet"
              >
                Export PDF
              </Button>
              <Button size="sm" onClick={() => setShowNewChecklist(true)} icon={<Plus className="h-4 w-4" />}>
                Add Item
              </Button>
            </div>
          </div>

          {showNewChecklist && (
            <Card variant="outlined" padding="md">
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Item Title" value={newChecklistTitle} onChange={(e) => setNewChecklistTitle(e.target.value)} placeholder="e.g., ER diagram includes all entities" fullWidth />
                <SelectField label="Assessment Method" value={newChecklistMethod} options={CHECKLIST_METHODS} onChange={setNewChecklistMethod} />
              </div>
              <div className="mt-3 space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Assessment Criteria</label>
                <input
                  value={newChecklistDescription}
                  onChange={(e) => setNewChecklistDescription(e.target.value)}
                  placeholder="e.g., 1.1. Conceptual database schema is properly designed — shared by indicators added below (optional)"
                  className="block w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary/60 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div className="mt-3 space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Section</label>
                <select
                  value={newChecklistSection}
                  onChange={(e) => setNewChecklistSection(e.target.value)}
                  className="block w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  {CHECKLIST_SECTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" size="sm" onClick={() => setShowNewChecklist(false)}>Cancel</Button>
                <Button size="sm" onClick={addChecklistItem}>Add Item</Button>
              </div>
            </Card>
          )}

          {checklistItems.length === 0 && !showNewChecklist && (
            <Card variant="outlined" padding="lg">
              <div className="flex flex-col items-center py-8 text-center">
                <Check className="h-12 w-12 text-text-tertiary" />
                <p className="mt-2 text-sm text-text-secondary">No checklist items yet. Add items that assessors will verify.</p>
              </div>
            </Card>
          )}

          <ChecklistTable
            items={checklistItems}
            onDelete={(item) => deleteChecklistItem(item.id)}
            onWeightChange={updateChecklistWeight}
            onSectionChange={updateChecklistSection}
            onDescriptionChange={updateChecklistCriteria}
            onTitleChange={updateChecklistTitle}
            emptyMessage="No checklist items yet. Add items that assessors will verify."
          />
        </div>
      )}

      {/* ── TAB: Evidence ───────────────────────── */}
      {activeTab === 'evidence' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Evidence Requirements ({evidenceReqs.length})</h2>
            <Button size="sm" onClick={() => setShowNewEvidence(true)} icon={<Plus className="h-4 w-4" />}>
              Add Evidence Requirement
            </Button>
          </div>

          {showNewEvidence && (
            <Card variant="outlined" padding="md">
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Title" value={newEvidenceTitle} onChange={(e) => setNewEvidenceTitle(e.target.value)} placeholder="e.g., Upload final SQL script" fullWidth />
                <SelectField label="Evidence Type" value={newEvidenceType} options={EVIDENCE_TYPES} onChange={setNewEvidenceType} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" size="sm" onClick={() => setShowNewEvidence(false)}>Cancel</Button>
                <Button size="sm" onClick={addEvidenceRequirement}>Add</Button>
              </div>
            </Card>
          )}

          {evidenceReqs.length === 0 && !showNewEvidence && (
            <Card variant="outlined" padding="lg">
              <div className="flex flex-col items-center py-8 text-center">
                <FileSearch className="h-12 w-12 text-text-tertiary" />
                <p className="mt-2 text-sm text-text-secondary">No evidence requirements. Add what candidates need to submit.</p>
              </div>
            </Card>
          )}

          {evidenceReqs.map((ev, idx) => (
            <Card key={ev.id} variant="outlined" padding="sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-tertiary font-mono">#{idx + 1}</span>
                  <span className="text-sm font-medium text-text-primary">{ev.title}</span>
                  <Badge size="sm" variant="info">{ev.evidenceType.replace(/_/g, ' ')}</Badge>
                  <span className="text-xs text-text-tertiary">Max {ev.maxFiles} file(s)</span>
                </div>
                <Button variant="ghost" size="sm" iconOnly onClick={() => deleteEvidence(ev.id)}>
                  <Trash2 className="h-4 w-4 text-error" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── TAB: AI Rules ───────────────────────── */}
      {activeTab === 'ai-rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">AI Evaluation Rules ({aiRules.length})</h2>
            <Button size="sm" onClick={() => setShowNewAiRule(true)} icon={<Plus className="h-4 w-4" />}>
              Add AI Rule
            </Button>
          </div>

          {showNewAiRule && (
            <Card variant="outlined" padding="md">
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Rule Name" value={newAiRuleName} onChange={(e) => setNewAiRuleName(e.target.value)} placeholder="e.g., Code Quality Scoring" fullWidth />
                <SelectField label="Rule Type" value={newAiRuleType} options={AI_RULE_TYPES} onChange={setNewAiRuleType} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" size="sm" onClick={() => setShowNewAiRule(false)}>Cancel</Button>
                <Button size="sm" onClick={addAiRule}>Add Rule</Button>
              </div>
            </Card>
          )}

          {aiRules.length === 0 && !showNewAiRule && (
            <Card variant="outlined" padding="lg">
              <div className="flex flex-col items-center py-8 text-center">
                <Brain className="h-12 w-12 text-text-tertiary" />
                <p className="mt-2 text-sm text-text-secondary">No AI rules configured. Add rules for AI-powered evaluation.</p>
              </div>
            </Card>
          )}

          {aiRules.map((rule) => (
            <Card key={rule.id} variant="outlined" padding="sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lightbulb className="h-4 w-4 text-accent-600" />
                  <span className="text-sm font-medium text-text-primary">{rule.ruleName}</span>
                  <Badge size="sm" variant="info">{rule.ruleType.replace(/_/g, ' ')}</Badge>
                  <Badge size="sm" variant={rule.isActive ? 'success' : 'neutral'}>{rule.isActive ? 'Active' : 'Inactive'}</Badge>
                  <span className="text-xs text-text-tertiary">wt: {rule.weight}</span>
                </div>
                <Button variant="ghost" size="sm" iconOnly onClick={() => deleteAiRule(rule.id)}>
                  <Trash2 className="h-4 w-4 text-error" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── TAB: Oral Questions ─────────────────── */}
      {activeTab === 'oral-questions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Oral Defense Questions ({oralQuestions.length})</h2>
            <Button size="sm" onClick={() => setShowNewOralQ(true)} icon={<Plus className="h-4 w-4" />}>
              Add Question
            </Button>
          </div>

          {showNewOralQ && (
            <Card variant="outlined" padding="md">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-text-primary">Question</label>
                  <textarea
                    value={newOralQuestionText}
                    onChange={(e) => setNewOralQuestionText(e.target.value)}
                    rows={3}
                    className="block w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="e.g., Explain your approach to database normalization"
                  />
                </div>
                <SelectField label="Question Type" value={newOralQType} options={ORAL_QUESTION_TYPES} onChange={setNewOralQType} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" size="sm" onClick={() => setShowNewOralQ(false)}>Cancel</Button>
                <Button size="sm" onClick={addOralQuestion}>Add Question</Button>
              </div>
            </Card>
          )}

          {oralQuestions.length === 0 && !showNewOralQ && (
            <Card variant="outlined" padding="lg">
              <div className="flex flex-col items-center py-8 text-center">
                <MessageSquare className="h-12 w-12 text-text-tertiary" />
                <p className="mt-2 text-sm text-text-secondary">No oral defense questions. Add questions for the oral defense session.</p>
              </div>
            </Card>
          )}

          {oralQuestions.map((q, idx) => (
            <Card key={q.id} variant="outlined" padding="md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-text-tertiary font-mono">Q{idx + 1}</span>
                    <Badge size="sm" variant="info">{q.questionType.replace(/_/g, ' ')}</Badge>
                    {q.category && <Badge size="sm" variant="neutral">{q.category}</Badge>}
                  </div>
                  <p className="text-sm text-text-primary">{q.questionText}</p>
                  {q.timeLimitSeconds && (
                    <p className="text-xs text-text-tertiary mt-1">{q.timeLimitSeconds}s time limit</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" iconOnly onClick={() => deleteOralQuestion(q.id)}>
                  <Trash2 className="h-4 w-4 text-error" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── TAB: AI Evaluation ──────────────────── */}
      {activeTab === 'ai-evaluation' && id && id !== 'new' && (
        <AiEvaluationTab assessmentId={id} />
      )}

      {/* ── TAB: Workspace ──────────────────────── */}
      {activeTab === 'workspace' && (
        <div className="space-y-4">
          {/* Module Assignment */}
          <Card variant="outlined" padding="lg">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Assign Workspace Modules</h2>
            <p className="text-sm text-text-secondary mb-6">
              Select which workspace modules candidates can use during this assessment.
            </p>

            {workspaceModules.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Puzzle className="h-12 w-12 text-text-tertiary" />
                <p className="mt-2 text-sm text-text-secondary">
                  No workspace modules available. Run the workspace module seed to populate.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {workspaceModules.map((mod) => {
                  const isSelected = selectedModules.has(mod.id);
                  return (
                    <Card
                      key={mod.id}
                      variant={isSelected ? 'default' : 'outlined'}
                      padding="md"
                      interactive
                      onClick={() => {
                        if (!id) return;
                        const newSelected = new Set(selectedModules);
                        if (isSelected) {
                          newSelected.delete(mod.id);
                          assessmentBuilderApi.removeWorkspaceModule(id, mod.id).catch(() => {});
                          setAssignedModules((prev) => prev.filter((a) => a.workspaceModuleId !== mod.id));
                        } else {
                          newSelected.add(mod.id);
                          assessmentBuilderApi.assignWorkspaceModule(id, mod.id, assignedModules.length).catch(() => {});
                          setAssignedModules((prev) => [...prev, {
                            assessmentId: id!,
                            workspaceModuleId: mod.id,
                            orderIndex: assignedModules.length,
                            config: null,
                            workspaceModule: {
                              id: mod.id,
                              moduleKey: mod.moduleKey,
                              name: mod.name,
                              description: mod.description,
                              iconUrl: mod.iconUrl,
                              configSchema: (mod.configSchema ?? null) as Record<string, unknown> | null,
                              isActive: mod.isActive,
                            },
                          }]);
                        }
                        setSelectedModules(newSelected);
                      }}
                      className={isSelected ? 'border-primary-500 bg-primary-50/30 ring-1 ring-primary-500' : ''}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary-100' : 'bg-surface-tertiary'}`}>
                          <Monitor className={`h-5 w-5 ${isSelected ? 'text-primary-600' : 'text-text-tertiary'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-text-primary">{mod.name}</h3>
                          <p className="text-xs text-text-tertiary">{mod.moduleKey}</p>
                        </div>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-primary-600 flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      {mod.description && (
                        <p className="mt-2 text-xs text-text-secondary line-clamp-2">{mod.description}</p>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Workspace Engine Preview */}
          {assignedModules.length > 0 && (
            <Card variant="outlined" padding="lg">
              <h2 className="text-lg font-semibold text-text-primary mb-1">Workspace Preview</h2>
              <p className="text-sm text-text-secondary mb-6">
                Preview how the assigned workspace modules will appear to candidates.
              </p>
              <WorkspaceEngine
                modules={assignedModules}
                assessmentId={id}
                readOnly={true}
              />
            </Card>
          )}
        </div>
      )}

      {/* Auto-configuration review modal */}
      {id && id !== 'new' && (
        <AutoConfigPanel
          assessmentId={id}
          open={showAutoConfig}
          onClose={() => setShowAutoConfig(false)}
          onApplied={() => {
            loadAssessment();
            setSuccess('Auto-configuration applied — review the generated sections before publishing.');
          }}
        />
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="ghost" onClick={() => navigate('/assessment-builder')} icon={<ArrowLeft className="h-4 w-4" />}>
          Back to Assessments
        </Button>
        <div className="flex items-center gap-2">
          {assessment?.status === 'DRAFT' && (
            <Button variant="success" onClick={handlePublish} icon={<Play className="h-4 w-4" />}>
              Publish Assessment
            </Button>
          )}
          <Button onClick={handleSave} loading={saving} icon={<Save className="h-4 w-4" />}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AssessmentDetailPage;
