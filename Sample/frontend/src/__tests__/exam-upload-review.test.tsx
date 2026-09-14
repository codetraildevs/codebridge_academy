import { render, screen, fireEvent, within, configure } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminExamCreatePage } from '@pages/admin/exam-create';
import type { ParsedExamData } from '@services/exam-service';

// The upload flow runs several async steps (parse, review, confirm); raise the
// default async timeout (findBy/waitFor) so the file never flakes at 1s under
// whole-suite CPU load.
configure({ asyncUtilTimeout: 20000 });

// ── Mocks ──────────────────────────────────────────
// vi.hoisted so the mock factory can reference the spies (vi.mock is hoisted).
const { mockUploadAndParse, mockConfirmImport } = vi.hoisted(() => ({
  mockUploadAndParse: vi.fn(),
  mockConfirmImport: vi.fn(),
}));

vi.mock('@services/exam-service', () => ({
  examService: {
    create: vi.fn(),
    getById: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    publish: vi.fn(),
    archive: vi.fn(),
    createSection: vi.fn(),
    createQuestion: vi.fn(),
    registerCandidate: vi.fn(),
    getRegistrations: vi.fn(),
    getIndividualCandidates: vi.fn(),
    uploadAndParse: (...args: unknown[]) => mockUploadAndParse(...args),
    confirmImport: (...args: unknown[]) => mockConfirmImport(...args),
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
    ]),
  },
}));

// ── Fixture: mirrors the deterministic fallback output for docs/TASK _1.pdf
//    (4 parsed TVET sections — the flat upload model merges them into one). ──
const parsedTASK1: ParsedExamData = {
  title: 'Employee Payroll Management System (EPMS)',
  description:
    'SmartPark is a company located in Rubavu District, western province of Rwanda. It manages parking slots for cars and needs a system to manage employees, departments, and salaries.',
  examType: 'PRACTICAL',
  duration: 420,
  passingScore: 50,
  maxAttempts: 1,
  instructions:
    'SmartPark is a company located in Rubavu District, western province of Rwanda.\n\nComplete all tasks according to the assessment criteria.',
  sections: [
    {
      title: 'Preliminary activities performance',
      sectionType: 'ERD_DESIGN',
      weight: 15,
      rubricCriteria: [
        { criterionName: 'Department entity is drawn', description: 'Department entity is drawn', maxScore: 1, weight: 1 },
        { criterionName: 'Employee entity is drawn', description: 'Employee entity is drawn', maxScore: 1, weight: 1 },
        { criterionName: 'Primary Key rule respected', description: 'Primary Key rule respected', maxScore: 1, weight: 1 },
      ],
      questions: [
        {
          questionText: 'Using attributes provided below, design an Entity Relationship Diagram (ERD).',
          questionType: 'DIAGRAM',
          points: 0,
        },
      ],
    },
    {
      title: 'Process and fulfillment of the task',
      sectionType: 'CODE_WRITING',
      weight: 50,
      rubricCriteria: [
        { criterionName: 'Node.js project is created', description: 'Node.js project is created', maxScore: 2, weight: 1 },
        { criterionName: 'Express.js is installed', description: 'Express.js is installed', maxScore: 1, weight: 1 },
        { criterionName: 'Login page is created', description: 'Login page is created', maxScore: 1, weight: 1 },
      ],
      questions: [
        {
          questionText: 'Creating database called EPMS with Employee, Department and Salary tables.',
          questionType: 'CODE',
          points: 0,
        },
      ],
    },
    {
      title: 'Product presentation/Exhibition and Quality Assessment',
      sectionType: 'PRESENTATION',
      weight: 30,
      rubricCriteria: [
        { criterionName: 'The product name is mentioned', description: 'The product name is mentioned', maxScore: 1, weight: 1 },
        { criterionName: 'The key steps of the process are stated', description: 'The key steps of the process are stated', maxScore: 3, weight: 1 },
      ],
      questions: [
        {
          questionText: 'Present your product and explain the key steps of the process.',
          questionType: 'ESSAY',
          points: 0,
        },
      ],
    },
    {
      title: 'Closing activities',
      sectionType: 'PROJECT_CLEANUP',
      weight: 5,
      rubricCriteria: [
        { criterionName: 'Project folder is permanently removed', description: 'Project folder is permanently removed', maxScore: 1, weight: 1 },
      ],
      questions: [
        {
          questionText: 'Removing permanently your project with its related configurations.',
          questionType: 'SHORT_ANSWER',
          points: 0,
        },
      ],
    },
  ],
};

