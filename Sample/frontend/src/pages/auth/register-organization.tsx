import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { PhoneInput } from '@components/ui/phone-input';
import { PreviewPanel } from '@components/ui/preview-panel';
import { cn } from '@utils/cn';
import { authService } from '@services/auth-service';
import {
  Mail, Lock, User, Phone, Building2, Globe, MapPin, Hash,
  CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, ChevronDown,
  Briefcase, Check, Code, Database, Shield, BarChart3, Cpu, Settings,
} from 'lucide-react';
import type { OrganizationType } from '../../types';

const STEPS = [
  { id: 'organization', label: 'Organization' },
  { id: 'owner', label: 'Owner' },
  { id: 'security', label: 'Security' },
  { id: 'plan', label: 'Plan' },
];

const ORG_TYPES: { value: OrganizationType; label: string; desc: string }[] = [
  { value: 'TVET_SCHOOL', label: 'TVET School', desc: 'Technical and vocational education' },
  { value: 'SECONDARY_SCHOOL', label: 'Secondary School', desc: 'General secondary education' },
  { value: 'UNIVERSITY', label: 'University', desc: 'Higher education institution' },
  { value: 'COMPANY', label: 'Company', desc: 'Private sector employer' },
  { value: 'GOVERNMENT_INSTITUTION', label: 'Government Institution', desc: 'Public sector agency' },
  { value: 'EXAMINATION_AUTHORITY', label: 'Examination Authority', desc: 'National exam board' },
  { value: 'CERTIFICATION_BODY', label: 'Certification Body', desc: 'Skills certification provider' },
  { value: 'NGO', label: 'NGO', desc: 'Non-governmental organization' },
  { value: 'TRAINING_CENTER', label: 'Training Center', desc: 'Independent training provider' },
  { value: 'OTHER', label: 'Other', desc: 'Other organization type' },
];

const PLAN_OPTIONS = [
  { id: 'starter', icon: Code, title: 'Starter', description: 'Up to 100 candidates, 2 admin accounts, 10 assessors, assessment builder, and basic analytics.' },
  { id: 'professional', icon: BarChart3, title: 'Professional', description: 'Up to 1,000 candidates, unlimited assessors, full dynamic workspace, advanced analytics, and API access.' },
  { id: 'enterprise', icon: Settings, title: 'Enterprise', description: 'Unlimited candidates, white label branding, custom domain, on-premise option, and 24/7 support.' },
  { id: 'growth', icon: Cpu, title: 'Growth', description: 'Mid-tier for growing teams with expanded candidate limits and team management features.' },
  { id: 'premium', icon: Shield, title: 'Premium', description: 'Everything in Professional plus dedicated support, custom integrations, SSO, and SLA guarantees.' },
  { id: 'custom', icon: Database, title: 'Custom', description: 'Tailored solutions for large institutions with specific compliance and deployment requirements.' },
];

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: '', color: '', width: '0%' };
  const checks = [password.length >= 8, /[a-z]/.test(password), /[A-Z]/.test(password), /\d/.test(password), /[@$!%*?&]/.test(password)];
  const score = checks.filter(Boolean).length;
  if (score <= 2) return { label: 'Weak', color: 'bg-[#dc2626]', width: '25%' };
  if (score <= 3) return { label: 'Fair', color: 'bg-[#d97706]', width: '50%' };
  if (score <= 4) return { label: 'Good', color: 'bg-[#0A0A3B]', width: '75%' };
  return { label: 'Strong', color: 'bg-[#000100]', width: '100%' };
}

interface FormData {
  orgName: string; orgCode: string; orgType: OrganizationType | '';
  country: string; province: string; district: string; address: string; website: string; logoUrl: string;
  firstName: string; lastName: string; email: string; phone: string; position: string;
  password: string; confirmPassword: string;
}

const pageVariants = { enter: { opacity: 0, x: 16 }, center: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -16 } };

