import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminExamCreatePage } from '@pages/admin/exam-create';
import { defaultWorkspaceToolsForTrade } from '@lib/workspace-tools';

// ── Mocks ──────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  createSection: vi.fn(),
  createRubricCriterion: vi.fn(),
  createQuestion: vi.fn(),
  publish: vi.fn(),
}));

vi.mock('@services/exam-service', () => ({
  examService: {
    create: (...args: unknown[]) => mocks.create(...args),
    getById: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    createSection: (...args: unknown[]) => mocks.createSection(...args),
    createQuestion: (...args: unknown[]) => mocks.createQuestion(...args),
    createRubricCriterion: (...args: unknown[]) => mocks.createRubricCriterion(...args),
    publish: (...args: unknown[]) => mocks.publish(...args),
    registerCandidate: vi.fn(),
    getRegistrations: vi.fn(),
    getIndividualCandidates: vi.fn(),
    uploadAndParse: vi.fn(),
    confirmImport: vi.fn(),
  },
}));

vi.mock('@services/trade-service', () => ({
  tradeService: {
    listTrades: vi.fn().mockResolvedValue([
      {
        id: 'trade-swd',
        name: 'Software Development',
        code: 'SWD',
        description: 'Software Development trade',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'trade-net',
        name: 'Networking',
        code: 'NET',
        description: 'Networking trade',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ]),
  },
}));

// ── Helpers ────────────────────────────────────────

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminExamCreatePage />
    </MemoryRouter>,
  );

/** Drive the manual flow through Exam Details and fill in Scenario + Tasks
 *  (both use the rich-text editor, which degrades to a labelled textarea in
 *  jsdom — so we type into the fallback textareas). */
const fillScenarioAndTasks = async (tradeId = 'trade-swd') => {
  // Choice screen -> Create Manually
  fireEvent.click(await screen.findByRole('button', { name: /create from scratch/i }));

  // Step 0: Exam Details (labels carry a required-asterisk, so match loosely)
  fireEvent.change(screen.getByLabelText(/Exam Title/), {
    target: { value: 'Employee Payroll Management System (EPMS)' },
  });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: tradeId } });
  fireEvent.click(screen.getByRole('button', { name: /next: scenario & tasks/i }));

  // Step 1: Scenario + Tasks (single working area)
  fireEvent.change(
    await screen.findByLabelText(/SmartPark is a company/),
    { target: { value: '<p>SmartPark is a company located in Rubavu District.</p>' } },
  );
  fireEvent.change(screen.getByLabelText(/Using attributes provided below/), {
    target: {
      value:
        '1. Using attributes provided below, design an Entity Relationship Diagram (ERD) for the system.\n' +
        '2. Develop the backend with Node.js and Express.',
    },
  });
};

// ── Tests ──────────────────────────────────────────

