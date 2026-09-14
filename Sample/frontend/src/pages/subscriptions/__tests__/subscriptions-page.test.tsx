import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrganizationSubscriptionsPage } from '../index';
import { SubscriptionHistoryPage } from '../history';
import { subscriptionService, type OrganizationSubscriptionRow } from '@services/subscription-service';

vi.mock('@services/subscription-service', () => ({
  subscriptionService: {
    listOrganizationSubscriptions: vi.fn(),
    listPlans: vi.fn(),
    setOrganizationSubscription: vi.fn(),
    cancelOrganizationSubscription: vi.fn(),
    reactivateOrganizationSubscription: vi.fn(),
    getOrganizationSubscriptionHistory: vi.fn(),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <OrganizationSubscriptionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Renders the org list with the history route registered so History navigates to it. */
function renderPageWithHistoryRoute() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/subscriptions']}>
        <Routes>
          <Route path="/subscriptions" element={<OrganizationSubscriptionsPage />} />
          <Route path="/subscriptions/organizations/:organizationId/history" element={<SubscriptionHistoryPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const mockRows: OrganizationSubscriptionRow[] = [
  {
    id: 'org-1',
    name: 'CodeBridge Academy',
    code: 'CBA',
    organizationType: 'TVET_SCHOOL',
    email: 'info@cba.edu.rw',
    isActive: true,
    subscriptionPlanId: 'plan-1',
    subscriptionStatus: 'ACTIVE',
    subscriptionStartAt: '2026-01-01T00:00:00.000Z',
    subscriptionEndAt: '2026-12-31T00:00:00.000Z',
    maxUsers: 50,
    maxCandidates: 500,
    maxJobPostings: 10,
    totalUsers: 12,
    totalCandidates: 90,
    createdAt: '2025-12-01T00:00:00.000Z',
    subscriptionPlan: { id: 'plan-1', name: 'Organization Pro', planType: 'ORGANIZATION', price: 500000, currency: 'RWF', billingCycle: 'ANNUAL', durationDays: 365, maxUsers: 50, maxCandidates: 500, maxAssessments: 100, maxJobPostings: 10, features: [], isActive: true, createdAt: '2025-11-01T00:00:00.000Z' },
  },
  {
    id: 'org-2',
    name: 'Kigali Tech Institute',
    code: 'KTI',
    organizationType: 'UNIVERSITY',
    email: null,
    isActive: true,
    subscriptionPlanId: null,
    subscriptionStatus: 'CANCELLED',
    subscriptionStartAt: null,
    subscriptionEndAt: null,
    maxUsers: 50,
    maxCandidates: 500,
    maxJobPostings: 10,
    totalUsers: 0,
    totalCandidates: 0,
    createdAt: '2026-02-01T00:00:00.000Z',
    subscriptionPlan: null,
  },
];

describe('OrganizationSubscriptionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(subscriptionService.listOrganizationSubscriptions).mockResolvedValue({
      data: mockRows,
      meta: { page: 1, limit: 20, totalItems: 2, totalPages: 1 },
    });
    vi.mocked(subscriptionService.listPlans).mockResolvedValue([
      { id: 'plan-1', name: 'Organization Pro', planType: 'ORGANIZATION' } as any,
      { id: 'plan-2', name: 'Starter', planType: 'ORGANIZATION' } as any,
    ]);
  });

  it('renders the header and organization rows with plan + status', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Organization Subscriptions')).toBeInTheDocument();
    });
    expect(await screen.findByText('CodeBridge Academy')).toBeInTheDocument();
    expect(screen.getByText('Kigali Tech Institute')).toBeInTheDocument();
    // Plan name + status badges (status text also appears in the filter options)
    expect(screen.getByText('Organization Pro')).toBeInTheDocument();
    expect(screen.getAllByText('ACTIVE').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('CANCELLED').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Cancel action for active orgs and Reactivate for cancelled orgs', async () => {
    renderPage();
    await screen.findByText('CodeBridge Academy');

    // One active org (Cancel) and one cancelled org (Reactivate)
    expect(screen.getAllByText('Cancel').length).toBe(1);
    expect(screen.getAllByText('Reactivate').length).toBe(1);
  });

  it('opens the assign modal and saves plan/status changes', async () => {
    renderPage();
    await screen.findByText('CodeBridge Academy');

    fireEvent.click(screen.getAllByText('Assign')[0]!);
    expect(await screen.findByText('Set the plan and status for')).toBeInTheDocument();

    // Change status to PENDING and save
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'PENDING' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      // The current plan is pre-selected in the modal
      expect(subscriptionService.setOrganizationSubscription).toHaveBeenCalledWith('org-1', {
        planId: 'plan-1',
        status: 'PENDING',
        durationDays: undefined,
        note: undefined,
      });
    });
  });

  it('cancels a subscription through the cancel modal', async () => {
    renderPage();
    await screen.findByText('CodeBridge Academy');

    fireEvent.click(screen.getAllByText('Cancel')[0]!);
    expect(await screen.findByText('Cancel the subscription for')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Why is this subscription being cancelled?'), {
      target: { value: 'Non-payment' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Cancellation' }));

    await waitFor(() => {
      expect(subscriptionService.cancelOrganizationSubscription).toHaveBeenCalledWith('org-1', {
        reason: 'Non-payment',
        cancelImmediately: false,
      });
    });
  });

  it('reactivates a cancelled subscription', async () => {
    renderPage();
    await screen.findByText('Kigali Tech Institute');

    fireEvent.click(screen.getByText('Reactivate'));
    await waitFor(() => {
      expect(subscriptionService.reactivateOrganizationSubscription).toHaveBeenCalledWith('org-2');
    });
  });

  it('navigates to the dedicated history page when History is clicked', async () => {
    vi.mocked(subscriptionService.getOrganizationSubscriptionHistory).mockResolvedValue({
      organization: { id: 'org-1', name: 'CodeBridge Academy', code: 'CBA' },
      data: [
        {
          id: 'change-1',
          action: 'CHANGE_PLAN',
          status: 'COMPLETED',
          previousPlanId: 'plan-1',
          newPlanId: 'plan-2',
          previousPlanName: 'Organization Pro',
          newPlanName: 'Enterprise',
          reason: 'Seat upgrade',
          feedback: null,
          cancelImmediately: false,
          cancelAt: null,
          createdAt: '2026-07-01T10:00:00.000Z',
        },
      ],
    });
    renderPageWithHistoryRoute();
    await screen.findByText('CodeBridge Academy');

    fireEvent.click(screen.getAllByText('History')[0]!);

    // The history PAGE renders (not a modal) with the org's changes
    expect(await screen.findByText('Subscription History')).toBeInTheDocument();
    expect(await screen.findByText('Organization Pro → Enterprise')).toBeInTheDocument();
    expect(subscriptionService.getOrganizationSubscriptionHistory).toHaveBeenCalledWith('org-1');
    // Back link returns to the org list
    fireEvent.click(screen.getByText('Organization Subscriptions'));
    expect(await screen.findByText('Manage plans, subscription status, and seat usage across all organizations')).toBeInTheDocument();
  });

  it('shows an empty state when no organizations match', async () => {
    vi.mocked(subscriptionService.listOrganizationSubscriptions).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 1 },
    });
    renderPage();
    expect(await screen.findByText('No organizations match your filters.')).toBeInTheDocument();
  });
});
