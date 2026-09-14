import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Modal } from '@components/ui/modal';

export type PricingVariant = 'individual' | 'organization';
type BillingCycle = 'monthly' | 'annual';

interface PricingPlanData {
  name: string;
  tagline: string;
  price: string;
  period: string;
  highlight?: boolean;
  badge?: string;
  features: string[];
  cta: string;
  description?: string;
}

const pricingPlans: Record<PricingVariant, PricingPlanData[]> = {
  individual: [
    {
      name: 'Free',
      tagline: 'For getting started',
      price: '0',
      period: '/month',
      features: ['3 practice assessments / month', 'Basic AI practical assessment', '1 AI oral defense / month'],
      cta: 'Get Started Free',
    },
    {
      name: 'Professional',
      tagline: 'Best value for individuals',
      price: '10,000',
      period: '/month',
      highlight: true,
      badge: 'Most popular',
      features: ['Unlimited practice assessments', 'Full AI practical assessment', 'Unlimited AI oral defense', 'AI learning recommendations'],
      cta: 'Start Free Trial',
    },
    {
      name: 'Premium',
      tagline: 'For power users',
      price: '20,000',
      period: '/month',
      features: ['Unlimited official assessments', 'Advanced AI practical assessment', 'Priority support', 'Personalized AI recommendations'],
      cta: 'Start Free Trial',
    },
  ],
  organization: [
    {
      name: 'Starter',
      tagline: 'For small institutions',
      price: '100,000',
      period: '/month',
      features: ['Up to 100 active candidates', '2 admin accounts', 'AI practical assessments', 'Basic analytics'],
      cta: 'Start Free Trial',
    },
    {
      name: 'Professional',
      tagline: 'For growing organizations',
      price: '300,000',
      period: '/month',
      highlight: true,
      badge: 'Most popular',
      features: ['Up to 1,000 active candidates', 'Unlimited assessors', 'Advanced analytics', 'Full dynamic workspace'],
      cta: 'Start Free Trial',
    },
    {
      name: 'Enterprise',
      tagline: 'For large institutions',
      price: 'Custom',
      period: 'tailored to you',
      features: ['Unlimited active candidates', 'Custom domain', 'Dedicated support', 'Full API and governance'],
      cta: 'Contact Sales',
    },
  ],
};

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const [activeTab, setActiveTab] = useState<PricingVariant>('individual');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  const plans = useMemo(() => pricingPlans[activeTab], [activeTab]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      showCloseButton
      className="max-w-[1200px] overflow-hidden border border-[#c9d9f7] bg-[#edf4ff] p-0 shadow-[0_24px_80px_rgba(14,46,94,0.12)]"
    >
      <div className="bg-[#edf4ff] px-4 pb-8 pt-3 sm:px-8 sm:pb-10">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-[2.5rem] font-semibold tracking-[-0.05em] text-[#172c4a] sm:text-[3rem]">
            Choose the plan that&apos;s right for you
          </h2>

          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-xl border border-[#b4c8e8] bg-[#dfeaf9] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              {(['individual', 'organization'] as PricingVariant[]).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-lg px-10 py-3.5 text-base font-medium transition ${
                      isActive ? 'bg-white text-[#1a2e4d] shadow-sm ring-1 ring-[#bdd0ef]' : 'text-[#3d4d67]'
                    }`}
                  >
                    {tab === 'individual' ? 'Individual' : 'Business'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 text-sm font-medium text-[#3b586d]">
            Save up to 28% with annual billing
          </div>

          <div className="mt-5 flex justify-center">
            <div className="inline-flex rounded-full border border-[#b6caef] bg-white/55 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              {(['monthly', 'annual'] as BillingCycle[]).map((cycle) => {
                const isActive = billingCycle === cycle;
                return (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setBillingCycle(cycle)}
                    className={`rounded-full px-7 py-2.5 text-sm font-medium transition ${
                      isActive ? 'bg-[#eff4ff] text-[#1f3b6d] shadow-sm ring-1 ring-[#bed1f0]' : 'text-[#3d4d67]'
                    }`}
                  >
                    {cycle === 'monthly' ? 'Pay monthly' : 'Pay annually'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => {
              const isHighlighted = !!plan.highlight;

              return (
                <div
                  key={plan.name}
                  className={`rounded-[24px] border p-6 text-left sm:p-7 ${
                    isHighlighted
                      ? 'border-[#6b9ef7] bg-[#f7faff] shadow-[0_0_0_1px_rgba(74,115,220,0.12),0_14px_30px_rgba(36,71,145,0.08)]'
                      : 'border-[#9dc0fb] bg-[#f4f9ff]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[2.6rem] font-semibold tracking-[-0.05em] text-[#172c4a] leading-none">
                        {plan.name}
                      </h3>
                      <p className="mt-2 text-sm leading-5 text-[#455d7c]">{plan.tagline}</p>
                    </div>

                    {plan.badge && (
                      <span className="mt-1 inline-flex shrink-0 items-center self-start rounded-full bg-[#ff72c7] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-white shadow-[0_6px_12px_rgba(255,114,199,0.28)]">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <div className="mt-8 flex items-end gap-2">
                    {plan.price === 'Custom' ? (
                      <span className="text-[2.3rem] font-semibold tracking-[-0.05em] text-[#172c4a]">Custom</span>
                    ) : (
                      <>
                        <span className="text-[2.3rem] font-semibold tracking-[-0.05em] text-[#172c4a]">
                          {plan.price === '0' ? 'RWF 0' : `RWF ${plan.price}`}
                        </span>
                        <span className="pb-1 text-sm text-[#475b78]">{plan.period}</span>
                      </>
                    )}
                  </div>

                  {plan.price !== '0' && plan.price !== 'Custom' && (
                    <div className="mt-2 text-sm text-[#5a718b]">
                      {billingCycle === 'monthly' ? 'RWF 10,000 / month' : 'RWF 100,000 / year'}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className={`mt-8 flex w-full items-center justify-center rounded-full border px-5 py-3.5 text-base font-semibold transition ${
                      isHighlighted
                        ? 'border-[#2b6af5] bg-[#1c2d4d] text-white hover:bg-[#152744] shadow-[0_8px_18px_rgba(33,63,133,0.2)]'
                        : 'border-[#6aa1ff] bg-transparent text-[#1e3c72] hover:bg-white/40'
                    }`}
                  >
                    {plan.cta}
                  </button>

                  <div className="mt-6 border-t border-[#bfd2ee] pt-5">
                    <p className="mb-4 text-[0.95rem] font-medium text-[#1d335d]">
                      {activeTab === 'individual'
                        ? plan.name === 'Free'
                          ? 'Free for everyone'
                          : plan.name === 'Professional'
                            ? 'Everything in Free, plus:'
                            : 'Everything in Professional, plus:'
                        : plan.name === 'Starter'
                          ? 'Everything in Starter, plus:'
                          : 'Everything in Professional, plus:'}
                    </p>

                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-[0.95rem] leading-6 text-[#364c62]">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#dff7eb] text-[#1f9f63]">
                            <Check className="h-3 w-3" />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default PricingModal;
