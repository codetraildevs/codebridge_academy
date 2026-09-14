import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SubscriptionHistoryPage } from '../history';
import { subscriptionService } from '@services/subscription-service';

vi.mock('@services/subscription-service', () => ({
  subscriptionService: {
    getOrganizationSubscriptionHistory: vi.fn(),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/subscriptions/organizations/org-1/history']}>
        <Routes>
          <Route path="/subscriptions/organizations/:organizationId/history" element={<SubscriptionHistoryPage />} />
          <Route path="/subscriptions" element={<div>Org List</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const mockResponse = {
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
    {
      id: 'change-2',
      action: 'CANCEL',
      status: 'COMPLETED',
      previousPlanId: null,
      newPlanId: null,
      previousPlanName: null,
      newPlanName: null,
      reason: 'Non-payment',
      feedback: 'Improve invoicing',
      cancelImmediately: true,
      cancelAt: '2026-08-01T10:00:00.000Z',
      createdAt: '2026-08-01T10:00:00.000Z',
    },
  ],
};

describe('SubscriptionHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(subscriptionService.getOrganizationSubscriptionHistory).mockResolvedValue(mockResponse as any);
  });

  it('renders the org header and summary counts', async () => {
    renderPage();
    expect(await screen.findByText('CodeBridge Academy · CBA')).toBeInTheDocument();
    expect(screen.getByText('Total Changes')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // total
    // Plan Changes and Cancellations each show 1
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2);
  });

  it('renders change entries with plan transition and cancel details', async () => {
    renderPage();
    expect(await screen.findByText('Plan changed')).toBeInTheDocument();
    expect(screen.getByText('Organization Pro → Enterprise')).toBeInTheDocument();
    expect(screen.getByText('Subscription cancelled')).toBeInTheDocument();
    expect(screen.getByText('Cancelled immediately')).toBeInTheDocument();
    // Feedback shown for cancellations
    expect(screen.getByText(/Improve invoicing/)).toBeInTheDocument();
  });

  it('shows an empty state when there is no history', async () => {
    vi.mocked(subscriptionService.getOrganizationSubscriptionHistory).mockResolvedValue({
      organization: { id: 'org-1', name: 'CodeBridge Academy', code: 'CBA' },
      data: [],
    } as any);
    renderPage();
    expect(await screen.findByText(/No subscription changes recorded for this organization yet/)).toBeInTheDocument();
  });
});
