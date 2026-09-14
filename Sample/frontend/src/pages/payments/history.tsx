import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { billingService, type PaidInvoice, type SettledOrgUsage } from '@services/billing-service';
import { cn } from '@utils/cn';
import { formatDate } from '@utils/format';
import {
  Loader2,
  AlertCircle,
  Inbox,
  Landmark,
  Wallet,
  FileText,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

export function PaymentHistoryPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['payment-history'],
    queryFn: () => billingService.getPaymentHistory(),
  });

  const invoices = data?.invoices ?? [];
  const orgBills = data?.organizations ?? [];

  const invoiceTotal = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const usageTotal = orgBills.reduce((sum, o) => sum + o.settledAmount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/payments')} className="mb-3">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Payments
        </Button>
        <h1 className="text-2xl font-bold text-text-primary">Payment History</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Paid invoices and settled usage bills across all organizations
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card variant="elevated">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-50">
              <FileText className="h-5 w-5 text-accent-600" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Paid Invoices</p>
              <p className="text-xl font-bold text-text-primary">
                {invoiceTotal.toLocaleString()} <span className="text-xs font-medium text-text-tertiary">RWF</span>
              </p>
              <p className="text-xs text-text-tertiary">{invoices.length} invoice{invoices.length === 1 ? '' : 's'} paid</p>
            </div>
          </div>
        </Card>
        <Card variant="elevated">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50">
              <Wallet className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Settled Usage</p>
              <p className="text-xl font-bold text-text-primary">
                {usageTotal.toLocaleString()} <span className="text-xs font-medium text-text-tertiary">RWF</span>
              </p>
              <p className="text-xs text-text-tertiary">{orgBills.length} organization{orgBills.length === 1 ? '' : 's'} with settled usage</p>
            </div>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-text-tertiary">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading payment history…
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center py-16 text-center">
          <AlertCircle className="h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">Couldn't load payment history.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          {/* Paid invoices */}
          <Card className="!p-0">
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <FileText className="h-4 w-4 text-text-tertiary" />
                Paid Invoices
              </h2>
            </div>
            {invoices.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center border-t border-border">
                <Inbox className="h-8 w-8 text-text-tertiary" />
                <p className="mt-3 text-sm text-text-secondary">No paid invoices yet.</p>
              </div>
            ) : (
              <>
                <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary border-t border-border">
                  <div className="lg:col-span-3">Invoice</div>
                  <div className="lg:col-span-3">Organization</div>
                  <div className="lg:col-span-2">Paid</div>
                  <div className="lg:col-span-2">Amount</div>
                  <div className="lg:col-span-2">Method</div>
                </div>
                <div className="divide-y divide-border border-t border-border">
                  {invoices.map((invoice: PaidInvoice) => (
                    <div key={invoice.id} className="grid grid-cols-1 gap-2 px-5 py-3.5 lg:grid-cols-12 lg:gap-4 lg:items-center">
                      <div className="lg:col-span-3 min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">{invoice.invoiceNumber}</p>
                        <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-medium text-accent-700">
                          <CheckCircle2 className="h-3 w-3" />
                          PAID
                        </span>
                      </div>
                      <div className="lg:col-span-3">
                        <p className="truncate text-sm text-text-secondary">{invoice.organization?.name ?? '—'}</p>
                        <p className="truncate text-xs text-text-tertiary">{invoice.organization?.code ?? ''}</p>
                      </div>
                      <div className="lg:col-span-2 text-xs text-text-tertiary">
                        {invoice.paidAt ? formatDate(invoice.paidAt, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                      </div>
                      <div className="lg:col-span-2 text-sm font-medium text-text-primary">
                        RWF {invoice.totalAmount.toLocaleString()}
                      </div>
                      <div className="lg:col-span-2 text-xs text-text-secondary">
                        {invoice.paymentMethodLabel ?? '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Settled usage bills */}
          <Card className="!p-0">
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Wallet className="h-4 w-4 text-text-tertiary" />
                Settled Usage Bills
              </h2>
            </div>
            {orgBills.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center border-t border-border">
                <Inbox className="h-8 w-8 text-text-tertiary" />
                <p className="mt-3 text-sm text-text-secondary">No settled usage bills yet.</p>
              </div>
            ) : (
              <>
                <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary border-t border-border">
                  <div className="lg:col-span-4">Organization</div>
                  <div className="lg:col-span-2">Plan</div>
                  <div className="lg:col-span-2">Settled Records</div>
                  <div className="lg:col-span-2">Amount</div>
                  <div className="lg:col-span-2">Last Settled</div>
                </div>
                <div className="divide-y divide-border border-t border-border">
                  {orgBills.map((bill: SettledOrgUsage) => (
                    <div key={bill.organizationId} className="grid grid-cols-1 gap-2 px-5 py-3.5 lg:grid-cols-12 lg:gap-4 lg:items-center">
                      <div className="lg:col-span-4 min-w-0">
                        <div className="flex items-center gap-2">
                          <Landmark className="h-4 w-4 shrink-0 text-text-tertiary" />
                          <p className="truncate text-sm font-medium text-text-primary">{bill.organizationName}</p>
                        </div>
                        <p className="pl-6 truncate text-xs text-text-tertiary">{bill.code}</p>
                      </div>
                      <div className="lg:col-span-2">
                        <p className="truncate text-sm text-text-secondary">{bill.planName ?? 'No plan'}</p>
                        <p className="text-xs text-text-tertiary">
                          {bill.billingCycle === 'PER_EXAM' ? 'Per exam' : bill.billingCycle ?? ''}
                        </p>
                      </div>
                      <div className="lg:col-span-2 text-sm text-text-secondary">{bill.settledCount}</div>
                      <div className="lg:col-span-2 text-sm font-medium text-text-primary">
                        RWF {bill.settledAmount.toLocaleString()}
                      </div>
                      <div className="lg:col-span-2 text-xs text-text-tertiary">
                        {bill.lastSettledAt ? formatDate(bill.lastSettledAt, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export default PaymentHistoryPage;