// ── Helpers ────────────────────────────────────────

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminExamCreatePage />
    </MemoryRouter>,
  );

/** Drive the real upload flow: choose Upload Document, pick a trade + file,
 *  and click "Upload & Parse with AI" until the review screen appears. */
const runUploadFlow = async () => {
  mockUploadAndParse.mockResolvedValue({
    fileName: 'TASK _1.pdf',
    fileSize: 12345,
    extractedTextLength: 6400,
    parsedData: parsedTASK1,
  });

  renderPage();

  // 1. Choice screen -> Upload Document card
  fireEvent.click(await screen.findByText('Upload Document'));

  // 2. Select a trade
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'trade-swd' } });

  // 3. Select the document file (the real input is hidden)
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  expect(fileInput).not.toBeNull();
  fireEvent.change(fileInput, {
    target: { files: [new File(['pdf'], 'TASK _1.pdf', { type: 'application/pdf' })] },
  });

  // 4. Upload & parse -> review screen
  fireEvent.click(screen.getByRole('button', { name: /upload & parse/i }));
  await screen.findByText('Review Parsed Content');
};

const clickCreateExam = async () => {
  fireEvent.click(screen.getByRole('button', { name: /create exam from parsed data/i }));
  await screen.findByText('Exam Created Successfully!');
};

// ── Tests ──────────────────────────────────────────

