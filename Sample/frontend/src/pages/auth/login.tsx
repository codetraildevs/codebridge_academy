import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { useAuth } from '@hooks/use-auth';
import { AlertCircle, Check } from 'lucide-react';
import { useAuthStore } from '@stores/auth-store';
import { cn } from '@utils/cn';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, verifyMfa } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // MFA challenge step
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaEmail, setMfaEmail] = useState('');
  const [mfaDevCode, setMfaDevCode] = useState('');
  const [mfaExpiresIn, setMfaExpiresIn] = useState(30);

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'email':
        if (!value.trim()) return 'Required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Valid email required';
        return '';
      case 'password':
        if (!value) return 'Required';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
    if (error) setError('');
  };

  const handleBlur = (name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, form[name as keyof typeof form]) }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    Object.keys(form).forEach((key) => {
      const err = validateField(key, form[key as keyof typeof form]);
      if (err) newErrors[key] = err;
    });
    setErrors(newErrors);
    setTouched({ email: true, password: true });
    return Object.keys(newErrors).length === 0;
  };

  const redirectAfterAuth = () => {
    const currentUser = useAuthStore.getState().user;
    if (currentUser?.role === 'CANDIDATE' || currentUser?.role === 'INDIVIDUAL_CANDIDATE') {
      navigate('/candidate-portal');
    } else {
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await login(form);
      if (result?.mfaRequired) {
        setMfaToken(result.mfaToken ?? '');
        setMfaEmail(form.email);
        setMfaDevCode(result.devCode ?? '');
        setMfaCode(result.devCode ?? '');
        setError('');
        return;
      }
      redirectAfterAuth();
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || '';
      if (status === 429) {
        setError(msg || 'Too many login attempts. Please wait a few minutes and try again.');
      } else if (msg.toLowerCase().includes('deactivated')) {
        setError('This account has been deactivated. Please contact support.');
      } else if (status === 401 || status === 400) {
        setError(msg || 'Invalid email or password. Please try again.');
      } else {
        setError(msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mfaCode.trim().length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }

    setLoading(true);
    try {
      await verifyMfa(mfaToken, mfaCode.trim());
      redirectAfterAuth();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '';
      setError(msg || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Dev helper: TOTP codes rotate every 30s, so let the user refresh the code
  // (re-submits credentials → new challenge → new code) without typing it.
  const reRequestMfaCode = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await login(form);
      if (result?.mfaRequired) {
        setMfaToken(result.mfaToken ?? '');
        setMfaDevCode(result.devCode ?? '');
        setMfaCode(result.devCode ?? '');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh the dev code before its 30s step expires.
  useEffect(() => {
    if (!mfaDevCode) return;
    setMfaExpiresIn(30);
    const interval = setInterval(() => {
      setMfaExpiresIn((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [mfaDevCode]);

  useEffect(() => {
    if (mfaExpiresIn !== 0 || !mfaDevCode) return;
    void reRequestMfaCode();
  }, [mfaExpiresIn, mfaDevCode]);

  const isFormValid = form.email.trim() && form.password;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="mb-7 text-center">
        <h2 className="text-[22px] font-semibold text-[#000100]">
          {mfaToken ? 'Two-factor authentication' : 'Sign in'}
        </h2>
        <p className="mt-1.5 text-[13px] text-[#b8b8b8]">
          {mfaToken
            ? `Enter the 6-digit code from your authenticator app for ${mfaEmail}.`
            : 'Welcome back. Enter your credentials to continue.'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={mfaToken ? handleMfaSubmit : handleSubmit} className="space-y-4" noValidate>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-lg bg-[#dc2626]/5 p-3 text-[13px] text-[#dc2626]"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {mfaToken ? (
          <>
            <Input
              label="Authentication code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={mfaCode}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                setMfaCode(digits);
                if (error) setError('');
              }}
              required
              autoFocus
              fullWidth
              hint={mfaDevCode ? `Refreshes in ${mfaExpiresIn}s — the field is auto-filled` : 'Codes refresh every 30 seconds'}
            />
            {mfaDevCode && (
              <div className="rounded-lg border border-dashed border-[#2965ff]/40 bg-[#2965ff]/5 p-3 text-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-[#2965ff]">Dev mode — authenticator unavailable</p>
                  <button
                    type="button"
                    onClick={reRequestMfaCode}
                    disabled={loading}
                    className="text-[12px] font-medium text-[#2965ff] hover:underline disabled:opacity-50"
                  >
                    Get new code
                  </button>
                </div>
                <p className="mt-1 text-[#000100]">
                  Use code{' '}
                  <span className="font-mono text-base font-bold tracking-widest text-[#000100]">{mfaDevCode}</span>
                  {' '}— it auto-fills the field above and refreshes in {mfaExpiresIn}s.
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              error={touched.email ? errors.email : undefined}
              required
              autoComplete="email"
              autoFocus
              fullWidth
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              onBlur={() => handleBlur('password')}
              error={touched.password ? errors.password : undefined}
              required
              autoComplete="current-password"
              showPasswordToggle
              passwordVisible={showPassword}
              onPasswordToggle={() => setShowPassword(!showPassword)}
              fullWidth
            />
          </>
        )}

        {!mfaToken && (
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setRememberMe(!rememberMe)}
              className="flex items-center gap-2"
            >
              <div className={cn(
                'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                rememberMe ? 'border-[#000100] bg-[#000100]' : 'border-[#b8b8b8]/50',
              )}>
                {rememberMe && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
              </div>
              <span className="text-[13px] text-[#b8b8b8]">Remember me</span>
            </button>
            <Link
              to="/auth/forgot-password"
              className="text-[13px] font-medium text-[#000100] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        )}

        <div className="pt-1">
          <Button
            type="submit"
            loading={loading}
            disabled={mfaToken ? mfaCode.length !== 6 && !loading : !isFormValid && !loading}
            fullWidth
            size="lg"
          >
            {mfaToken ? 'Verify Code' : 'Sign In'}
          </Button>
        </div>

        {mfaToken && (
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => {
                setMfaToken('');
                setMfaCode('');
                setMfaEmail('');
                setError('');
              }}
              className="text-[13px] font-medium text-[#000100] hover:underline"
            >
              Back to sign in
            </button>
          </div>
        )}
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#b8b8b8]/30" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase">
          <span className="bg-white px-3 text-[#b8b8b8]">or</span>
        </div>
      </div>

      {/* Social buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled
          className="flex items-center justify-center gap-2 rounded-lg border border-[#b8b8b8]/40 bg-white px-4 py-2.5 text-[13px] font-medium text-[#b8b8b8] opacity-50 cursor-not-allowed"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </button>
        <button
          type="button"
          disabled
          className="flex items-center justify-center gap-2 rounded-lg border border-[#b8b8b8]/40 bg-white px-4 py-2.5 text-[13px] font-medium text-[#b8b8b8] opacity-50 cursor-not-allowed"
        >
          <svg className="h-4 w-4" viewBox="0 0 23 23">
            <rect x="1" y="1" width="10" height="10" fill="#f25022" rx="1" />
            <rect x="12" y="1" width="10" height="10" fill="#7fba00" rx="1" />
            <rect x="1" y="12" width="10" height="10" fill="#00a4ef" rx="1" />
            <rect x="12" y="12" width="10" height="10" fill="#ffb900" rx="1" />
          </svg>
          Microsoft
        </button>
      </div>

      {/* Register link */}
      <p className="mt-6 text-center text-[13px] text-[#b8b8b8]">
        Don't have an account?{' '}
        <Link to="/auth/register" className="font-medium text-[#000100] hover:underline">
          Create one
        </Link>
      </p>
    </motion.div>
  );
}

export default LoginPage;
