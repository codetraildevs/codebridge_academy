import { useState, useEffect, useCallback } from 'react';
import { Check, ArrowRight, Star, Building2, Briefcase, CreditCard, Smartphone, Crown, User, Shield, GraduationCap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@components/ui/button';
import { cn } from '@utils/cn';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { ComponentType } from 'react';
import { SectionContainer } from '@components/ui/section-container';
import { useAuthStore } from '@stores/auth-store';
import { billingService } from '@services/billing-service';
import { subscriptionService } from '@services/subscription-service';

// ─── Types ────────────────────────────────────
type PricingTier = 'individual' | 'organization';

interface PricingPlan {
  name: string;
  tagline: string;
  price: string;
  priceAnnual: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  ctaText: string;
  ctaVariant: 'primary' | 'secondary';
  icon: ComponentType<{ className?: string }>;
  iconBg: string;
  routing: 'individual' | 'organization' | 'enterprise';
  featuresLabel?: string;
}

interface IndividualFeatureRow {
  category: string;
  items: { label: string; free: boolean | string; professional: boolean | string; premium: boolean | string }[];
}

interface OrgFeatureRow {
  category: string;
  items: { label: string; starter: boolean | string; professional: boolean | string; enterprise: boolean | string }[];
}

// ─── Plan Data ────────────────────────────────
const individualPlans: PricingPlan[] = [
  {
    name: 'Free',
    tagline: 'For getting started',
    price: '0',
    priceAnnual: '',
    period: '/month',
    description: 'Perfect for students and professionals exploring the platform and building their competency profile.',
    features: [
      '3 practice assessments / month',
      'Basic AI practical assessment',
      '1 AI oral defense / month',
      'Basic competency passport',
      'Basic skill verification report',
      'Limited assessment history',
      'Community support',
    ],
    ctaText: 'Get Started Free',
    ctaVariant: 'secondary',
    icon: Star,
    iconBg: 'bg-primary-100 text-primary-500',
    routing: 'individual',
    featuresLabel: 'Free for everyone',
  },
  {
    name: 'Professional',
    tagline: 'Best value for individuals',
    price: '10,000',
    priceAnnual: '100,000',
    period: '/month',
    description: 'Unlock unlimited assessments, full AI evaluation, and digital certificates for serious professionals.',
    features: [
      'Unlimited practice assessments',
      'Limited official assessments*',
      'Full AI practical assessment',
      'Unlimited AI oral defense',
      'Competency passport',
      'Advanced skill verification report',
      'Digital certificates',
      'Unlimited assessment history',
      'Portfolio sharing',
      'Employer share link',
      'AI learning recommendations',
    ],
    highlighted: true,
    badge: 'Best Value',
    ctaText: 'Start Free Trial',
    ctaVariant: 'primary',
    icon: Briefcase,
    iconBg: 'bg-primary-500 text-white',
    routing: 'individual',
    featuresLabel: 'Everything in Free, plus:',
  },
  {
    name: 'Premium',
    tagline: 'For power users',
    price: '20,000',
    priceAnnual: '200,000',
    period: '/month',
    description: 'Everything in Professional plus unlimited official assessments and priority support.',
    features: [
      'Unlimited official assessments',
      'Advanced AI practical assessment',
      'Unlimited AI oral defense',
      'Priority support',
      'AI learning recommendations',
    ],
    ctaText: 'Start Free Trial',
    ctaVariant: 'secondary',
    icon: Crown,
    iconBg: 'bg-secondary-100 text-secondary-600',
    routing: 'individual',
    featuresLabel: 'Everything in Professional, plus:',
  },
];

const organizationPlans: PricingPlan[] = [
  {
    name: 'Starter',
    tagline: 'For small institutions',
    price: '100,000',
    priceAnnual: '1,000,000',
    period: '/month',
    description: 'Designed for small TVET schools and training centers getting started with digital assessments.',
    features: [
      'Up to 100 active candidates',
      '2 admin accounts',
      '10 assessors',
      '2 designers',
      '2 reviewers',
      'Assessment builder',
      'Upload PDF assessments',
      'AI PDF extraction',
      'Basic dynamic workspace',
      'AI practical assessment',
      'AI oral defense',
      'Basic evidence collection',
      'Basic analytics',
      'Export (PDF/Excel/CSV)',
      'Email support',
    ],
    ctaText: 'Start Free Trial',
    ctaVariant: 'secondary',
    icon: GraduationCap,
    iconBg: 'bg-accent-100 text-accent-600',
    routing: 'organization',
    featuresLabel: 'Free for everyone',
  },
  {
    name: 'Professional',
    tagline: 'For growing organizations',
    price: '300,000',
    priceAnnual: '3,000,000',
    period: '/month',
    description: 'For universities, companies, and mid-size institutions needing full assessment capabilities.',
    features: [
      'Up to 1,000 active candidates',
      '10 admin accounts',
      'Unlimited assessors',
      'Unlimited designers',
      'Unlimited reviewers',
      'Full dynamic workspace engine',
      'AI practical assessment',
      'AI oral defense',
      'Advanced evidence collection',
      'AI plagiarism detection',
      'Competency reports',
      'Candidate management',
      'Organization dashboard',
      'Advanced analytics',
      'Export (PDF/Excel/CSV)',
      'Limited API access',
      'Email & phone support',
    ],
    highlighted: true,
    badge: 'Most Popular',
    ctaText: 'Start Free Trial',
    ctaVariant: 'primary',
    icon: Building2,
    iconBg: 'bg-primary-500 text-white',
    routing: 'organization',
    featuresLabel: 'Everything in Starter, plus:',
  },
  {
    name: 'Enterprise',
    tagline: 'For large institutions & government',
    price: 'Custom',
    priceAnnual: '',
    period: 'tailored to you',
    description: 'For national examination boards, government agencies, and large organizations requiring dedicated infrastructure.',
    features: [
      'Unlimited active candidates',
      'Unlimited admin accounts',
      'Unlimited assessors, designers, reviewers',
      'Full dynamic workspace engine',
      'AI practical assessment',
      'AI oral defense',
      'Advanced evidence collection',
      'Advanced AI plagiarism detection',
      'Enterprise analytics',
      'Full API access',
      'White-label branding',
      'Custom domain',
      'On-premise deployment (optional)',
      'Dedicated account manager',
      '24/7 dedicated support',
    ],
    ctaText: 'Contact Sales',
    ctaVariant: 'primary',
    icon: Building2,
    iconBg: 'bg-secondary-100 text-secondary-600',
    routing: 'enterprise',
    featuresLabel: 'Everything in Professional, plus:',
  },
];

// ─── Feature Comparison: Individual ───────────
const individualFeatureData: IndividualFeatureRow[] = [
  {
    category: 'Assessments',
    items: [
      { label: 'Practice assessments', free: '3/month', professional: 'Unlimited', premium: 'Unlimited' },
      { label: 'Official assessments*', free: false, professional: 'Limited', premium: 'Unlimited' },
      { label: 'AI practical assessment', free: 'Basic', professional: 'Full', premium: 'Advanced' },
      { label: 'AI oral defense', free: '1/month', professional: 'Unlimited', premium: 'Unlimited' },
    ],
  },
  {
    category: 'Credentials & Profile',
    items: [
      { label: 'Competency passport', free: true, professional: true, premium: true },
      { label: 'Skill verification report', free: 'Basic', professional: 'Advanced', premium: 'Advanced' },
      { label: 'Digital certificates', free: false, professional: true, premium: true },
      { label: 'Assessment history', free: 'Limited', professional: 'Unlimited', premium: 'Unlimited' },
      { label: 'Portfolio sharing', free: false, professional: true, premium: true },
      { label: 'Employer share link', free: false, professional: true, premium: true },
      { label: 'AI learning recommendations', free: false, professional: true, premium: true },
    ],
  },
];

// ─── Feature Comparison: Organization ─────────
const organizationFeatureData: OrgFeatureRow[] = [
  {
    category: 'Capacity',
    items: [
      { label: 'Active candidates', starter: 'Up to 100', professional: 'Up to 1,000', enterprise: 'Unlimited' },
      { label: 'Admin accounts', starter: '2', professional: '10', enterprise: 'Unlimited' },
      { label: 'Assessors', starter: '10', professional: 'Unlimited', enterprise: 'Unlimited' },
      { label: 'Designers', starter: '2', professional: 'Unlimited', enterprise: 'Unlimited' },
      { label: 'Reviewers', starter: '2', professional: 'Unlimited', enterprise: 'Unlimited' },
    ],
  },
  {
    category: 'Assessment Tools',
    items: [
      { label: 'Assessment builder', starter: true, professional: true, enterprise: true },
      { label: 'Upload PDF assessments', starter: true, professional: true, enterprise: true },
      { label: 'AI PDF extraction', starter: true, professional: true, enterprise: true },
      { label: 'Manual assessment builder', starter: true, professional: true, enterprise: true },
      { label: 'Dynamic workspace engine', starter: 'Basic', professional: 'Full', enterprise: 'Full' },
      { label: 'AI practical assessment', starter: true, professional: true, enterprise: true },
      { label: 'AI oral defense', starter: true, professional: true, enterprise: true },
      { label: 'Evidence collection', starter: 'Basic', professional: 'Advanced', enterprise: 'Advanced' },
      { label: 'AI plagiarism detection', starter: true, professional: true, enterprise: 'Advanced' },
    ],
  },
  {
    category: 'Reports & Analytics',
    items: [
      { label: 'Competency reports', starter: true, professional: true, enterprise: true },
      { label: 'Candidate management', starter: true, professional: true, enterprise: true },
      { label: 'Organization dashboard', starter: true, professional: true, enterprise: true },
      { label: 'Analytics', starter: 'Basic', professional: 'Advanced', enterprise: 'Enterprise' },
      { label: 'Export (PDF/Excel/CSV)', starter: true, professional: true, enterprise: true },
    ],
  },
  {
    category: 'Integration & Deployment',
    items: [
      { label: 'API access', starter: false, professional: 'Limited', enterprise: 'Full' },
      { label: 'White-label branding', starter: false, professional: false, enterprise: true },
      { label: 'Custom domain', starter: false, professional: false, enterprise: true },
      { label: 'On-premise deployment', starter: false, professional: false, enterprise: 'Optional' },
    ],
  },
];

// ─── Animation variants ───────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

// ─── Toggle Component ─────────────────────────
function PlanTypeToggle({ value, onChange }: { value: PricingTier; onChange: (v: PricingTier) => void }) {
  return (
    <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 p-1">
      <button
        onClick={() => onChange('individual')}
        className={cn(
          'relative flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-200',
          value === 'individual'
            ? 'bg-[#2965ff] text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700',
        )}
      >
        <User className="h-4 w-4" />
        <span>For Individuals</span>
      </button>
      <button
        onClick={() => onChange('organization')}
        className={cn(
          'relative flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-200',
          value === 'organization'
            ? 'bg-[#2965ff] text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700',
        )}
      >
        <Building2 className="h-4 w-4" />
        <span>For Organizations</span>
      </button>
    </div>
  );
}

// ─── Helper: render cell in comparison table (prototype style) ──
function renderCellValue(value: boolean | string) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="h-5 w-5 text-black" />
    ) : (
      <span className="text-gray-400 text-base font-light">×</span>
    );
  }
  return <span className="text-sm text-gray-700">{value}</span>;
}

