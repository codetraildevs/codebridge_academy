import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@components/ui/modal';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { AuthStepper } from '@components/ui/auth-stepper';
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Layout,
  HelpCircle,
  Eye,
  Copy,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { adminService } from '@services/admin-service';

// ── Types ──────────────────────────────────────────

interface SectionDraft {
  id: string;
  title: string;
  description: string;
  sectionType: string;
  weight: number;
  duration: number;
  questions: QuestionDraft[];
}

interface QuestionDraft {
  id: string;
  questionText: string;
  questionType: string;
  points: number;
  orderIndex: number;
  options: string[];
  correctAnswer: string;
  expectedOutput: string;
}

interface ExamFormData {
  title: string;
  description: string;
  tradeId: string;
  examType: 'PRACTICAL' | 'THEORETICAL' | 'MIXED';
  duration: number;
  passingScore: number;
  maxAttempts: number;
  instructions: string;
  allowOralDefense: boolean;
  requireFullScreen: boolean;
  requireWebcam: boolean;
  sections: SectionDraft[];
}

const emptyForm: ExamFormData = {
  title: '',
  description: '',
  tradeId: '',
  examType: 'PRACTICAL',
  duration: 60,
  passingScore: 50,
  maxAttempts: 1,
  instructions: '',
  allowOralDefense: true,
  requireFullScreen: true,
  requireWebcam: false,
  sections: [],
};

const STEPS = [
  { id: 'details', label: 'Details', description: 'Basic exam info' },
  { id: 'sections', label: 'Sections', description: 'Add exam sections' },
  { id: 'questions', label: 'Questions', description: 'Add questions' },
  { id: 'review', label: 'Review', description: 'Confirm & create' },
];

const EXAM_TYPES = [
  { value: 'PRACTICAL', label: 'Practical' },
  { value: 'THEORETICAL', label: 'Theoretical' },
  { value: 'MIXED', label: 'Mixed' },
];

const SECTION_TYPES = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'ESSAY', label: 'Essay' },
  { value: 'CODE_WRITING', label: 'Code Writing' },
  { value: 'SHORT_ANSWER', label: 'Short Answer' },
  { value: 'FILE_UPLOAD', label: 'File Upload' },
  { value: 'DATABASE_DESIGN', label: 'Database Design' },
  { value: 'PRESENTATION', label: 'Presentation' },
  { value: 'MIXED', label: 'Mixed' },
];

const QUESTION_TYPES = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'ESSAY', label: 'Essay' },
  { value: 'CODE', label: 'Code' },
  { value: 'SHORT_ANSWER', label: 'Short Answer' },
  { value: 'FILE_UPLOAD', label: 'File Upload' },
  { value: 'DIAGRAM', label: 'Diagram' },
];

interface ExamCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  trades?: Array<{ id: string; name: string }>;
}

// ── Utility ────────────────────────────────────────

let _idCounter = 0;
const uid = () => `draft_${++_idCounter}_${Date.now()}`;

// ── Component ──────────────────────────────────────

