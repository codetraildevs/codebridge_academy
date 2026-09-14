import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaymentHistoryPage } from '../history';
import { billingService } from '@services/billing-service';

vi.mock('@services/billing-service', () => ({
  billingService: {
    getPaymentHistory: vi.fn(),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PaymentHistoryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const mockResponse = {
  invoices: [
    {
      id: 'inv-1',
      invoiceNumber: 'INV-2026-001',
      organizationId: 'org-1',
      status: 'PAID',
      currency: 'RWF',
      totalAmount: 250000,
      amountPaid: 250000,
      issuedAt: '2026-07-01T00:00:00.000Z',
      paidAt: '2026-07-05T00:00:00.000Z',
      paymentMethodLabel: 'Mobile money (+250788123456)',
      organization: { id: 'org-1', name: 'CodeBridge Academy', code: 'CBA' },
    },
  ],
  organizations: [
    {
      organizationId: 'org-2',
      organizationName: 'Kigali Tech Institute',
      code: 'KTI',
      planName: 'Per Exam',
      billingCycle: 'PER_EXAM',
      settledCount: 14,
      settledAmount: 70000,
      lastSettledAt: '2026-07-10T00:00:00.000Z',
    },
  ],
};

describe('PaymentHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(billingService.getPaymentHistory).mockResolvedValue(mockResponse as any);
  });

  it('renders summary cards with paid invoice + settled usage totals', async () => {
    renderPage();
    // Wait for the data to load (invoice row renders from the same query)
    await screen.findByText('INV-2026-001');
    expect(screen.getByText('Paid Invoices')).toBeInTheDocument();
    expect(screen.getByText('Settled Usage')).toBeInTheDocument();
    expect(screen.getAllByText(/250,000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/70,000/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders paid invoice and settled usage rows', async () => {
    renderPage();
    expect(await screen.findByText('INV-2026-001')).toBeInTheDocument();
    expect(screen.getByText('CodeBridge Academy')).toBeInTheDocument();
    expect(screen.getByText('Mobile money (+250788123456)')).toBeInTheDocument();
    expect(screen.getByText('Kigali Tech Institute')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getAllByText('PAID').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty states when nothing has been settled', async () => {
    vi.mocked(billingService.getPaymentHistory).mockResolvedValue({
      invoices: [],
      organizations: [],
    } as any);
    renderPage();
    expect(await screen.findByText('No paid invoices yet.')).toBeInTheDocument();
    expect(screen.getByText('No settled usage bills yet.')).toBeInTheDocument();
  });
});
