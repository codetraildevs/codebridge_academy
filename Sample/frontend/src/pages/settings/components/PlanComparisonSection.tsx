import { useState } from 'react';
import { Button } from '@components/ui/button';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { cn } from '@utils/cn';
import { formatPrice, getBillingLabel } from '@utils/format';
import {
  Table2,
  Check,
  X as XIcon,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { SubscriptionPlan } from '../../../types';

interface PlanComparisonSectionProps {
  plans: SubscriptionPlan[];
  currentPlanId: string | null;
  onUpgrade: (plan: SubscriptionPlan) => void;
}

interface ComparisonRow {
  label: string;
  tooltip?: string;
  getValue: (plan: SubscriptionPlan) => string | boolean | number;
  isHighlight?: (plan: SubscriptionPlan) => boolean;
}



const COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: 'Monthly Price',
    getValue: (p) => {
      if (p.price === 0) return 'Free';
      return formatPrice(p.price, p.currency);
    },
    isHighlight: (p) => p.price > 0,
  },
  {
    label: 'Billing Cycle',
    getValue: (p) => p.billingCycle === 'PER_EXAM' ? 'Pay Per Exam' :
      p.billingCycle.charAt(0) + p.billingCycle.slice(1).toLowerCase(),
  },
  {
    label: 'Max Users',
    getValue: (p) => p.maxUsers > 0 ? p.maxUsers : 'N/A',
    isHighlight: (p) => p.maxUsers > 0,
  },
  {
    label: 'Max Candidates',
    getValue: (p) => p.maxCandidates >= 999999 ? 'Unlimited' : p.maxCandidates,
    isHighlight: (p) => p.maxCandidates >= 999999,
  },
  {
    label: 'Max Assessments',
    getValue: (p) => p.maxAssessments >= 999999 ? 'Unlimited' : `${p.maxAssessments}${p.billingCycle === 'ANNUAL' ? '/yr' : p.billingCycle === 'PER_EXAM' ? '' : '/mo'}`,
    isHighlight: (p) => p.maxAssessments >= 999999,
  },
  {
    label: 'Job Postings',
    getValue: (p) => p.maxJobPostings > 0 ? p.maxJobPostings : 'N/A',
    isHighlight: (p) => p.maxJobPostings > 0,
  },
  {
    label: 'Price Per Exam',
    getValue: (p) => {
      if (p.pricePerExam && p.pricePerExam > 0) return `RWF ${p.pricePerExam.toLocaleString()}`;
      return 'Included';
    },
    isHighlight: (p) => (p.pricePerExam ?? 0) === 0,
  },
  {
    label: 'Certificates',
    getValue: () => true,
  },
  {
    label: 'Analytics & Reports',
    getValue: (p) => p.price > 0,
  },
  {
    label: 'API Access',
    getValue: (p) => p.planType === 'ORGANIZATION',
  },
  {
    label: 'Priority Support',
    getValue: (p) => (p.pricePerExam ?? 0) > 0 || p.billingCycle === 'ANNUAL',
  },
  {
    label: 'Custom Branding',
    getValue: (p) => p.billingCycle === 'ANNUAL',
  },
];

export function PlanComparisonSection({
  plans,
  currentPlanId,
  onUpgrade,
}: PlanComparisonSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (plans.length < 2) return null;

  const isPlanCurrent = (plan: SubscriptionPlan) => plan.id === currentPlanId;
  const sortedPlans = [...plans].sort((a, b) => a.price - b.price);

  return (
    <Card id="plan-comparison">
      <CardHeader>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex w-full items-center justify-between"
        >
          <CardTitle className="flex items-center gap-2">
            <Table2 className="h-5 w-5 text-primary-500" />
            Compare Plans
          </CardTitle>
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-text-tertiary" />
          ) : (
            <ChevronUp className="h-4 w-4 text-text-tertiary" />
          )}
        </button>
      </CardHeader>

      {!isCollapsed && (
        <CardBody className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="min-w-[140px] pb-3 pr-4 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Feature
                </th>
                {sortedPlans.map((plan) => (
                  <th
                    key={plan.id}
                    className={cn(
                      'pb-3 px-3 text-center text-xs font-medium uppercase tracking-wider',
                      isPlanCurrent(plan) ? 'text-primary-600' : 'text-text-tertiary',
                    )}
                  >
                    <div className="space-y-1">
                      <span className="block">{plan.name}</span>
                      <span className="block text-[11px] font-bold text-text-primary">
                        {formatPrice(plan.price, plan.currency)}{plan.price > 0 ? getBillingLabel(plan.billingCycle) : ''}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr
                  key={row.label}
                  className={cn(
                    'border-t border-border transition-colors hover:bg-surface-secondary',
                    i % 2 === 0 && 'bg-surface-secondary/30',
                  )}
                >
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-1 text-sm text-text-secondary">
                      {row.label}
                      {row.tooltip && (
                        <span className="group relative inline-flex" title={row.tooltip}>
                          <HelpCircle className="h-3 w-3 text-text-tertiary" />
                        </span>
                      )}
                    </span>
                  </td>
                  {sortedPlans.map((plan) => {
                    const value = row.getValue(plan);
                    const isHighlighted = row.isHighlight?.(plan);
                    return (
                      <td
                        key={plan.id}
                        className={cn(
                          'px-3 py-2.5 text-center text-sm',
                          isPlanCurrent(plan) && 'bg-primary-50/30',
                        )}
                      >
                        {typeof value === 'boolean' ? (
                          value ? (
                            <Check className="mx-auto h-4 w-4 text-accent-500" />
                          ) : (
                            <XIcon className="mx-auto h-4 w-4 text-text-tertiary" />
                          )
                        ) : (
                          <span className={cn(
                            'text-sm',
                            isHighlighted ? 'font-semibold text-text-primary' : 'text-text-secondary',
                          )}>
                            {value}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      )}
    </Card>
  );
}

export default PlanComparisonSection;
