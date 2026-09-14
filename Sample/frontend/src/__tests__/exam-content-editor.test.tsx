import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExamContentEditor } from '@pages/admin/components/exam-content-editor';
import type { Exam } from '@app_types/index';

// ── Mocks ──────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  createSection: vi.fn(),
  updateSection: vi.fn(),
  deleteSection: vi.fn(),
  createQuestion: vi.fn(),
  updateQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
  createRubricCriterion: vi.fn(),
  updateRubricCriterion: vi.fn(),
  deleteRubricCriterion: vi.fn(),
}));

vi.mock('@services/exam-service', () => ({
  examService: {
    update: (...args: unknown[]) => mocks.update(...args),
    createSection: (...args: unknown[]) => mocks.createSection(...args),
    updateSection: (...args: unknown[]) => mocks.updateSection(...args),
    deleteSection: (...args: unknown[]) => mocks.deleteSection(...args),
    createQuestion: (...args: unknown[]) => mocks.createQuestion(...args),
    updateQuestion: (...args: unknown[]) => mocks.updateQuestion(...args),
    deleteQuestion: (...args: unknown[]) => mocks.deleteQuestion(...args),
    createRubricCriterion: (...args: unknown[]) => mocks.createRubricCriterion(...args),
    updateRubricCriterion: (...args: unknown[]) => mocks.updateRubricCriterion(...args),
    deleteRubricCriterion: (...args: unknown[]) => mocks.deleteRubricCriterion(...args),
  },
}));

