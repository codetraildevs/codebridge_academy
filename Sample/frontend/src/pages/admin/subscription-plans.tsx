import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { adminService } from '@services/admin-service';
import { subscriptionService } from '@services/subscription-service';
import type { SubscriptionPlan } from '../../types';
import {
  CreditCard,
  RefreshCw,
  AlertCircle,
  Settings2,
  CheckCircle2,
  XCircle,
  User,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@utils/cn';
import { formatPrice, getBillingLabel } from '@utils/format';

export function AdminSubscriptionPlansPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await subscriptionService.listPlans();
      setPlans(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      await adminService.updatePlan(plan.id, { isActive: !plan.isActive });
      loadPlans();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update plan');
    }
  };

  const individualPlans = plans.filter((p) => p.planType === 'INDIVIDUAL');
  const orgPlans = plans.filter((p) => p.planType === 'ORGANIZATION');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Subscription Plans</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage subscription plans and environment configurations
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadPlans}>
          <RefreshCw className="mr-1 h-3 w-3" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <>
          {/* Individual Plans */}
          {individualPlans.length > 0 && (
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <User className="h-4 w-4 text-secondary-500" />
                Individual Plans
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {individualPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onToggleActive={handleToggleActive}
                    onEditEnv={() => navigate(`/admin/subscription-plans/${plan.id}/environment`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Organization Plans */}
          {orgPlans.length > 0 && (
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Building2 className="h-4 w-4 text-primary-500" />
                Organization Plans
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {orgPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onToggleActive={handleToggleActive}
                    onEditEnv={() => navigate(`/admin/subscription-plans/${plan.id}/environment`)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  onToggleActive,
  onEditEnv,
}: {
  plan: SubscriptionPlan;
  onToggleActive: (plan: SubscriptionPlan) => void;
  onEditEnv: () => void;
}) {
  return (
    <Card
      variant="outlined"
      padding="md"
      className={cn(
        'transition-all',
        !plan.isActive && 'opacity-60',
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{plan.name}</CardTitle>
          <Badge variant={plan.isActive ? 'success' : 'neutral'} size="sm">
            {plan.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        {/* Price */}
        <div>
          <span className="text-2xl font-bold text-text-primary">
            {formatPrice(plan.price, plan.currency)}
          </span>
          <span className="ml-1 text-sm text-text-tertiary">
            /{getBillingLabel(plan.billingCycle)}
          </span>
        </div>

        {/* Limits */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-surface-secondary px-2 py-1.5">
            <span className="text-text-tertiary">Users: </span>
            <span className="font-medium">{plan.maxUsers}</span>
          </div>
          <div className="rounded bg-surface-secondary px-2 py-1.5">
            <span className="text-text-tertiary">Candidates: </span>
            <span className="font-medium">{plan.maxCandidates}</span>
          </div>
          <div className="rounded bg-surface-secondary px-2 py-1.5">
            <span className="text-text-tertiary">Assessments: </span>
            <span className="font-medium">{plan.maxAssessments >= 999999 ? '∞' : plan.maxAssessments}</span>
          </div>
          <div className="rounded bg-surface-secondary px-2 py-1.5">
            <span className="text-text-tertiary">Jobs: </span>
            <span className="font-medium">{plan.maxJobPostings}</span>
          </div>
        </div>

        {/* Features preview */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-text-tertiary">Features ({plan.features.length})</p>
          <div className="max-h-24 overflow-y-auto space-y-0.5">
            {plan.features.slice(0, 6).map((f, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-accent-500" />
                <span className="text-xs text-text-secondary">{f}</span>
              </div>
            ))}
            {plan.features.length > 6 && (
              <p className="text-xs text-text-tertiary">+{plan.features.length - 6} more</p>
            )}
          </div>
        </div>
      </CardBody>
      <CardFooter>
        <div className="flex w-full gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={onEditEnv}
          >
            <Settings2 className="mr-1 h-3.5 w-3.5" />
            Environment
          </Button>
          <Button
            variant={plan.isActive ? 'ghost' : 'primary'}
            size="sm"
            onClick={() => onToggleActive(plan)}
          >
            {plan.isActive ? (
              <><XCircle className="mr-1 h-3.5 w-3.5" /> Disable</>
            ) : (
              <><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Enable</>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default AdminSubscriptionPlansPage;
