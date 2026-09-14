import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CandidatePortalDashboard } from '../dashboard';
import { candidatePortalApi, type ExamRegistration } from '@services/candidate-portal-service';
import { useAuthStore } from '@stores/auth-store';

// ── Mocks ──────────────────────────────────────
vi.mock('@services/candidate-portal-service', () => ({
  candidatePortalApi: {
    listAvailableAssessments: vi.fn(),
    listRegistrations: vi.fn(),
    registerForAssessment: vi.fn(),
  },
}));

vi.mock('@hooks/use-assessment-socket', () => ({
  useAssessmentSocket: vi.fn(),
}));

// Org quota banner needs no usage data for these tests (renders nothing when null).
vi.mock('@hooks/use-org-usage', () => ({
  useOrgUsage: () => null,
}));

// ── Fixtures ───────────────────────────────────
const baseExam = {
  id: 'a1',
  title: 'Software Development Practical',
  description: null,
  duration: 120,
  passingScore: 50,
  fieldId: 'f1',
};

function makeRegistration(overrides: Partial<ExamRegistration>): ExamRegistration {
  return {
    id: 'reg-1',
    examId: 'a1',
    candidateId: 'cand-1',
    status: 'REGISTERED',
    startedAt: null,
    completedAt: null,
    totalScore: null,
    registeredAt: '2026-07-01T00:00:00.000Z',
    exam: baseExam,
    sessions: [],
    submissions: [],
    latestSession: null,
    totalSubmissions: 2,
    submittedCount: 1,
    draftCount: 0,
    ...overrides,
  };
}

const registered = makeRegistration({ id: 'reg-1', status: 'REGISTERED' });
const inProgress = makeRegistration({ id: 'reg-2', status: 'IN_PROGRESS' });
const completed = makeRegistration({ id: 'reg-3', status: 'COMPLETED', completedAt: '2026-07-20T00:00:00.000Z' });

const availableAssessments = [
  {
    id: 'a10',
    organizationId: 'org-1',
    fieldId: 'f2',
    title: 'Network Installation Practical',
    description: null,
    assessmentType: 'PRACTICAL',
    difficulty: 'ADVANCED',
    status: 'PUBLISHED',
    durationMinutes: 90,
    passingScore: 60,
    maxAttempts: 1,
    instructions: null,
    scenario: null,
    resources: null,
    allowOralDefense: true,
    requireFullScreen: true,
    requireWebcam: false,
    createdBy: 'u1',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z',
    field: { id: 'f2', name: 'Network Administration', code: 'NET' },
    _count: { tasks: 3 },
  },
];

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname + location.search}</div>;
}