export function RegisterOrganizationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPlan = searchParams.get('plan');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [orgTypeOpen, setOrgTypeOpen] = useState(false);
  const [status, setStatus] = useState<'form' | 'success'>('form');
  const [chosenPlan, setChosenPlan] = useState(selectedPlan || 'starter');
  const [form, setForm] = useState<FormData>(() => {
    try {
      const saved = sessionStorage.getItem('qual-reg-org');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {
      orgName: '', orgCode: '', orgType: '', country: 'Rwanda', province: '', district: '',
      address: '', website: '', logoUrl: '', firstName: '', lastName: '', email: '',
      phone: '', position: '', password: '', confirmPassword: '',
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => { sessionStorage.setItem('qual-reg-org', JSON.stringify(form)); }, [form]);
  const passwordStrength = getPasswordStrength(form.password);

  const validateField = useCallback((name: string, value: string): string => {
    switch (name) {
      case 'firstName': return !value.trim() ? 'Required' : value.trim().length < 2 ? 'At least 2 characters' : '';
      case 'lastName': return !value.trim() ? 'Required' : value.trim().length < 2 ? 'At least 2 characters' : '';
      case 'email': return !value.trim() ? 'Required' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Valid email required' : '';
      case 'phone': return !value.trim() ? 'Required' : '';
      case 'password':
        if (!value) return 'Required';
        if (value.length < 8) return 'Min 8 characters';
        if (!/(?=.*[a-z])/.test(value)) return 'Need a lowercase letter';
        if (!/(?=.*[A-Z])/.test(value)) return 'Need an uppercase letter';
        if (!/(?=.*\d)/.test(value)) return 'Need a number';
        if (!/(?=.*[@$!%*?&])/.test(value)) return 'Need a special character';
        return '';
      case 'confirmPassword': return !value ? 'Confirm your password' : value !== form.password ? 'Passwords do not match' : '';
      case 'orgName': return !value.trim() ? 'Required' : value.trim().length < 2 ? 'At least 2 characters' : '';
      case 'orgCode': return !value.trim() ? 'Required' : !/^[A-Z0-9_]+$/.test(value.toUpperCase()) ? 'Uppercase, numbers, or underscores' : '';
      case 'website': return value && !/^https?:\/\/.+/.test(value) ? 'Valid URL required' : '';
      default: return '';
    }
  }, [form.password]);

  const handleChange = (name: string, value: string) => {
    const processed = name === 'orgCode' ? value.toUpperCase() : value;
    setForm((prev) => ({ ...prev, [name]: processed }));
    if (touched[name]) setErrors((prev) => ({ ...prev, [name]: validateField(name, processed) }));
  };
  const handleBlur = (name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, form[name as keyof FormData]) }));
  };
  const selectOrgType = (value: OrganizationType) => { setForm((prev) => ({ ...prev, orgType: value })); setErrors((prev) => ({ ...prev, orgType: '' })); setOrgTypeOpen(false); };

  const validateStep = (): boolean => {
    const fields: Record<number, (keyof FormData)[]> = {
      0: ['orgName', 'orgCode', 'website'], 1: ['firstName', 'lastName', 'email', 'phone'], 2: ['password', 'confirmPassword'],
    };
    const newErrors: Record<string, string> = {};
    (fields[step] || []).forEach((key) => { const err = validateField(key, form[key]); if (err) newErrors[key] = err; });
    if (step === 0 && !form.orgType) newErrors.orgType = 'Select organization type';
    if (step === 2 && !acceptedTerms) newErrors.terms = 'Accept terms to continue';
    setErrors(newErrors);
    setTouched((prev) => ({ ...prev, ...Object.fromEntries((fields[step] || []).map((k) => [k, true])) }));
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    setServerError('');
    if (!validateStep()) return;
    if (step === STEPS.length - 1) { handleSubmit(); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const handleBack = () => { setServerError(''); setStep((s) => Math.max(s - 1, 0)); };

  const handleSubmit = async () => {
    setServerError(''); setLoading(true);
    try {
      const response = await authService.registerOrganization({
        email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName,
        orgName: form.orgName, orgCode: form.orgCode, orgType: form.orgType || undefined,
        address: form.address || undefined, phone: form.phone || undefined, website: form.website || undefined,
      });
      if (response.success) {
        sessionStorage.removeItem('qual-reg-org');
        setStatus('success');
      } else {
        setServerError(response.message || 'Registration failed');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '';
      if (msg.toLowerCase().includes('email')) setServerError('This email is already registered.');
      else if (msg.toLowerCase().includes('code')) setServerError('This organization code is already taken.');
      else setServerError(msg || 'Registration failed.');
    } finally { setLoading(false); }
  };

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center space-y-6 py-12">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#000100]">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </motion.div>
          <div>
            <h2 className="text-[22px] font-semibold text-[#000100]">Organization registered</h2>
            <p className="mt-2 text-[14px] text-[#b8b8b8]">Your organization is ready. Sign in to get started.</p>
          </div>
          <Button fullWidth size="lg" onClick={() => navigate('/auth/login')}>Sign In</Button>
        </motion.div>
      </div>
    );
  }

  const inputCls = (error?: string) => cn(
    'block w-full rounded-lg border bg-white px-3 py-2.5 text-[14px] text-[#000100]',
    'placeholder:text-[#b8b8b8]',
    'transition-all duration-150 ease-out',
    'focus:outline-none focus:ring-1 focus:ring-[#000100]/20 focus:border-[#000100]',
    'hover:border-[#b8b8b8]',
    error ? 'border-[#dc2626] focus:ring-[#dc2626]/20 focus:border-[#dc2626]' : 'border-[#b8b8b8]/50',
  );

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <motion.div key="s0" variants={pageVariants} initial="enter" animate="center" exit="exit" className="space-y-5">
          <div className="space-y-1">
            <label className="block text-[13px] font-medium text-[#000100]">Organization name<span className="ml-0.5 text-[#b8b8b8]">*</span></label>
            <input type="text" value={form.orgName} onChange={(e) => handleChange('orgName', e.target.value)} onBlur={() => handleBlur('orgName')} placeholder="e.g., Kigali Technical College" className={inputCls(errors.orgName)} />
            {errors.orgName && <p className="text-[12px] text-[#dc2626]">{errors.orgName}</p>}
          </div>
          <div className="space-y-1">
            <label className="block text-[13px] font-medium text-[#000100]">Organization code<span className="ml-0.5 text-[#b8b8b8]">*</span></label>
            <input type="text" value={form.orgCode} onChange={(e) => handleChange('orgCode', e.target.value)} onBlur={() => handleBlur('orgCode')} placeholder="e.g., KTC" className={inputCls(errors.orgCode)} />
            {errors.orgCode && <p className="text-[12px] text-[#dc2626]">{errors.orgCode}</p>}
            <p className="text-[11px] text-[#b8b8b8]">Unique uppercase code</p>
          </div>
          <div className="space-y-1">
            <label className="block text-[13px] font-medium text-[#000100]">Organization type<span className="ml-0.5 text-[#b8b8b8]">*</span></label>
            <div className="relative">
              <button type="button" onClick={() => setOrgTypeOpen(!orgTypeOpen)}
                className={cn('flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2.5 text-[14px] transition-colors',
                  errors.orgType ? 'border-[#dc2626]' : 'border-[#b8b8b8]/50 hover:border-[#b8b8b8]',
                  form.orgType ? 'text-[#000100]' : 'text-[#b8b8b8]')}>
                <span>{form.orgType ? ORG_TYPES.find((o) => o.value === form.orgType)?.label : 'Select type'}</span>
                <ChevronDown className={cn('h-4 w-4 text-[#b8b8b8] transition-transform', orgTypeOpen && 'rotate-180')} />
              </button>
              {orgTypeOpen && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-[#b8b8b8]/40 bg-white shadow-lg">
                  {ORG_TYPES.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => selectOrgType(opt.value)}
                      className={cn('flex w-full flex-col px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-[#f5f5f5]',
                        form.orgType === opt.value && 'bg-[#f5f5f5]')}>
                      <span className="font-medium text-[#000100]">{opt.label}</span>
                      <span className="text-[12px] text-[#b8b8b8]">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.orgType && <p className="text-[12px] text-[#dc2626]">{errors.orgType}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Country" value={form.country} onChange={(e) => handleChange('country', e.target.value)} />
            <Input label="Province" placeholder="e.g., Kigali" value={form.province} onChange={(e) => handleChange('province', e.target.value)} />
          </div>
          <Input label="District" placeholder="e.g., Nyarugenge" value={form.district} onChange={(e) => handleChange('district', e.target.value)} />
          <Input label="Website" placeholder="https://..." value={form.website} onChange={(e) => handleChange('website', e.target.value)} onBlur={() => handleBlur('website')} error={touched.website ? errors.website : ''} />
        </motion.div>
      );
      case 1: return (
        <motion.div key="s1" variants={pageVariants} initial="enter" animate="center" exit="exit" className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[13px] font-medium text-[#000100]">First name<span className="ml-0.5 text-[#b8b8b8]">*</span></label>
              <input type="text" value={form.firstName} onChange={(e) => handleChange('firstName', e.target.value)} onBlur={() => handleBlur('firstName')} placeholder="First name" className={inputCls(errors.firstName)} />
              {errors.firstName && <p className="text-[12px] text-[#dc2626]">{errors.firstName}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-[13px] font-medium text-[#000100]">Last name<span className="ml-0.5 text-[#b8b8b8]">*</span></label>
              <input type="text" value={form.lastName} onChange={(e) => handleChange('lastName', e.target.value)} onBlur={() => handleBlur('lastName')} placeholder="Last name" className={inputCls(errors.lastName)} />
              {errors.lastName && <p className="text-[12px] text-[#dc2626]">{errors.lastName}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-[13px] font-medium text-[#000100]">Email<span className="ml-0.5 text-[#b8b8b8]">*</span></label>
            <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} onBlur={() => handleBlur('email')} placeholder="admin@organization.com" className={inputCls(errors.email)} />
            {errors.email && <p className="text-[12px] text-[#dc2626]">{errors.email}</p>}
          </div>
          <PhoneInput label="Phone number" value={form.phone} onChange={(v) => handleChange('phone', v)} onBlur={() => handleBlur('phone')} error={touched.phone ? errors.phone : undefined} required />
          <Input label="Position" placeholder="e.g., Director, HR Manager" value={form.position} onChange={(e) => handleChange('position', e.target.value)} />
        </motion.div>
      );
      case 2: return (
        <motion.div key="s2" variants={pageVariants} initial="enter" animate="center" exit="exit" className="space-y-5">
          <div className="space-y-1">
            <label className="block text-[13px] font-medium text-[#000100]">Password<span className="ml-0.5 text-[#b8b8b8]">*</span></label>
            <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => handleChange('password', e.target.value)} onBlur={() => handleBlur('password')} placeholder="Create a password" className={inputCls(errors.password)} />
            {errors.password && <p className="text-[12px] text-[#dc2626]">{errors.password}</p>}
          </div>
          {form.password && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors duration-300',
                    i <= (passwordStrength.label === 'Weak' ? 1 : passwordStrength.label === 'Fair' ? 2 : passwordStrength.label === 'Good' ? 3 : 4) ? passwordStrength.color : '#f5f5f5',
                  )} />
                ))}
              </div>
              <p className="text-[11px] text-[#b8b8b8]">Strength: {passwordStrength.label}</p>
            </div>
          )}
          <div className="space-y-1">
            <label className="block text-[13px] font-medium text-[#000100]">Confirm password<span className="ml-0.5 text-[#b8b8b8]">*</span></label>
            <input type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => handleChange('confirmPassword', e.target.value)} onBlur={() => handleBlur('confirmPassword')} placeholder="Re-enter password" className={inputCls(errors.confirmPassword)} />
            {errors.confirmPassword && <p className="text-[12px] text-[#dc2626]">{errors.confirmPassword}</p>}
          </div>
          <div className="flex items-start gap-3 pt-2">
            <button type="button" onClick={() => setAcceptedTerms(!acceptedTerms)}
              className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                acceptedTerms ? 'border-[#000100] bg-[#000100]' : 'border-[#b8b8b8]/50')}>
              {acceptedTerms && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
            </button>
            <label onClick={() => setAcceptedTerms(!acceptedTerms)} className="text-[13px] text-[#b8b8b8] cursor-pointer select-none leading-relaxed">
              I agree to the <span className="text-[#000100] font-medium">Terms of Service</span> and <span className="text-[#000100] font-medium">Privacy Policy</span>
            </label>
          </div>
          {errors.terms && <p className="text-[12px] text-[#dc2626]">{errors.terms}</p>}
        </motion.div>
      );
      case 3: return (
        <motion.div key="s3" variants={pageVariants} initial="enter" animate="center" exit="exit">
          {serverError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-[#dc2626]/5 p-3 text-[13px] text-[#dc2626]" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{serverError}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {PLAN_OPTIONS.map((plan) => (
              <button key={plan.id} type="button" onClick={() => setChosenPlan(plan.id)}
                className={cn('group relative flex flex-col items-start rounded-xl border p-4 text-left transition-all duration-150',
                  chosenPlan === plan.id ? 'border-[#000100] bg-[#000100] text-white shadow-md' : 'border-[#b8b8b8]/40 bg-white hover:border-[#b8b8b8]')}>
                <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                  chosenPlan === plan.id ? 'bg-white/10' : 'bg-[#f5f5f5] group-hover:bg-[#f0f0f0]')}>
                  <plan.icon className={cn('h-4 w-4', chosenPlan === plan.id ? 'text-white' : 'text-[#000100]')} />
                </div>
                <p className={cn('text-[13px] font-semibold', chosenPlan === plan.id ? 'text-white' : 'text-[#000100]')}>{plan.title}</p>
                <p className={cn('mt-1 text-[12px] leading-relaxed', chosenPlan === plan.id ? 'text-white/70' : 'text-[#b8b8b8]')}>{plan.description}</p>
                {chosenPlan === plan.id && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 right-3">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </motion.div>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      );
      default: return null;
    }
  };

  const stepHeadings: Record<number, { title: string; sub: string }> = {
    0: { title: 'Organization details', sub: 'Tell us about your organization.' },
    1: { title: 'Account owner', sub: 'Primary administrator account.' },
    2: { title: 'Secure your account', sub: 'Create a password for your admin account.' },
    3: { title: 'Choose a plan', sub: 'Select the right plan for your organization.' },
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left: Form panel */}
      <div className="flex w-full flex-col lg:w-[55%]">
        <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-lg">
            {/* Logo */}
            <div className="mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#000100]">
                <span className="text-[14px] font-bold text-white">Q</span>
              </div>
            </div>

            {/* Step heading */}
            <AnimatePresence mode="wait">
              <motion.div key={step} variants={pageVariants} initial="enter" animate="center" exit="exit">
                <h1 className="text-[24px] font-semibold text-[#000100]">{stepHeadings[step]!.title}</h1>
                <p className="mt-1.5 text-[14px] text-[#b8b8b8]">{stepHeadings[step]!.sub}</p>
              </motion.div>
            </AnimatePresence>

            {/* Form */}
            <div className="mt-8">
              <AnimatePresence mode="wait">
                {renderStep()}
              </AnimatePresence>
            </div>

            {/* Bottom navigation */}
            <div className="mt-10 flex items-center justify-between border-t border-[#b8b8b8]/20 pt-5">
              <div>
                {step > 0 ? (
                  <button onClick={handleBack} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#b8b8b8] hover:text-[#000100] transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Go back
                  </button>
                ) : (
                  <Link to="/auth/register" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#b8b8b8] hover:text-[#000100] transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Go back
                  </Link>
                )}
              </div>
              <Button onClick={handleNext} loading={loading && step === STEPS.length - 1}>
                {step === STEPS.length - 1 ? 'Create Organization' : 'Continue'}
                {step < STEPS.length - 1 && <ArrowRight className="ml-1.5 h-3.5 w-3.5" />}
              </Button>
            </div>

            {step === 0 && (
              <p className="mt-6 text-center text-[13px] text-[#b8b8b8]">
                Already have an account?{' '}
                <Link to="/auth/login" className="font-medium text-[#000100] hover:underline">Sign in</Link>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right: Preview panel */}
      <div className="hidden w-[45%] border-l border-[#b8b8b8]/20 bg-[#f5f5f5] p-4 lg:block">
        <PreviewPanel />
      </div>
    </div>
  );
}

export default RegisterOrganizationPage;
