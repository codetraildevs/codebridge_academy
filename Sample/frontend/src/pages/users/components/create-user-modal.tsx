import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@components/ui/modal';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { SeatsMeter } from '@components/ui/seats-meter';
import { userService } from '@services/user-service';
import { organizationService } from '@services/organization-service';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Shield,
  User,
} from 'lucide-react';

type RoleValue = 'PLATFORM_OWNER' | 'ORGANIZATION_OWNER' | 'ADMIN' | 'DESIGNER' | 'ASSESSOR' | 'CANDIDATE';

const ROLE_OPTIONS: Array<{ value: RoleValue; label: string; description: string }> = [
  {
    value: 'PLATFORM_OWNER',
    label: 'Platform Owner',
    description: 'Full platform access — create organizations and manage the platform',
  },
  {
    value: 'ORGANIZATION_OWNER',
    label: 'Organization Owner',
    description: 'Bootstrap a new organization together with its first owner',
  },
  {
    value: 'ADMIN',
    label: 'Admin',
    description: 'Day-to-day operations — manage users, exams, and candidates',
  },
  {
    value: 'DESIGNER',
    label: 'Designer',
    description: 'Create and design assessments, questions, and rubrics',
  },
  {
    value: 'ASSESSOR',
    label: 'Assessor',
    description: 'Review submissions, moderate AI scores, and grade candidates',
  },
  {
    value: 'CANDIDATE',
    label: 'Candidate',
    description: 'Takes assessments and submits work from the candidate portal',
  },
];

/** Platform owners can mint new platform owners / organizations; org users
 *  only get in-org member roles and may never create another organization. */
function availableRoles(isPlatformOwner: boolean): typeof ROLE_OPTIONS {
  return isPlatformOwner
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((r) => ['ADMIN', 'DESIGNER', 'ASSESSOR', 'CANDIDATE'].includes(r.value));
}

const ORG_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'TVET_SCHOOL', label: 'TVET School' },
  { value: 'SECONDARY_SCHOOL', label: 'Secondary School' },
  { value: 'UNIVERSITY', label: 'University' },
  { value: 'COMPANY', label: 'Company' },
  { value: 'GOVERNMENT_INSTITUTION', label: 'Government Institution' },
  { value: 'EXAMINATION_AUTHORITY', label: 'Examination Authority' },
  { value: 'CERTIFICATION_BODY', label: 'Certification Body' },
  { value: 'NGO', label: 'NGO' },
  { value: 'TRAINING_CENTER', label: 'Training Center' },
  { value: 'OTHER', label: 'Other' },
];

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  isPlatformOwner: boolean;
}