function renderPortal(initialPath = '/candidate-portal') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/candidate-portal"
          element={
            <>
              <LocationProbe />
              <CandidatePortalDashboard />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

function setCandidateUser() {
  useAuthStore.setState({
    user: {
      id: 'cand-1',
      email: 'candidate@cbacademy.com',
      firstName: 'John',
      lastName: 'Candidate',
      role: 'CANDIDATE',
      userType: 'ORGANIZATION',
      organizationId: 'org-1',
      candidateId: 'cand-1',
      isActive: true,
      mfaEnabled: false,
    },
    accessToken: 't',
    refreshToken: 'r',
    isAuthenticated: true,
  });
}

/** Waits for the portal to finish loading, then returns the tablist container. */
async function waitForTabs() {
  // The page starts in a loading state, so the tabs only appear after the
  // mocked API calls resolve.
  return screen.findByRole('tab', { name: /My Assessments \(\d+\)/ });
}

describe('CandidatePortalDashboard — URL-driven tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCandidateUser();
    vi.mocked(candidatePortalApi.listAvailableAssessments).mockResolvedValue(availableAssessments as never);
    vi.mocked(candidatePortalApi.listRegistrations).mockResolvedValue([registered, inProgress, completed] as never);
    vi.mocked(candidatePortalApi.registerForAssessment).mockResolvedValue(registered as never);
  });

  it('renders all four tabs with the counts and defaults to the registered view', async () => {
    renderPortal();
    await waitForTabs();

    // All four tabs exist; "My Assessments" is selected by default (no ?tab=).
    expect(screen.getByRole('tab', { name: 'My Assessments (3)' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Available (1)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Active (2)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'History (1)' })).toBeInTheDocument();

    // Default tab lists every registration regardless of status (all three
    // fixtures share this exam title → three registration cards).
    expect(screen.getAllByText('Software Development Practical')).toHaveLength(3);
  });

  it('preselects the Available tab from ?tab=available and lists only available assessments', async () => {
    renderPortal('/candidate-portal?tab=available');
    await waitForTabs();

    expect(screen.getByRole('tab', { name: 'Available (1)' })).toHaveAttribute('aria-selected', 'true');
    // Available assessment is shown…
    expect(screen.getByText('Network Installation Practical')).toBeInTheDocument();
    // …and registrations are hidden on this tab.
    expect(screen.queryByText('Software Development Practical')).not.toBeInTheDocument();
  });

  it('preselects the Active tab from ?tab=active and filters to in-progress registrations', async () => {
    renderPortal('/candidate-portal?tab=active');
    await waitForTabs();

    expect(screen.getByRole('tab', { name: 'Active (2)' })).toHaveAttribute('aria-selected', 'true');
    // REGISTERED + IN_PROGRESS registrations are shown on the Active tab (two cards).
    expect(screen.getAllByText('Software Development Practical')).toHaveLength(2);
    // The completed registration is filtered out — its uppercase COMPLETED
    // status badge is gone (the stat card's lowercase "Completed" label remains).
    expect(screen.queryByText('COMPLETED')).not.toBeInTheDocument();
  });

  it('preselects the History tab from ?tab=history and filters to completed registrations', async () => {
    renderPortal('/candidate-portal?tab=history');
    await waitForTabs();

    expect(screen.getByRole('tab', { name: 'History (1)' })).toHaveAttribute('aria-selected', 'true');
    // Only the completed registration survives the History filter.
    expect(screen.getAllByText('Software Development Practical')).toHaveLength(1);
    // Its status badge shows "COMPLETED" (the stat card label uses lowercase "Completed").
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  it('falls back to the registered tab for an unknown tab param', async () => {
    renderPortal('/candidate-portal?tab=bogus');
    await waitForTabs();

    expect(screen.getByRole('tab', { name: 'My Assessments (3)' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByText('Software Development Practical')).toHaveLength(3);
  });

  it('switching tabs updates the URL (?tab=) and the probe reflects it', async () => {
    renderPortal();
    await waitForTabs();

    fireEvent.click(screen.getByRole('tab', { name: 'Available (1)' }));
    await waitFor(() => {
      expect(screen.getByTestId('location-probe').textContent).toBe('/candidate-portal?tab=available');
    });
    expect(screen.getByRole('tab', { name: 'Available (1)' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'History (1)' }));
    await waitFor(() => {
      expect(screen.getByTestId('location-probe').textContent).toBe('/candidate-portal?tab=history');
    });
  });

  it('returning to My Assessments clears the query params entirely', async () => {
    renderPortal('/candidate-portal?tab=history');
    await waitForTabs();

    fireEvent.click(screen.getByRole('tab', { name: 'My Assessments (3)' }));
    // Exact match — the tab button clears the query params entirely (no ?tab=).
    await waitFor(() => {
      expect(screen.getByTestId('location-probe').textContent).toBe('/candidate-portal');
    });
    expect(screen.getByRole('tab', { name: 'My Assessments (3)' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows tab-specific empty states when a filtered view has no rows', async () => {
    vi.mocked(candidatePortalApi.listRegistrations).mockResolvedValue([registered, inProgress] as never);

    renderPortal('/candidate-portal?tab=history');
    await waitForTabs();

    expect(screen.getByText('No completed assessments yet')).toBeInTheDocument();
  });

  it('registering from the Available tab returns to My Assessments with a clean URL', async () => {
    renderPortal('/candidate-portal?tab=available');
    await waitForTabs();

    const registerButton = await screen.findByRole('button', { name: 'Register' });
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(candidatePortalApi.registerForAssessment).toHaveBeenCalledWith('a10');
    });
    // Returns to the default registered view with no query params (exact match).
    await waitFor(() => {
      expect(screen.getByTestId('location-probe').textContent).toBe('/candidate-portal');
    });
    expect(screen.getByRole('tab', { name: 'My Assessments (3)' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows the available-tab empty state when no assessments are open', async () => {
    vi.mocked(candidatePortalApi.listAvailableAssessments).mockResolvedValue([] as never);

    renderPortal('/candidate-portal?tab=available');
    await waitForTabs();

    expect(screen.getByText('No available assessments')).toBeInTheDocument();
  });
});
