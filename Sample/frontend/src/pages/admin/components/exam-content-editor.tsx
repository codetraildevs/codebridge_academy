import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Input } from '@components/ui/input';
import { RichTextEditor } from '@components/editor/rich-text-editor';
import { examService } from '@services/exam-service';
import type { Exam } from '@app_types/index';
import {
  generateAssessmentChecklist,
  detectQuestionType,
  extractNumberedTasks,
  renormalizeChecklistWeights,
  DEFAULT_CRITERION_MARKS,
  type ChecklistSection,
} from './checklist-generator';
import { htmlToPlainText } from '@utils/rich-text';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  ListChecks,
  Plus,
  RefreshCw,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';

/**
 * Edit workspace for an existing (draft) exam — mirrors the manual create
 * flow exactly: Title, Scenario, Tasks (all questions in one flat list) and
 * the Assessment Checklist (standard TVET format, generated from the tasks).
 * Saving reconciles the whole structure (exam fields + sections + tasks +
 * checklist rows) through the exam API.
 */

const SECTION_TYPES = [
  { value: 'ERD_DESIGN', label: 'ERD Design' },
  { value: 'DFD_DESIGN', label: 'DFD Design' },
  { value: 'FLOWCHART', label: 'Flowchart' },
  { value: 'UML_DIAGRAM', label: 'UML Diagram' },
  { value: 'CODE_WRITING', label: 'Code Writing' },
  { value: 'DATABASE_DESIGN', label: 'Database Design' },
  { value: 'TOPOLOGY_BUILDER', label: 'Topology Builder' },
  { value: 'NETWORK_CONFIG', label: 'Network Config' },
  { value: 'SUBNETTING', label: 'Subnetting' },
  { value: 'PRESENTATION', label: 'Presentation' },
  { value: 'PORTFOLIO', label: 'Portfolio' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'ESSAY', label: 'Essay' },
  { value: 'FILE_UPLOAD', label: 'File Upload' },
  { value: 'MIXED', label: 'Mixed' },
  { value: 'ENVIRONMENT_SETUP', label: 'Environment Setup' },
  { value: 'PROJECT_CLEANUP', label: 'Project Cleanup' },
];

/** Placeholder questions the create flow inserts into empty sections. */
const isPlaceholderQuestion = (text: string) => /^complete the tasks for /i.test(htmlToPlainText(text).trim());

/** Word-overlap similarity (0..1) used to keep question ids when a task is
 *  edited in place inside the single tasks editor. */
function taskTextSimilarity(a: string, b: string): number {
  const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const wa = words(a);
  const wb = words(b);
  if (wa.length === 0 || wb.length === 0) return 0;
  const common = wa.filter((w) => wb.includes(w)).length;
  return common / Math.max(wa.length, wb.length);
}

/** Keep a question id when at least this much of the text overlaps. */
const ID_MATCH_THRESHOLD = 0.35;

interface EditTask {
  key: string;
  questionId?: string;
  text: string;
  questionType: string;
}

interface EditCriterion {
  key: string;
  criterionId?: string;
  criterionName: string;
  description: string;
  maxScore: number;
}

interface EditSection {
  key: string;
  sectionId?: string;
  title: string;
  sectionType: string;
  weight: number;
  taskIndexes: number[];
  criteria: EditCriterion[];
}

let editKeyCounter = 0;
const nextEditKey = () => `edit-${++editKeyCounter}-${Date.now().toString(36)}`;

/** Build the flat task list and the checklist from the exam's persisted structure. */
function buildFromExam(exam: Exam): { tasks: EditTask[]; checklist: EditSection[] } {
  const tasks: EditTask[] = [];
  const sections: EditSection[] = (exam.sections || []).map((s) => {
    const taskIndexes: number[] = [];
    for (const q of s.questions || []) {
      if (isPlaceholderQuestion(q.questionText)) continue;
      taskIndexes.push(tasks.length);
      tasks.push({
        key: nextEditKey(),
        questionId: q.id,
        text: q.questionText,
        questionType: q.questionType,
      });
    }
    return {
      key: nextEditKey(),
      sectionId: s.id,
      title: s.title,
      sectionType: s.sectionType,
      weight: s.weight,
      taskIndexes,
      criteria: (s.rubricCriteria || []).map((c) => ({
        key: nextEditKey(),
        criterionId: c.id,
        criterionName: c.criterionName,
        description: c.description || '',
        maxScore: c.maxScore,
      })),
    };
  });
  return { tasks, checklist: sections };
}

