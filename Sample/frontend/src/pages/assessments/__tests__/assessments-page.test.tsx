import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssessmentsPage } from '../index';
import { assessmentBuilderApi, type Assessment } from '@services/assessment-builder-service';
import { useAuthStore } from '@stores/auth-store';

vi.mock('@services/assessment-builder-service', () => ({
  assessmentBuilderApi: { list: vi.fn() },
  // Re-export the type namespace used by the page via the mocked module.
  // The page imports `type Assessment` — erased at runtime, but vitest needs
  // the named export to exist for ESM interop.
}));

const mockAssessment: Assessment = {
  id: 'a1',
  organizationId: 'org-1',
  fieldId: 'f1',
  title: 'Software Development Practical',
  description: null,
  assessmentType: 'PRACTICAL',
  difficulty: 'INTERMEDIATE',
  status: 'DRAFT',
  durationMinutes: 120,
  passingScore: 50,
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
  field: { id: 'f1', name: 'Software Development', code: 'SWD' },
  organization: { id: 'org-1', name: 'CodeBridge Academy' },
  _count: { tasks: 3, checklistItems: 5, aiRules: 2, oralQuestions: 1 },
};

const mockPublished: Assessment = {
  ...mockAssessment,
  id: 'a2',
  title: 'Network Installation Practical',
  status: 'PUBLISHED',
  difficulty: 'ADVANCED',
  field: { id: 'f2', name: 'Network Administration', code: 'NET' },
};

function renderPage(initialPath = '/assessments') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AssessmentsPage />
    </MemoryRouter>,
  );
}

describe('AssessmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: '1',
        email: 'owner@org.com',
        firstName: 'Test',
        lastName: 'Owner',
        role: 'ORGANIZATION_OWNER',
        isActive: true,
        mfaEnabled: false,
      },
      accessToken: 't',
      refreshToken: 'r',
      isAuthenticated: true,
    });
  });

  it('renders all four status tabs and the default (All) list', async () => {
    vi.mocked(assessmentBuilderApi.list).mockResolvedValue({
      data: [mockAssessment, mockPublished],
      meta: { page: 1, limit: 20, totalItems: 2, totalPages: 1 },
    });

    renderPage();

    // Tabs
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Draft' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Published' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Assigned' })).toBeInTheDocument();

    // All tab → no status filter, no assigned flag
    await waitFor(() => {
      expect(assessmentBuilderApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, status: undefined, assigned: undefined }),
      );
    });
    expect(await screen.findByText('Software Development Practical')).toBeInTheDocument();
    expect(screen.getByText('Network Installation Practical')).toBeInTheDocument();
  });

  it('switches to Draft tab and requests the DRAFT status filter', async () => {
    vi.mocked(assessmentBuilderApi.list).mockResolvedValue({
      data: [mockAssessment],
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });

    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Draft' }));

    await waitFor(() => {
      expect(assessmentBuilderApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, status: 'DRAFT', assigned: undefined }),
      );
    });
  });

  it('switches to Published tab and requests the PUBLISHED status filter', async () => {
    vi.mocked(assessmentBuilderApi.list).mockResolvedValue({
      data: [mockPublished],
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });

    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Published' }));

    await waitFor(() => {
      expect(assessmentBuilderApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, status: 'PUBLISHED', assigned: undefined }),
      );
    });
  });

  it('switches to Assigned tab and requests the assigned flag', async () => {
    vi.mocked(assessmentBuilderApi.list).mockResolvedValue({
      data: [mockPublished],
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });

    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Assigned' }));

    await waitFor(() => {
      expect(assessmentBuilderApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, status: undefined, assigned: true }),
      );
    });
  });

  it('reads the ?status= param to preselect a tab (deep link from the sidebar)', async () => {
    vi.mocked(assessmentBuilderApi.list).mockResolvedValue({
      data: [mockPublished],
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });

    renderPage('/assessments?status=published');

    expect(screen.getByRole('tab', { name: 'Published' })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => {
      expect(assessmentBuilderApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PUBLISHED' }),
      );
    });
  });

  it('shows an empty state with a role-appropriate message when nothing matches', async () => {
    vi.mocked(assessmentBuilderApi.list).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });

    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Assigned' }));

    expect(await screen.findByText(/assessments assigned to you or in active use/i)).toBeInTheDocument();
    // Managers don't get a Create CTA on the assigned tab
    expect(screen.queryByRole('button', { name: /create assessment/i })).not.toBeInTheDocument();
  });

  it('searches by title (debounced)', async () => {
    vi.mocked(assessmentBuilderApi.list).mockResolvedValue({
      data: [mockAssessment],
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });

    renderPage();
    fireEvent.change(screen.getByLabelText('Search assessments'), { target: { value: 'Software' } });

    await waitFor(() => {
      expect(assessmentBuilderApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Software' }),
      );
    });
  });
});
