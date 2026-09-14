import { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Badge } from '@components/ui/badge';
import {
  assessmentBuilderApi,
  type ImportedAssessmentDraft,
} from '@services/assessment-builder-service';
import { fieldService, type Field } from '@services/field-service';
import { organizationService } from '@services/organization-service';
import type { Organization } from '../../types';
import { RichTextEditor, hasRichTextContent } from './rich-text-editor';
import { CHECKLIST_SECTIONS, DEFAULT_CHECKLIST_SECTION, type SectionMeta } from './checklist-sections';
import { ChecklistTable } from './checklist-table';
import {
  UploadCloud,
  FileText,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Trash2,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  BookOpen,
  ListChecks,
  FileWarning,
  X,
} from 'lucide-react';
import { cn } from '@utils/cn';

// ── Types ───────────────────────────────────────

interface EditableTask {
  id: string;
  title: string;
  description: string;
  taskType: string;
  points: number;
}

interface EditableChecklistItem {
  id: string;
  title: string;
  description: string;
  section: string;
  weight: number;
}

interface EditableDraft {
  title: string;
  description: string;
  scenarioHtml: string;
  tasks: EditableTask[];
  checklistItems: EditableChecklistItem[];
}

const TASK_TYPES = [
  'CODE',
  'DIAGRAM',
  'ESSAY',
  'FILE_UPLOAD',
  'MULTIPLE_CHOICE',
  'SHORT_ANSWER',
  'SQL',
  'DATABASE_DESIGN',
  'NETWORK_CONFIG',
  'PRESENTATION',
  'PORTFOLIO',
  'ORAL_DEFENSE',
];

// `.doc` (legacy binary Word) is intentionally excluded — the import parser
// only supports PDF, .docx and plain text.
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];
const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

let uidCounter = 0;
const uid = () => `item-${Date.now()}-${uidCounter++}`;

/** Extracts a user-friendly message from an Axios-style error. */
function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message || e.message || fallback;
  }
  return fallback;
}

// ── Steps ───────────────────────────────────────

type Step = 'upload' | 'review' | 'create';

// ── Component ───────────────────────────────────

