import { useState } from 'react';
import { useAuthStore } from '@stores/auth-store';
import { Button } from '@components/ui/button';
import { PricingModal } from '@components/subscription/pricing-modal';
import { ArrowUpRight, Info } from 'lucide-react';

export function BillingPage() {
  const [pricingOpen, setPricingOpen] = useState(false);
  const user = useAuthStore((state) => state.user);

  const normalizedStatus = (user?.subscriptionStatus ?? 'FREE').toUpperCase();
  const hasActivePaidPlan = normalizedStatus === 'ACTIVE';
  const showUpgradeButton = !hasActivePaidPlan;
  const planName = hasActivePaidPlan ? 'Pro' : (normalizedStatus === 'TRIAL' ? 'Trial' : 'Free');
  const includedCredits = hasActivePaidPlan ? 120 : 40;

  return (
    <div className="min-h-screen px-4 py-10 text-[#1f2a37] animate-fade-in">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-10 text-[2rem] font-semibold tracking-[-0.04em] text-[#1c2330]">
          Billing and subscription
        </h1>

        <div className="border-t border-[#d9dee6] pt-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:items-center">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.04em] text-[#1a2333]">
                Account
              </h2>
              <p className="mt-3 text-[1.25rem] font-normal text-[#1a2333]">
                Your workspace is on the {planName} plan.
              </p>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#2965ff] transition hover:text-[#1d4ce8]"
              >
                View all plans
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex min-h-[160px] items-center justify-center rounded-[22px] border border-[#e7ebf0] bg-[#f3f5f7] px-6 py-5">
              <div className="text-center">
                <div className="text-[2.8rem] font-semibold leading-none tracking-[-0.05em] text-[#2f2f2f]">
                  {planName}
                </div>
                <div className="mt-2 text-sm text-[#5b6472]">Current plan</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[#d9dee6] pt-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:items-center">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.04em] text-[#1a2333]">Assessments</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#404b5c]">
                Assessments power your workspace activity. Different actions use different amounts.
              </p>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#2965ff] transition hover:text-[#1d4ce8]"
              >
                How assessments work
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-[22px] border border-[#e7ebf0] bg-[#f3f5f7] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.04em] text-[#4d5868]">
                    Included assessments
                  </div>
                  <div className="mt-2 text-[2.6rem] font-semibold leading-none tracking-[-0.05em] text-[#1d2431]">
                    {includedCredits}
                  </div>
                  <p className="mt-3 text-sm text-[#4d5868]">
                    Upgrade for more assessments that refresh monthly.
                  </p>
                </div>

                {showUpgradeButton && (
                  <Button
                    className="rounded-full bg-[#2965ff] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1e4fe1]"
                    onClick={() => setPricingOpen(true)}
                  >
                    Upgrade
                  </Button>
                )}
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-[18px] border border-[#e7ebf0] bg-white/40 px-4 py-4 text-sm text-[#485464]">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[#2965ff]">
                  <Info className="h-4 w-4" />
                </div>
                <p>
                  On a paid plan, you can purchase additional assessments whenever you need them.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label="Billing help"
        className="fixed bottom-7 right-7 flex h-12 w-12 items-center justify-center rounded-full border border-[#dfe4ea] bg-white text-[1.55rem] font-medium text-[#2a2f3a] shadow-sm transition hover:bg-[#f4f6fb]"
      >
        ?
      </button>

      <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
}

export default BillingPage;
