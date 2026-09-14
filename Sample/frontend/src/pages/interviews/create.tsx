import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { ArrowLeft, Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import type {
  InterviewType,
  InterviewDifficulty,
  InterviewSectionType,
  InterviewQuestionType,
} from '@app_types/interviews';

// ── Form Types ─────────────────────────────────

interface QuestionForm {
  tempId: string;
  questionText: string;
  questionType: InterviewQuestionType;
  points: number;
  orderIndex: number;
  expectedAnswer: string;
  hints: string;
}

interface SectionForm {
  tempId: string;
  title: string;
  description: string;
  sectionType: InterviewSectionType;
  weight: number;
  duration: number;
  questions: QuestionForm[];
  expanded: boolean;
}

interface TemplateForm {
  title: string;
  description: string;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  duration: number;
  totalScore: number;
  instructions: string;
  sections: SectionForm[];
}

let tempIdCounter = 0;
const newTempId = () => `temp_${++tempIdCounter}`;

const defaultForm: TemplateForm = {
  title: '',
  description: '',
  interviewType: 'STRUCTURED_QA',
  difficulty: 'MID',
  duration: 60,
  totalScore: 100,
  instructions: '',
  sections: [],
};

// ── Component ──────────────────────────────────

export function CreateInterviewPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<TemplateForm>({ ...defaultForm, sections: [] });

  const updateField = <K extends keyof TemplateForm>(key: K, value: TemplateForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addSection = () => {
    const section: SectionForm = {
      tempId: newTempId(),
      title: '',
      description: '',
      sectionType: 'TECHNICAL_QA',
      weight: 100,
      duration: 30,
      questions: [],
      expanded: true,
    };
    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, section],
    }));
  };

  const updateSection = (tempId: string, updates: Partial<SectionForm>) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.tempId === tempId ? { ...s, ...updates } : s)),
    }));
  };

  const removeSection = (tempId: string) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.tempId !== tempId),
    }));
  };

  const addQuestion = (sectionTempId: string) => {
    const question: QuestionForm = {
      tempId: newTempId(),
      questionText: '',
      questionType: 'TEXT',
      points: 10,
      orderIndex: 0,
      expectedAnswer: '',
      hints: '',
    };
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.tempId === sectionTempId
          ? { ...s, questions: [...s.questions, question] }
          : s,
      ),
    }));
  };

  const updateQuestion = (sectionTempId: string, questionTempId: string, updates: Partial<QuestionForm>) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.tempId === sectionTempId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.tempId === questionTempId ? { ...q, ...updates } : q,
              ),
            }
          : s,
      ),
    }));
  };

  const removeQuestion = (sectionTempId: string, questionTempId: string) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.tempId === sectionTempId
          ? { ...s, questions: s.questions.filter((q) => q.tempId !== questionTempId) }
          : s,
      ),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Submit to API
    console.log('Submitting template:', form);
    navigate('/interviews');
  };

  const totalWeight = form.sections.reduce((sum, s) => sum + (s.weight || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/interviews">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Create Interview Template</h1>
          <p className="text-sm text-text-secondary">
            Design a structured technical assessment for recruitment
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-primary">
                  Template Title <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Senior Backend Developer Technical Interview"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-primary">Description</label>
                <textarea
                  className="w-full rounded-lg border border-border bg-white p-3 text-sm"
                  rows={3}
                  placeholder="Describe the purpose and scope of this interview..."
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary">Interview Type</label>
                <select
                  className="w-full rounded-lg border border-border bg-white p-2.5 text-sm"
                  value={form.interviewType}
                  onChange={(e) => updateField('interviewType', e.target.value as InterviewType)}
                >
                  <option value="STRUCTURED_QA">Structured Q&A</option>
                  <option value="LIVE_CODING">Live Coding</option>
                  <option value="SYSTEM_DESIGN">System Design</option>
                  <option value="CASE_STUDY">Case Study</option>
                  <option value="WHITEBOARD">Whiteboard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary">Difficulty Level</label>
                <select
                  className="w-full rounded-lg border border-border bg-white p-2.5 text-sm"
                  value={form.difficulty}
                  onChange={(e) => updateField('difficulty', e.target.value as InterviewDifficulty)}
                >
                  <option value="JUNIOR">Junior</option>
                  <option value="MID">Mid-Level</option>
                  <option value="SENIOR">Senior</option>
                  <option value="LEAD">Lead</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary">
                  Duration (minutes) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  value={form.duration}
                  onChange={(e) => updateField('duration', parseInt(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary">Total Score</label>
                <Input
                  type="number"
                  min={1}
                  value={form.totalScore}
                  onChange={(e) => updateField('totalScore', parseInt(e.target.value) || 100)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-primary">Instructions for Interviewer</label>
                <textarea
                  className="w-full rounded-lg border border-border bg-white p-3 text-sm"
                  rows={3}
                  placeholder="Provide guidance for the interviewer..."
                  value={form.instructions}
                  onChange={(e) => updateField('instructions', e.target.value)}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Sections */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sections</CardTitle>
              <Button type="button" variant="secondary" size="sm" onClick={addSection} icon={<Plus className="h-4 w-4" />}>
                Add Section
              </Button>
            </div>
            {form.sections.length > 0 && (
              <p className={`mt-1 text-xs ${totalWeight === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                Total weight: {totalWeight}% {totalWeight !== 100 ? '(should be 100%)' : '(balanced)'}
              </p>
            )}
          </CardHeader>
          <CardBody className="space-y-4">
            {form.sections.length === 0 && (
              <div className="flex flex-col items-center py-8 text-center">
                <p className="text-sm text-text-secondary">
                  No sections yet. Add a section to start building your interview template.
                </p>
                <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={addSection} icon={<Plus className="h-4 w-4" />}>
                  Add First Section
                </Button>
              </div>
            )}

            {form.sections.map((section, idx) => (
              <div key={section.tempId} className="rounded-lg border border-border bg-surface-secondary">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-text-tertiary" />
                    <span className="text-sm font-medium text-text-primary">
                      Section {idx + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateSection(section.tempId, { expanded: !section.expanded })}
                      className="rounded p-1 text-text-secondary hover:bg-surface-tertiary"
                    >
                      {section.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSection(section.tempId)}
                      className="rounded p-1 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {section.expanded && (
                  <div className="space-y-4 p-4">
                    {/* Section Fields */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-text-primary">Section Title</label>
                        <Input
                          type="text"
                          placeholder="e.g., System Design Discussion"
                          value={section.title}
                          onChange={(e) => updateSection(section.tempId, { title: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-text-primary">Description</label>
                        <textarea
                          className="w-full rounded-lg border border-border bg-white p-2 text-sm"
                          rows={2}
                          placeholder="What this section evaluates..."
                          value={section.description}
                          onChange={(e) => updateSection(section.tempId, { description: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-primary">Type</label>
                        <select
                          className="w-full rounded-lg border border-border bg-white p-2 text-sm"
                          value={section.sectionType}
                          onChange={(e) =>
                            updateSection(section.tempId, {
                              sectionType: e.target.value as InterviewSectionType,
                            })
                          }
                        >
                          <option value="TECHNICAL_QA">Technical Q&A</option>
                          <option value="CODING_CHALLENGE">Coding Challenge</option>
                          <option value="SYSTEM_DESIGN">System Design</option>
                          <option value="CASE_STUDY">Case Study</option>
                          <option value="BEHAVIORAL">Behavioral</option>
                          <option value="GENERAL">General</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-primary">
                          Weight (%) — Current: {section.weight}%
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={section.weight}
                          onChange={(e) =>
                            updateSection(section.tempId, {
                              weight: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-primary">
                          Duration (min)
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={section.duration}
                          onChange={(e) =>
                            updateSection(section.tempId, {
                              duration: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Questions */}
                    <div className="border-t border-border pt-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-medium text-text-primary">Questions</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => addQuestion(section.tempId)}
                          icon={<Plus className="h-3.5 w-3.5" />}
                        >
                          Add Question
                        </Button>
                      </div>

                      {section.questions.map((question, qIdx) => (
                        <div
                          key={question.tempId}
                          className="mb-3 rounded-lg border border-border bg-white p-3"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-medium text-text-secondary">
                              Question {qIdx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeQuestion(section.tempId, question.tempId)}
                              className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                            <div className="md:col-span-4">
                              <label className="block text-xs font-medium text-text-primary">Question</label>
                              <textarea
                                className="w-full rounded-lg border border-border bg-white p-2 text-sm"
                                rows={2}
                                placeholder="Enter the interview question..."
                                value={question.questionText}
                                onChange={(e) =>
                                  updateQuestion(section.tempId, question.tempId, {
                                    questionText: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-text-primary">Type</label>
                              <select
                                className="w-full rounded-lg border border-border bg-white p-2 text-sm"
                                value={question.questionType}
                                onChange={(e) =>
                                  updateQuestion(section.tempId, question.tempId, {
                                    questionType: e.target.value as InterviewQuestionType,
                                  })
                                }
                              >
                                <option value="TEXT">Text Response</option>
                                <option value="CODE">Code</option>
                                <option value="FILE_UPLOAD">File Upload</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-text-primary">Points</label>
                              <input
                                type="number"
                                min={1}
                                className="w-full rounded-lg border border-border bg-white p-2 text-sm"
                                value={question.points}
                                onChange={(e) =>
                                  updateQuestion(section.tempId, question.tempId, {
                                    points: parseInt(e.target.value) || 0,
                                  })
                                }
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-text-primary">Expected Answer (optional)</label>
                              <input
                                type="text"
                                className="w-full rounded-lg border border-border bg-white p-2 text-sm"
                                placeholder="What to look for in the response..."
                                value={question.expectedAnswer}
                                onChange={(e) =>
                                  updateQuestion(section.tempId, question.tempId, {
                                    expectedAnswer: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {section.questions.length === 0 && (
                        <p className="text-center text-xs text-text-tertiary">
                          No questions yet. Click "Add Question" to add one.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link to="/interviews">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={!form.title || form.sections.length === 0}>
            Create Template
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CreateInterviewPage;
