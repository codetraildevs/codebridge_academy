import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserSubscriptionsPage } from '../users';
import { subscriptionService, type UserSubscriptionRow } from '@services/subscription-service';

vi.mock('@services/subscription-service', () => ({
  subscriptionService: {
    listUserSubscriptions: vi.fn(),
    listPlans: vi.fn(),
    setUserSubscription: vi.fn(),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <UserSubscriptionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const mockRows: UserSubscriptionRow[] = [
  {
    id: 'user-1',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Mukamana',
    role: 'INDIVIDUAL_CANDIDATE',
    isActive: true,
    freeAssessmentsUsed: 1,
    maxFreeAssessments: 5,
    subscriptionPlanId: 'plan-1',
    subscriptionStatus: 'ACTIVE',
    subscriptionStartAt: '2026-01-01T00:00:00.000Z',
    subscriptionEndAt: '2026-12-31T00:00:00.000Z',
    createdAt: '2025-12-01T00:00:00.000Z',
    subscriptionPlan: { id: 'plan-1', name: 'Individual Pro', planType: 'INDIVIDUAL', billingCycle: 'ANNUAL', price: 50000, maxAssessments: 5 },
  },
  {
    id: 'user-2',
    email: 'bob@example.com',
    firstName: null,
    lastName: null,
    role: 'INDIVIDUAL_CANDIDATE',
    isActive: true,
    freeAssessmentsUsed: 0,
    maxFreeAssessments: 2,
    subscriptionPlanId: null,
    subscriptionStatus: 'PENDING',
    subscriptionStartAt: null,
    subscriptionEndAt: null,
    createdAt: '2026-02-01T00:00:00.000Z',
    subscriptionPlan: null,
  },
];

describe('UserSubscriptionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(subscriptionService.listUserSubscriptions).mockResolvedValue({
      data: mockRows,
      meta: { page: 1, limit: 20, totalItems: 2, totalPages: 1 },
    });
    vi.mocked(subscriptionService.listPlans).mockResolvedValue([
      { id: 'plan-1', name: 'Individual Pro', planType: 'INDIVIDUAL' } as any,
      { id: 'plan-2', name: 'Starter', planType: 'INDIVIDUAL' } as any,
    ]);
  });

  it('renders the header and user rows with plan + status', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('User Subscriptions')).toBeInTheDocument();
    });
    expect(await screen.findByText('Alice Mukamana')).toBeInTheDocument();
    // bob has no name, so the email appears as both name and subtitle
    expect(screen.getAllByText('bob@example.com').length).toBeGreaterThanOrEqual(1);
    // Plan name + status badges (status text also appears in the filter options)
    expect(screen.getByText('Individual Pro')).toBeInTheDocument();
    expect(screen.getAllByText('ACTIVE').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('PENDING').length).toBeGreaterThanOrEqual(1);
  });

  it('opens the assign modal with the current plan pre-selected and saves', async () => {
    renderPage();
    await screen.findByText('Alice Mukamana');

    fireEvent.click(screen.getAllByText('Assign')[0]!);
    expect(await screen.findByText('Set the plan and status for')).toBeInTheDocument();

    // Change status to TRIAL and save
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'TRIAL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(subscriptionService.setUserSubscription).toHaveBeenCalledWith('user-1', {
        planId: 'plan-1',
        status: 'TRIAL',
        durationDays: undefined,
        note: undefined,
      });
    });
  });

  it('sends only the changed fields for a user with no current plan', async () => {
    renderPage();
    await screen.findAllByText('bob@example.com');

    fireEvent.click(screen.getAllByText('Assign')[1]!);
    expect(await screen.findByText('Set the plan and status for')).toBeInTheDocument();
    // Plans load asynchronously after the modal opens — wait for the option to exist
    await screen.findByRole('option', { name: 'Starter' });

    fireEvent.change(screen.getByLabelText('Plan'), { target: { value: 'plan-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(subscriptionService.setUserSubscription).toHaveBeenCalledWith('user-2', {
        planId: 'plan-2',
        status: undefined,
        durationDays: undefined,
        note: undefined,
      });
    });
  });

  it('shows an empty state when no users match', async () => {
    vi.mocked(subscriptionService.listUserSubscriptions).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 1 },
    });
    renderPage();
    expect(await screen.findByText('No users match your filters.')).toBeInTheDocument();
  });
});
