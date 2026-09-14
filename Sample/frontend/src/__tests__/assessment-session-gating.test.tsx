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

// The session page renders the REAL DynamicWorkspace here (so tool gating is
// tested end-to-end from the exam payload to the UI). Only the xterm-based
// terminal is stubbed, since xterm can't run in jsdom.
vi.mock('@components/workspace/workspace-terminal', () => ({
  WorkspaceTerminal: () => <div data-testid="mock-terminal" />,
}));

// Non-sandbox sessions never call the API; stub it so the real axios instance
// (and its auth-store interceptors) aren't loaded by the workspace modules.
vi.mock('@services/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// ── Fixtures ───────────────────────────────────────
// A flat practical exam — ONE MIXED section with a CODE question. With no
// sandbox session the workspace uses the in-memory file system, so no API
// calls are made and the fixture stays self-contained.
function makeSessionExam(workspaceTools: string[], sectionType = 'MIXED') {
  return {
    id: 'exam-gate',
    title: 'Gating Verification Exam',
    description: null,
    tradeName: 'Software Development',
    tradeCode: 'SWD',
    examType: 'PRACTICAL',
    duration: 120,
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
    workspaceTools,
    sections: [
      {
        id: 'sec-1',
        title: sectionType === 'ERD_DESIGN' ? 'Database Design' : 'Practical Assessment',
        description: null,
        orderIndex: 0,
        sectionType,
        weight: 100,
        duration: null,
        rubricCriteria: [],
        questions: [
          {
            id: 'q-1',
            questionText:
              sectionType === 'ERD_DESIGN'
                ? 'Design an Entity Relationship Diagram for the system.'
                : 'Build the system in the workspace.',
            questionType: sectionType === 'ERD_DESIGN' ? 'DIAGRAM' : 'CODE',
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
}

const renderSession = (exam: ReturnType<typeof makeSessionExam>) => {
  mocks.getSessionExam.mockResolvedValue(exam);
  return render(
    <MemoryRouter initialEntries={['/candidate/assessments/exam-gate']}>
      <Routes>
        <Route
          path="/candidate/assessments/:assessmentId"
          element={<AssessmentSessionPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
};

// Tab buttons carry an "(off)" badge until opened.
const terminalTab = { name: /^Terminal( \(off\))?$/ };
const browserTab = { name: /^Browser( \(off\))?$/ };

// ── Tests ──────────────────────────────────────────

describe('AssessmentSessionPage — workspace tool gating (exam payload → UI)', () => {
  beforeEach(() => {
    mocks.getSessionExam.mockReset();
    mocks.submitAnswer.mockReset();
    mocks.finalizeAssessment.mockReset();
  });

  it('shows every tool for an exam with no tool restriction (legacy = all tools)', async () => {
    renderSession(makeSessionExam([]));

    await screen.findAllByText('Gating Verification Exam');

    // All tabs and toolbar controls are present.
    expect(screen.getByRole('button', { name: 'Editor' })).toBeInTheDocument();
    expect(screen.getByRole('button', terminalTab)).toBeInTheDocument();
    expect(screen.getByRole('button', browserTab)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Database' })).toBeInTheDocument();
    expect(screen.getByTitle('Toggle File Explorer')).toBeInTheDocument();
    expect(screen.getByTitle('Toggle Terminal')).toBeInTheDocument();
    expect(screen.getByTitle('Toggle Browser Preview')).toBeInTheDocument();
    expect(screen.getByTitle('Upload Files (to root)')).toBeInTheDocument();
  });

  it('hides every unselected tool (restricted exam: explorer + editor only)', async () => {
    renderSession(makeSessionExam(['FILE_EXPLORER', 'CODE_EDITOR']));

    await screen.findAllByText('Gating Verification Exam');

    // Selected tools remain.
    expect(screen.getByRole('button', { name: 'Editor' })).toBeInTheDocument();
    expect(screen.getByTitle('Toggle File Explorer')).toBeInTheDocument();

    // Unselected tabs are gone.
    expect(screen.queryByRole('button', terminalTab)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', browserTab)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Database' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Diagram' })).not.toBeInTheDocument();

    // So are their toolbar toggles and the upload button.
    expect(screen.queryByTitle('Toggle Terminal')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Toggle Browser Preview')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Upload Files (to root)')).not.toBeInTheDocument();
  });

  it('keeps only the selected tools visible for a partial set', async () => {
    renderSession(
      makeSessionExam(['CODE_EDITOR', 'TERMINAL', 'DATABASE', 'FILE_UPLOAD']),
    );

    await screen.findAllByText('Gating Verification Exam');

    // Selected: Editor, Terminal, Database, Upload.
    expect(screen.getByRole('button', { name: 'Editor' })).toBeInTheDocument();
    expect(screen.getByRole('button', terminalTab)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Database' })).toBeInTheDocument();
    expect(screen.getByTitle('Toggle Terminal')).toBeInTheDocument();
    expect(screen.getByTitle('Upload Files (to root)')).toBeInTheDocument();

    // Unselected: Browser (tab + toggle) is hidden.
    expect(screen.queryByRole('button', browserTab)).not.toBeInTheDocument();
    expect(screen.queryByTitle('Toggle Browser Preview')).not.toBeInTheDocument();
  });

  it('hides the Diagram tab on a design section when DIAGRAM_EDITOR is not selected', async () => {
    renderSession(
      makeSessionExam(['FILE_EXPLORER', 'CODE_EDITOR'], 'ERD_DESIGN'),
    );

    await screen.findAllByText('Gating Verification Exam');

    // No Diagram tab, no diagram canvas tablist; the editor is the active tab.
    expect(screen.queryByRole('button', { name: 'Diagram' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('tablist', { name: 'Diagram canvases' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editor' })).toBeInTheDocument();
  });

  it('shows the Diagram tab on a design section when DIAGRAM_EDITOR is selected', async () => {
    renderSession(
      makeSessionExam(['FILE_EXPLORER', 'DIAGRAM_EDITOR'], 'ERD_DESIGN'),
    );

    await screen.findAllByText('Gating Verification Exam');

    // Diagram tab renders and its canvas tablist with an ERD canvas appears.
    // The primary canvas is created asynchronously by the workspace load
    // effect, so await it rather than asserting synchronously.
    expect(screen.getByRole('button', { name: 'Diagram' })).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Diagram canvases' })).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: /ERD/ })).toBeInTheDocument();

    // The editor tab is hidden when the code editor isn't part of the exam.
    expect(screen.queryByRole('button', { name: 'Editor' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Database' })).not.toBeInTheDocument();
  });
});