// ─── Main Component ──────────────────────────
export function PricingSection() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [activeTab, setActiveTab] = useState<PricingTier>('individual');
  const [planIdMap, setPlanIdMap] = useState<Record<string, string>>({});
  const [startingPlanId, setStartingPlanId] = useState<string | null>(null);
  const [trialError, setTrialError] = useState<string | null>(null);
  const [trialSuccess, setTrialSuccess] = useState<string | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});

  // Fetch plans once on mount to build type:name→id lookup
  // Key format: "individual:professional", "organization:starter", etc.
  useEffect(() => {
    async function loadPlans() {
      try {
        const plans = await subscriptionService.listPlans();
        const map: Record<string, string> = {};
        for (const plan of plans) {
          const key = `${plan.planType.toLowerCase()}:${plan.name.toLowerCase()}`;
          map[key] = plan.id;
        }
        setPlanIdMap(map);
      } catch {
        // Plans will be unavailable — fall back to registration flow
      }
    }
    loadPlans();
  }, []);

  // Clear status messages when switching between Individual/Organization tabs
  useEffect(() => {
    setTrialError(null);
    setTrialSuccess(null);
  }, [activeTab]);

  const handlePlanClick = useCallback(async (planName: string, routing: 'individual' | 'organization' | 'enterprise') => {
    // Clear previous messages
    setTrialError(null);
    setTrialSuccess(null);

    // Enterprise / Contact Sales → scroll to demo
    if (routing === 'enterprise' || planName === 'Enterprise') {
      document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Free plan → redirect to registration
    if (planName === 'Free') {
      navigate('/auth/register/individual?plan=free');
      return;
    }

    const planKey = `${routing}:${planName.toLowerCase()}`;
    const planId = planIdMap[planKey];

    // Authenticated user with a known plan → call startTrial API
    if (isAuthenticated && planId) {
      setStartingPlanId(planId);
      try {
        const result = await billingService.startTrial(planId);
        setTrialSuccess(result.message);
        setTimeout(() => {
          navigate('/settings/plans');
        }, 1500);
      } catch (err: any) {
        const message = err?.response?.data?.message || err?.message || 'Failed to start trial. Please try again.';
        setTrialError(message);
      } finally {
        setStartingPlanId(null);
      }
      return;
    }

    // Authenticated but no planId from API → go to settings
    if (isAuthenticated) {
      navigate('/settings/plans');
      return;
    }

    // Not authenticated → navigate to registration with plan param
    const planParam = planKey;
    if (routing === 'individual') {
      navigate(`/auth/register/individual?plan=${planParam}`);
    } else {
      navigate(`/auth/register/organization?plan=${planParam}`);
    }
  }, [isAuthenticated, navigate, planIdMap]);

  const currentPlans = activeTab === 'individual' ? individualPlans : organizationPlans;

  return (
    <section id="pricing" className="relative bg-[#faf9f6] py-16 sm:py-24 overflow-hidden">
      <SectionContainer>
        {/* ── Header ────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-4xl text-center"
        >
          <h2 className="landing-section-heading text-4xl sm:text-5xl lg:text-6xl text-gray-900 tracking-tight">
            Choose the plan that fits <span className="italic">your needs</span>
          </h2>
        </motion.div>

        {/* ── Toggle ────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-10 flex justify-center"
        >
          <PlanTypeToggle value={activeTab} onChange={setActiveTab} />
        </motion.div>

        {/* ── Pricing Cards ─────────────────────── */}
        <motion.div
          className="mx-auto mt-14 grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          key={activeTab}
        >
          <AnimatePresence>
            {currentPlans.map((plan) => {
              const isFree = plan.price === '0';
              const isCustom = plan.price === 'Custom';
              const planKey = `${activeTab}-${plan.name}`;
              const isExpanded = expandedPlans[planKey] ?? false;
              const visibleFeatures = isExpanded ? plan.features : plan.features.slice(0, 4);
              const hiddenFeatureCount = plan.features.length - visibleFeatures.length;
              return (
                <motion.div
                  key={`${activeTab}-${plan.name}`}
                  variants={cardVariants}
                  className={cn(
                    'group relative flex min-h-[650px] flex-col rounded-xl border bg-white p-6 transition-all duration-300 sm:p-7',
                    plan.highlighted
                      ? 'border-gray-900 shadow-md shadow-gray-900/10 hover:shadow-lg'
                      : 'border-gray-200 hover:border-gray-400 hover:shadow-md',
                  )}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#f0d4c8] bg-[#f8e5dc] px-4 py-1 text-xs font-semibold text-gray-900 shadow-sm"
                      >
                        <span className="text-[#a55b46]">★</span>
                        {plan.badge}
                      </motion.span>
                    </div>
                  )}

                  {/* Plan Name */}
                  <div className={cn(plan.badge && 'pt-2')}>
                    <h3 className="text-2xl font-semibold text-gray-900">{plan.name}</h3>
                    <p className="mt-2 min-h-10 text-sm leading-5 text-gray-500">{plan.tagline}</p>
                  </div>

                  {/* Price */}
                  <div className="mt-7">
                    {isCustom ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-semibold tracking-tight text-gray-900">Custom</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-medium text-gray-500">RWF</span>
                        <span className="text-4xl font-semibold tracking-tight text-gray-900">{plan.price}</span>
                        <span className="text-sm text-gray-500">{plan.period}</span>
                      </div>
                    )}
                    {!isFree && !isCustom && (
                      <p className="mt-1 text-xs text-gray-400">
                        Excludes applicable sale taxes.
                      </p>
                    )}
                  </div>

                  {/* Annual price & Save badge */}
                  {!isFree && !isCustom && plan.priceAnnual && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>Billed</span>
                        <button className="font-medium text-gray-900 underline underline-offset-2">Yearly</button>
                        <span>/</span>
                        <button className="text-gray-400 hover:text-gray-600">Monthly</button>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[11px] font-medium text-green-700">
                        Save RWF {parseInt(plan.price.replace(/,/g, '')) * 2}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  <p className="mt-4 min-h-12 text-sm leading-5 text-gray-600">{plan.description}</p>

                  {/* CTA Button */}
                  <div className="mt-6">
                    <Button
                      variant={plan.ctaVariant}
                      fullWidth
                      size="md"
                      disabled={!!startingPlanId}
                      onClick={() => handlePlanClick(plan.name, plan.routing)}
                      className={cn(
                        'transition-all duration-200 group rounded-lg py-3 text-sm',
                        !!startingPlanId && 'opacity-60 cursor-not-allowed',
                        plan.ctaVariant === 'primary'
                          ? 'bg-[#2965ff] text-white shadow-md shadow-[#2965ff]/20 hover:bg-[#1f54dd]'
                          : 'border border-gray-200 bg-gray-100 text-gray-900 hover:bg-gray-200',
                      )}
                    >
                      <span>{plan.ctaText}</span>
                      <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </Button>
                  </div>

                  {/* Secondary CTA */}
                  {plan.routing !== 'enterprise' && (
                    <div className="mt-3 text-center">
                      <button
                        onClick={() => document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="text-sm font-medium text-gray-700 hover:text-[#2965ff]"
                      >
                        Talk to us
                      </button>
                    </div>
                  )}

                  {/* Trial loading / success / error status */}
                  {startingPlanId && planIdMap[`${plan.routing}:${plan.name.toLowerCase()}`] === startingPlanId && (
                    <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary-50 p-2 text-xs text-primary-700">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Starting your free trial...</span>
                    </div>
                  )}
                  {trialSuccess && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent-50 p-2 text-xs text-accent-700">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>{trialSuccess}</span>
                    </div>
                  )}
                  {trialError && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{trialError}</span>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="mt-6 border-t border-gray-100" />

                  {/* Features label */}
                  <p className="mt-5 border-t border-gray-200 pt-5 text-sm font-semibold text-gray-900">{plan.featuresLabel || 'Features:'}</p>

                  {/* Features */}
                  <ul className="mt-4 flex-1 space-y-3">
                    {visibleFeatures.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-gray-900" />
                        <span className="text-sm leading-5 text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* See more */}
                  <div className="mt-6 border-t border-gray-200 pt-5">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedPlans((current) => ({ ...current, [planKey]: !isExpanded }))}
                      className="text-sm font-semibold text-gray-900 transition-colors hover:text-[#2965ff]"
                    >
                      {isExpanded ? 'See less' : hiddenFeatureCount > 0 ? `See more (${hiddenFeatureCount})` : 'See more'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* ── Official assessments note ──────────── */}
        {activeTab === 'individual' && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-4 text-center text-[11px] text-text-tertiary"
          >
            *Official assessments depend on the assessment publisher&apos;s settings.
          </motion.p>
        )}

        {/* ── Feature Comparison Table ──────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 sm:mt-20"
        >
          <div className="max-w-7xl text-left">
            <h3 className="landing-section-heading text-3xl font-normal text-black sm:text-4xl">
              Compare plans
            </h3>
          </div>

          <div className="mt-6">
            {activeTab === 'individual' ? (
              <IndividualComparisonTable onNavigate={(path) => navigate(path)} />
            ) : (
              <OrganizationComparisonTable onNavigate={(path) => {
                if (path === '/demo-section') {
                  document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
                } else {
                  navigate(path);
                }
              }} />
            )}
          </div>
        </motion.div>

        {/* ── Payment Methods Banner ──────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-10 text-center"
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-border/60 bg-surface-secondary/60 px-6 py-4 sm:px-8">
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <Smartphone className="h-4 w-4 text-primary-500" />
              <span>MTN Mobile Money</span>
            </div>
            <div className="h-4 w-px bg-border/60" />
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <Smartphone className="h-4 w-4 text-accent-500" />
              <span>Airtel Money</span>
            </div>
            <div className="h-4 w-px bg-border/60" />
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <Building2 className="h-4 w-4 text-secondary-500" />
              <span>Bank Transfer</span>
            </div>
            <div className="h-4 w-px bg-border/60" />
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <CreditCard className="h-4 w-4 text-primary-500" />
              <span>Credit / Debit Card</span>
            </div>
          </div>
        </motion.div>

        {/* ── Bottom Trust Signal ──────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-text-tertiary">
            All paid plans include a 14-day free trial. No credit card required.{' '}
            <button
              onClick={() => document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="font-medium text-primary-600 hover:text-primary-700 underline-offset-2 hover:underline transition-colors"
            >
              Talk to our team for custom pricing
            </button>
          </p>
        </motion.div>
      </SectionContainer>
    </section>
  );
}

// ─── Individual Comparison Table ─────────────
const INDIVIDUAL_INITIAL_LIMIT = 1;

function IndividualComparisonTable({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const visibleSections = expanded ? individualFeatureData : individualFeatureData.slice(0, INDIVIDUAL_INITIAL_LIMIT);
  const hasMore = individualFeatureData.length > INDIVIDUAL_INITIAL_LIMIT;

  return (
    <>
      {/* Table header with colored dots */}
      <div className="grid grid-cols-4 gap-0 border-b border-dashed border-gray-300 px-8 py-6">
        <div />
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2965ff]" />
          </div>
          <span className="text-base font-semibold text-black">Free</span>
          <div className="mt-1">
            <Button variant="primary" size="xs" onClick={() => onNavigate('/auth/register/individual')} className="rounded-full bg-black text-white hover:bg-gray-800 px-5 py-2 text-xs">
              Get Started
            </Button>
          </div>
        </div>
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
          </div>
          <span className="text-base font-semibold text-black">Professional</span>
          <div className="mt-1">
            <Button variant="secondary" size="xs" onClick={() => onNavigate('/auth/register/individual?plan=professional')} className="rounded-full border-2 border-gray-300 text-black hover:bg-gray-50 px-5 py-2 text-xs">
              Get started
            </Button>
          </div>
        </div>
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
          </div>
          <span className="text-base font-semibold text-black">Premium</span>
          <div className="mt-1">
            <Button variant="primary" size="xs" onClick={() => onNavigate('/auth/register/individual?plan=premium')} className="rounded-full bg-[#2965ff] text-white hover:bg-[#1e50d9] px-5 py-2 text-xs">
              Get started
            </Button>
          </div>
        </div>
      </div>

      {/* Rows */}
      {visibleSections.map((section) => (
        <div key={section.category}>
          <div className="px-8 py-5 border-b border-dashed border-gray-300">
            <h4 className="text-xl font-bold text-black">{section.category}</h4>
          </div>
          {section.items.map((row) => (
            <div key={row.label} className="grid grid-cols-4 gap-0 border-b border-dashed border-gray-300 px-8 py-4 last:border-b-0">
              <div className="flex items-center text-sm font-medium text-gray-800">{row.label}</div>
              <div className="flex items-center justify-center">{renderCellValue(row.free)}</div>
              <div className="flex items-center justify-center">{renderCellValue(row.professional)}</div>
              <div className="flex items-center justify-center">{renderCellValue(row.premium)}</div>
            </div>
          ))}
        </div>
      ))}

      {/* Grayed out Reports & Analytics section heading */}
      {hasMore && (
        <div className="px-8 py-5 border-b border-dashed border-gray-300">
          <h4 className={cn("text-xl font-bold", expanded ? "text-black" : "text-gray-300")}>Reports & Analytics</h4>
        </div>
      )}

      {/* Footer with See more / See less */}
      <div className="px-8 py-8 text-center">
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-full border border-gray-300 px-8 py-3 text-sm font-medium text-black hover:bg-gray-50 transition-colors"
          >
            {expanded ? 'See less' : 'See more'}
          </button>
        )}
      </div>
    </>
  );
}