export interface ExamContentEditorProps {
  exam: Exam;
  onSaved: () => void;
  onCancel: () => void;
}

export function ExamContentEditor({ exam, onSaved, onCancel }: ExamContentEditorProps) {
  const initial = buildFromExam(exam);
  // Flat imported exams (ONE "Practical Assessment" section created from an
  // uploaded document) render as a single flat checklist instead of the
  // standard TVET section cards. Manual TVET exams keep the section-card flow
  // even if they happen to have one section.
  const isFlatExam =
    initial.checklist.length === 1 &&
    initial.checklist[0]!.title.trim().toLowerCase() === 'practical assessment';
  const [title, setTitle] = useState(exam.title);
  const [scenario, setScenario] = useState(exam.description || '');
  const [tasks, setTasks] = useState<EditTask[]>(initial.tasks);
  const [tasksText, setTasksText] = useState(() =>
    initial.tasks.map((t, i) => `${i + 1}. ${htmlToPlainText(t.text)}`).join('\n'),
  );
  const [checklist, setChecklist] = useState<EditSection[]>(initial.checklist);
  const [checklistGenerated, setChecklistGenerated] = useState(initial.checklist.length > 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Task helpers (single working area, parsed like the sample exam) ──
  const invalidateChecklist = () => {
    setChecklist([]);
    setChecklistGenerated(false);
  };

  /** Re-parse the tasks editor into the task list, keeping each question's id
   *  when its text was edited in place (best-text match) so saving updates
   *  existing rows instead of churning them. */
  const handleTasksChange = (html: string) => {
    setTasksText(html);
    const parsedTexts = extractNumberedTasks(html);
    const used = new Set<number>();
    const next: EditTask[] = parsedTexts.map((text) => {
      let bestIndex = -1;
      let bestScore = 0;
      tasks.forEach((known, ki) => {
        if (used.has(ki)) return;
        const score = taskTextSimilarity(htmlToPlainText(known.text), htmlToPlainText(text));
        if (score > bestScore) { bestScore = score; bestIndex = ki; }
      });
      if (bestIndex >= 0 && bestScore >= ID_MATCH_THRESHOLD) {
        const best = tasks[bestIndex]!;
        used.add(bestIndex);
        return { key: best.key, questionId: best.questionId, text, questionType: best.questionType };
      }
      return { key: nextEditKey(), text, questionType: '' };
    });
    setTasks(next);
    if (isFlatExam) {
      // Flat imported exam: keep the extracted checklist exactly as it is and
      // just point every task at the single practical section (as the upload
      // review screen does).
      setChecklist(
        checklist.map((s, i) => (i === 0 ? { ...s, taskIndexes: next.map((_, idx) => idx) } : s)),
      );
      setChecklistGenerated(true);
    } else {
      invalidateChecklist();
    }
  };

  // ── Checklist helpers ───────────────────────────
  const handleGenerateChecklist = () => {
    const generated = generateAssessmentChecklist(tasks);
    if (generated.length === 0) {
      setError('Add at least one task before generating the checklist.');
      return;
    }
    // Preserve existing section ids when titles match (so rows are updated, not churned).
    const idByTitle = new Map(checklist.map((s) => [s.title, s.sectionId]));
    const mapped: EditSection[] = generated.map((g: ChecklistSection) => ({
      key: nextEditKey(),
      sectionId: idByTitle.get(g.title),
      title: g.title,
      sectionType: g.sectionType,
      weight: g.weight,
      taskIndexes: g.taskIndexes,
      criteria: g.criteria.map((c) => ({
        key: nextEditKey(),
        criterionName: c.criterionName,
        description: c.description,
        maxScore: c.maxScore,
      })),
    }));
    setChecklist(mapped);
    setChecklistGenerated(true);
    setError('');
  };

  const handleRegenerateChecklist = () => {
    if (!window.confirm(
      'Regenerate the assessment checklist from the current tasks? The four standard sections and all their indicators will be rebuilt from the full sample-exam checklist, replacing the current sections, indicators and marks.',
    )) {
      return;
    }
    handleGenerateChecklist();
  };

  const updateChecklistSection = (sIndex: number, field: keyof EditSection, value: any) => {
    setChecklist(checklist.map((s, i) => (i === sIndex ? { ...s, [field]: value } : s)));
  };

  const addCriterion = (sIndex: number) => {
    setChecklist(
      checklist.map((s, i) =>
        i === sIndex
          ? { ...s, criteria: [...s.criteria, { key: nextEditKey(), criterionName: '', description: '', maxScore: DEFAULT_CRITERION_MARKS }] }
          : s,
      ),
    );
  };

  const updateCriterion = (sIndex: number, cKey: string, field: keyof EditCriterion, value: any) => {
    setChecklist(
      checklist.map((s, i) =>
        i === sIndex
          ? { ...s, criteria: s.criteria.map((c) => (c.key === cKey ? { ...c, [field]: value } : c)) }
          : s,
      ),
    );
  };

  const removeCriterion = (sIndex: number, cKey: string) => {
    setChecklist(
      checklist.map((s, i) =>
        i === sIndex ? { ...s, criteria: s.criteria.filter((c) => c.key !== cKey) } : s,
      ),
    );
  };

  const removeChecklistSection = (sIndex: number) => {
    const remaining = checklist.filter((_, i) => i !== sIndex);
    if (remaining.length === 0) {
      setChecklist([]);
      setChecklistGenerated(false);
      return;
    }
    setChecklist(renormalizeChecklistWeights(remaining));
  };

  // ── Validation (mirrors the create flow) ────────
  const validate = (): boolean => {
    setError('');
    if (!title.trim()) { setError('Exam title is required'); return false; }
    if (!htmlToPlainText(scenario).trim()) { setError('Scenario is required — describe the situation for candidates'); return false; }
    if (tasks.length === 0) { setError('Add at least one task'); return false; }
    for (const task of tasks) {
      if (!htmlToPlainText(task.text).trim()) { setError('Every task needs content'); return false; }
    }
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
  };

  // ── Save ────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // 1. Exam-level fields (title + scenario).
      await examService.update(exam.id, { title, description: scenario });

      const originalSections = exam.sections || [];
      const questionSection = new Map<string, string>();
      const criterionSection = new Map<string, string>();
      for (const s of originalSections) {
        for (const q of s.questions || []) questionSection.set(q.id, s.id);
        for (const c of s.rubricCriteria || []) criterionSection.set(c.id, s.id);
      }

      // 2. Resolve each checklist section to a persisted section (by id or by title).
      const originalByTitle = new Map<string, string>();
      for (const s of originalSections) if (!originalByTitle.has(s.title)) originalByTitle.set(s.title, s.id);
      const usedOriginalIds = new Set<string>();
      const sectionIdByKey = new Map<string, string>();
      for (const sec of checklist) {
        let matchId = sec.sectionId;
        if (!matchId || !originalSections.some((s) => s.id === matchId)) {
          const byTitle = originalByTitle.get(sec.title);
          if (byTitle && !usedOriginalIds.has(byTitle)) matchId = byTitle;
        }
        if (matchId && !usedOriginalIds.has(matchId)) usedOriginalIds.add(matchId);
        sectionIdByKey.set(sec.key, matchId || '');
      }

      // 3. Delete removed sections (their questions/checklist rows go with them).
      const deletedSectionIds = originalSections.map((s) => s.id).filter((id) => !usedOriginalIds.has(id));
      for (const id of deletedSectionIds) await examService.deleteSection(id);

      // 4. Upsert sections.
      const resolvedIdByKey = new Map(sectionIdByKey);
      for (const [sIndex, sec] of checklist.entries()) {
        const existingId = resolvedIdByKey.get(sec.key);
        if (existingId) {
          await examService.updateSection(existingId, {
            title: sec.title,
            sectionType: sec.sectionType,
            weight: sec.weight,
            orderIndex: sIndex,
          });
        } else {
          const created = await examService.createSection(exam.id, {
            title: sec.title,
            sectionType: sec.sectionType,
            weight: sec.weight,
            orderIndex: sIndex,
          });
          resolvedIdByKey.set(sec.key, created.id);
        }
      }

      // 5. Tasks → questions, assigned to the section the checklist places them in.
      const keepQuestionIds = new Set<string>();
      const movedQuestionIds = new Set<string>();
      for (const sec of checklist) {
        const sectionId = resolvedIdByKey.get(sec.key)!;
        const secTasks = sec.taskIndexes
          .map((i) => tasks[i])
          .filter((t): t is EditTask => Boolean(t));
        if (secTasks.length === 0) {
          // Empty section — keep a placeholder question (as the create flow does).
          const existingPlaceholder = (originalSections.find((s) => s.id === sectionId)?.questions || [])
            .find((q) => isPlaceholderQuestion(q.questionText));
          const placeholderText = `Complete the tasks for ${sec.title}`;
          if (existingPlaceholder) {
            await examService.updateQuestion(existingPlaceholder.id, {
              questionText: placeholderText,
              questionType: 'ESSAY',
              orderIndex: 0,
            });
            keepQuestionIds.add(existingPlaceholder.id);
          } else {
            await examService.createQuestion(sectionId, {
              questionText: placeholderText,
              questionType: 'ESSAY',
              points: 0,
              orderIndex: 0,
            });
          }
          continue;
        }
        for (const [qi, t] of secTasks.entries()) {
          const questionType = t.questionType || detectQuestionType(t.text);
          if (t.questionId && questionSection.get(t.questionId) === sectionId) {
            await examService.updateQuestion(t.questionId, {
              questionText: t.text,
              questionType,
              orderIndex: qi,
            });
            keepQuestionIds.add(t.questionId);
          } else if (t.questionId) {
            // Moved to a different section — recreate there, remove the old row.
            await examService.createQuestion(sectionId, {
              questionText: t.text,
              questionType,
              points: 0,
              orderIndex: qi,
            });
            movedQuestionIds.add(t.questionId);
          } else {
            await examService.createQuestion(sectionId, {
              questionText: t.text,
              questionType,
              points: 0,
              orderIndex: qi,
            });
          }
        }
      }
      for (const s of originalSections) {
        for (const q of s.questions || []) {
          if (!keepQuestionIds.has(q.id) && !movedQuestionIds.has(q.id) && !deletedSectionIds.includes(s.id)) {
            await examService.deleteQuestion(q.id);
          }
        }
      }

      // 6. Assessment checklist rows.
      const keepCriterionIds = new Set<string>();
      for (const sec of checklist) {
        const sectionId = resolvedIdByKey.get(sec.key)!;
        for (const c of sec.criteria) {
          if (c.criterionId) {
            await examService.updateRubricCriterion(c.criterionId, {
              criterionName: c.criterionName,
              description: c.description,
              maxScore: c.maxScore,
            });
            keepCriterionIds.add(c.criterionId);
          } else {
            await examService.createRubricCriterion(sectionId, {
              criterionName: c.criterionName,
              description: c.description,
              maxScore: c.maxScore,
            });
          }
        }
      }
      for (const s of originalSections) {
        for (const c of s.rubricCriteria || []) {
          if (!keepCriterionIds.has(c.id) && !deletedSectionIds.includes(s.id)) {
            await examService.deleteRubricCriterion(c.id);
          }
        }
      }

      setSuccess('Exam content saved successfully.');
      setTimeout(onSaved, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save exam');
    } finally {
      setSaving(false);
    }
  };

  const totalMarks = checklist.reduce(
    (sum, s) => sum + s.criteria.reduce((cs, c) => cs + c.maxScore, 0),
    0,
  );

  // ── Render ──────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onCancel}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Edit Exam Content</h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              Update the title, scenario, tasks and assessment checklist. Changes are saved when you click
              &quot;Save Changes&quot;.
            </p>
          </div>
        </div>
        <Badge variant="info" size="md">Draft</Badge>
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

      {/* 1. Title */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary-500" />
            Title
          </CardTitle>
        </CardHeader>
        <CardBody>
          <Input
            label="Exam Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Parking Space Sales Management System (PSSMS)"
            icon={<FileCheck className="h-4 w-4" />}
            required
          />
        </CardBody>
      </Card>

      {/* 2. Scenario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary-500" />
            Scenario
          </CardTitle>
        </CardHeader>
        <CardBody>
          <RichTextEditor
            value={scenario}
            onChange={setScenario}
            placeholder="The integrated situation presented to the candidate (as in the exam document)..."
            minHeight={200}
          />
        </CardBody>
      </Card>

      {/* 3. Tasks — one working area, as in the sample exam document */}
      <Card>
        <CardHeader>
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary-500" />
              Tasks
              {tasks.length > 0 && (
                <Badge size="sm" variant="neutral">
                  {tasks.length} {tasks.length === 1 ? 'question' : 'questions'} detected
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <p className="mb-3 text-xs text-text-tertiary">
            Write all the questions the candidate must complete in this single working area — numbered,
            exactly as in the exam document. Each task becomes a scored indicator in the assessment
            checklist.
          </p>

          <RichTextEditor
            value={tasksText}
            onChange={handleTasksChange}
            placeholder="1. Using attributes provided below, design an Entity Relationship Diagram (ERD)..."
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
                  <li key={task.key} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-semibold text-primary-700">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-text-secondary">{htmlToPlainText(task.text)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 4. Assessment Checklist — standard TVET format */}
      <Card>
        <CardHeader>
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-accent-500" />
              Assessment Checklist
              {!isFlatExam && checklistGenerated && (
                <Badge size="sm" variant="success">{totalMarks} marks</Badge>
              )}
            </CardTitle>
            {!isFlatExam && checklistGenerated && (
              <Button size="sm" variant="secondary" onClick={handleRegenerateChecklist}>
                <Wand2 className="mr-1 h-3.5 w-3.5" /> Regenerate Checklist
              </Button>
            )}
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {isFlatExam ? (
            <>
              <p className="text-xs text-text-tertiary">
                Assessment checklist extracted from the document — one practical section holding every task. Edit
                the indicators and marks below as needed.
              </p>
              {checklist.length === 0 ? (
                <p className="py-4 text-center text-sm text-text-tertiary">
                  No assessment checklist — add indicators below.
                </p>
              ) : (
                <div className="rounded-lg border border-accent-200 bg-accent-50/30 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-accent-600" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-accent-700">Indicators</span>
                    <Badge size="sm" variant="success">
                      {checklist[0]!.criteria.reduce((sum, c) => sum + c.maxScore, 0)} marks
                    </Badge>
                    <Button size="xs" variant="ghost" className="ml-auto" onClick={() => addCriterion(0)}>
                      <Plus className="mr-1 h-3 w-3" /> Add Indicator
                    </Button>
                  </div>
                  {checklist[0]!.criteria.length === 0 ? (
                    <p className="py-4 text-center text-sm text-text-tertiary">
                      No indicators yet — add them below to build the assessment checklist.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {checklist[0]!.criteria.map((criterion, cIndex) => (
                        <div key={criterion.key} className="flex items-start gap-3 rounded-lg border border-accent-100 bg-white p-2.5">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-700">
                            {cIndex + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <input
                                className="min-w-0 flex-1 rounded border border-border bg-white px-2 py-1 text-xs font-medium text-text-primary"
                                value={criterion.criterionName}
                                onChange={(e) => updateCriterion(0, criterion.key, 'criterionName', e.target.value)}
                                placeholder="Indicator name"
                              />
                              <div className="flex shrink-0 items-center gap-1">
                                <input
                                  className="w-14 rounded border border-border px-2 py-1 text-center text-xs"
                                  type="number"
                                  value={criterion.maxScore}
                                  onChange={(e) => updateCriterion(0, criterion.key, 'maxScore', Number(e.target.value))}
                                />
                                <span className="text-xs text-text-tertiary">pts</span>
                                <button
                                  onClick={() => removeCriterion(0, criterion.key)}
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
                              onChange={(e) => updateCriterion(0, criterion.key, 'description', e.target.value)}
                              placeholder="Indicator description..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : !checklistGenerated ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-accent-200 bg-accent-50/30 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-100 to-accent-50">
                <Wand2 className="h-7 w-7 text-accent-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-text-primary">Generate the Assessment Checklist</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-text-secondary">
                  We&apos;ll build the full standard TVET checklist — the four standard sections (Preliminary, Process,
                  Presentation and Closing) seeded with all the sample-exam indicators, plus a scored indicator for
                  every task — from your {tasks.length} task(s), exactly as in the exam document.
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={handleGenerateChecklist} disabled={tasks.length === 0}>
                <Wand2 className="mr-1 h-3.5 w-3.5" /> Generate Checklist
              </Button>
            </div>
          ) : (
            <>
              <p className="text-xs text-text-tertiary">
                Standard assessment checklist (Preliminary Activities 15% · Process &amp; Fulfillment 50% · Presentation
                &amp; Quality 30% · Closing Activities 5%). Each task becomes a scored indicator — edit names and marks,
                or regenerate from the tasks.
              </p>
              <div className="space-y-4">
                {checklist.map((section, sIndex) => (
                  <div key={section.key} className="rounded-xl border border-border bg-white p-3">
                    {/* Section header */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-text-tertiary uppercase shrink-0">
                        Section {sIndex + 1}
                      </span>
                      <input
                        className="min-w-40 flex-1 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium text-text-primary"
                        value={section.title}
                        onChange={(e) => updateChecklistSection(sIndex, 'title', e.target.value)}
                        placeholder="Section title"
                      />
                      <select
                        value={section.sectionType}
                        onChange={(e) => updateChecklistSection(sIndex, 'sectionType', e.target.value)}
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
                          onChange={(e) => updateChecklistSection(sIndex, 'weight', Number(e.target.value))}
                        />
                        <span className="text-xs text-text-tertiary">%</span>
                      </div>
                      <Badge size="sm" variant="neutral">
                        {section.taskIndexes.length} {section.taskIndexes.length === 1 ? 'task' : 'tasks'}
                      </Badge>
                      <button
                        onClick={() => removeChecklistSection(sIndex)}
                        className="ml-auto rounded-md p-1 text-text-tertiary hover:bg-red-50 hover:text-error"
                        title="Remove section"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Indicators */}
                    <div className="mt-3 space-y-1.5">
                      {section.criteria.length === 0 && (
                        <p className="py-2 text-center text-xs text-text-tertiary">
                          No indicators — click &quot;Regenerate Checklist&quot; to build them from the tasks
                        </p>
                      )}
                      {section.criteria.map((criterion, cIndex) => (
                        <div key={criterion.key} className="flex items-start gap-3 rounded-lg border border-accent-100 bg-accent-50/30 p-2.5">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-700">
                            {cIndex + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <input
                                className="min-w-0 flex-1 rounded border border-border bg-white px-2 py-1 text-xs font-medium text-text-primary"
                                value={criterion.criterionName}
                                onChange={(e) => updateCriterion(sIndex, criterion.key, 'criterionName', e.target.value)}
                                placeholder="Indicator name"
                              />
                              <div className="flex shrink-0 items-center gap-1">
                                <input
                                  className="w-14 rounded border border-border px-2 py-1 text-center text-xs"
                                  type="number"
                                  value={criterion.maxScore}
                                  onChange={(e) => updateCriterion(sIndex, criterion.key, 'maxScore', Number(e.target.value))}
                                />
                                <span className="text-xs text-text-tertiary">pts</span>
                                <button
                                  onClick={() => removeCriterion(sIndex, criterion.key)}
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
                              onChange={(e) => updateCriterion(sIndex, criterion.key, 'description', e.target.value)}
                              placeholder="Indicator description..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button size="xs" variant="ghost" className="mt-2" onClick={() => addCriterion(sIndex)}>
                      <Plus className="mr-1 h-3 w-3" /> Add Indicator
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Footer */}
      <CardFooter className="justify-between border-t border-border bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-tertiary">
            {checklist.reduce((sum, s) => sum + s.weight, 0)}% total weight
          </span>
          <Button onClick={handleSave} loading={saving}>
            {saving ? (
              <><RefreshCw className="mr-1 h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle2 className="mr-1 h-4 w-4" /> Save Changes</>
            )}
          </Button>
        </div>
      </CardFooter>
    </div>
  );
}

export default ExamContentEditor;
