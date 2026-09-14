import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssessmentSessionPage } from '@pages/candidate/assessment-session';

// ── Mocks ──────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  getSessionExam: vi.fn(),
  submitAnswer: vi.fn(),
  finalizeAssessment: vi.fn(),
}));

vi.mock('@services/candidate-service', () => ({
  candidateService: {
    getSessionExam: (...args: unknown[]) => mocks.getSessionExam(...args),
    submitAnswer: (...args: unknown[]) => mocks.submitAnswer(...args),
    finalizeAssessment: (...args: unknown[]) => mocks.finalizeAssessment(...args),
  },
}));

// The sandbox/terminal workspaces can't run in jsdom — stub them out.
vi.mock('@components/workspace', () => ({
  CodeWorkspace: () => <div data-testid="ws-code" />,
  EssayWorkspace: () => <div data-testid="ws-essay" />,
  MultipleChoiceWorkspace: () => <div data-testid="ws-mc" />,
  FileUploadWorkspace: () => <div data-testid="ws-file" />,
  DiagramWorkspace: () => <div data-testid="ws-diagram" />,
  ShortAnswerWorkspace: () => <div data-testid="ws-short" />,
  DynamicWorkspace: () => <div data-testid="ws-dynamic" />,
}));

// ── Fixture: a flat imported exam — ONE practical section, all indicators on
//    the section (not on the questions) ──────────────────────────────────
const flatSessionExam = {
  id: 'exam-flat',
  title: 'Employee Payroll Management System (EPMS)',
  description: '<p>SmartPark is a company located in Rubavu District.</p>',
  tradeName: 'Software Development',
  tradeCode: 'SWD',
  examType: 'PRACTICAL',
  duration: 420,
  passingScore: 50,
  maxAttempts: 1,
  instructions: null,
  allowOralDefense: true,
  requireFullScreen: true,
  requireWebcam: false,
  registrationId: 'reg-1',
  registrationStatus: 'IN_PROGRESS',
  sessionId: null,
  sessionStartedAt: null,
  sections: [
    {
      id: 'sec-flat',
      title: 'Practical Assessment',
      description: null,
      orderIndex: 0,
      sectionType: 'MIXED',
      weight: 100,
      duration: null,
      rubricCriteria: [
        { id: 'c1', criterionName: 'Department entity is drawn', description: 'Department entity is drawn', maxScore: 1, weight: 1 },
        { id: 'c2', criterionName: 'Node.js project is created', description: 'Node.js project is created', maxScore: 2, weight: 1 },
        { id: 'c3', criterionName: 'The product name is mentioned', description: 'The product name is mentioned', maxScore: 1, weight: 1 },
      ],
      questions: [
        {
          id: 'q1',
          questionText: 'Design an Entity Relationship Diagram (ERD) for the system.',
          questionType: 'DIAGRAM',
          options: null,
          points: 0,
          orderIndex: 0,
          expectedOutput: null,
          rubricCriteria: [],
          savedAnswer: null,
        },
      ],
    },
  ],
};

const renderSession = () =>
  render(
    <MemoryRouter initialEntries={['/candidate/assessments/reg-1']}>
      <Routes>
        <Route path="/candidate/assessments/:assessmentId" element={<AssessmentSessionPage />} />
      </Routes>
    </MemoryRouter>,
  );

// ── Tests ──────────────────────────────────────────

describe('AssessmentSessionPage (flat imported exam)', () => {
  beforeEach(() => {
    mocks.getSessionExam.mockReset();
    mocks.getSessionExam.mockResolvedValue(flatSessionExam);
  });

  it('pins the whole scenario and the tasks at the top — no assessment checklist', async () => {
    renderSession();

    // The exam scenario is shown at the top of the question area.
    expect(await screen.findByText(/SmartPark is a company located in Rubavu District/)).toBeInTheDocument();
    // Every task is listed under its section label ("Section 1: Practical Assessment").
    expect(screen.getAllByText(/Practical Assessment/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Design an Entity Relationship Diagram \(ERD\) for the system/).length).toBeGreaterThan(0);
    // The assessment checklist is NOT shown to the candidate (per the unified
    // workspace layout the brief is scenario + tasks, no rubric list).
    expect(screen.queryByText(/Assessment Checklist/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Department entity is drawn/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Node.js project is created/)).not.toBeInTheDocument();
  });

  it('shows the single unified workspace for the whole practical exam', async () => {
    renderSession();

    // Flat imported exams are ONE MIXED section covering the whole project, so
    // the unified layout opens the full VS Code-style workspace (file explorer,
    // folders, free writing) rather than a single-purpose editor.
    expect(await screen.findByTestId('ws-dynamic')).toBeInTheDocument();
  });
});
