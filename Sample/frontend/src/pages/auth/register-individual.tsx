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
  Mail, Lock, User, Phone, Briefcase, GraduationCap,
  CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, Check,
  Code, Database, Shield, BarChart3, Cpu, Settings,
} from 'lucide-react';

const STEPS = [
  { id: 'personal', label: 'Personal Info' },
  { id: 'security', label: 'Security' },
  { id: 'professional', label: 'Professional' },
  { id: 'plan', label: 'Plan' },
];

const PLAN_OPTIONS = [
  { id: 'free', icon: Code, title: 'Free', description: '3 practice assessments per month with basic AI scoring and competency reports.' },
  { id: 'professional', icon: BarChart3, title: 'Professional', description: 'Unlimited assessments, full AI feedback, digital certificates, and competency passport.' },
  { id: 'premium', icon: Shield, title: 'Premium', description: 'Everything in Professional plus official assessments, advanced analytics, and priority support.' },
  { id: 'starter', icon: Database, title: 'Starter', description: 'Up to 25 candidates per month with bulk assessment tools and basic reporting.' },
  { id: 'growth', icon: Cpu, title: 'Growth', description: 'Unlimited candidates, team management, custom branding, and API access.' },
  { id: 'enterprise', icon: Settings, title: 'Enterprise', description: 'Dedicated support, custom integrations, SSO, SLA, and on-premise deployment options.' },
];

const OCCUPATIONS = ['Student', 'Graduate', 'Software Developer', 'Network Engineer', 'Graphic Designer', 'Data Analyst', 'Teacher', 'Entrepreneur', 'Freelancer', 'Other'];
const EDUCATION_LEVELS = ['High School', 'Certificate', 'Diploma', "Bachelor's Degree", "Master's Degree", 'PhD', 'Other'];

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
  firstName: string; lastName: string; email: string; phone: string; country: string;
  password: string; confirmPassword: string;
  occupation: string; educationLevel: string; institution: string; skills: string; yearsExperience: string;
}

const pageVariants = { enter: { opacity: 0, x: 16 }, center: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -16 } };

export function RegisterIndividualPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPlan = searchParams.get('plan');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<'form' | 'success'>('form');
  const [chosenPlan, setChosenPlan] = useState(selectedPlan || 'free');
  const [form, setForm] = useState<FormData>(() => {
    try {
      const saved = sessionStorage.getItem('qual-reg-individual');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {
      firstName: '', lastName: '', email: '', phone: '', country: 'Rwanda',
      password: '', confirmPassword: '', occupation: '', educationLevel: '',
      institution: '', skills: '', yearsExperience: '',
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => { sessionStorage.setItem('qual-reg-individual', JSON.stringify(form)); }, [form]);
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
      default: return '';
    }
  }, [form.password]);

  const handleChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };
  const handleBlur = (name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, form[name as keyof FormData]) }));
  };

  const validateStep = (): boolean => {
    const fields: Record<number, (keyof FormData)[]> = {
      0: ['firstName', 'lastName', 'email', 'phone'],
      1: ['password', 'confirmPassword'],
    };
    const newErrors: Record<string, string> = {};
    (fields[step] || []).forEach((key) => { const err = validateField(key, form[key]); if (err) newErrors[key] = err; });
    if (step === 1 && !acceptedTerms) newErrors.terms = 'Accept terms to continue';
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
      const response = await authService.register({
        email: form.email, password: form.password, firstName: form.firstName,
        lastName: form.lastName, role: 'INDIVIDUAL_CANDIDATE', phone: form.phone || undefined,
      });
      if (response.success) {
        sessionStorage.removeItem('qual-reg-individual');
        setStatus('success');
      } else {
        setServerError(response.message || 'Registration failed');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '';
      setServerError(msg.toLowerCase().includes('email') ? 'This email is already registered.' : msg || 'Registration failed.');
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
            <h2 className="text-[22px] font-semibold text-[#000100]">Account created</h2>
            <p className="mt-2 text-[14px] text-[#b8b8b8]">Your account is ready. Sign in to get started.</p>
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
            <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} onBlur={() => handleBlur('email')} placeholder="you@company.com" className={inputCls(errors.email)} />
            {errors.email && <p className="text-[12px] text-[#dc2626]">{errors.email}</p>}
          </div>
          <PhoneInput label="Phone number" value={form.phone} onChange={(v) => handleChange('phone', v)} onBlur={() => handleBlur('phone')} error={touched.phone ? errors.phone : undefined} required />
          <Input label="Country" value={form.country} onChange={(e) => handleChange('country', e.target.value)} />
        </motion.div>
      );
      case 1: return (
        <motion.div key="s1" variants={pageVariants} initial="enter" animate="center" exit="exit" className="space-y-5">
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
      case 2: return (
        <motion.div key="s2" variants={pageVariants} initial="enter" animate="center" exit="exit" className="space-y-5">
          <div className="space-y-2">
            <label className="block text-[13px] font-medium text-[#000100]">Occupation</label>
            <div className="grid grid-cols-2 gap-2">
              {OCCUPATIONS.map((o) => (
                <button key={o} type="button" onClick={() => handleChange('occupation', o)}
                  className={cn('rounded-lg px-3 py-2 text-[13px] text-left transition-colors border',
                    form.occupation === o ? 'border-[#000100] bg-[#000100] text-white' : 'border-[#b8b8b8]/40 text-[#b8b8b8] hover:border-[#b8b8b8]')}>
                  {o}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[13px] font-medium text-[#000100]">Education level</label>
            <div className="grid grid-cols-2 gap-2">
              {EDUCATION_LEVELS.map((el) => (
                <button key={el} type="button" onClick={() => handleChange('educationLevel', el)}
                  className={cn('rounded-lg px-3 py-2 text-[13px] text-left transition-colors border',
                    form.educationLevel === el ? 'border-[#000100] bg-[#000100] text-white' : 'border-[#b8b8b8]/40 text-[#b8b8b8] hover:border-[#b8b8b8]')}>
                  {el}
                </button>
              ))}
            </div>
          </div>
          <Input label="Institution" placeholder="e.g., University of Rwanda" value={form.institution} onChange={(e) => handleChange('institution', e.target.value)} />
          <Input label="Skills" placeholder="e.g., Software Development" value={form.skills} onChange={(e) => handleChange('skills', e.target.value)} />
          <div className="space-y-2">
            <label className="block text-[13px] font-medium text-[#000100]">Years of experience</label>
            <div className="flex gap-2">
              {['0-1', '1-3', '3-5', '5-10', '10+'].map((y) => (
                <button key={y} type="button" onClick={() => handleChange('yearsExperience', y)}
                  className={cn('flex-1 rounded-lg border px-3 py-2 text-[13px] text-center transition-colors',
                    form.yearsExperience === y ? 'border-[#000100] bg-[#000100] text-white' : 'border-[#b8b8b8]/40 text-[#b8b8b8] hover:border-[#b8b8b8]')}>
                  {y}yr
                </button>
              ))}
            </div>
          </div>
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
    0: { title: 'Personal information', sub: 'Your basic account details.' },
    1: { title: 'Secure your account', sub: 'Create a strong password.' },
    2: { title: 'Professional background', sub: 'Optional — helps personalize your experience.' },
    3: { title: 'Choose a plan', sub: 'Start free, upgrade anytime.' },
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
                {step === STEPS.length - 1 ? 'Create Account' : 'Continue'}
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

export default RegisterIndividualPage;
