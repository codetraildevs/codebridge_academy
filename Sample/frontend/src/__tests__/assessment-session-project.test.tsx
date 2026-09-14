import { render, screen, waitFor, fireEvent, act, configure } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssessmentSessionPage } from '@pages/candidate/assessment-session';

// This page mounts the full session (project-status check, sandbox workspace),
// which is slow under the whole-suite CPU load on CI/dev machines. Raise the
// default async timeout (findBy/waitFor) so these never flake at 1s.
// (The per-test vitest timeout is raised globally in vite.config.ts.)
configure({ asyncUtilTimeout: 20000 });

// ── Mocks ──────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  getSessionExam: vi.fn(),
  submitAnswer: vi.fn(),
  finalizeAssessment: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  workspaceProps: vi.fn(),
}));

vi.mock('@services/candidate-service', () => ({
  candidateService: {
    getSessionExam: (...args: unknown[]) => mocks.getSessionExam(...args),
    submitAnswer: (...args: unknown[]) => mocks.submitAnswer(...args),
    finalizeAssessment: (...args: unknown[]) => mocks.finalizeAssessment(...args),
  },
}));

vi.mock('@services/api', () => ({
  api: {
    get: (...args: unknown[]) => mocks.apiGet(...args),
    post: (...args: unknown[]) => mocks.apiPost(...args),
  },
}));

// DynamicWorkspace is stubbed but captures its props so we can assert
// projectMode and the per-section deliverable filtering.
vi.mock('@components/workspace', () => ({
  CodeWorkspace: () => <div data-testid="ws-code" />,
  EssayWorkspace: () => <div data-testid="ws-essay" />,
  MultipleChoiceWorkspace: () => <div data-testid="ws-mc" />,
  FileUploadWorkspace: () => <div data-testid="ws-file" />,
  DiagramWorkspace: () => <div data-testid="ws-diagram" />,
  ShortAnswerWorkspace: () => <div data-testid="ws-short" />,
  DynamicWorkspace: (props: any) => {
    mocks.workspaceProps(props);
    return <div data-testid="ws-dynamic" />;
  },
}));

