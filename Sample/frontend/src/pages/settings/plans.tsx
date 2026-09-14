import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '@components/ui/card';
import { useAuthStore } from '@stores/auth-store';
import { subscriptionService } from '@services/subscription-service';
import { billingService } from '@services/billing-service';
import type { SubscriptionPlan } from '../../types';
import type { PaymentMethod, Invoice, AppliedCoupon } from '../../types/billing';
import {
  CheckCircle2,
  Star,
  Zap,
  Building2,
  User,
  CreditCard,
  TrendingUp,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@utils/cn';
import { formatPrice, getBillingLabel } from '@utils/format';
import { retryWithBackoff } from '@utils/retry';

// ── Import new sections ───────────────────────
import { UsageAlertsSection } from './components/UsageAlertsSection';
import { PaymentMethodsSection } from './components/PaymentMethodsSection';
import { CouponCodeInput } from './components/CouponCodeInput';
import { BillingHistorySection } from './components/BillingHistorySection';
import { PlanComparisonSection } from './components/PlanComparisonSection';
import { CancelSubscriptionModal } from './components/CancelSubscriptionModal';
import { DemoRequestModal } from './components/DemoRequestModal';
import { UsageMeter } from '@components/ui/usage-meter';
import { PricingModal } from '@components/subscription/pricing-modal';

// ── Icon Helpers ───────────────────────────────

function getPlanIcon(planType: string, name: string) {
  if (name.toLowerCase().includes('free')) return Star;
  if (name.toLowerCase().includes('annual')) return Zap;
  if (name.toLowerCase().includes('per exam')) return CreditCard;
  return planType === 'INDIVIDUAL' ? User : Building2;
}

function getPlanCardColor(name: string) {
  if (name.toLowerCase().includes('free')) return 'bg-accent-50 border-accent-200';
  if (name.toLowerCase().includes('annual')) return 'bg-primary-50 border-primary-200';
  if (name.toLowerCase().includes('per exam')) return 'bg-secondary-50 border-secondary-200';
  return 'bg-white border-border';
}

export function PlanManagementPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isOrganization = user?.userType === 'ORGANIZATION' || user?.userType === 'PLATFORM';
  const isIndividual = user?.userType === 'INDIVIDUAL';
  // Org-linked data (profile, usage, billing) requires an actual organizationId —
  // platform owners have userType PLATFORM but no org, and would otherwise 400.
  const hasOrganization = isOrganization && !!user?.organizationId;

  // ── Core State ────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [userPlans, setUserPlans] = useState<SubscriptionPlan[]>([]);
  const [orgPlans, setOrgPlans] = useState<SubscriptionPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [orgName, setOrgName] = useState<string>('');
  const [error, setError] = useState('');

  // ── Billing State ─────────────────────────────
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceTotalPages, setInvoiceTotalPages] = useState(1);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  // ── Modal State ───────────────────────────────
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  // ── Usage alerts data ─────────────────────────
  const [usageAlerts, setUsageAlerts] = useState<Array<{
    label: string;
    used: number;
    max: number;
    unit: string;
  }>>([]);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      // Keep the spinner up while retrying: `pnpm dev` boots the frontend before
      // the backend, so the first request can hit ECONNREFUSED on port 4000.
      setLoading(true);
      try {
        // Stop retrying if the component unmounts (StrictMode double-mounts effects in dev).
        await retryWithBackoff(() => loadSubscriptionData(), {
          isCancelled: () => cancelled,
        });
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Failed to load subscription data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hasOrganization && !loading) {
      loadInvoices(1);
      loadPaymentMethods();
    }
  }, [loading, hasOrganization]);

  // ── Data Loading ─────────────────────────────
  // Core data fetch (no loading/error state toggling) — shared by `loadData`
  // (Refresh) and the initial mount, which retries it with backoff while the
  // backend finishes starting up.
  const loadSubscriptionData = async () => {
    const allPlans = await subscriptionService.listPlans();
    setPlans(allPlans);
    setUserPlans(allPlans.filter((p) => p.planType === 'INDIVIDUAL'));
    setOrgPlans(allPlans.filter((p) => p.planType === 'ORGANIZATION'));

    if (hasOrganization) {
      const orgProfile = await subscriptionService.getOrgProfile();
      setOrgName(orgProfile.name);
      setCurrentPlanId(orgProfile.subscriptionPlanId);

      try {
        // Full OrgStats (cards + nested usage) come from the org stats endpoint;
        // /usage/stats alone is the flat usage shape.
        const stats = await subscriptionService.getOrgStatsById(orgProfile.id);
        setUsageStats(stats);

        // Build usage alerts
        const alerts = [];
        if (stats.usage) {
          alerts.push({
            label: 'Assessments',
            used: stats.usage.totalAssessmentsUsed,
            max: stats.usage.maxAssessments,
            unit: 'assessments',
          });
        }
        if (stats.totalUsers !== undefined) {
          alerts.push({
            label: 'Users',
            used: stats.totalUsers,
            max: orgProfile.maxUsers || 50,
            unit: 'users',
          });
        }
        if (stats.totalCandidates !== undefined) {
          alerts.push({
            label: 'Candidates',
            used: stats.totalCandidates,
            max: orgProfile.maxCandidates || 500,
            unit: 'candidates',
          });
        }
        if (stats.totalExams !== undefined) {
          alerts.push({
            label: 'Exams',
            used: stats.totalExams,
            max: stats.usage?.maxAssessments || 100,
            unit: 'exams',
          });
        }
        setUsageAlerts(alerts);
      } catch {
        // Stats may not be available
      }
    }

    // Coupon is loaded from billing stats or stored in memory
  };

  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      await loadSubscriptionData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load subscription data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Billing Data Loading ─────────────────────
  const loadInvoices = async (page: number) => {
    setInvoicesLoading(true);
    try {
      const result = await billingService.getInvoices({ page, limit: 10 });
      setInvoices(result.data);
      setInvoicePage(result.meta.page);
      setInvoiceTotalPages(result.meta.totalPages);
    } catch (err: any) {
      console.warn('Failed to load invoices:', err?.message || err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const methods = await billingService.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (err: any) {
      console.warn('Failed to load payment methods:', err?.message || err);
    }
  };

  // ── Handlers ─────────────────────────────────
  const handleUpgrade = (plan: SubscriptionPlan) => {
    if (plan.price === 0) {
      if (plan.planType === 'INDIVIDUAL') {
        navigate('/auth/register/individual');
      } else {
        navigate('/auth/register/organization');
      }
      return;
    }
    setShowPricingModal(true);
  };

  // ── Payment Method Handlers ──────────────────
  const handleAddPaymentMethod = async (data: any) => {
    await billingService.addPaymentMethod(data);
    await loadPaymentMethods();
  };

  const handleSetDefaultPaymentMethod = async (id: string) => {
    await billingService.setDefaultPaymentMethod(id);
    await loadPaymentMethods();
  };

  const handleDeletePaymentMethod = async (id: string) => {
    await billingService.deletePaymentMethod(id);
    await loadPaymentMethods();
  };

  // ── Invoice Download Handler ─────────────────
  const handleDownloadInvoice = async (invoiceId: string) => {
    const url = await billingService.getInvoiceDownloadUrl(invoiceId);
    // Use an anchor download instead of window.open: after an `await` the call
    // is outside the user-gesture stack, so popup blockers would swallow the tab.
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${invoiceId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // ── Coupon Handlers ──────────────────────────
  const handleApplyCoupon = async (code: string) => {
    const result = await billingService.applyCouponCode(code);
    setAppliedCoupon({
      code: result.code,
      discountPercent: result.discountPercent,
      discountAmount: result.discountAmount,
      validUntil: result.validUntil,
      description: result.description,
    });
  };

  const handleRemoveCoupon = async () => {
    await billingService.removeCouponCode();
    setAppliedCoupon(null);
  };

  // ── Cancel Subscription Handler ──────────────
  const handleCancelSubscription = async (payload: { reason: string; feedback?: string; cancelImmediately?: boolean }) => {
    await billingService.cancelSubscription(payload);
    setShowCancelModal(false);
    await loadData(true);
  };

  // ── Demo Request Handler ─────────────────────
  const handleDemoRequest = async (payload: any) => {
    await billingService.submitDemoRequest(payload);
    setShowDemoModal(false);
  };

  const getSubscriptionStatusBadge = () => {
    const status = user?.subscriptionStatus;
    if (!status) return null;
    const colors: Record<string, string> = {
      ACTIVE: 'bg-accent-100 text-accent-700',
      TRIAL: 'bg-blue-100 text-blue-700',
      PENDING: 'bg-yellow-50 text-yellow-800',
      EXPIRED: 'bg-red-50 text-red-700',
      CANCELLED: 'bg-red-50 text-red-700',
    };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || 'bg-surface-tertiary text-text-secondary'}`}>
        {status === 'ACTIVE' && <CheckCircle2 className="h-3 w-3" />}
        {status === 'TRIAL' && <Clock className="h-3 w-3" />}
        {status === 'PENDING' && <AlertCircle className="h-3 w-3" />}
        {(status === 'EXPIRED' || status === 'CANCELLED') && <Clock className="h-3 w-3" />}
        {status}
      </span>
    );
  };

  const isCurrentPlan = (plan: SubscriptionPlan) => {
    if (plan.id === currentPlanId) return true;
    if (isIndividual && plan.price === 0) return true;
    return false;
  };

  // ── Loading State ───────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary-500" />
          <p className="mt-3 text-sm text-text-secondary">Loading plans...</p>
        </div>
      </div>
    );
  }

  // ── Render Plan Card ────────────────────────────
  const renderPlanCard = (plan: SubscriptionPlan, index: number) => {
    const isRecommended = index === 1;
    const isCurPlan = isCurrentPlan(plan);
    const PlanIcon = getPlanIcon(plan.planType, plan.name);
    const planPrice = plan.pricePerExam ?? 0;

    return (
      <Card
        key={plan.id}
        variant="outlined"
        padding="lg"
        className={cn(
          'relative flex flex-col transition-all duration-200',
          getPlanCardColor(plan.name),
          isCurPlan && 'ring-2 ring-primary-500',
          isRecommended && !isCurPlan && 'hover:shadow-card-hover hover:border-primary-300',
        )}
      >
        {isRecommended && !isCurPlan && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-3 py-0.5 text-[11px] font-semibold text-white shadow-sm">
              <Star className="h-3 w-3" />
              BEST VALUE
            </span>
          </div>
        )}

        {isCurPlan && (
          <div className="absolute -top-3 right-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-0.5 text-[11px] font-semibold text-primary-700">
              CURRENT PLAN
            </span>
          </div>
        )}

        <div className="mb-4 text-center">
          <div className={cn(
            'mx-auto flex h-12 w-12 items-center justify-center rounded-full',
            plan.name.toLowerCase().includes('free') ? 'bg-accent-100' :
            plan.name.toLowerCase().includes('annual') ? 'bg-primary-100' :
            'bg-surface-tertiary',
          )}>
            <PlanIcon className={cn(
              'h-6 w-6',
              plan.name.toLowerCase().includes('free') ? 'text-accent-600' :
              plan.name.toLowerCase().includes('annual') ? 'text-primary-600' :
              'text-text-secondary',
            )} />
          </div>
          <h3 className="mt-3 text-lg font-semibold text-text-primary">{plan.name}</h3>
          <p className="mt-1 text-xs text-text-tertiary line-clamp-2">{plan.description}</p>
        </div>

        {/* Price */}
        <div className="mb-4 text-center">
          <span className="text-3xl font-bold text-text-primary">
            {formatPrice(plan.price, plan.currency)}
          </span>
          {plan.price > 0 && (
            <span className="ml-1 text-sm text-text-tertiary">
              {getBillingLabel(plan.billingCycle)}
            </span>
          )}
          {plan.billingCycle === 'PER_EXAM' && planPrice > 0 && (
            <p className="mt-1 text-xs text-text-tertiary">
              + RWF {planPrice.toLocaleString()} per candidate per exam
            </p>
          )}
        </div>

        {/* Limits */}
        <div className="mb-4 space-y-2 rounded-lg bg-surface-secondary p-3">
          {plan.maxUsers > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Users</span>
              <span className="font-medium text-text-primary">{plan.maxUsers}</span>
            </div>
          )}
          {plan.maxCandidates > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Candidates</span>
              <span className="font-medium text-text-primary">{plan.maxCandidates}</span>
            </div>
          )}
          {plan.maxAssessments < 999999 ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Assessments</span>
              <span className="font-medium text-text-primary">
                {plan.maxAssessments}/{plan.billingCycle === 'ANNUAL' ? 'year' : plan.billingCycle === 'PER_EXAM' ? 'unlimited' : 'month'}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Assessments</span>
              <span className="font-medium text-text-primary">Unlimited</span>
            </div>
          )}
          {plan.maxJobPostings > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Job Postings</span>
              <span className="font-medium text-text-primary">{plan.maxJobPostings}</span>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mb-6 flex-1 space-y-2">
          {plan.features.map((feature, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
              <span className="text-xs text-text-secondary">{feature}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <CardFooter className="mt-auto border-t border-border pt-4">
          {isCurPlan ? (
            <Button variant="secondary" fullWidth disabled>
              Current Plan
            </Button>
          ) : (
            <Button
              variant={isRecommended ? 'primary' : 'secondary'}
              fullWidth
              onClick={() => handleUpgrade(plan)}
            >
              {plan.price === 0 ? 'Get Started' : 'Upgrade'}
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Plans & Billing</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {isOrganization
              ? `Manage subscription for ${orgName || 'your organization'}`
              : 'Manage your individual subscription plan'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" loading={refreshing} onClick={() => loadData(true)}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Refresh
          </Button>
          <Button variant="ghost" onClick={() => navigate('/settings')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Usage Alerts Section ───────────────── */}
      {usageAlerts.length > 0 && (
        <UsageAlertsSection usage={usageAlerts} />
      )}

      {/* ── Current Status Section ─────────────── */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary-500" />
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs text-text-tertiary">Current Plan</p>
              <p className="text-lg font-semibold text-text-primary">
                {isIndividual ? 'Free Trial' : (currentPlanId ? plans.find((p) => p.id === currentPlanId)?.name || 'Custom Plan' : 'Pending Setup')}
              </p>
              <div>{getSubscriptionStatusBadge()}</div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-text-tertiary">Account Type</p>
              <div className="flex items-center gap-2">
                {isOrganization ? (
                  <Building2 className="h-4 w-4 text-primary-500" />
                ) : (
                  <User className="h-4 w-4 text-secondary-500" />
                )}
                <span className="text-sm font-medium text-text-primary">
                  {isOrganization ? 'Organization' : 'Individual'}
                </span>
              </div>
              {user?.role && (
                <p className="text-xs text-text-tertiary capitalize">{user.role.replace(/_/g, ' ').toLowerCase()}</p>
              )}
            </div>

            {isIndividual && (
              <div className="space-y-1">
                <p className="text-xs text-text-tertiary">Free Assessments Used</p>
                <p className="text-lg font-semibold text-text-primary">
                  {user?.freeAssessmentsUsed ?? 0} / {user?.maxFreeAssessments ?? 2}
                </p>
                <p className="text-xs text-text-tertiary">
                  {(user?.maxFreeAssessments ?? 2) - (user?.freeAssessmentsUsed ?? 0)} remaining
                </p>
              </div>
            )}

            {user?.subscriptionEndAt && (
              <div className="space-y-1">
                <p className="text-xs text-text-tertiary">Renewal Date</p>
                <p className="text-sm font-medium text-text-primary">
                  {new Date(user.subscriptionEndAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Cancel Subscription Button */}
          {currentPlanId && hasOrganization && (
            <div className="mt-4 border-t border-border pt-4">
              <Button
                variant="secondary"
                size="sm"
                className="text-error hover:text-error"
                onClick={() => setShowCancelModal(true)}
              >
                Cancel Subscription
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── Usage Statistics (Org) ──────────────── */}
      {isOrganization && usageStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-500" />
              Usage & Limits
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg bg-surface-secondary p-3">
                <p className="text-xs text-text-tertiary">Total Exams</p>
                <p className="mt-1 text-xl font-bold text-text-primary">{usageStats.totalExams}</p>
                <p className="text-xs text-text-tertiary">{usageStats.activeExams} active</p>
              </div>
              <div className="rounded-lg bg-surface-secondary p-3">
                <p className="text-xs text-text-tertiary">Candidates</p>
                <p className="mt-1 text-xl font-bold text-text-primary">{usageStats.totalCandidates}</p>
                <p className="text-xs text-text-tertiary">{usageStats.completedAssessments} assessments completed</p>
              </div>
              <div className="rounded-lg bg-surface-secondary p-3">
                <p className="text-xs text-text-tertiary">Average Score</p>
                <p className="mt-1 text-xl font-bold text-text-primary">{usageStats.averageScore || '-'}%</p>
                <p className="text-xs text-text-tertiary">Pass rate: {usageStats.passRate?.toFixed(1) || '-'}%</p>
              </div>
            </div>

            {usageStats.usage && (
              <>
                <div className="border-t border-border pt-4">
                  <h4 className="mb-3 text-sm font-semibold text-text-primary">Assessment Usage</h4>
                  <UsageMeter
                    used={usageStats.usage.totalAssessmentsUsed}
                    max={usageStats.usage.maxAssessments}
                    label="Assessments Used"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-white p-3">
                    <p className="text-xs text-text-tertiary">Billing Cycle</p>
                    <p className="mt-1 text-sm font-medium text-text-primary">
                      {usageStats.usage.billingCycle === 'PER_EXAM' ? 'Pay Per Exam' : usageStats.usage.billingCycle}
                    </p>
                    {usageStats.usage.pricePerExam > 0 && (
                      <p className="text-xs text-text-tertiary">
                        RWF {usageStats.usage.pricePerExam.toLocaleString()} per candidate per exam
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border bg-white p-3">
                    <p className="text-xs text-text-tertiary">Billing Summary</p>
                    <p className="mt-1 text-sm font-medium text-text-primary">
                      Pending: RWF {usageStats.usage.pendingBills.toLocaleString()}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      Total billed: RWF {usageStats.usage.totalBilled.toLocaleString()}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {/* ── Individual Free Trial Usage ─────────── */}
      {isIndividual && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-accent-500" />
              Free Trial Usage
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <UsageMeter
              used={user?.freeAssessmentsUsed ?? 0}
              max={user?.maxFreeAssessments ?? 2}
              label="Free Assessments"
            />
            <p className="text-xs text-text-tertiary">
              Upgrade to an Individual plan for full competency profiles, detailed analytics, and unlimited skill tracking.
            </p>
          </CardBody>
        </Card>
      )}

      {/* ── Organization: Payment Methods ────────── */}
      {hasOrganization && (
        <PaymentMethodsSection
          paymentMethods={paymentMethods}
          onAdd={handleAddPaymentMethod}
          onSetDefault={handleSetDefaultPaymentMethod}
          onDelete={handleDeletePaymentMethod}
        />
      )}

      {/* ── Organization: Coupon Code ─────────────── */}
      {hasOrganization && (
        <CouponCodeInput
          appliedCoupon={appliedCoupon}
          onApply={handleApplyCoupon}
          onRemove={handleRemoveCoupon}
        />
      )}

      {/* ── Available Plans ─────────────────────── */}
      <div>
        <h2 className="mb-1 text-xl font-semibold text-text-primary">Available Plans</h2>
        <p className="mb-6 text-sm text-text-secondary">
          {isOrganization
            ? "Choose the plan that fits your organization's needs"
            : 'Upgrade to unlock full features and analytics'}
        </p>

        {isIndividual && userPlans.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <User className="h-4 w-4 text-secondary-500" />
              Individual Plans
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {userPlans.map((plan, i) => renderPlanCard(plan, i))}
            </div>
          </div>
        )}

        {isOrganization && orgPlans.length > 0 && (
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Building2 className="h-4 w-4 text-primary-500" />
              Organization Plans
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {orgPlans.map((plan, i) => renderPlanCard(plan, i))}
            </div>
          </div>
        )}

        {plans.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-border p-10 text-center">
            <p className="text-sm text-text-tertiary">No subscription plans are currently available.</p>
          </div>
        )}
      </div>

      {/* ── Plan Comparison Table ─────────────── */}
      {plans.length >= 2 && (
        <PlanComparisonSection
          plans={plans}
          currentPlanId={currentPlanId}
          onUpgrade={handleUpgrade}
        />
      )}

      {/* ── Organization: Billing History ────────── */}
      {hasOrganization && (
        <BillingHistorySection
          invoices={invoices}
          loading={invoicesLoading}
          page={invoicePage}
          totalPages={invoiceTotalPages}
          onPageChange={loadInvoices}
          onDownloadInvoice={handleDownloadInvoice}
        />
      )}

      {/* ── Footer: Enterprise / Demo Request ──── */}
      {hasOrganization && (
        <Card variant="flat" padding="lg">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
              <ExternalLink className="h-6 w-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-text-primary">Need a Custom Plan?</h3>
              <p className="mt-0.5 text-xs text-text-tertiary">
                Contact us for enterprise pricing, custom assessment configurations, or to schedule a platform demo.
              </p>
            </div>
            <Button variant="primary" onClick={() => setShowDemoModal(true)}>
              Request Demo
            </Button>
          </div>
        </Card>
      )}

      {/* ── Cancel Subscription Modal ───────────── */}
      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelSubscription}
        planName={currentPlanId ? plans.find((p) => p.id === currentPlanId)?.name : undefined}
      />

      {/* ── Demo Request Modal ──────────────────── */}
      <DemoRequestModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        onSubmit={handleDemoRequest}
      />

      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
    </div>
  );
}

export default PlanManagementPage;
