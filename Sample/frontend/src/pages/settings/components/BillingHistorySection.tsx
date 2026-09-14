import { useState } from 'react';
import { Button } from '@components/ui/button';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { cn } from '@utils/cn';
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Ban,
  ArrowUpRight,
} from 'lucide-react';
import type { Invoice, InvoiceStatus } from '../../../types/billing';

interface BillingHistorySectionProps {
  invoices: Invoice[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onDownloadInvoice: (invoiceId: string) => Promise<void>;
}

const STATUS_CONFIG: Record<InvoiceStatus, {
  label: string;
  color: string;
  icon: typeof CheckCircle2;
}> = {
  DRAFT: { label: 'Draft', color: 'bg-surface-tertiary text-text-secondary', icon: Clock },
  PENDING: { label: 'Pending', color: 'bg-yellow-50 text-yellow-700', icon: Clock },
  PAID: { label: 'Paid', color: 'bg-accent-100 text-accent-700', icon: CheckCircle2 },
  OVERDUE: { label: 'Overdue', color: 'bg-red-50 text-red-700', icon: AlertCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600', icon: XCircle },
  REFUNDED: { label: 'Refunded', color: 'bg-blue-50 text-blue-700', icon: ArrowUpRight },
};

function formatCurrency(amount: number, currency: string) {
  return `${currency === 'RWF' ? 'RWF' : ''} ${amount.toLocaleString()}`;
}

export function BillingHistorySection({
  invoices,
  loading,
  page,
  totalPages,
  onPageChange,
  onDownloadInvoice,
}: BillingHistorySectionProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (invoiceId: string) => {
    setDownloadingId(invoiceId);
    try {
      await onDownloadInvoice(invoiceId);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Card id="billing-history">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-500" />
            Billing History
          </CardTitle>
          {loading && (
            <RefreshCw className="h-4 w-4 animate-spin text-text-tertiary" />
          )}
        </div>
      </CardHeader>
      <CardBody>
        {invoices.length === 0 && !loading ? (
          <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-text-tertiary" />
            <p className="text-sm text-text-secondary">No invoices yet</p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              Your billing history will appear here once you upgrade to a paid plan
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 pr-4 text-xs font-medium text-text-tertiary uppercase tracking-wider">Invoice</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-text-tertiary uppercase tracking-wider">Date</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-text-tertiary uppercase tracking-wider">Amount</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-text-tertiary uppercase tracking-wider">Status</th>
                    <th className="pb-2 text-xs font-medium text-text-tertiary uppercase tracking-wider" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const statusConfig = STATUS_CONFIG[inv.status];
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-border transition-colors hover:bg-surface-secondary"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-text-tertiary" />
                            <span className="font-medium text-text-primary">{inv.invoiceNumber}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-text-secondary">
                            {new Date(inv.issuedAt).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="font-semibold text-text-primary">
                            {formatCurrency(inv.totalAmount, inv.currency)}
                          </span>
                          {inv.status === 'PAID' && inv.amountPaid < inv.totalAmount && (
                            <span className="ml-1 text-xs text-text-tertiary">
                              ({formatCurrency(inv.amountPaid, inv.currency)} paid)
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                            statusConfig.color,
                          )}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={downloadingId === inv.id}
                            onClick={() => handleDownload(inv.id)}
                            title="Download invoice"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <p className="text-xs text-text-tertiary">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => onPageChange(pageNum)}
                        className="min-w-[32px]"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {totalPages <= 1 && invoices.length > 0 && (
              <p className="mt-3 text-center text-xs text-text-tertiary">
                {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
              </p>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}

export default BillingHistorySection;
