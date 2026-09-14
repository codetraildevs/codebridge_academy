import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { billingService, type PendingOrgUsage, type PendingPaymentInvoice } from '@services/billing-service';
import type { PaymentMethod } from '../../types/billing';
import { cn } from '@utils/cn';
import { formatDate } from '@utils/format';
import {
  Loader2,
  AlertCircle,
  Inbox,
  Landmark,
  Wallet,
  FileText,
  CheckCircle2,
  X,
  ThumbsUp,
} from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-800',
  OVERDUE: 'bg-red-50 text-red-700',
  PAID: 'bg-accent-100 text-accent-700',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status] ?? 'bg-surface-tertiary text-text-tertiary',
      )}
    >
      {status}
    </span>
  );
}

interface ConfirmPaymentTarget {
  organizationId: string;
  organizationName: string;
  invoice?: PendingPaymentInvoice;
  pendingAmount: number;
}

/** Display label for a payment method (mirrors the billing settings page). */
function paymentMethodLabel(pm: PaymentMethod): string {
  switch (pm.type) {
    case 'CARD':
      return `${pm.brand || 'Card'} ending in ${pm.last4}`;
    case 'MOBILE_MONEY':
      return `Mobile money (${pm.phoneNumber || 'N/A'})`;
    case 'BANK_TRANSFER':
      return `Bank transfer${pm.bankName ? ` — ${pm.bankName}` : ''}`;
    default:
      return 'Payment method';
  }
}

// ── Confirm Payment Modal ───────────────────────

