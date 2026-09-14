// ── Payment Method Types ─────────────────────

export type PaymentMethodType = 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER';

export interface PaymentMethod {
  id: string;
  organizationId?: string;
  userId?: string;
  type: PaymentMethodType;
  last4?: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
  cardholderName?: string;
  phoneNumber?: string;
  bankName?: string;
  isDefault: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Invoice Types ─────────────────────────────

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  organizationId?: string;
  userId?: string;
  status: InvoiceStatus;
  currency: string;
  subtotal: number;
  discountAmount: number;
  discountDescription?: string;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  lineItems: InvoiceLineItem[];
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  issuedAt: string;
  dueAt?: string;
  paidAt?: string;
  paymentMethodId?: string;
  paymentMethodLabel?: string;
  downloadUrl?: string;
  createdAt: string;
}

// ── Coupon Types ──────────────────────────────

export interface CouponCode {
  id: string;
  code: string;
  description: string;
  discountPercent: number;
  discountAmount?: number;
  maxRedemptions: number;
  currentRedemptions: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  minPlanType?: string;
  createdAt: string;
}

export interface AppliedCoupon {
  code: string;
  discountPercent: number;
  discountAmount?: number;
  validUntil: string;
  description: string;
}

// ── Cancellation Types ────────────────────────

export interface CancellationReason {
  id: string;
  label: string;
  description: string;
}

export const CANCELLATION_REASONS: CancellationReason[] = [
  {
    id: 'too_expensive',
    label: 'Too expensive',
    description: 'The current pricing does not fit my budget',
  },
  {
    id: 'missing_features',
    label: 'Missing features',
    description: 'The platform lacks features I need',
  },
  {
    id: 'not_using',
    label: 'Not using enough',
    description: 'I am not using the platform enough to justify the cost',
  },
  {
    id: 'switching',
    label: 'Switching to competitor',
    description: 'I found a better alternative',
  },
  {
    id: 'no_longer_needed',
    label: 'No longer needed',
    description: 'My organization no longer needs assessment services',
  },
  {
    id: 'technical_issues',
    label: 'Technical issues',
    description: 'Experiencing persistent technical problems',
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Another reason not listed above',
  },
];