describe('Manual exam creation — single tasks editor + sample checklist', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.create.mockResolvedValue({
      id: 'exam-1',
      title: 'Employee Payroll Management System (EPMS)',
      status: 'DRAFT',
    });
    mocks.createSection.mockImplementation((_examId: string, data: { title: string }) =>
      Promise.resolve({ id: `section-${data.title.slice(0, 8)}` }),
    );
    mocks.createRubricCriterion.mockResolvedValue({ id: 'criterion-1' });
    mocks.createQuestion.mockResolvedValue({ id: 'question-1' });
    mocks.publish.mockResolvedValue({ id: 'exam-1', title: 'Employee Payroll Management System (EPMS)', status: 'PUBLISHED' });
  });

  it('parses tasks from the single editor and shows them in the detected-tasks preview', async () => {
    renderPage();
    await fillScenarioAndTasks();

    expect(await screen.findByText(/2 tasks detected/)).toBeInTheDocument();
    // Preview lists both parsed tasks (numbers stripped), numbered 1..2.
    expect(screen.getByText('Using attributes provided below, design an Entity Relationship Diagram (ERD) for the system.')).toBeInTheDocument();
    expect(screen.getByText('Develop the backend with Node.js and Express.')).toBeInTheDocument();

    // Invalidating: an empty tasks area yields no tasks and a hint.
    fireEvent.change(screen.getByLabelText(/Using attributes provided below/), {
      target: { value: '' },
    });
    expect(screen.queryByText('2 tasks detected')).not.toBeInTheDocument();
    expect(await screen.findByText(/No tasks detected yet/)).toBeInTheDocument();
  }, 30000);

  // Rendering the full standard checklist (41 editable rows) is slow under
  // full-suite load — allow more than the default 5s.
  it('auto-generates the sample-format assessment checklist from the parsed tasks', async () => {
    renderPage();
    await fillScenarioAndTasks();

    fireEvent.click(screen.getByRole('button', { name: /next: assessment checklist/i }));

    // No manual generate button — the checklist is generated automatically.
    expect(screen.queryByRole('button', { name: /generate assessment checklist/i })).not.toBeInTheDocument();

    // All four standard TVET sections as in docs/Practical_examination.pdf.
    expect(await screen.findByDisplayValue('Preliminary Activities Performance')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Process and Fulfillment of the Task')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Product Presentation/Exhibition and Quality Assessment')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Closing Activities')).toBeInTheDocument();
    expect(screen.getByText(/Total Weight:/)).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();

    // The full standard indicator catalog from the sample exam is seeded…
    // (Node.js project is created appears in both its name input and its
    // description textarea, so match all occurrences.)
    expect(screen.getByDisplayValue('Required entities are drawn')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('Node.js project is created').length).toBeGreaterThanOrEqual(1);
    // …plus one scored indicator per task (name = first words of the task).
    expect(screen.getByDisplayValue('Using attributes provided below,…')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Develop the backend with…')).toBeInTheDocument();
  }, 30000);

  it('creates and publishes the exam with tasks (0 marks) and checklist rows as rubric criteria', async () => {
    renderPage();
    await fillScenarioAndTasks();

    fireEvent.click(screen.getByRole('button', { name: /next: assessment checklist/i }));
    await screen.findByDisplayValue('Preliminary Activities Performance');

    fireEvent.click(screen.getByRole('button', { name: /review & publish/i }));
    fireEvent.click(await screen.findByRole('button', { name: /create & publish exam/i }));

    // Wait for the whole async submit to run: exam + sections + rows + tasks.
    await vi.waitFor(() => {
      expect(mocks.create).toHaveBeenCalledTimes(1);
      expect(mocks.createSection.mock.calls.length).toBe(4);
    });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Employee Payroll Management System (EPMS)',
        description: '<p>SmartPark is a company located in Rubavu District.</p>',
        instructions: expect.stringContaining('SmartPark'),
        // Workspace tools are picked on the Review & Publish screen (all by default)
        workspaceTools: expect.arrayContaining(['CODE_EDITOR', 'TERMINAL', 'DATABASE']),
      }),
    );

    // All four standard sections are created with the standard weights.
    const sectionCalls = mocks.createSection.mock.calls.map(([, data]) => data);
    expect(sectionCalls.map((s: { title: string }) => s.title)).toEqual([
      'Preliminary Activities Performance',
      'Process and Fulfillment of the Task',
      'Product Presentation/Exhibition and Quality Assessment',
      'Closing Activities',
    ]);
    expect(sectionCalls.reduce((sum: number, s: { weight: number }) => sum + s.weight, 0)).toBe(100);

    // Checklist rows -> section-level rubric criteria: the full standard catalog
    // (12/14/8/5 indicators) plus one task indicator per task (2) = 41 rows.
    expect(mocks.createRubricCriterion).toHaveBeenCalledTimes(41);
    const criterionCalls = mocks.createRubricCriterion.mock.calls.map(([, data]) => data);
    const taskCriteria = criterionCalls.filter(
      (c: { criterionName: string }) =>
        c.criterionName === 'Using attributes provided below,…' ||
        c.criterionName === 'Develop the backend with…',
    );
    expect(taskCriteria).toHaveLength(2);
    // Task-derived indicators carry the default marks; standard ones carry catalog marks.
    expect(taskCriteria.every((c: { maxScore: number }) => c.maxScore === 5)).toBe(true);
    expect(
      criterionCalls.some(
        (c: { criterionName: string; maxScore: number }) =>
          c.criterionName === 'Node.js project is created' && c.maxScore === 2,
      ),
    ).toBe(true);

    // Tasks -> questions carrying NO marks: the two author tasks plus a
    // placeholder question for each standard section that has no task.
    const questionCalls = mocks.createQuestion.mock.calls.map(([, data]) => data);
    expect(questionCalls.map((q: { points: number }) => q.points)).toEqual([0, 0, 0, 0]);
    expect(questionCalls.map((q: { questionType: string }) => q.questionType)).toEqual([
      'DIAGRAM',
      'CODE',
      'ESSAY',
      'ESSAY',
    ]);

    // Publish happens after content is saved.
    expect(mocks.publish).toHaveBeenCalledWith('exam-1');
  }, 30000);

  it('pre-fills the working environment from the chosen trade', async () => {
    renderPage();
    // Networking trade → the candidate workspace is pre-set to NET's tools
    await fillScenarioAndTasks('trade-net');

    fireEvent.click(screen.getByRole('button', { name: /next: assessment checklist/i }));
    await screen.findByDisplayValue('Preliminary Activities Performance');

    fireEvent.click(screen.getByRole('button', { name: /review & publish/i }));
    // The trade-default chip is visible on the review screen
    expect(await screen.findByRole('button', { name: /networking default/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /create & publish exam/i }));

    await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceTools: defaultWorkspaceToolsForTrade('NET'),
      }),
    );
  }, 30000);
});