function ConfirmPaymentModal({
  target,
  onClose,
  onConfirm,
}: {
  target: ConfirmPaymentTarget;
  onClose: () => void;
  onConfirm: (payload: { organizationId: string; invoiceId?: string; paymentMethodId?: string; amount?: number; notes?: string }) => Promise<unknown>;
}) {
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [amount, setAmount] = useState(String(target.invoice ? target.invoice.totalAmount : target.pendingAmount || ''));
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // The org's payment methods (platform owner listing) — only fetched while open.
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['org-payment-methods', target.organizationId],
    queryFn: () => billingService.getPaymentMethods(target.organizationId),
    enabled: !done,
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await onConfirm({
        organizationId: target.organizationId,
        invoiceId: target.invoice?.id,
        paymentMethodId: paymentMethodId || undefined,
        amount: amount ? Number(amount) : undefined,
        notes: notes.trim() || undefined,
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to confirm payment');
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setDone(false);
    setAmount('');
    setNotes('');
    setError('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) handleClose(); }}
    >
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            {done ? (
              <CheckCircle2 className="h-5 w-5 text-accent-500" />
            ) : (
              <Wallet className="h-5 w-5 text-primary-500" />
            )}
            <h2 className="text-lg font-semibold text-text-primary">
              {done ? 'Payment Confirmed' : 'Confirm Payment'}
            </h2>
          </div>
          {!done && (
            <button onClick={handleClose} className="rounded-lg p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {done ? (
          <div className="space-y-4 px-6 py-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-100">
              <ThumbsUp className="h-8 w-8 text-accent-600" />
            </div>
            <p className="text-lg font-semibold text-text-primary">Payment received</p>
            <p className="text-sm text-text-secondary">
              {target.organizationName}'s subscription has been activated
              {target.invoice ? ` and invoice ${target.invoice.invoiceNumber} marked paid` : ''}.
            </p>
            <Button variant="primary" onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <>
            <div className="space-y-4 px-6 py-4">
              <div className="rounded-lg bg-surface-secondary p-3">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-text-tertiary" />
                  <p className="text-sm font-medium text-text-primary">{target.organizationName}</p>
                </div>
                {target.invoice && (
                  <p className="mt-1 pl-6 text-xs text-text-tertiary">
                    Invoice {target.invoice.invoiceNumber} · due {target.invoice.dueAt ? formatDate(target.invoice.dueAt, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-primary">Payment method</label>
                <select
                  value={paymentMethodId}
                  onChange={(e) => setPaymentMethodId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  aria-label="Payment method"
                >
                  <option value="">No payment method recorded</option>
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>{paymentMethodLabel(pm)}</option>
                  ))}
                </select>
                {paymentMethods.length === 0 && (
                  <p className="mt-1 text-xs text-text-tertiary">
                    No payment methods on file for this organization — you can still confirm the payment.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-primary">Amount received (RWF)</label>
                <Input
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-primary">
                  Notes <span className="text-text-tertiary">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Payment reference, channel (MTN MoMo, bank transfer…), etc."
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <Button variant="secondary" onClick={handleClose} disabled={submitting}>Cancel</Button>
              <Button variant="success" loading={submitting} onClick={handleSubmit}>
                Confirm Payment
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────

export function PaymentsPage() {
  const queryClient = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState<ConfirmPaymentTarget | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pending-payments'],
    queryFn: () => billingService.listPendingPayments(),
  });

  const confirmMutation = useMutation({
    mutationFn: (payload: Parameters<typeof billingService.completePayment>[0]) => billingService.completePayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
    },
  });

  const invoices = data?.invoices ?? [];
  const orgBills = data?.organizations ?? [];

  const invoiceTotal = invoices.reduce((sum, i) => sum + (i.totalAmount - i.amountPaid), 0);
  const usageTotal = orgBills.reduce((sum, o) => sum + o.pendingAmount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Payments</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Outstanding invoices and pending usage bills — confirm received payments to activate subscriptions
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card variant="elevated">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow-50">
              <FileText className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Pending Invoices</p>
              <p className="text-xl font-bold text-text-primary">
                {invoiceTotal.toLocaleString()} <span className="text-xs font-medium text-text-tertiary">RWF</span>
              </p>
              <p className="text-xs text-text-tertiary">{invoices.length} invoice{invoices.length === 1 ? '' : 's'} awaiting payment</p>
            </div>
          </div>
        </Card>
        <Card variant="elevated">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50">
              <Wallet className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Pending Usage Bills</p>
              <p className="text-xl font-bold text-text-primary">
                {usageTotal.toLocaleString()} <span className="text-xs font-medium text-text-tertiary">RWF</span>
              </p>
              <p className="text-xs text-text-tertiary">{orgBills.length} organization{orgBills.length === 1 ? '' : 's'} with per-exam usage pending</p>
            </div>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-text-tertiary">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading payments…
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center py-16 text-center">
          <AlertCircle className="h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">Couldn't load payment data.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          {/* Pending invoices */}
          <Card className="!p-0">
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <FileText className="h-4 w-4 text-text-tertiary" />
                Pending Invoices
              </h2>
            </div>
            {invoices.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <Inbox className="h-8 w-8 text-text-tertiary" />
                <p className="mt-3 text-sm text-text-secondary">No pending invoices.</p>
              </div>
            ) : (
              <>
                <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary border-t border-border">
                  <div className="lg:col-span-3">Invoice</div>
                  <div className="lg:col-span-3">Organization</div>
                  <div className="lg:col-span-2">Due</div>
                  <div className="lg:col-span-2">Amount</div>
                  <div className="lg:col-span-2">Actions</div>
                </div>
                <div className="divide-y divide-border border-t border-border">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="grid grid-cols-1 gap-2 px-5 py-3.5 lg:grid-cols-12 lg:gap-4 lg:items-center">
                      <div className="lg:col-span-3 min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">{invoice.invoiceNumber}</p>
                        <div className="mt-0.5"><StatusBadge status={invoice.status} /></div>
                      </div>
                      <div className="lg:col-span-3">
                        <p className="truncate text-sm text-text-secondary">{invoice.organization?.name ?? '—'}</p>
                        <p className="truncate text-xs text-text-tertiary">{invoice.organization?.code ?? ''}</p>
                      </div>
                      <div className="lg:col-span-2 text-xs text-text-tertiary">
                        {invoice.dueAt ? formatDate(invoice.dueAt, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                      </div>
                      <div className="lg:col-span-2 text-sm font-medium text-text-primary">
                        RWF {(invoice.totalAmount - invoice.amountPaid).toLocaleString()}
                      </div>
                      <div className="lg:col-span-2">
                        {invoice.organization ? (
                          <Button
                            variant="success"
                            size="xs"
                            onClick={() =>
                              setConfirmTarget({
                                organizationId: invoice.organizationId ?? invoice.organization!.id,
                                organizationName: invoice.organization!.name,
                                invoice,
                                pendingAmount: invoice.totalAmount - invoice.amountPaid,
                              })
                            }
                          >
                            Confirm Payment
                          </Button>
                        ) : (
                          <span className="text-xs text-text-tertiary">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Pending usage bills */}
          <Card className="!p-0">
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Wallet className="h-4 w-4 text-text-tertiary" />
                Pending Usage Bills
              </h2>
            </div>
            {orgBills.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center border-t border-border">
                <Inbox className="h-8 w-8 text-text-tertiary" />
                <p className="mt-3 text-sm text-text-secondary">No pending per-exam usage bills.</p>
              </div>
            ) : (
              <>
                <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary border-t border-border">
                  <div className="lg:col-span-4">Organization</div>
                  <div className="lg:col-span-2">Plan</div>
                  <div className="lg:col-span-2">Pending Records</div>
                  <div className="lg:col-span-2">Amount</div>
                  <div className="lg:col-span-2">Actions</div>
                </div>
                <div className="divide-y divide-border border-t border-border">
                  {orgBills.map((bill: PendingOrgUsage) => (
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
                      <div className="lg:col-span-2 text-sm text-text-secondary">{bill.pendingCount}</div>
                      <div className="lg:col-span-2 text-sm font-medium text-text-primary">
                        RWF {bill.pendingAmount.toLocaleString()}
                      </div>
                      <div className="lg:col-span-2">
                        <Button
                          variant="success"
                          size="xs"
                          onClick={() =>
                            setConfirmTarget({
                              organizationId: bill.organizationId,
                              organizationName: bill.organizationName,
                              pendingAmount: bill.pendingAmount,
                            })
                          }
                        >
                          Settle Bill
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </>
      )}

      {confirmTarget && (
        <ConfirmPaymentModal
          target={confirmTarget}
          onClose={() => setConfirmTarget(null)}
          onConfirm={(payload) => confirmMutation.mutateAsync(payload)}
        />
      )}
    </div>
  );
}

export default PaymentsPage;