// ── Fixture: a draft exam with two sections carrying tasks ────────
const draftExam: Exam = {
  id: 'exam-1',
  title: 'Employee Payroll Management System (EPMS)',
  description: '<p>SmartPark is a company located in Rubavu District.</p>',
  tradeId: 'trade-swd',
  tradeName: 'Software Development',
  examType: 'PRACTICAL',
  status: 'DRAFT',
  duration: 420,
  passingScore: 50,
  maxAttempts: 1,
  instructions: null,
  allowOralDefense: true,
  requireFullScreen: true,
  requireWebcam: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  sections: [
    {
      id: 'sec-1',
      examId: 'exam-1',
      title: 'Preliminary Activities Performance',
      sectionType: 'ERD_DESIGN',
      weight: 15,
      orderIndex: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      questions: [
        {
          id: 'q1',
          sectionId: 'sec-1',
          questionText: 'Design an Entity Relationship Diagram (ERD) for the system.',
          questionType: 'DIAGRAM',
          points: 0,
          orderIndex: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      rubricCriteria: [
        { id: 'c1', criterionName: 'Department entity is drawn', description: 'Department entity is drawn', maxScore: 1, weight: 1 },
      ],
    },
    {
      id: 'sec-2',
      examId: 'exam-1',
      title: 'Process and Fulfillment of the Task',
      sectionType: 'CODE_WRITING',
      weight: 80,
      orderIndex: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      questions: [
        {
          id: 'q2',
          sectionId: 'sec-2',
          questionText: 'Develop the backend with Node.js and Express.',
          questionType: 'CODE',
          points: 0,
          orderIndex: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      rubricCriteria: [
        { id: 'c2', criterionName: 'Node.js project is created', description: 'Node.js project is created', maxScore: 2, weight: 1 },
      ],
    },
    {
      id: 'sec-3',
      examId: 'exam-1',
      title: 'Closing Activities',
      sectionType: 'PROJECT_CLEANUP',
      weight: 5,
      orderIndex: 2,
      createdAt: '2026-01-01T00:00:00.000Z',
      questions: [],
      rubricCriteria: [],
    },
  ],
};

// ── Fixture: a flat imported exam — ONE practical section holding all tasks ──
const flatExam: Exam = {
  ...draftExam,
  id: 'exam-flat',
  sections: [
    {
      id: 'sec-flat',
      examId: 'exam-flat',
      title: 'Practical Assessment',
      sectionType: 'MIXED',
      weight: 100,
      orderIndex: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      questions: [
        {
          id: 'q1',
          sectionId: 'sec-flat',
          questionText: 'Design an Entity Relationship Diagram (ERD) for the system.',
          questionType: 'DIAGRAM',
          points: 0,
          orderIndex: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'q2',
          sectionId: 'sec-flat',
          questionText: 'Develop the backend with Node.js and Express.',
          questionType: 'CODE',
          points: 0,
          orderIndex: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      rubricCriteria: [
        { id: 'c1', criterionName: 'Department entity is drawn', description: 'Department entity is drawn', maxScore: 1, weight: 1 },
        { id: 'c2', criterionName: 'Node.js project is created', description: 'Node.js project is created', maxScore: 2, weight: 1 },
        { id: 'c3', criterionName: 'The product name is mentioned', description: 'The product name is mentioned', maxScore: 1, weight: 1 },
      ],
    },
  ],
};

const renderEditor = (props: Partial<React.ComponentProps<typeof ExamContentEditor>> = {}) =>
  render(
    <ExamContentEditor exam={draftExam} onSaved={vi.fn()} onCancel={vi.fn()} {...props} />,
  );

const renderFlatEditor = () =>
  render(
    <ExamContentEditor exam={flatExam} onSaved={vi.fn()} onCancel={vi.fn()} />,
  );

describe('ExamContentEditor', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.createSection.mockResolvedValue({ id: 'sec-created' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders title, scenario, all tasks in one flat list, and the checklist', () => {
    renderEditor();

    // Title field.
    expect(screen.getByDisplayValue('Employee Payroll Management System (EPMS)')).toBeInTheDocument();
    // Scenario editor carries the persisted scenario.
    expect(screen.getByDisplayValue(/SmartPark is a company/)).toBeInTheDocument();
    // All questions appear in ONE tasks working area (numbered, as in the sample exam).
    expect(screen.getByDisplayValue(/1\. Design an Entity Relationship Diagram/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/2\. Develop the backend with Node\.js/)).toBeInTheDocument();
    expect(screen.getByText(/2 questions detected/)).toBeInTheDocument();
    // Checklist sections + indicators render.
    expect(screen.getByDisplayValue('Preliminary Activities Performance')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Process and Fulfillment of the Task')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('Department entity is drawn').length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue('Node.js project is created').length).toBeGreaterThan(0);
  });

  it('saves title + scenario and updates sections, tasks and indicators in place', async () => {
    mocks.update.mockResolvedValue({ id: 'exam-1' });
    mocks.updateSection.mockResolvedValue({});
    mocks.updateQuestion.mockResolvedValue({});
    mocks.createQuestion.mockResolvedValue({ id: 'q-ph' });
    mocks.updateRubricCriterion.mockResolvedValue({});

    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await screen.findByText(/saved successfully/i);

    expect(mocks.update).toHaveBeenCalledWith('exam-1', {
      title: 'Employee Payroll Management System (EPMS)',
      description: '<p>SmartPark is a company located in Rubavu District.</p>',
    });
    // Sections stay in place — updated, not recreated.
    expect(mocks.updateSection).toHaveBeenCalledTimes(3);
    expect(mocks.createSection).not.toHaveBeenCalled();
    // Tasks updated in place.
    expect(mocks.updateQuestion).toHaveBeenCalledWith('q1', expect.objectContaining({ questionText: 'Design an Entity Relationship Diagram (ERD) for the system.' }));
    expect(mocks.updateQuestion).toHaveBeenCalledWith('q2', expect.objectContaining({ questionText: 'Develop the backend with Node.js and Express.' }));
    // Indicators updated in place.
    expect(mocks.updateRubricCriterion).toHaveBeenCalledWith('c1', expect.objectContaining({ criterionName: 'Department entity is drawn' }));
    expect(mocks.updateRubricCriterion).toHaveBeenCalledWith('c2', expect.objectContaining({ criterionName: 'Node.js project is created' }));
    // Empty section gets a placeholder question; nothing deleted.
    expect(mocks.createQuestion).toHaveBeenCalledWith('sec-3', expect.objectContaining({ questionText: 'Complete the tasks for Closing Activities' }));
    expect(mocks.deleteSection).not.toHaveBeenCalled();
    expect(mocks.deleteQuestion).not.toHaveBeenCalled();
    expect(mocks.deleteRubricCriterion).not.toHaveBeenCalled();
  });

  it('regenerates the checklist from tasks and replaces the indicators', async () => {
    mocks.update.mockResolvedValue({ id: 'exam-1' });
    mocks.updateSection.mockResolvedValue({});
    mocks.updateQuestion.mockResolvedValue({});
    mocks.createQuestion.mockResolvedValue({ id: 'q-ph' });
    mocks.createRubricCriterion.mockResolvedValue({});
    mocks.deleteRubricCriterion.mockResolvedValue({});

    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: /regenerate checklist/i }));
    // Old custom indicators are gone; the full standard catalog is seeded and
    // each task still adds its own indicator (name = first 4 words).
    expect(screen.queryByDisplayValue('Department entity is drawn')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Design an Entity Relationship…')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Develop the backend with…')).toBeInTheDocument();
    // Standard sample-exam indicators appear in every section.
    expect(screen.getAllByDisplayValue('Required entities are drawn').length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue('Node.js project is created').length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue('The product name is mentioned').length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue('Project folder is permanently removed').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await screen.findByText(/saved successfully/i);

    // Old indicators deleted; the full catalog (12/14/8/5) + task indicators created.
    expect(mocks.deleteRubricCriterion).toHaveBeenCalledWith('c1');
    expect(mocks.deleteRubricCriterion).toHaveBeenCalledWith('c2');
    expect(mocks.createRubricCriterion).toHaveBeenCalledTimes(41);
    expect(mocks.createRubricCriterion).toHaveBeenCalledWith(
      'sec-1',
      expect.objectContaining({ maxScore: 5, criterionName: 'Design an Entity Relationship…' }),
    );
    // The Presentation section is new — created; the other three match by title.
    expect(mocks.createSection).toHaveBeenCalledWith('exam-1', expect.objectContaining({ title: 'Product Presentation/Exhibition and Quality Assessment' }));
  });

  it('renders a flat imported exam as ONE flat checklist (no section cards)', () => {
    renderFlatEditor();

    // All tasks appear in the single tasks working area.
    expect(screen.getByDisplayValue(/1\. Design an Entity Relationship Diagram/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/2\. Develop the backend with Node\.js/)).toBeInTheDocument();

    // Flat mode: no section-card chrome and no TVET regenerate action.
    expect(screen.queryByText('Section 1')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Practical Assessment')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Mixed')).not.toBeInTheDocument(); // section-type dropdown
    expect(screen.queryByRole('button', { name: /regenerate checklist/i })).not.toBeInTheDocument();
    expect(screen.getByText(/one practical section/)).toBeInTheDocument();

    // The extracted indicators render flat, with the total marks badge.
    expect(screen.getAllByDisplayValue('Department entity is drawn').length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue('Node.js project is created').length).toBeGreaterThan(0);
    // Total marks badge (flat panel only)
    expect(screen.getByText('4 marks')).toBeInTheDocument(); // 1 + 2 + 1
  });

  it('editing tasks on a flat imported exam keeps the extracted checklist', () => {
    renderFlatEditor();

    // Rewrite the tasks area to a single task.
    fireEvent.change(screen.getByLabelText(/1\. Using attributes provided below/), {
      target: { value: 'Build the complete system with ERD and backend.' },
    });
    expect(screen.getByText(/1 question detected/)).toBeInTheDocument();

    // The extracted checklist survives — no "Generate the Assessment Checklist"
    // empty state and no 4-section TVET regeneration.
    expect(screen.queryByText('Generate the Assessment Checklist')).not.toBeInTheDocument();
    expect(screen.getAllByDisplayValue('Department entity is drawn').length).toBeGreaterThan(0);
  });

  it('saving a flat imported exam updates the single section and its indicators in place', async () => {
    mocks.update.mockResolvedValue({ id: 'exam-flat' });
    mocks.updateSection.mockResolvedValue({});
    mocks.updateQuestion.mockResolvedValue({});
    mocks.updateRubricCriterion.mockResolvedValue({});

    renderFlatEditor();
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await screen.findByText(/saved successfully/i);

    // One section, updated in place — never recreated.
    expect(mocks.updateSection).toHaveBeenCalledTimes(1);
    expect(mocks.createSection).not.toHaveBeenCalled();
    expect(mocks.updateSection).toHaveBeenCalledWith('sec-flat', expect.objectContaining({
      title: 'Practical Assessment',
      sectionType: 'MIXED',
      weight: 100,
      orderIndex: 0,
    }));
    // Tasks and indicators updated in place; nothing deleted.
    expect(mocks.updateQuestion).toHaveBeenCalledWith('q1', expect.objectContaining({ questionText: 'Design an Entity Relationship Diagram (ERD) for the system.' }));
    expect(mocks.updateQuestion).toHaveBeenCalledWith('q2', expect.objectContaining({ questionText: 'Develop the backend with Node.js and Express.' }));
    expect(mocks.updateRubricCriterion).toHaveBeenCalledWith('c1', expect.objectContaining({ criterionName: 'Department entity is drawn' }));
    expect(mocks.deleteSection).not.toHaveBeenCalled();
    expect(mocks.deleteQuestion).not.toHaveBeenCalled();
    expect(mocks.deleteRubricCriterion).not.toHaveBeenCalled();
  });

  it('removing a task invalidates the checklist and saving after regenerate deletes the removed task', async () => {
    mocks.update.mockResolvedValue({ id: 'exam-1' });
    mocks.updateSection.mockResolvedValue({});
    mocks.updateQuestion.mockResolvedValue({});
    mocks.createQuestion.mockResolvedValue({ id: 'q-ph' });
    mocks.createRubricCriterion.mockResolvedValue({});
    mocks.deleteRubricCriterion.mockResolvedValue({});

    renderEditor();

    // Remove the first task by editing the single tasks area to keep only the second.
    fireEvent.change(screen.getByLabelText(/1\. Using attributes provided below/), {
      target: { value: 'Develop the backend with Node.js and Express.' },
    });
    expect(screen.getByText(/1 question detected/)).toBeInTheDocument();

    // Checklist is invalidated — generate it again from the remaining task.
    fireEvent.click(screen.getByRole('button', { name: /generate checklist/i }));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await screen.findByText(/saved successfully/i);

    // The removed task's question is deleted. Its section (Preliminary) is kept
    // because the standard catalog always seeds it — now with a placeholder
    // question instead of the removed task.
    expect(mocks.deleteQuestion).toHaveBeenCalledWith('q1');
    expect(mocks.deleteSection).not.toHaveBeenCalled();
    expect(mocks.updateQuestion).toHaveBeenCalledWith('q2', expect.objectContaining({ questionText: 'Develop the backend with Node.js and Express.' }));
  });
});
