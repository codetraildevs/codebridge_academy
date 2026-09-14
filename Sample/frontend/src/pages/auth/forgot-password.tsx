import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { authService } from '@services/auth-service';
import { Mail, Lock, ArrowLeft, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import { cn } from '@utils/cn';

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: '', color: '', width: '0%' };
  const checks = [
    password.length >= 8, /[a-z]/.test(password), /[A-Z]/.test(password),
    /\d/.test(password), /[@$!%*?&]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  if (score <= 2) return { label: 'Weak', color: 'bg-[#dc2626]', width: '25%' };
  if (score <= 3) return { label: 'Fair', color: 'bg-[#d97706]', width: '50%' };
  if (score <= 4) return { label: 'Good', color: 'bg-[#0A0A3B]', width: '75%' };
  return { label: 'Strong', color: 'bg-[#000100]', width: '100%' };
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const passwordStrength = getPasswordStrength(password);

  const validateEmail = (): boolean => {
    if (!email.trim()) { setEmailError('Required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('Valid email required'); return false; }
    setEmailError('');
    return true;
  };

  const validateCode = (): boolean => {
    if (!code.trim() || code.length < 4) { setCodeError('Enter the verification code'); return false; }
    setCodeError('');
    return true;
  };

  const validatePassword = (): boolean => {
    if (!password) { setPasswordError('Required'); return false; }
    if (password.length < 8) { setPasswordError('Min 8 characters'); return false; }
    if (!/(?=.*[a-z])/.test(password)) { setPasswordError('Need a lowercase letter'); return false; }
    if (!/(?=.*[A-Z])/.test(password)) { setPasswordError('Need an uppercase letter'); return false; }
    if (!/(?=.*\d)/.test(password)) { setPasswordError('Need a number'); return false; }
    if (!/(?=.*[@$!%*?&])/.test(password)) { setPasswordError('Need a special character'); return false; }
    if (password !== confirmPassword) { setConfirmError('Passwords do not match'); return false; }
    setPasswordError('');
    setConfirmError('');
    return true;
  };

  const handleSendCode = async () => {
    if (!validateEmail()) return;
    setLoading(true);
    setError('');
    try {
      await authService.forgotPassword(email);
      setSuccess('Code sent');
      setTimeout(() => setStep(1), 500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!validateCode()) return;
    setLoading(true);
    setError('');
    try {
      setSuccess('Code verified');
      setTimeout(() => setStep(2), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validatePassword()) return;
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword(code, password);
      setSuccess('Password reset');
      setTimeout(() => navigate('/auth/login'), 1000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const stepContent = () => {
    switch (step) {
      case 0:
        return (
          <motion.div key="email" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
            <div className="mb-6">
              <h3 className="text-[18px] font-semibold text-[#000100]">Reset your password</h3>
              <p className="mt-1 text-[13px] text-[#b8b8b8]">Enter your email and we'll send you a code.</p>
            </div>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              error={touched.email ? emailError : undefined}
              autoFocus
              required
            />
            <Button fullWidth size="lg" loading={loading} onClick={handleSendCode}>
              Send Code
            </Button>
          </motion.div>
        );

      case 1:
        return (
          <motion.div key="code" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
            <div className="mb-6">
              <h3 className="text-[18px] font-semibold text-[#000100]">Enter verification code</h3>
              <p className="mt-1 text-[13px] text-[#b8b8b8]">We sent a code to <span className="text-[#000100] font-medium">{email}</span></p>
            </div>
            <Input
              label="Code"
              placeholder="Enter the code from your email"
              value={code}
              onChange={(e) => { setCode(e.target.value); setCodeError(''); }}
              error={codeError}
              autoFocus
              maxLength={8}
            />
            <Button fullWidth size="lg" loading={loading} onClick={handleVerifyCode}>
              Verify
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="inline-flex items-center gap-1.5 text-[13px] text-[#b8b8b8] hover:text-[#000100] transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Change email
              </button>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div key="password" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
            <div className="mb-6">
              <h3 className="text-[18px] font-semibold text-[#000100]">Create new password</h3>
              <p className="mt-1 text-[13px] text-[#b8b8b8]">Choose a strong password you haven't used before.</p>
            </div>
            <Input
              label="New password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={passwordError}
              autoFocus
              required
              showPasswordToggle
              passwordVisible={showPassword}
              onPasswordToggle={() => setShowPassword(!showPassword)}
            />
            {password && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1 flex-1 rounded-full transition-colors duration-300',
                        i <= (passwordStrength.label === 'Weak' ? 1 : passwordStrength.label === 'Fair' ? 2 : passwordStrength.label === 'Good' ? 3 : 4)
                          ? passwordStrength.color
                          : '#f5f5f5',
                      )}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-[#b8b8b8]">Strength: {passwordStrength.label}</p>
              </div>
            )}
            <Input
              label="Confirm password"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(''); }}
              error={confirmError}
              required
            />
            <Button fullWidth size="lg" loading={loading} onClick={handleResetPassword}>
              Reset Password
            </Button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg bg-[#dc2626]/5 p-3 text-[13px] text-[#dc2626]" role="alert">
          {error}
        </motion.div>
      )}
      {success && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg bg-[#f5f5f5] p-3 text-[13px] text-[#000100]">
          {success}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {stepContent()}
      </AnimatePresence>

      <div className="text-center pt-2">
        <Link to="/auth/login" className="inline-flex items-center gap-1.5 text-[13px] text-[#b8b8b8] hover:text-[#000100] transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
