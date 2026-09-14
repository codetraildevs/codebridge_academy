import { api } from './api';
import type { PaymentMethod, Invoice } from '../types/billing';

export interface BillingStats {
  totalBilled: number;
  totalPending: number;
  totalPaid: number;
  pendingInvoices: number;
  lastInvoiceDate: string | null;
  currentBillingPeriod: {
    start: string;
    end: string;
  } | null;
}

export interface DemoRequestPayload {
  organizationName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  companySize?: string;
  message?: string;
}

// ── Platform Owner: pending payments ──

export interface PendingPaymentInvoice {
  id: string;
  invoiceNumber: string;
  organizationId: string | null;
  status: 'PENDING' | 'OVERDUE';
  currency: string;
  totalAmount: number;
  amountPaid: number;
  issuedAt: string;
  dueAt: string | null;
  organization: { id: string; name: string; code: string } | null;
}

export interface PendingOrgUsage {
  organizationId: string;
  organizationName: string;
  code: string | null;
  planName: string | null;
  billingCycle: string | null;
  pendingCount: number;
  pendingAmount: number;
}

export interface PendingPaymentsResponse {
  invoices: PendingPaymentInvoice[];
  organizations: PendingOrgUsage[];
}

// ── Platform Owner: settled payment history ──

export interface PaidInvoice {
  id: string;
  invoiceNumber: string;
  organizationId: string | null;
  status: string;
  currency: string;
  totalAmount: number;
  amountPaid: number;
  issuedAt: string;
  paidAt: string | null;
  paymentMethodLabel: string | null;
  organization: { id: string; name: string; code: string } | null;
}

export interface SettledOrgUsage {
  organizationId: string;
  organizationName: string;
  code: string | null;
  planName: string | null;
  billingCycle: string | null;
  settledCount: number;
  settledAmount: number;
  lastSettledAt: string | null;
}

export interface PaymentHistoryResponse {
  invoices: PaidInvoice[];
  organizations: SettledOrgUsage[];
}

export const billingService = {
  // ── Payment Methods ─────────────────────────
  async getPaymentMethods(organizationId?: string): Promise<PaymentMethod[]> {
    // Platform owners pass an organizationId to list another org's methods
    // (e.g. when confirming a payment); everyone else gets their own.
    const response = await api.get('/billing/payment-methods', {
      params: organizationId ? { organizationId } : {},
    });
    return response.data.data;
  },

  async addPaymentMethod(payload: {
    type: 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER';
    cardNumber?: string;
    expMonth?: number;
    expYear?: number;
    cvc?: string;
    cardholderName?: string;
    phoneNumber?: string;
    isDefault?: boolean;
  }): Promise<PaymentMethod> {
    const response = await api.post('/billing/payment-methods', payload);
    return response.data.data;
  },

  async setDefaultPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    const response = await api.patch(`/billing/payment-methods/${paymentMethodId}/default`);
    return response.data.data;
  },

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    await api.delete(`/billing/payment-methods/${paymentMethodId}`);
  },

  // ── Invoices / Billing History ──────────────
  async getInvoices(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ data: Invoice[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const response = await api.get('/billing/invoices', { params });
    return response.data;
  },

  async getInvoiceDownloadUrl(invoiceId: string): Promise<string> {
    const response = await api.get(`/billing/invoices/${invoiceId}/download`);
    return response.data.data.url;
  },

  async getBillingStats(): Promise<BillingStats> {
    const response = await api.get('/billing/stats');
    return response.data.data;
  },

  // ── Subscription Actions ────────────────────
  async cancelSubscription(payload: {
    reason: string;
    feedback?: string;
    cancelImmediately?: boolean;
  }): Promise<{ cancelAt: string; status: string }> {
    const response = await api.post('/subscriptions/cancel', payload);
    return response.data.data;
  },

  async reactivateSubscription(): Promise<{ status: string }> {
    const response = await api.post('/subscriptions/reactivate');
    return response.data.data;
  },

  async changePlan(planId: string): Promise<{ status: string; newPlanId: string }> {
    const response = await api.post('/subscriptions/change-plan', { planId });
    return response.data.data;
  },

  // ── Coupon / Promo Code ─────────────────────
  async applyCouponCode(code: string): Promise<{
    code: string;
    discountPercent: number;
    discountAmount?: number;
    validUntil: string;
    description: string;
  }> {
    const response = await api.post('/billing/coupons/apply', { code });
    return response.data.data;
  },

  async removeCouponCode(): Promise<void> {
    await api.delete('/billing/coupons/current');
  },

  // ── Trial ────────────────────────────────────
  async startTrial(planId: string): Promise<{
    planId: string;
    planName: string;
    planType: string;
    subscriptionStatus: string;
    trialStartAt: string;
    trialEndAt: string;
    trialDurationDays: number;
    message: string;
  }> {
    const response = await api.post('/subscriptions/start-trial', { planId });
    return response.data.data;
  },

  // ── Platform Owner: payment completion ──

  async listPendingPayments(status?: 'PENDING' | 'OVERDUE'): Promise<PendingPaymentsResponse> {
    const response = await api.get('/billing/payments', { params: status ? { status } : {} });
    return response.data;
  },

  async getPaymentHistory(): Promise<PaymentHistoryResponse> {
    const response = await api.get('/billing/payments/history');
    return response.data;
  },

  async completePayment(payload: {
    organizationId?: string;
    invoiceId?: string;
    paymentMethodId?: string;
    amount?: number;
    notes?: string;
  }): Promise<{
    organizationId: string;
    invoiceId: string | null;
    subscriptionStatus: string;
    subscriptionEndAt: string;
    recordsSettled: number;
    amountSettled: number | null;
    paymentMethodLabel: string | null;
  }> {
    const response = await api.post('/billing/payments/complete', payload);
    return response.data.data;
  },

  // ── Demo Request ────────────────────────────
  async submitDemoRequest(payload: DemoRequestPayload): Promise<{ requestId: string; message: string }> {
    const response = await api.post('/demo-requests', payload);
    return response.data.data;
  },
};

export default billingService;