export function ExamCreateModal({ isOpen, onClose, onCreated, trades = [] }: ExamCreateModalProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ExamFormData>({ ...emptyForm });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({ ...emptyForm });
      setStep(0);
      setErrors({});
      setSubmitError('');
    }
  }, [isOpen]);

  // ── Field updater ────────────────────────────────
  const update = <K extends keyof ExamFormData>(key: K, value: ExamFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const addSection = () => {
    const section: SectionDraft = {
      id: uid(),
      title: '',
      description: '',
      sectionType: 'MULTIPLE_CHOICE',
      weight: 10,
      duration: 15,
      questions: [],
    };
    setForm((f) => ({ ...f, sections: [...f.sections, section] }));
  };

  const updateSection = (id: string, updates: Partial<SectionDraft>) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
  };

  const removeSection = (id: string) => {
    setForm((f) => ({ ...f, sections: f.sections.filter((s) => s.id !== id) }));
  };

  const addQuestion = (sectionId: string) => {
    const question: QuestionDraft = {
      id: uid(),
      questionText: '',
      questionType: 'MULTIPLE_CHOICE',
      points: 10,
      orderIndex: 0,
      options: [''],
      correctAnswer: '',
      expectedOutput: '',
    };
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s) =>
        s.id === sectionId
          ? { ...s, questions: [...s.questions, question] }
          : s,
      ),
    }));
  };

  const updateQuestion = (
    sectionId: string,
    questionId: string,
    updates: Partial<QuestionDraft>,
  ) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === questionId ? { ...q, ...updates } : q,
              ),
            }
          : s,
      ),
    }));
  };

  const removeQuestion = (sectionId: string, questionId: string) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s) =>
        s.id === sectionId
          ? { ...s, questions: s.questions.filter((q) => q.id !== questionId) }
          : s,
      ),
    }));
  };

  const addOption = (sectionId: string, questionId: string) => {
    const section = form.sections.find((s) => s.id === sectionId);
    const question = section?.questions.find((q) => q.id === questionId);
    if (question) {
      updateQuestion(sectionId, questionId, {
        options: [...question.options, ''],
      });
    }
  };

  const updateOption = (
    sectionId: string,
    questionId: string,
    index: number,
    value: string,
  ) => {
    const section = form.sections.find((s) => s.id === sectionId);
    const question = section?.questions.find((q) => q.id === questionId);
    if (question) {
      const options = [...question.options];
      options[index] = value;
      updateQuestion(sectionId, questionId, { options });
    }
  };

  const removeOption = (sectionId: string, questionId: string, index: number) => {
    const section = form.sections.find((s) => s.id === sectionId);
    const question = section?.questions.find((q) => q.id === questionId);
    if (question && question.options.length > 1) {
      updateQuestion(sectionId, questionId, {
        options: question.options.filter((_, i) => i !== index),
      });
    }
  };

  // ── Validation ───────────────────────────────────
  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!form.title.trim()) newErrors.title = 'Title is required';
      if (!form.tradeId) newErrors.tradeId = 'Trade is required';
      if (form.duration < 1) newErrors.duration = 'Duration must be at least 1 minute';
      if (form.passingScore < 0 || form.passingScore > 100)
        newErrors.passingScore = 'Passing score must be 0–100';
    }

    if (step === 1) {
      if (form.sections.length === 0) {
        newErrors.sections = 'Add at least one section';
      } else {
        form.sections.forEach((s, i) => {
          if (!s.title.trim()) newErrors[`section_${s.id}_title`] = `Section ${i + 1} title is required`;
          if (s.weight < 1) newErrors[`section_${s.id}_weight`] = `Weight must be at least 1`;
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  // ── Submit ───────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      // Build the payload sections with questions
      const payload = {
        title: form.title,
        description: form.description || undefined,
        tradeId: form.tradeId,
        examType: form.examType,
        duration: form.duration,
        passingScore: form.passingScore,
        maxAttempts: form.maxAttempts,
        instructions: form.instructions || undefined,
        allowOralDefense: form.allowOralDefense,
        requireFullScreen: form.requireFullScreen,
        requireWebcam: form.requireWebcam,
        sections: form.sections.map((s, si) => ({
          title: s.title,
          description: s.description || undefined,
          orderIndex: si,
          sectionType: s.sectionType,
          weight: s.weight,
          duration: s.duration || undefined,
          questions: s.questions.map((q, qi) => ({
            questionText: q.questionText,
            questionType: q.questionType,
            points: q.points,
            orderIndex: qi,
            options:
              q.questionType === 'MULTIPLE_CHOICE'
                ? q.options.filter((o) => o.trim())
                : undefined,
            correctAnswer: q.correctAnswer || undefined,
            expectedOutput: q.expectedOutput || undefined,
          })),
        })),
      };

      await adminService.createExam(payload);
      onCreated();
      onClose();
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to create exam');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render helpers ───────────────────────────────
  const renderError = (key: string) =>
    errors[key] ? (
      <p className="mt-1 text-xs text-error flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        {errors[key]}
      </p>
    ) : null;

  const inputCls =
    'w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary/70 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all';

  const selectCls =
    'w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all';

  // ── Step content ─────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Exam Title <span className="text-error">*</span>
              </label>
              <input
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="e.g., Web Development Fundamentals"
                className={`${inputCls} ${errors.title ? 'border-error' : ''}`}
              />
              {renderError('title')}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="exam-trade" className="block text-sm font-medium text-text-primary mb-1.5">
                  Trade <span className="text-error">*</span>
                </label>
                <select
                  id="exam-trade"
                  data-testid="exam-trade-select"
                  value={form.tradeId}
                  onChange={(e) => update('tradeId', e.target.value)}
                  className={`${selectCls} ${errors.tradeId ? 'border-error' : ''}`}
                >
                  <option value="">Select trade...</option>
                  {trades.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {renderError('tradeId')}
              </div>

              <div>
                <label htmlFor="exam-type" className="block text-sm font-medium text-text-primary mb-1.5">
                  Exam Type
                </label>
                <select
                  id="exam-type"
                  value={form.examType}
                  onChange={(e) => update('examType', e.target.value as 'PRACTICAL' | 'THEORETICAL' | 'MIXED')}
                  className={selectCls}
                >
                  {EXAM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Scenario
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Describe the exam objectives..."
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Duration (min) <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.duration}
                  onChange={(e) => update('duration', parseInt(e.target.value) || 1)}
                  className={`${inputCls} ${errors.duration ? 'border-error' : ''}`}
                />
                {renderError('duration')}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Passing Score (%) <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.passingScore}
                  onChange={(e) => update('passingScore', parseInt(e.target.value) || 0)}
                  className={`${inputCls} ${errors.passingScore ? 'border-error' : ''}`}
                />
                {renderError('passingScore')}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Max Attempts
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.maxAttempts}
                  onChange={(e) => update('maxAttempts', parseInt(e.target.value) || 1)}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Instructions
              </label>
              <textarea
                value={form.instructions}
                onChange={(e) => update('instructions', e.target.value)}
                placeholder="Provide detailed instructions for candidates..."
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allowOralDefense}
                  onChange={(e) => update('allowOralDefense', e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-text-primary">Allow Oral Defense</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requireFullScreen}
                  onChange={(e) => update('requireFullScreen', e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-text-primary">Require Full Screen</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requireWebcam}
                  onChange={(e) => update('requireWebcam', e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-text-primary">Require Webcam</span>
              </label>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            {form.sections.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Layout className="h-12 w-12 text-text-tertiary mb-3" />
                <h3 className="text-base font-medium text-text-primary">No sections yet</h3>
                <p className="mt-1 text-sm text-text-tertiary">
                  Add sections to organize your exam content
                </p>
              </div>
            ) : (
              form.sections.map((section, si) => (
                <div
                  key={section.id}
                  className="rounded-xl border border-border bg-white p-4 transition-all hover:border-border-hover"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-text-tertiary cursor-grab" />
                      <span className="text-xs font-medium text-text-tertiary bg-surface-tertiary px-2 py-0.5 rounded">
                        Section {si + 1}
                      </span>
                    </div>
                    <button
                      onClick={() => removeSection(section.id)}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-error hover:bg-error-light transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Title <span className="text-error">*</span>
                      </label>
                      <input
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        placeholder="e.g., Multiple Choice Section"
                        className={`${inputCls} text-sm ${
                          errors[`section_${section.id}_title`] ? 'border-error' : ''
                        }`}
                      />
                      {renderError(`section_${section.id}_title`)}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Section Type
                      </label>
                      <select
                        value={section.sectionType}
                        onChange={(e) => updateSection(section.id, { sectionType: e.target.value })}
                        className={selectCls}
                      >
                        {SECTION_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Weight
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={section.weight}
                        onChange={(e) =>
                          updateSection(section.id, { weight: parseInt(e.target.value) || 1 })
                        }
                        className={`${inputCls} ${
                          errors[`section_${section.id}_weight`] ? 'border-error' : ''
                        }`}
                      />
                      {renderError(`section_${section.id}_weight`)}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Duration (min)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={section.duration}
                        onChange={(e) =>
                          updateSection(section.id, { duration: parseInt(e.target.value) || 0 })
                        }
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1 mt-2">
                      Description
                    </label>
                    <input
                      value={section.description}
                      onChange={(e) => updateSection(section.id, { description: e.target.value })}
                      placeholder="Section description..."
                      className={inputCls}
                    />
                  </div>
                </div>
              ))
            )}

            <button
              onClick={addSection}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm font-medium text-text-tertiary transition-all hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50"
            >
              <Plus className="h-4 w-4" />
              Add Section
            </button>

            {renderError('sections')}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {form.sections.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <HelpCircle className="h-12 w-12 text-text-tertiary mb-3" />
                <h3 className="text-base font-medium text-text-primary">No sections available</h3>
                <p className="mt-1 text-sm text-text-tertiary">
                  Go back and add sections before adding questions
                </p>
              </div>
            ) : (
              form.sections.map((section, si) => (
                <div key={section.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary-600" />
                    <h3 className="text-sm font-semibold text-text-primary">
                      {section.title || `Section ${si + 1}`}
                    </h3>
                    <span className="text-xs text-text-tertiary">
                      ({section.questions.length} questions)
                    </span>
                  </div>

                  {section.questions.map((question, qi) => (
                    <div
                      key={question.id}
                      className="ml-4 rounded-xl border border-border bg-white p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-text-tertiary bg-surface-tertiary px-2 py-0.5 rounded">
                          Q{qi + 1}
                        </span>
                        <button
                          onClick={() => removeQuestion(section.id, question.id)}
                          className="p-1 rounded-lg text-text-tertiary hover:text-error transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Question Text <span className="text-error">*</span>
                        </label>
                        <textarea
                          value={question.questionText}
                          onChange={(e) =>
                            updateQuestion(section.id, question.id, {
                              questionText: e.target.value,
                            })
                          }
                          placeholder="Enter the question..."
                          rows={2}
                          className={`${inputCls} resize-none text-sm`}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">
                            Question Type
                          </label>
                          <select
                            data-testid="question-type-select"
                            value={question.questionType}
                            onChange={(e) =>
                              updateQuestion(section.id, question.id, {
                                questionType: e.target.value,
                              })
                            }
                            className={selectCls}
                          >
                            {QUESTION_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">
                            Points
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={question.points}
                            onChange={(e) =>
                              updateQuestion(section.id, question.id, {
                                points: parseInt(e.target.value) || 1,
                              })
                            }
                            className={inputCls}
                          />
                        </div>
                      </div>

                      {/* Multiple Choice Options */}
                      {question.questionType === 'MULTIPLE_CHOICE' && (
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-text-secondary">
                            Answer Options
                          </label>
                          {question.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct_${question.id}`}
                                checked={question.correctAnswer === opt}
                                onChange={() =>
                                  updateQuestion(section.id, question.id, {
                                    correctAnswer: opt,
                                  })
                                }
                                className="h-4 w-4 text-primary-600"
                              />
                              <input
                                value={opt}
                                onChange={(e) => updateOption(section.id, question.id, oi, e.target.value)}
                                placeholder={`Option ${oi + 1}`}
                                className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                              />
                              <button
                                onClick={() => removeOption(section.id, question.id, oi)}
                                className="p-1 text-text-tertiary hover:text-error"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addOption(section.id, question.id)}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            + Add option
                          </button>
                        </div>
                      )}

                      {/* Correct Answer / Expected Output for non-MCQ */}
                      {question.questionType !== 'MULTIPLE_CHOICE' && (
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">
                            Correct Answer / Expected Output
                          </label>
                          <textarea
                            value={question.correctAnswer}
                            onChange={(e) =>
                              updateQuestion(section.id, question.id, {
                                correctAnswer: e.target.value,
                              })
                            }
                            placeholder="Provide the expected answer or output..."
                            rows={2}
                            className={`${inputCls} resize-none text-sm`}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() => addQuestion(section.id)}
                    className="ml-4 flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Question
                  </button>
                </div>
              ))
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            {/* Summary */}
            <div className="rounded-xl border border-border bg-surface-secondary p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Exam Summary</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-text-tertiary">Title:</span>
                  <span className="ml-2 font-medium text-text-primary">{form.title}</span>
                </div>
                <div>
                  <span className="text-text-tertiary">Type:</span>
                  <span className="ml-2 font-medium text-text-primary">
                    {EXAM_TYPES.find((t) => t.value === form.examType)?.label}
                  </span>
                </div>
                <div>
                  <span className="text-text-tertiary">Duration:</span>
                  <span className="ml-2 font-medium text-text-primary">{form.duration} min</span>
                </div>
                <div>
                  <span className="text-text-tertiary">Passing Score:</span>
                  <span className="ml-2 font-medium text-text-primary">{form.passingScore}%</span>
                </div>
                <div>
                  <span className="text-text-tertiary">Sections:</span>
                  <span className="ml-2 font-medium text-text-primary">{form.sections.length}</span>
                </div>
                <div>
                  <span className="text-text-tertiary">Total Questions:</span>
                  <span className="ml-2 font-medium text-text-primary">
                    {form.sections.reduce((sum, s) => sum + s.questions.length, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sections Preview */}
            {form.sections.map((section, si) => (
              <div key={section.id} className="rounded-xl border border-border bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Layout className="h-4 w-4 text-primary-600" />
                    <span className="text-sm font-semibold text-text-primary">
                      {section.title || `Section ${si + 1}`}
                    </span>
                  </div>
                  <span className="text-xs text-text-tertiary bg-surface-tertiary px-2 py-0.5 rounded">
                    {SECTION_TYPES.find((t) => t.value === section.sectionType)?.label} · W:{section.weight} · {section.duration}min
                  </span>
                </div>
                {section.description && (
                  <p className="text-xs text-text-tertiary mb-2">{section.description}</p>
                )}
                {section.questions.length > 0 ? (
                  <div className="space-y-1">
                    {section.questions.map((q, qi) => (
                      <div
                        key={q.id}
                        className="flex items-center gap-2 rounded-lg bg-surface-secondary px-3 py-1.5"
                      >
                        <HelpCircle className="h-3 w-3 text-text-tertiary shrink-0" />
                        <span className="text-xs text-text-secondary truncate flex-1">
                          Q{qi + 1}: {q.questionText || '(empty)'}
                        </span>
                        <span className="text-xs text-text-tertiary shrink-0">
                          {QUESTION_TYPES.find((t) => t.value === q.questionType)?.label} · {q.points}pts
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-tertiary italic">No questions added yet</p>
                )}
              </div>
            ))}

            {submitError && (
              <div className="rounded-xl border border-error/20 bg-error-light p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-error shrink-0 mt-0.5" />
                <p className="text-sm text-error-dark">{submitError}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Exam"
      description="Set up an exam with sections and questions"
      size="xl"
    >
      {/* Stepper */}
      <div className="mb-6 -mx-2">
        <AuthStepper steps={STEPS} currentStep={step} />
      </div>

      {/* Step Content */}
      <div className="min-h-[280px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <Button variant="ghost" size="sm" onClick={step === 0 ? onClose : prevStep}>
          {step === 0 ? 'Cancel' : (
            <span className="flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </span>
          )}
        </Button>

        <div className="flex items-center gap-2">
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={nextStep}>
              <span className="flex items-center gap-1">
                Next <ArrowRight className="h-4 w-4" />
              </span>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              loading={submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Creating...' : (
                <span className="flex items-center gap-1">
                  <Check className="h-4 w-4" /> Create Exam
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default ExamCreateModal;