describe('Exam upload review screen', () => {
  beforeEach(() => {
    mockUploadAndParse.mockReset();
    mockConfirmImport.mockReset();
    mockConfirmImport.mockResolvedValue({
      exam: { id: 'exam-1', title: 'Employee Payroll Management System (EPMS)', status: 'DRAFT' },
      stats: { sectionsCreated: 4, questionsCreated: 4, rubricCriteriaCreated: 130 },
    });
  });

  it('shows only Title, Scenario, Tasks and Assessment Checklist after extraction', async () => {
    await runUploadFlow();

    // Title comes from the parsed data
    expect(screen.getByDisplayValue('Employee Payroll Management System (EPMS)')).toBeInTheDocument();

    // Scenario editor (rich-text editor degrades to a labelled textarea in jsdom)
    const scenario = screen.getByLabelText(/integrated situation presented to the candidate/) as HTMLTextAreaElement;
    expect(scenario.value).toContain('SmartPark is a company');

    // Tasks: single working area with all 4 tasks detected
    await screen.findByText(/4 tasks detected/);
    expect(screen.getByLabelText(/Using attributes provided below/)).toBeInTheDocument();

    // Assessment checklist: ONE flat indicators list (TVET sections dropped)
    expect(screen.queryByDisplayValue('Preliminary activities performance')).not.toBeInTheDocument();
    expect(screen.queryByText('Section 1')).not.toBeInTheDocument();
    expect(screen.getAllByDisplayValue('Department entity is drawn').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByDisplayValue('Node.js project is created').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/9 indicators/)).toBeInTheDocument();
    expect(screen.getByText(/12 total marks/)).toBeInTheDocument();

    // The old per-question metadata is gone
    expect(screen.queryByText('Exam Information')).not.toBeInTheDocument();
    expect(screen.queryByText('Sections & Questions')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Duration/)).not.toBeInTheDocument();
  });

  it('highlights the detected tasks inside the tasks editor (marker styling)', async () => {
    await runUploadFlow();

    // Every parsed task is marker-highlighted right inside the editor content
    const tasksEditor = screen.getByLabelText(/Using attributes provided below/) as HTMLTextAreaElement;
    expect(tasksEditor.value).toContain('<mark>1. Using attributes provided below');
    expect(tasksEditor.value).toContain('<mark>4. Removing permanently your project');

    // The author rewrites the tasks — the fresh text starts unmarked…
    fireEvent.change(tasksEditor, {
      target: { value: '1. Build the ERD.\n2. Write the backend.' },
    });
    await screen.findByText(/2 tasks detected/);
    const edited = screen.getByLabelText(/Using attributes provided below/) as HTMLTextAreaElement;
    expect(edited.value).not.toContain('<mark>');

    // …and "Re-highlight" re-applies the markers around the detected tasks.
    fireEvent.click(screen.getByRole('button', { name: /re-highlight/i }));
    const reHighlighted = screen.getByLabelText(/Using attributes provided below/) as HTMLTextAreaElement;
    expect(reHighlighted.value).toContain('<mark>1. Build the ERD.</mark>');
    expect(reHighlighted.value).toContain('<mark>2. Write the backend.</mark>');

    // Saving strips the markers — the stored questions never contain HTML.
    await clickCreateExam();
    const [payload] = mockConfirmImport.mock.calls[0]!;
    const allQuestions = payload.sections.flatMap((s: { questions: any[] }) => s.questions);
    expect(allQuestions.map((q: { questionText: string }) => q.questionText)).toEqual([
      'Build the ERD.',
      'Write the backend.',
    ]);
  });

  it('lets the author pick workspace tools on the review screen before creating', async () => {
    await runUploadFlow();

    // The Workspace Tools card is on the review screen with all 7 tools selected
    await screen.findByText(/7 of 7 tools selected/);

    // Deselect one tool and confirm — the choice travels with the import
    fireEvent.click(screen.getByText('File Explorer'));
    await screen.findByText(/6 of 7 tools selected/);

    await clickCreateExam();

    expect(mockConfirmImport.mock.calls[0]![2]).toEqual([
      'CODE_EDITOR',
      'TERMINAL',
      'DIAGRAM_EDITOR',
      'DATABASE',
      'BROWSER_PREVIEW',
      'FILE_UPLOAD',
    ]);
  });

  // Rendering the full parsed checklist is slow under full-suite load.
  it('sends edited title, scenario and tasks to confirmImport', async () => {
    await runUploadFlow();

    // Edit the title
    fireEvent.change(screen.getByDisplayValue('Employee Payroll Management System (EPMS)'), {
      target: { value: 'Renamed EPMS Exam' },
    });

    // Edit the scenario
    fireEvent.change(screen.getByLabelText(/integrated situation presented to the candidate/), {
      target: { value: '<p>Updated scenario text for the candidates.</p>' },
    });

    // Rewrite the tasks in the single working area
    fireEvent.change(screen.getByLabelText(/Using attributes provided below/), {
      target: { value: '1. Build the ERD.\n2. Write the backend.\n3. Present the product.' },
    });
    // findBy* already waits for the element — no redundant toBeInTheDocument
    // (that assertion can flake when a re-render replaces the node between the
    // poll resolving and the check running, e.g. under CPU contention).
    await screen.findByText(/3 tasks detected/);

    await clickCreateExam();

    const [payload] = mockConfirmImport.mock.calls[0]!;
    expect(payload.title).toBe('Renamed EPMS Exam');
    expect(payload.description).toContain('Updated scenario text');

    // The uploaded exam is ONE practical section holding all tasks
    expect(payload.sections).toHaveLength(1);
    expect(payload.sections[0].title).toBe('Practical Assessment');
    const allQuestions = payload.sections.flatMap((s: { questions: any[] }) => s.questions);
    expect(allQuestions.map((q: { questionText: string }) => q.questionText)).toEqual([
      'Build the ERD.',
      'Write the backend.',
      'Present the product.',
    ]);
    // Tasks carry no marks — scored via the checklist
    expect(allQuestions.every((q: { points: number }) => q.points === 0)).toBe(true);
  }, 30000);

  it('sends the extracted assessment checklist (weights + indicators) to confirmImport', async () => {
    await runUploadFlow();
    await clickCreateExam();

    const [payload] = mockConfirmImport.mock.calls[0]!;
    expect(mockConfirmImport).toHaveBeenCalledTimes(1);
    expect(mockConfirmImport.mock.calls[0]![1]).toBe('trade-swd');

    // ONE practical section (weight 100) — the parsed TVET sections are merged
    expect(payload.sections).toHaveLength(1);
    expect(payload.sections[0].weight).toBe(100);
    expect(payload.sections[0].sectionType).toBe('MIXED');

    // Every extracted indicator lands flat in that single section
    // (the optional `weight` is dropped in the rebuild; the backend defaults it to 1)
    expect(payload.sections[0].rubricCriteria).toHaveLength(9);
    expect(payload.sections[0].rubricCriteria).toEqual(
      parsedTASK1.sections.flatMap((s) =>
        (s.rubricCriteria || []).map(({ weight: _weight, ...rest }) => rest),
      ),
    );

    // All 4 tasks become questions, with their parsed question types preserved
    const allQuestions = payload.sections.flatMap((s: { questions: any[] }) => s.questions);
    expect(allQuestions.length).toBe(4);
    expect(allQuestions.map((q: { questionType: string }) => q.questionType)).toEqual([
      'DIAGRAM',
      'CODE',
      'ESSAY',
      'SHORT_ANSWER',
    ]);
  });

  it('lets the author add indicators when none were extracted (no dead end)', async () => {
    mockUploadAndParse.mockResolvedValueOnce({
      fileName: 'TASK _1.pdf',
      fileSize: 12345,
      extractedTextLength: 6400,
      parsedData: {
        ...parsedTASK1,
        sections: parsedTASK1.sections.map((s) => ({ ...s, rubricCriteria: [] })),
      },
    });

    renderPage();
    fireEvent.click(await screen.findByText('Upload Document'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'trade-swd' } });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(['pdf'], 'TASK _1.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: /upload & parse/i }));
    await screen.findByText('Review Parsed Content');

    // No indicators extracted — the flat panel offers recovery instead of a dead end
    expect(screen.getByText(/No indicators were extracted/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /add indicator/i }));

    const nameInput = screen.getByPlaceholderText('Indicator name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'ERD respects key rules' } });

    await clickCreateExam();

    const [payload] = mockConfirmImport.mock.calls[0]!;
    expect(payload.sections[0].rubricCriteria).toHaveLength(1);
    expect(payload.sections[0].rubricCriteria[0].criterionName).toBe('ERD respects key rules');
    // A fresh indicator row gets the generator's default max score (> 0)
    expect(payload.sections[0].rubricCriteria[0].maxScore).toBeGreaterThan(0);
  });

  it('sends an edited indicator maxScore to confirmImport', async () => {
    await runUploadFlow();

    // The criterion name appears twice per row (name input + description
    // textarea); the name input is first in DOM order. Its maxScore input
    // lives in the same rubric row.
    const nameInput = screen.getAllByDisplayValue('Department entity is drawn')[0] as HTMLInputElement;
    const rubricRow = nameInput.closest('.flex.items-center.gap-2') as HTMLElement;
    const maxScoreInput = within(rubricRow).getByDisplayValue('1') as HTMLInputElement;
    fireEvent.change(maxScoreInput, { target: { value: '5' } });

    // The flat checklist's marks badge reflects the edit (12 -> 16 marks)
    expect(screen.getByText('16 marks')).toBeInTheDocument();

    await clickCreateExam();

    const [payload] = mockConfirmImport.mock.calls[0]!;
    // The edited value reaches the backend contract
    expect(payload.sections[0].rubricCriteria[0].maxScore).toBe(5);
    // Unedited criteria in the flat list are untouched
    expect(payload.sections[0].rubricCriteria[1].maxScore).toBe(1);
    expect(payload.sections[0].rubricCriteria[2].maxScore).toBe(1);
    expect(payload.sections[0].rubricCriteria[3].maxScore).toBe(2);
  });
});
