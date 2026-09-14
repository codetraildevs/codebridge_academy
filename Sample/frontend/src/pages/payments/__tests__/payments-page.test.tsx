import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaymentsPage } from '../index';
import { billingService } from '@services/billing-service';

vi.mock('@services/billing-service', () => ({
  billingService: {
    listPendingPayments: vi.fn(),
    getPaymentMethods: vi.fn(),
    completePayment: vi.fn(),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PaymentsPage />
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
      status: 'PENDING',
      currency: 'RWF',
      totalAmount: 250000,
      amountPaid: 0,
      issuedAt: '2026-07-01T00:00:00.000Z',
      dueAt: '2026-08-01T00:00:00.000Z',
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
      pendingCount: 14,
      pendingAmount: 70000,
    },
  ],
};

describe('PaymentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(billingService.listPendingPayments).mockResolvedValue(mockResponse as any);
    vi.mocked(billingService.getPaymentMethods).mockResolvedValue([
      { id: 'pm-1', type: 'MOBILE_MONEY', phoneNumber: '+250788123456', isDefault: true, isVerified: false, createdAt: '', updatedAt: '' },
      { id: 'pm-2', type: 'BANK_TRANSFER', bankName: 'BK', isDefault: false, isVerified: false, createdAt: '', updatedAt: '' },
    ] as any);
    vi.mocked(billingService.completePayment).mockResolvedValue({
      organizationId: 'org-1',
      invoiceId: 'inv-1',
      subscriptionStatus: 'ACTIVE',
      subscriptionEndAt: '2026-08-17T00:00:00.000Z',
      recordsSettled: 0,
      amountSettled: 250000,
      paymentMethodLabel: null,
    });
  });

  it('renders summary cards with pending invoice + usage totals', async () => {
    renderPage();
    await screen.findByText('Payments');

    expect(await screen.findByText('Pending Invoices')).toBeInTheDocument();
    // Section heading + summary card both say "Pending Usage Bills"
    expect(screen.getAllByText('Pending Usage Bills').length).toBeGreaterThanOrEqual(1);
    // Invoice total (250,000) appears in the summary card and the invoice row
    expect(screen.getAllByText(/250,000/).length).toBeGreaterThanOrEqual(1);
    // Usage total (70,000) appears in the summary card and the usage row
    expect(screen.getAllByText(/70,000/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders pending invoice and usage bill rows', async () => {
    renderPage();
    await screen.findByText('CodeBridge Academy');
    expect(screen.getByText('INV-2026-001')).toBeInTheDocument();
    expect(screen.getByText('Kigali Tech Institute')).toBeInTheDocument();
    // Usage row shows record count + amount
    expect(screen.getByText('14')).toBeInTheDocument();
    // Invoice status badge
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('confirms a payment from the invoice row and shows the success view', async () => {
    renderPage();
    await screen.findByText('INV-2026-001');

    fireEvent.click(screen.getAllByText('Confirm Payment')[0]!);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Amount received (RWF)')).toBeInTheDocument();

    // The org's payment methods load into the select — pick the mobile money method
    await within(dialog).findByRole('option', { name: 'Mobile money (+250788123456)' });
    fireEvent.change(within(dialog).getByLabelText('Payment method'), { target: { value: 'pm-1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm Payment' }));

    await waitFor(() => {
      expect(billingService.getPaymentMethods).toHaveBeenCalledWith('org-1');
      expect(billingService.completePayment).toHaveBeenCalledWith({
        organizationId: 'org-1',
        invoiceId: 'inv-1',
        paymentMethodId: 'pm-1',
        amount: 250000,
        notes: undefined,
      });
    });
    expect(await screen.findByText('Payment received')).toBeInTheDocument();
    expect(screen.getByText(/CodeBridge Academy's subscription has been activated/)).toBeInTheDocument();
  });

  it('settles a usage bill by organization', async () => {
    renderPage();
    await screen.findByText('Kigali Tech Institute');

    fireEvent.click(screen.getByText('Settle Bill'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Amount received (RWF)')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm Payment' }));

    await waitFor(() => {
      expect(billingService.completePayment).toHaveBeenCalledWith({
        organizationId: 'org-2',
        invoiceId: undefined,
        amount: 70000,
        notes: undefined,
      });
    });
  });

  it('shows an empty state when there are no pending payments', async () => {
    vi.mocked(billingService.listPendingPayments).mockResolvedValue({
      invoices: [],
      organizations: [],
    } as any);
    renderPage();
    expect(await screen.findByText('No pending invoices.')).toBeInTheDocument();
    expect(screen.getByText('No pending per-exam usage bills.')).toBeInTheDocument();
  });
});
