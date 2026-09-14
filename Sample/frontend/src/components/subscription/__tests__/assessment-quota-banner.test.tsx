import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssessmentQuotaBanner } from '../assessment-quota-banner';
import type { UsageStats } from '@services/subscription-service';

const base: UsageStats = {
  planName: 'Professional',
  billingCycle: 'MONTHLY',
  pricePerExam: 0,
  totalAssessmentsUsed: 320,
  maxAssessments: 500,
  pendingBills: 0,
  totalBilled: 0,
};

function renderBanner(usage?: UsageStats | null) {
  return render(
    <MemoryRouter>
      <AssessmentQuotaBanner usage={usage} />
    </MemoryRouter>,
  );
}

describe('AssessmentQuotaBanner', () => {
  it('renders used/max with a progress bar while below the cap', () => {
    renderBanner(base);

    expect(screen.getByText('Organization assessment quota')).toBeInTheDocument();
    expect(screen.getByText(/320 of 500 registrations used/)).toBeInTheDocument();
    expect(screen.getByText(/Professional plan/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /switch to per-exam billing/i })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the per-exam billing CTA when the cap is hit', () => {
    renderBanner({ ...base, totalAssessmentsUsed: 500 });

    expect(screen.getByText('Assessment quota reached')).toBeInTheDocument();
    expect(screen.getByText(/registration is paused until the plan is upgraded/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    const cta = screen.getByRole('link', { name: /switch to per-exam billing/i });
    expect(cta).toHaveAttribute('href', '/settings/plans');
  });

  it('renders unlimited (no bar, no CTA) for PER_EXAM billing', () => {
    renderBanner({ ...base, billingCycle: 'PER_EXAM', maxAssessments: 5000 });

    expect(screen.getByText(/320 of unlimited registrations used/)).toBeInTheDocument();
    // No progress bar (unlimited has no meaningful width) and no CTA
    expect(screen.queryByText('Assessment quota reached')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /switch to per-exam billing/i })).not.toBeInTheDocument();
  });

  it('renders unlimited for uncapped plans (999999+)', () => {
    renderBanner({ ...base, maxAssessments: 999999 });

    expect(screen.getByText(/320 of unlimited registrations used/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /switch to per-exam billing/i })).not.toBeInTheDocument();
  });

  it('shows the no-plan alert (max 0) with the CTA', () => {
    renderBanner({ ...base, planName: null, maxAssessments: 0, totalAssessmentsUsed: 3 });

    expect(screen.getByText('No active subscription')).toBeInTheDocument();
    expect(screen.getByText(/Registration is paused until a plan is chosen/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /switch to per-exam billing/i })).toHaveAttribute('href', '/settings/plans');
  });

  it('renders nothing when usage is null or undefined', () => {
    const { container: nullContainer } = renderBanner(null);
    expect(nullContainer.firstChild).toBeNull();

    const { container: undefinedContainer } = renderBanner(undefined);
    expect(undefinedContainer.firstChild).toBeNull();
  });
});