export function CreateUserModal({ isOpen, onClose, onCreated, isPlatformOwner }: CreateUserModalProps) {
  const [step, setStep] = useState<'form' | 'credentials'>('form');
  const [form, setForm] = useState({
    role: 'ADMIN' as RoleValue,
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    orgName: '',
    orgCode: '',
    orgType: 'OTHER',
    orgEmail: '',
    orgPhone: '',
    orgWebsite: '',
    orgAddress: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [created, setCreated] = useState<{
    email: string;
    firstName: string;
    lastName: string;
    orgName?: string;
    temporaryPassword?: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const roles = availableRoles(isPlatformOwner);

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setForm({
        role: 'ADMIN',
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        orgName: '',
        orgCode: '',
        orgType: 'OTHER',
        orgEmail: '',
        orgPhone: '',
        orgWebsite: '',
        orgAddress: '',
      });
      setErrors({});
      setSubmitError('');
      setCreated(null);
      setShowPassword(false);
      setCopied(false);
    }
  }, [isOpen]);

  // Org managers create into their own org, so surface its plan-based seats.
  const { data: orgProfile } = useQuery({
    queryKey: ['org-profile', 'create-user'],
    queryFn: () => organizationService.getProfile(),
    enabled: isOpen && !isPlatformOwner,
  });
  const { data: roster } = useQuery({
    queryKey: ['org-user-count', 'create-user'],
    queryFn: () => userService.listUsers({ page: 1, limit: 1 }),
    enabled: isOpen && !isPlatformOwner,
  });
  const seatsUsed = roster?.meta.totalItems ?? 0;

  const needsOrganization = isPlatformOwner && form.role === 'ORGANIZATION_OWNER';
  const selectedRole = ROLE_OPTIONS.find((r) => r.value === form.role);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address';
    }
    if (!form.firstName.trim()) next.firstName = 'First name is required';
    if (!form.lastName.trim()) next.lastName = 'Last name is required';
    if (!form.role) next.role = 'Role is required';
    if (needsOrganization) {
      if (!form.orgName.trim()) next.orgName = 'Organization name is required';
      if (!/^[A-Z0-9_]{2,20}$/.test(form.orgCode.trim())) {
        next.orgCode = 'Code must be 2-20 uppercase letters, numbers, or underscore';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload: Parameters<typeof userService.createUser>[0] = {
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: form.role,
        phone: form.phone.trim() || undefined,
      };
      if (needsOrganization) {
        payload.organization = {
          name: form.orgName.trim(),
          code: form.orgCode.trim().toUpperCase(),
          organizationType: form.orgType,
          email: form.orgEmail.trim() || undefined,
          phone: form.orgPhone.trim() || undefined,
          website: form.orgWebsite.trim() || undefined,
          address: form.orgAddress.trim() || undefined,
        };
      }
      const result = await userService.createUser(payload);
      setCreated({
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        orgName: payload.organization?.name,
        temporaryPassword: result.temporaryPassword ?? 'Welcome@123',
      });
      setStep('credentials');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setSubmitError(e.response?.data?.message || e.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!created?.temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(created.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — user can copy manually
    }
  };

  const handleDone = () => {
    onCreated();
    onClose();
  };

  const inputCls =
    'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';

  return (
    <Modal
      isOpen={isOpen}
      onClose={step === 'form' ? onClose : () => setStep('form')}
      title={step === 'form' ? 'Add User' : 'Credentials'}
      description={
        step === 'form'
          ? isPlatformOwner
            ? 'Create an account, or bootstrap a new organization with its owner'
            : 'Create an account for a member of your organization'
          : 'Share these login credentials with the new user'
      }
      size="lg"
    >
      {step === 'form' ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="role-select" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Role <span className="text-error">*</span>
            </label>
            <div className="relative">
              <Shield className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <select
                id="role-select"
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value as RoleValue }))
                }
                className={`${inputCls} pl-10`}
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-xs text-text-tertiary">{selectedRole?.description}</p>
          </div>

          {!isPlatformOwner && orgProfile && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-secondary px-3 py-2">
              <span className="text-xs text-text-secondary">User seats</span>
              <SeatsMeter variant="chip" used={seatsUsed} max={orgProfile.maxUsers ?? 0} />
            </div>
          )}

          {needsOrganization && (
            <div className="space-y-4 rounded-xl border border-primary-100 bg-primary-50/40 p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary-700" />
                <span className="text-sm font-medium text-text-primary">New Organization</span>
              </div>
              <p className="-mt-2 text-xs text-text-tertiary">
                Details of the organization to create.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Organization Name"
                  placeholder="e.g., Luminary Tech"
                  icon={<Building2 className="h-4 w-4" />}
                  value={form.orgName}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, orgName: e.target.value }));
                    if (errors.orgName) setErrors((er) => ({ ...er, orgName: '' }));
                  }}
                  error={errors.orgName}
                  required
                  fullWidth
                />
                <Input
                  label="Organization Code"
                  placeholder="LUMTECH"
                  value={form.orgCode}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, orgCode: e.target.value.toUpperCase() }));
                    if (errors.orgCode) setErrors((er) => ({ ...er, orgCode: '' }));
                  }}
                  error={errors.orgCode}
                  required
                  fullWidth
                />
              </div>
              <div>
                <label htmlFor="org-type-select" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Organization Type
                </label>
                <select
                  id="org-type-select"
                  value={form.orgType}
                  onChange={(e) => setForm((f) => ({ ...f, orgType: e.target.value }))}
                  className={inputCls}
                >
                  {ORG_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Organization Email (optional)"
                  type="email"
                  placeholder="contact@organization.com"
                  value={form.orgEmail}
                  onChange={(e) => setForm((f) => ({ ...f, orgEmail: e.target.value }))}
                  fullWidth
                />
                <Input
                  label="Organization Phone (optional)"
                  type="tel"
                  placeholder="+250 7XX XXX XXX"
                  value={form.orgPhone}
                  onChange={(e) => setForm((f) => ({ ...f, orgPhone: e.target.value }))}
                  fullWidth
                />
              </div>
              <Input
                label="Website (optional)"
                type="url"
                placeholder="https://organization.com"
                value={form.orgWebsite}
                onChange={(e) => setForm((f) => ({ ...f, orgWebsite: e.target.value }))}
                fullWidth
              />
              <Input
                label="Address (optional)"
                placeholder="Street, City"
                value={form.orgAddress}
                onChange={(e) => setForm((f) => ({ ...f, orgAddress: e.target.value }))}
                fullWidth
              />
            </div>
          )}

          {needsOrganization ? (
            <div className="space-y-4 rounded-xl border border-border bg-surface-secondary/60 p-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary-700" />
                <span className="text-sm font-medium text-text-primary">Owner Account</span>
              </div>
              <p className="-mt-2 text-xs text-text-tertiary">
                Login credentials for the person who will manage this organization.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  placeholder="Jean"
                  icon={<User className="h-4 w-4" />}
                  value={form.firstName}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, firstName: e.target.value }));
                    if (errors.firstName) setErrors((er) => ({ ...er, firstName: '' }));
                  }}
                  error={errors.firstName}
                  required
                  fullWidth
                />
                <Input
                  label="Last Name"
                  placeholder="Bizimana"
                  value={form.lastName}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, lastName: e.target.value }));
                    if (errors.lastName) setErrors((er) => ({ ...er, lastName: '' }));
                  }}
                  error={errors.lastName}
                  required
                  fullWidth
                />
              </div>

              <Input
                label="Email Address"
                type="email"
                placeholder="user@organization.com"
                icon={<Mail className="h-4 w-4" />}
                value={form.email}
                onChange={(e) => {
                  setForm((f) => ({ ...f, email: e.target.value }));
                  if (errors.email) setErrors((er) => ({ ...er, email: '' }));
                }}
                error={errors.email}
                required
                fullWidth
              />

              <Input
                label="Phone (optional)"
                type="tel"
                placeholder="+250 7XX XXX XXX"
                icon={<Phone className="h-4 w-4" />}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                fullWidth
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  placeholder="Jean"
                  icon={<User className="h-4 w-4" />}
                  value={form.firstName}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, firstName: e.target.value }));
                    if (errors.firstName) setErrors((er) => ({ ...er, firstName: '' }));
                  }}
                  error={errors.firstName}
                  required
                  fullWidth
                />
                <Input
                  label="Last Name"
                  placeholder="Bizimana"
                  value={form.lastName}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, lastName: e.target.value }));
                    if (errors.lastName) setErrors((er) => ({ ...er, lastName: '' }));
                  }}
                  error={errors.lastName}
                  required
                  fullWidth
                />
              </div>

              <Input
                label="Email Address"
                type="email"
                placeholder="user@organization.com"
                icon={<Mail className="h-4 w-4" />}
                value={form.email}
                onChange={(e) => {
                  setForm((f) => ({ ...f, email: e.target.value }));
                  if (errors.email) setErrors((er) => ({ ...er, email: '' }));
                }}
                error={errors.email}
                required
                fullWidth
              />

              <Input
                label="Phone (optional)"
                type="tel"
                placeholder="+250 7XX XXX XXX"
                icon={<Phone className="h-4 w-4" />}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                fullWidth
              />
            </>
          )}

          {submitError && (
            <div className="flex items-start gap-2 rounded-lg border border-error/20 bg-error-light p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
              <p className="text-sm text-error-dark">{submitError}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" loading={submitting} onClick={handleSubmit}>
              {needsOrganization ? 'Create Organization & Owner' : 'Create User'}
            </Button>
          </div>
        </div>
      ) : (
        created && (
          <div className="space-y-6">
            <div className="flex flex-col items-center py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-light">
                <CheckCircle2 className="h-7 w-7 text-success" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-text-primary">
                {created.orgName ? 'Organization Created' : 'Account Created'}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-text-tertiary">
                {created.orgName
                  ? `${created.orgName} and its owner account were created. Credentials were emailed to ${created.email} — they are also listed below in case you want to share them again.`
                  : 'The account was created and the login credentials were emailed to the new user. They are also listed below in case you want to share them again.'}
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-surface-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                  {created.firstName[0]}
                  {created.lastName[0]}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {created.firstName} {created.lastName}
                  </p>
                  <p className="truncate text-xs text-text-tertiary">{created.email}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-white p-3">
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Login Email
                </label>
                <p className="rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm text-text-primary">
                  {created.email}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-white p-3">
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Temporary Password
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      readOnly
                      value={created.temporaryPassword}
                      className="w-full rounded-lg border border-border bg-surface-secondary px-3 py-2 font-mono text-sm text-text-primary"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-tertiary hover:text-text-secondary"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Copy className="h-4 w-4" />}
                    onClick={handleCopyPassword}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button size="sm" onClick={handleDone}>
                Done
              </Button>
            </div>
          </div>
        )
      )}
    </Modal>
  );
}

export default CreateUserModal;