export function ImportAssessmentWizard() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parsingRef = useRef(false);

  const [step, setStep] = useState<Step>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditableDraft | null>(null);
  // Import-engine checklist metadata: detected section weights/subtotals and
  // any verification warnings (e.g. subtotals ≠ printed grand total).
  const [checklistMeta, setChecklistMeta] = useState<{
    sections: Record<string, SectionMeta>;
    warnings: string[];
    totalMarks: number | null;
  }>({ sections: {}, warnings: [], totalMarks: null });

  // Basic info (step 3)
  const [fieldsList, setFieldsList] = useState<Field[]>([]);
  const [orgsList, setOrgsList] = useState<Organization[]>([]);
  const [fieldId, setFieldId] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [difficulty, setDifficulty] = useState('INTERMEDIATE');
  const [assessmentType, setAssessmentType] = useState('PRACTICAL');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Expanded sections in review step
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  // Criterion-level delete confirmation (keyed by the block's first item id)
  const [confirmDeleteBlockId, setConfirmDeleteBlockId] = useState<string | null>(null);

  const loadMeta = useCallback(() => {
    fieldService.list().then(setFieldsList).catch(() => {});
    organizationService.list({ limit: 100 }).then((res) => setOrgsList(res.data)).catch(() => {});
  }, []);

  const parseFile = useCallback(async (file: File) => {
    if (parsingRef.current) return;
    parsingRef.current = true;
    setFileName(file.name);
    setParsing(true);
    setParseError(null);
    try {
      const parsed: ImportedAssessmentDraft = await assessmentBuilderApi.importDocument(file);
      setDraft({
        title: parsed.title || file.name.replace(/\.[^.]+$/, ''),
        description: parsed.description || '',
        scenarioHtml: parsed.scenario?.html || '',
        tasks: (parsed.tasks || []).map((t) => ({
          id: uid(),
          title: t.title,
          description: t.description,
          taskType: t.taskType || 'CODE',
          points: t.points || 10,
        })),
        checklistItems: (parsed.checklistItems || []).map((c) => ({
          id: uid(),
          title: c.title,
          description: c.description,
          section: c.section || DEFAULT_CHECKLIST_SECTION,
          weight: c.weight,
        })),
      });
      // Checklist metadata from the structured extraction (section weights /
      // printed subtotals + verification warnings).
      setChecklistMeta({
        sections: Object.fromEntries(
          (parsed.checklist?.sections ?? []).map((s) => [
            s.name,
            { weightPct: s.weightPct, subtotalMarks: s.subtotalMarks },
          ]),
        ),
        warnings: parsed.checklist?.warnings ?? [],
        totalMarks: parsed.checklist?.totalMarks ?? null,
      });
      // A fresh draft has no pending criterion-delete confirmation.
      setConfirmDeleteBlockId(null);
      loadMeta();
      setStep('review');
    } catch (err) {
      setParseError(getErrorMessage(err, 'Failed to parse the document.'));
    } finally {
      setParsing(false);
      parsingRef.current = false;
    }
  }, [loadMeta]);

  const handleFileSelected = (file: File | undefined | null) => {
    if (!file) return;
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_MIME.includes(file.type)) {
      setParseError('Unsupported file. Please upload a PDF, Word (.docx) or text (.txt) document.');
      return;
    }
    parseFile(file);
  };

  // ── Task / checklist editing helpers ──────────

  const updateTask = (id: string, patch: Partial<EditableTask>) => {
    setDraft((prev) => prev && { ...prev, tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  };

  const removeTask = (id: string) => {
    setDraft((prev) => prev && { ...prev, tasks: prev.tasks.filter((t) => t.id !== id) });
  };

  const addTask = () => {
    setDraft((prev) => prev && {
      ...prev,
      tasks: [...prev.tasks, { id: uid(), title: 'New task', description: '', taskType: 'CODE', points: 10 }],
    });
  };

  const updateChecklist = (id: string, patch: Partial<EditableChecklistItem>) => {
    setDraft((prev) => prev && {
      ...prev,
      checklistItems: prev.checklistItems.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };

  const removeChecklist = (id: string) => {
    setDraft((prev) => prev && { ...prev, checklistItems: prev.checklistItems.filter((c) => c.id !== id) });
  };

  const addChecklist = () => {
    setDraft((prev) => prev && {
      ...prev,
      checklistItems: [...prev.checklistItems, { id: uid(), title: 'New checklist item', description: '', section: DEFAULT_CHECKLIST_SECTION, weight: 1 }],
    });
  };

  /** Moves every item of a section group to another section (regroups the table). */
  const updateChecklistSection = (fromSection: string, toSection: string) => {
    if (fromSection === toSection) return;
    setDraft((prev) => prev && {
      ...prev,
      checklistItems: prev.checklistItems.map((c) =>
        c.section === fromSection ? { ...c, section: toSection } : c,
      ),
    });
  };

  /** Reorders one indicator within the checklist (orderIndex follows array order). */
  const moveChecklist = (id: string, direction: 'up' | 'down') => {
    setDraft((prev) => {
      if (!prev) return prev;
      const items = prev.checklistItems;
      const idx = items.findIndex((c) => c.id === id);
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (idx < 0 || swap < 0 || swap >= items.length) return prev;
      const next = [...items];
      [next[idx], next[swap]] = [next[swap]!, next[idx]!];
      return { ...prev, checklistItems: next };
    });
  };

  // Section selector options = the document's detected sections ∪ the canonical
  // four, so moving a group to a dynamically-detected section stays possible.
  const checklistSectionOptions = useMemo(() => {
    const names = new Set<string>([
      ...(draft?.checklistItems ?? []).map((c) => c.section).filter((s): s is string => Boolean(s)),
      ...CHECKLIST_SECTIONS,
    ]);
    return Array.from(names);
  }, [draft]);

  // ── Create ────────────────────────────────────

  const handleCreate = async () => {
    if (!draft || creating) return;
    if (!draft.title.trim()) {
      setCreateError('Title is required');
      return;
    }
    if (!fieldId) {
      setCreateError('Please select a field');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await assessmentBuilderApi.create({
        title: draft.title,
        description: hasRichTextContent(draft.description) ? draft.description : undefined,
        fieldId,
        organizationId: organizationId || undefined,
        assessmentType,
        difficulty,
        durationMinutes,
        passingScore: 50,
        maxAttempts: 1,
        allowOralDefense: true,
        requireFullScreen: false,
        requireWebcam: false,
        scenario: draft.scenarioHtml ? { html: draft.scenarioHtml } : undefined,
        tasks: draft.tasks.map((t, i) => ({
          title: t.title,
          description: hasRichTextContent(t.description) ? t.description : undefined,
          taskType: t.taskType,
          points: t.points,
          orderIndex: i,
        })),
        checklistItems: draft.checklistItems.map((c, i) => ({
          title: c.title,
          description: c.description || undefined,
          section: c.section || undefined,
          weight: c.weight,
          isRequired: true,
          assessmentMethod: 'ASSESSOR_REVIEW',
          orderIndex: i,
        })),
      });
      navigate(`/assessment-builder/${created.id}`, { replace: true });
    } catch (err) {
      setCreateError(getErrorMessage(err, 'Failed to create assessment.'));
    } finally {
      setCreating(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Render: Upload step ───────────────────────

  if (step === 'upload') {
    return (
      <div className="space-y-6">
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-primary-600" />
              Import Assessment Document
            </CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-text-secondary">
              Upload a PDF, Word (.docx) or text file — we'll extract the <strong>Scenario</strong>,{' '}
              <strong>Tasks</strong> and <strong>Assessment Checklist</strong> into editable sections.
            </p>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFileSelected(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                'mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200',
                dragOver
                  ? 'border-primary-500 bg-primary-50/50 scale-[1.01]'
                  : 'border-border hover:border-primary-400 hover:bg-surface-secondary/60',
              )}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
                <UploadCloud className="h-7 w-7 text-primary-600" />
              </div>
              <p className="mt-4 text-sm font-medium text-text-primary">
                {parsing ? 'Parsing document...' : 'Drag & drop your document here'}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                or <span className="text-primary-600 font-medium">browse files</span> — PDF, DOCX, TXT
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {['PDF', 'DOCX', 'TXT'].map((t) => (
                  <span key={t} className="rounded-md bg-surface-tertiary px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(',')}
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0])}
            />

            {/* Parsing state */}
            {parsing && (
              <div className="mt-6 flex items-center justify-center gap-3 rounded-xl bg-primary-50 p-4 text-sm text-primary-700">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Extracting Scenario, Tasks and Checklist from “{fileName}”…</span>
              </div>
            )}

            {/* Error */}
            {parseError && !parsing && (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-error/30 bg-error-light p-4 text-sm text-error">
                <FileWarning className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Could not import document</p>
                  <p className="mt-0.5 text-error/90">{parseError}</p>
                </div>
                <button onClick={() => setParseError(null)} className="text-error/70 hover:text-error">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button variant="ghost" onClick={() => navigate('/assessment-builder')} icon={<ArrowLeft className="h-4 w-4" />}>
                Back to Assessments
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ── Render: Review / Create steps ─────────────

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="success" size="sm"><CheckCircle2 className="h-3 w-3" /> Parsed</Badge>
        <ArrowRight className="h-4 w-4 text-text-tertiary" />
        <Badge variant={step === 'review' ? 'info' : 'success'} size="sm">
          {step === 'review' ? 'Review & edit sections' : <CheckCircle2 className="h-3 w-3" />}
          {step === 'review' ? ' Review & edit sections' : ' Reviewed'}
        </Badge>
        {step === 'create' && (
          <>
            <ArrowRight className="h-4 w-4 text-text-tertiary" />
            <Badge variant="info" size="sm">Assessment details</Badge>
          </>
        )}
      </div>

      {/* ── REVIEW STEP ─────────────────────────── */}
      {step === 'review' && draft && (
        <>
          {/* Title + description */}
          <Card variant="outlined" padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-600" />
                Assessment Overview
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <Input
                label="Title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                fullWidth
                required
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Description</label>
                <RichTextEditor
                  value={draft.description}
                  onChange={(html) => setDraft({ ...draft, description: html })}
                  placeholder="Short description of the assessment — supports rich formatting and images"
                  minHeight={100}
                />
              </div>
            </CardBody>
          </Card>

          {/* Scenario */}
          <Card variant="outlined" padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-secondary-600" />
                Scenario
              </CardTitle>
              <Badge variant="info" size="sm">Editable</Badge>
            </CardHeader>
            <CardBody>
              <RichTextEditor
                value={draft.scenarioHtml}
                onChange={(html) => setDraft({ ...draft, scenarioHtml: html })}
                placeholder="Describe the scenario / integrated situation for candidates..."
                minHeight={180}
              />
            </CardBody>
          </Card>

          {/* Tasks */}
          <Card variant="outlined" padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary-600" />
                Tasks ({draft.tasks.length})
              </CardTitle>
              <Button size="sm" variant="secondary" onClick={addTask} icon={<Plus className="h-4 w-4" />}>
                Add Task
              </Button>
            </CardHeader>
            <CardBody className="space-y-3">
              {draft.tasks.length === 0 && (
                <p className="py-6 text-center text-sm text-text-tertiary">
                  No tasks extracted. Add tasks manually or go back to upload a different file.
                </p>
              )}
              {draft.tasks.map((task, idx) => (
                <div key={task.id} className="rounded-xl border border-border bg-surface-secondary/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 cursor-move text-text-tertiary">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-text-tertiary">#{idx + 1}</span>
                        <button
                          onClick={() => toggleExpand(task.id)}
                          className="flex flex-1 items-center gap-2 text-left"
                        >
                          <span className="flex-1 truncate text-sm font-medium text-text-primary">{task.title}</span>
                          <Badge size="sm" variant="info">{task.taskType.replace(/_/g, ' ')}</Badge>
                          <span className="text-xs text-text-tertiary">{task.points} pts</span>
                          {expandedTasks.has(task.id)
                            ? <ChevronUp className="h-4 w-4 text-text-tertiary" />
                            : <ChevronDown className="h-4 w-4 text-text-tertiary" />}
                        </button>
                      </div>

                      {expandedTasks.has(task.id) && (
                        <div className="space-y-3 pl-4 border-l-2 border-border">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-text-secondary">Task title</label>
                              <input
                                value={task.title}
                                onChange={(e) => updateTask(task.id, { title: e.target.value })}
                                className="block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-text-secondary">Type</label>
                                <select
                                  value={task.taskType}
                                  onChange={(e) => updateTask(task.id, { taskType: e.target.value })}
                                  className="block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                >
                                  {TASK_TYPES.map((t) => (
                                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-text-secondary">Points</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={task.points}
                                  onChange={(e) => updateTask(task.id, { points: Math.max(1, Number(e.target.value) || 1) })}
                                  className="block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-text-secondary">Task instructions</label>
                            <RichTextEditor
                              value={task.description}
                              onChange={(html) => updateTask(task.id, { description: html })}
                              placeholder="Describe what the candidate must do..."
                              minHeight={120}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => removeTask(task.id)}
                      aria-label="Remove task"
                    >
                      <Trash2 className="h-4 w-4 text-error" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Checklist */}
          <Card variant="outlined" padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-accent-600" />
                Assessment Checklist ({draft.checklistItems.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                {checklistMeta.totalMarks != null && (
                  <Badge size="sm" variant="info">Total {checklistMeta.totalMarks} marks</Badge>
                )}
                <Button size="sm" variant="secondary" onClick={addChecklist} icon={<Plus className="h-4 w-4" />}>
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {/* Verification warnings from the extraction engine (e.g. section
                  subtotals that don't add up to the printed grand total). The
                  source data is never altered — the assessor decides. */}
              {checklistMeta.warnings.length > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-light p-4 text-sm text-warning-dark">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">Checklist figures need review</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      {checklistMeta.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-xs opacity-80">
                      The extracted marks are kept as printed — adjust the Max column above to reconcile.
                    </p>
                  </div>
                </div>
              )}
              <ChecklistTable
                items={draft.checklistItems}
                sectionOptions={checklistSectionOptions}
                sectionMeta={checklistMeta.sections}
                onTitleChange={(id, title) => updateChecklist(id, { title })}
                onDescriptionChange={(id, html) => updateChecklist(id, { description: html })}
                onWeightChange={(id, weight) => updateChecklist(id, { weight })}
                onSectionChange={updateChecklistSection}
                onMove={moveChecklist}
                onDelete={(item) => removeChecklist(item.id)}
                emptyMessage="No checklist items extracted. Add items that assessors will verify during marking."
              />
            </CardBody>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button
              variant="ghost"
              onClick={() => { setStep('upload'); setDraft(null); }}
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Upload a different file
            </Button>
            <Button
              onClick={() => setStep('create')}
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Continue to Assessment Details
            </Button>
          </div>
        </>
      )}

      {/* ── CREATE STEP ─────────────────────────── */}
      {step === 'create' && draft && (
        <>
          <Card variant="outlined" padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-secondary-600" />
                Assessment Details
              </CardTitle>
            </CardHeader>
            <CardBody className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Input
                  label="Title"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  fullWidth
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">
                  Field <span className="ml-0.5 text-error">*</span>
                </label>
                <select
                  value={fieldId}
                  onChange={(e) => setFieldId(e.target.value)}
                  className="block w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">Select a field...</option>
                  {fieldsList.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">
                  Organization <span className="text-xs text-text-tertiary">(optional)</span>
                </label>
                <select
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  className="block w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">No organization (general assessment)...</option>
                  {orgsList.map((o) => (
                    <option key={o.id} value={o.id}>{o.name} ({o.code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Assessment Type</label>
                <select
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value)}
                  className="block w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="PRACTICAL">Practical</option>
                  <option value="THEORETICAL">Theoretical</option>
                  <option value="MIXED">Mixed</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="block w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Duration (minutes)</label>
                <input
                  type="number"
                  min={5}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(5, Number(e.target.value) || 5))}
                  className="block w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              {createError && (
                <div className="md:col-span-2 flex items-start gap-3 rounded-xl border border-error/30 bg-error-light p-4 text-sm text-error">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Summary */}
              <div className="md:col-span-2 mt-2 rounded-xl bg-surface-secondary p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Import summary</p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-text-secondary">
                  <span><strong className="text-text-primary">{draft.tasks.length}</strong> tasks</span>
                  <span><strong className="text-text-primary">{draft.checklistItems.length}</strong> checklist items</span>
                  <span><strong className="text-text-primary">{draft.scenarioHtml ? '✓' : '—'}</strong> scenario</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button
              variant="ghost"
              onClick={() => setStep('review')}
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Back to review
            </Button>
            <Button onClick={handleCreate} loading={creating} icon={<Sparkles className="h-4 w-4" />}>
              Create Assessment
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default ImportAssessmentWizard;
