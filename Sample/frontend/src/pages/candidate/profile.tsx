import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { useAuthStore } from '@stores/auth-store';
import { useAuth } from '@hooks/use-auth';
import { candidateService } from '@services/candidate-service';
import {
  User,
  Mail,
  Phone,
  Save,
  Lock,
  KeyRound,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Building2,
  CalendarDays,
  BadgeCheck,
  Clock,
} from 'lucide-react';
import { formatDate } from '@utils/format';

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: '', color: '', width: '0%' };
  const checks = [
    password.length >= 8, /[a-z]/.test(password), /[A-Z]/.test(password),
    /\d/.test(password), /[@$!%*?&]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  if (score <= 2) return { label: 'Weak', color: 'bg-error', width: '25%' };
  if (score <= 3) return { label: 'Fair', color: 'bg-warning', width: '50%' };
  if (score <= 4) return { label: 'Good', color: 'bg-accent-500', width: '75%' };
  return { label: 'Strong', color: 'bg-accent-600', width: '100%' };
}

export function CandidateProfilePage() {
  const user = useAuthStore((state) => state.user);
  const { logout } = useAuth();

  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const passwordStrength = getPasswordStrength(passwordForm.newPassword);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileSaving(true);
    try {
      const result = await candidateService.updateProfile(profileForm);
      useAuthStore.getState().setUser({
        ...user!,
        firstName: result.firstName,
        lastName: result.lastName,
        phone: result.phone,
      });
      setProfileSuccess('Profile updated successfully!');
    } catch (err: any) {
      setProfileError(err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await candidateService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPasswordError(err?.response?.data?.message || 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Candidate';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ── Header ─────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">My Profile</h1>
        <p className="mt-1 text-sm text-text-secondary">Manage your account information and security</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Profile Card ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary-500" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleProfileSubmit}>
              <CardBody>
                {profileSuccess && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-accent-200 bg-accent-50 p-3 text-sm text-accent-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {profileSuccess}
                  </div>
                )}
                {profileError && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-error/20 bg-error-light p-3 text-sm text-error-dark">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {profileError}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="First Name"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))}
                    icon={<User className="h-4 w-4" />}
                    required
                  />
                  <Input
                    label="Last Name"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))}
                    icon={<User className="h-4 w-4" />}
                    required
                  />
                  <Input
                    label="Email"
                    value={user?.email || ''}
                    disabled
                    icon={<Mail className="h-4 w-4" />}
                    hint="Email cannot be changed"
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    placeholder="+250 7XX XXX XXX"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                    icon={<Phone className="h-4 w-4" />}
                  />
                </div>
              </CardBody>
              <CardFooter>
                <Button type="submit" loading={profileSaving} icon={<Save className="h-4 w-4" />}>
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary-500" />
                Change Password
              </CardTitle>
            </CardHeader>
            <form onSubmit={handlePasswordSubmit}>
              <CardBody>
                {passwordSuccess && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-accent-200 bg-accent-50 p-3 text-sm text-accent-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {passwordSuccess}
                  </div>
                )}
                {passwordError && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-error/20 bg-error-light p-3 text-sm text-error-dark">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {passwordError}
                  </div>
                )}
                <div className="space-y-4">
                  <Input
                    label="Current Password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                    icon={<KeyRound className="h-4 w-4" />}
                    showPasswordToggle
                    passwordVisible={showCurrentPassword}
                    onPasswordToggle={() => setShowCurrentPassword(!showCurrentPassword)}
                    required
                    autoComplete="current-password"
                  />
                  <Input
                    label="New Password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                    icon={<Lock className="h-4 w-4" />}
                    showPasswordToggle
                    passwordVisible={showNewPassword}
                    onPasswordToggle={() => setShowNewPassword(!showNewPassword)}
                    required
                    autoComplete="new-password"
                  />
                  {passwordForm.newPassword && (
                    <div className="-mt-1 mb-1">
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
                        <div className={`rounded-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: passwordStrength.width }} />
                      </div>
                      <p className={`mt-0.5 text-xs ${passwordStrength.label === 'Weak' ? 'text-error' : passwordStrength.label === 'Fair' ? 'text-warning' : 'text-accent-600'}`}>
                        Strength: {passwordStrength.label}
                      </p>
                    </div>
                  )}
                  <Input
                    label="Confirm New Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    icon={<Shield className="h-4 w-4" />}
                    showPasswordToggle
                    passwordVisible={showConfirmPassword}
                    onPasswordToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </CardBody>
              <CardFooter>
                <Button type="submit" loading={passwordSaving} icon={<Save className="h-4 w-4" />}>
                  Update Password
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* ── Account Summary Sidebar ──────────────── */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-accent-500" />
                Account Summary
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col items-center py-4 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-50 text-2xl font-bold text-primary-700">
                  {displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-text-primary">{displayName}</h3>
                <p className="text-sm text-text-tertiary">{user?.email}</p>
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                    {user?.role?.replace('_', ' ') || 'Candidate'}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t border-border pt-4">
                {user?.organizationName && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-text-tertiary" />
                    <div>
                      <p className="text-xs text-text-tertiary">Organization</p>
                      <p className="text-sm font-medium text-text-primary">{user.organizationName}</p>
                    </div>
                  </div>
                )}
                {user?.subscriptionStatus && (
                  <div className="flex items-center gap-3">
                    <BadgeCheck className="h-4 w-4 text-text-tertiary" />
                    <div>
                      <p className="text-xs text-text-tertiary">Status</p>
                      <p className="text-sm font-medium text-text-primary capitalize">{user.subscriptionStatus.toLowerCase()}</p>
                    </div>
                  </div>
                )}
                {user?.createdAt && (
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-text-tertiary" />
                    <div>
                      <p className="text-xs text-text-tertiary">Member Since</p>
                      <p className="text-sm font-medium text-text-primary">
                        {formatDate(user.createdAt, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
                {user?.freeAssessmentsUsed !== undefined && user?.maxFreeAssessments !== undefined && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-text-tertiary" />
                    <div>
                      <p className="text-xs text-text-tertiary">Free Assessments Used</p>
                      <p className="text-sm font-medium text-text-primary">
                        {user.freeAssessmentsUsed} / {user.maxFreeAssessments}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Button variant="danger" fullWidth onClick={logout} icon={<Lock className="h-4 w-4" />}>
                Sign Out
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

export default CandidateProfilePage;