// ── Fixture: a practical exam with a real sandbox session ─────────────
const practicalSessionExam = {
  id: 'exam-practical',
  title: 'EPMS Practical',
  description: null,
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
  sessionId: 'sess-123',
  sessionStartedAt: new Date().toISOString(),
  workspaceTools: ['FILE_EXPLORER', 'CODE_EDITOR', 'TERMINAL', 'DATABASE'],
  sections: [
    {
      id: 'sec-erd',
      title: 'Database Design',
      description: null,
      orderIndex: 0,
      sectionType: 'ERD_DESIGN',
      weight: 40,
      duration: null,
      rubricCriteria: [],
      questions: [
        {
          id: 'q-erd',
          questionText: 'Design the ERD.',
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
    {
      id: 'sec-code',
      title: 'Code Writing',
      description: null,
      orderIndex: 1,
      sectionType: 'CODE_WRITING',
      weight: 60,
      duration: null,
      rubricCriteria: [],
      questions: [
        {
          id: 'q-code',
          questionText: 'Build the app.',
          questionType: 'CODE',
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

// The workspace may render once with projectMode=false before the project-status
// API resolves (which then flips projectConfigured and re-renders with true).
// Always assert on the latest captured props.
const latestWorkspaceProps = () => {
  const calls = mocks.workspaceProps.mock.calls;
  return calls[calls.length - 1]?.[0];
};

const waitForProjectMode = (expected: boolean) =>
  waitFor(() => expect(latestWorkspaceProps()?.projectMode).toBe(expected));

// ── Tests ──────────────────────────────────────────

describe('AssessmentSessionPage (practical exam, project workspace)', () => {
  beforeEach(() => {
    mocks.getSessionExam.mockReset();
    mocks.getSessionExam.mockResolvedValue(practicalSessionExam);
    mocks.apiGet.mockReset();
    mocks.apiPost.mockReset();
    mocks.workspaceProps.mockReset();
  });

  it('shows the setup wizard when the project workspace is not configured yet', async () => {
    // Backend says the wizard has not run for this session.
    mocks.apiGet.mockResolvedValueOnce({ data: { data: { configured: false, parts: [] } } });

    renderSession();

    await screen.findByText(/Set up your project workspace/);
    // Parts derived from the sections are pre-selected (ERD_DESIGN + CODE_WRITING
    // ⇒ database + frontend + backend) and shown as a folder preview.
    expect((await screen.findAllByText(/database\/designs\//)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/frontend\//).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/backend\//).length).toBeGreaterThan(0);
  });

  it('creates the project structure on wizard confirm and dismisses the wizard', async () => {
    mocks.apiGet.mockResolvedValueOnce({ data: { data: { configured: false, parts: [] } } });
    mocks.apiPost.mockResolvedValueOnce({ data: { data: { created: [] } } });

    renderSession();

    // Wait for the wizard, then confirm with the default selection.
    const createBtn = await screen.findByRole('button', { name: /Create Workspace/ });
    fireEvent.click(createBtn);

    await waitFor(() => expect(mocks.apiPost).toHaveBeenCalledTimes(1));
    expect(mocks.apiPost).toHaveBeenCalledWith('/sandbox/workspace/sess-123/project', {
      parts: expect.arrayContaining(['DATABASE', 'FRONTEND', 'BACKEND']),
    });

    // Wizard is gone; the question workspace renders in project mode.
    await waitFor(() =>
      expect(screen.queryByText(/Set up your project workspace/)).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('ws-dynamic')).toBeInTheDocument();
    await waitForProjectMode(true);
  });

  it('skips the wizard on returning visits when the project is already configured', async () => {
    mocks.apiGet.mockResolvedValueOnce({
      data: { data: { configured: true, parts: ['DATABASE', 'FRONTEND', 'BACKEND'] } },
    });

    renderSession();

    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalledWith('/sandbox/workspace/sess-123/project'));

    // No wizard — straight to the workspace in project mode.
    expect(screen.queryByText(/Set up your project workspace/)).not.toBeInTheDocument();
    await screen.findByTestId('ws-dynamic');
    await waitForProjectMode(true);
  });

  it('falls back to the legacy per-stage workspace when the project API fails', async () => {
    mocks.apiGet.mockRejectedValueOnce(new Error('network'));

    renderSession();

    await screen.findByTestId('ws-dynamic');
    expect(mocks.workspaceProps.mock.calls[0]?.[0]?.projectMode).toBe(false);
  });

  it('shows the project overview panel with parts and live file counts', async () => {
    mocks.apiGet.mockResolvedValueOnce({
      data: { data: { configured: true, parts: ['DATABASE', 'FRONTEND', 'BACKEND'] } },
    });

    renderSession();

    await screen.findByText(/Project overview/);
    // All chosen parts are listed with their folders.
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
    // Nothing saved yet — all parts show as empty.
    expect(screen.getAllByText('empty').length).toBe(3);
    expect(screen.getByText(/0\/3 parts/)).toBeInTheDocument();

    // Simulate the candidate saving a diagram file in the database part.
    const props = latestWorkspaceProps();
    act(() => {
      props.onFilesChange([{ path: 'database/designs/erd/diagram.json', content: '{}' }]);
    });

    // The overview updates live: database now has 1 file.
    await waitFor(() => expect(screen.getByText(/1\/3 parts · 1 files/)).toBeInTheDocument());
    expect(screen.getAllByText('1 file').length).toBe(1);
    expect(screen.getAllByText('empty').length).toBe(2);
  });

  it('jumps to the owning section when a part is clicked in the overview', async () => {
    mocks.apiGet.mockResolvedValueOnce({
      data: { data: { configured: true, parts: ['DATABASE', 'FRONTEND', 'BACKEND'] } },
    });

    renderSession();

    // Wait for the panel, then click the Backend part — CODE_WRITING is the
    // section that owns frontend/ + backend/.
    const backendBtn = await screen.findByRole('button', { name: /Backend/ });
    fireEvent.click(backendBtn);

    // The session navigates to the Code Writing section.
    await screen.findByText(/Section 2: Code Writing/);
  });

  it('re-opens the setup wizard mid-exam with existing parts pre-selected and can add a part', async () => {
    mocks.apiGet.mockResolvedValueOnce({
      data: { data: { configured: true, parts: ['DATABASE', 'FRONTEND', 'BACKEND'] } },
    });
    mocks.apiPost.mockResolvedValueOnce({ data: { data: { created: ['network/designs', 'network/config'] } } });

    renderSession();

    // Wait for the overview panel, then click the edit (pencil) button.
    await screen.findByText(/Project overview/);
    fireEvent.click(screen.getByRole('button', { name: /Add or remove parts/ }));

    // The wizard re-opens in edit mode with the existing parts pre-selected.
    await screen.findByText(/Update your project workspace/);
    expect(screen.getByText(/Your existing folders and saved work are kept/)).toBeInTheDocument();

    // Add the Network part, then confirm.
    fireEvent.click(screen.getByRole('button', { name: /Network/ }));
    fireEvent.click(screen.getByRole('button', { name: /Update Workspace/ }));

    await waitFor(() => expect(mocks.apiPost).toHaveBeenCalledTimes(1));
    expect(mocks.apiPost).toHaveBeenCalledWith('/sandbox/workspace/sess-123/project', {
      parts: expect.arrayContaining(['DATABASE', 'FRONTEND', 'BACKEND', 'NETWORK']),
    });

    // Wizard closes and the workspace remounts (projectVersion bump → new key).
    await waitFor(() =>
      expect(screen.queryByText(/Update your project workspace/)).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('ws-dynamic')).toBeInTheDocument();
    await waitForProjectMode(true);
  });

  it('can cancel the mid-exam wizard without changing the structure', async () => {
    mocks.apiGet.mockResolvedValueOnce({
      data: { data: { configured: true, parts: ['DATABASE', 'FRONTEND', 'BACKEND'] } },
    });

    renderSession();

    await screen.findByText(/Project overview/);
    fireEvent.click(screen.getByRole('button', { name: /Add or remove parts/ }));

    await screen.findByText(/Update your project workspace/);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));

    expect(mocks.apiPost).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText(/Update your project workspace/)).not.toBeInTheDocument(),
    );
  });

  it('distributes the single workspace files into each section’s deliverable answers', async () => {
    mocks.apiGet.mockResolvedValueOnce({ data: { data: { configured: true, parts: ['DATABASE'] } } });

    renderSession();

    const dynamic = await screen.findByTestId('ws-dynamic');
    await waitForProjectMode(true);
    const props = latestWorkspaceProps();

    // Simulate the candidate's full project tree being edited in the single
    // unified workspace.
    const allFiles = [
      { path: 'database/designs/erd/diagram.json', content: '{}' },
      { path: 'frontend/src/App.js', content: 'x' },
      { path: 'backend/server.js', content: 'y' },
    ];
    act(() => {
      props.onFilesChange(allFiles);
    });

    // Submit — finalize flushes every section's answer from the one workspace.
    expect(dynamic).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Submit/ }));
    fireEvent.click(screen.getByRole('button', { name: /Submit Now/ }));

    await waitFor(() => expect(mocks.submitAnswer).toHaveBeenCalled());

    // The ERD section's answer contains ONLY its deliverable (database/designs/),
    // even though the single workspace holds the whole project.
    const erdCall = mocks.submitAnswer.mock.calls.find((c) => c[1] === 'sec-erd' && c[2] === 'q-erd');
    expect(erdCall).toBeDefined();
    expect(erdCall![0]).toBe('reg-1');
    expect(erdCall![3]).toEqual([{ path: 'database/designs/erd/diagram.json', content: '{}' }]);

    // The CODE_WRITING section receives the whole project (its part folders
    // weren't chosen, so the answer falls back to the full tree).
    const codeCall = mocks.submitAnswer.mock.calls.find((c) => c[1] === 'sec-code' && c[2] === 'q-code');
    expect(codeCall).toBeDefined();
    expect(codeCall![3]).toEqual(allFiles);
  });
});