// ─── Organization Comparison Table ────────────
const ORG_INITIAL_LIMIT = 2;

function OrganizationComparisonTable({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const visibleSections = expanded ? organizationFeatureData : organizationFeatureData.slice(0, ORG_INITIAL_LIMIT);
  const hasMore = organizationFeatureData.length > ORG_INITIAL_LIMIT;

  return (
    <>
      {/* Table header with colored dots */}
      <div className="grid grid-cols-4 gap-0 border-b border-dashed border-gray-300 px-8 py-6">
        <div />
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2965ff]" />
          </div>
          <span className="text-base font-semibold text-black">Starter</span>
          <div className="mt-1">
            <Button variant="secondary" size="xs" onClick={() => onNavigate('/auth/register/organization?plan=starter')} className="rounded-full border-2 border-gray-300 text-black hover:bg-gray-50 px-5 py-2 text-xs">
              Request pricing
            </Button>
          </div>
        </div>
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
          </div>
          <span className="text-base font-semibold text-black">Professional</span>
          <div className="mt-1">
            <Button variant="primary" size="xs" onClick={() => onNavigate('/auth/register/organization?plan=professional')} className="rounded-full bg-[#2965ff] text-white hover:bg-[#1e50d9] px-5 py-2 text-xs">
              Request pricing
            </Button>
          </div>
        </div>
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
          </div>
          <span className="text-base font-semibold text-black">Enterprise</span>
          <div className="mt-1">
            <Button variant="primary" size="xs" onClick={() => onNavigate('/demo-section')} className="rounded-full bg-[#2965ff] text-white hover:bg-[#1e50d9] px-5 py-2 text-xs">
              Request pricing
            </Button>
          </div>
        </div>
      </div>

      {/* Rows */}
      {visibleSections.map((section) => (
        <div key={section.category}>
          <div className="px-8 py-5 border-b border-dashed border-gray-300">
            <h4 className="text-xl font-bold text-black">{section.category}</h4>
          </div>
          {section.items.map((row) => (
            <div key={row.label} className="grid grid-cols-4 gap-0 border-b border-dashed border-gray-300 px-8 py-4 last:border-b-0">
              <div className="flex items-center text-sm font-medium text-gray-800">{row.label}</div>
              <div className="flex items-center justify-center">{renderCellValue(row.starter)}</div>
              <div className="flex items-center justify-center">{renderCellValue(row.professional)}</div>
              <div className="flex items-center justify-center">{renderCellValue(row.enterprise)}</div>
            </div>
          ))}
        </div>
      ))}

      {/* Grayed out Reports & Analytics section heading */}
      {hasMore && (
        <div className="px-8 py-5 border-b border-dashed border-gray-300">
          <h4 className={cn("text-xl font-bold", expanded ? "text-black" : "text-gray-300")}>Reports & Analytics</h4>
        </div>
      )}

      {/* Footer with See more / See less */}
      <div className="px-8 py-8 text-center">
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-full border border-gray-300 px-8 py-3 text-sm font-medium text-black hover:bg-gray-50 transition-colors"
          >
            {expanded ? 'See less' : 'See more'}
          </button>
        )}
      </div>
    </>
  );
}

export default PricingSection;
