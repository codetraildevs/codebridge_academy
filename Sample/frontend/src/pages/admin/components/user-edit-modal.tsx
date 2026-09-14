import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@components/ui/modal';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { adminService } from '@services/admin-service';
import {
  Mail,
  User,
  Phone,
  Shield,
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────

export interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'DESIGNER' | 'ASSESSOR' | 'ORGANIZATION_REVIEWER';
  phone: string;
}

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    phone: string | null;
    isActive: boolean;
  } | null;
}

const emptyForm: UserFormData = {
  email: '',
  firstName: '',
  lastName: '',
  role: 'ADMIN',
  phone: '',
};

const ROLE_OPTIONS: Array<{ value: UserFormData['role']; label: string; description: string }> = [
  { value: 'ADMIN', label: 'Admin', description: 'Day-to-day operations — manage users, exams, candidates' },
  { value: 'DESIGNER', label: 'Designer', description: 'Create and design assessments, questions, and rubrics' },
  { value: 'ASSESSOR', label: 'Assessor', description: 'Review submissions, moderate AI scores, grade candidates' },
  { value: 'ORGANIZATION_REVIEWER', label: 'Reviewer', description: 'Independent moderation, verify assessor decisions' },
];

// ── Component ──────────────────────────────────────

export function UserEditModal({ isOpen, onClose, onSaved, editUser }: UserEditModalProps) {
  const isEditing = !!editUser;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<UserFormData>({ ...emptyForm });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdUser, setCreatedUser] = useState<{
    email: string;
    temporaryPassword: string;
    firstName: string;
    lastName: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const userToEdit = editUser;
      if (userToEdit) {
        setForm({
          email: userToEdit.email,
          firstName: userToEdit.firstName,
          lastName: userToEdit.lastName,
          role: userToEdit.role as UserFormData['role'],
          phone: (userToEdit.phone ?? '') as string,
        });
        setStep(1); // Skip to edit mode directly
      } else {
        setForm({ ...emptyForm });
        setStep(0);
      }
      setErrors({});
      setSubmitError('');
      setCreatedUser(null);
      setCopied(false);
    }
  }, [isOpen, editUser]);

  // ── Validation ───────────────────────────────────
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!isEditing) {
      if (!form.email.trim()) newErrors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        newErrors.email = 'Invalid email format';
      if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
      if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    } else {
      if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
      if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    }

    if (!isEditing && !form.role) newErrors.role = 'Role is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ───────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      if (isEditing && editUser) {
        await adminService.updateUser(editUser.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || undefined,
        });
        onSaved();
        onClose();
      } else {
        const result = await adminService.createUser({
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          phone: form.phone || undefined,
        });
        setCreatedUser({
          email: result.email ?? form.email,
          temporaryPassword: result.temporaryPassword ?? 'Welcome@123',
          firstName: result.firstName ?? form.firstName,
          lastName: result.lastName ?? form.lastName,
        });
        setStep(2); // Show success with credentials
      }
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message || err?.message || 'Failed to save user',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyPassword = async () => {
    if (createdUser) {
      try {
        await navigator.clipboard.writeText(createdUser.temporaryPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback
      }
    }
  };

  const handleDone = () => {
    onSaved();
    onClose();
  };

  // ── Render ───────────────────────────────────────
  const inputCls =
    'w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary/70 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Staff Member' : 'Add Staff Member'}
      description={
        isEditing
          ? 'Update staff member details'
          : 'Create a new admin, designer, assessor, or reviewer account'
      }
      size="md"
    >
      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
          {step === 0 && !isEditing && (
            <motion.div
              key="step-role"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Role Selection Header */}
              <div className="mb-1">
                <h3 className="text-sm font-medium text-text-primary">Select Role</h3>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Choose the type of staff account to create
                </p>
              </div>

              {/* Role Cards */}
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setForm((f) => ({ ...f, role: option.value }))}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                    form.role === option.value
                      ? 'border-primary-500 bg-primary-50 shadow-sm'
                      : 'border-border hover:border-primary-300 hover:bg-surface-secondary'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        form.role === option.value
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-surface-tertiary text-text-tertiary'
                      }`}
                    >
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">
                          {option.label}
                        </span>
                        {form.role === option.value && (
                          <CheckCircle2 className="h-4 w-4 text-primary-600" />
                        )}
                      </div>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}

              {errors.role && (
                <p className="flex items-center gap-1 text-xs text-error">
                  <AlertCircle className="h-3 w-3" />
                  {errors.role}
                </p>
              )}

              {/* Next Button */}
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (!form.role) {
                      setErrors((e) => ({ ...e, role: 'Please select a role' }));
                      return;
                    }
                    setStep(1);
                  }}
                  icon={<ArrowRight className="h-4 w-4" />}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Back button for create mode */}
              {!isEditing && (
                <button
                  onClick={() => setStep(0)}
                  className="flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change role
                </button>
              )}

              {/* Role indicator */}
              {!isEditing && (
                <div className="flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-2">
                  <Shield className="h-4 w-4 text-primary-600" />
                  <span className="text-sm font-medium text-primary-700">
                    {ROLE_OPTIONS.find((r) => r.value === form.role)?.label ?? form.role}
                  </span>
                </div>
              )}

              {/* Email (only for create) */}
              {!isEditing && (
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="staff@organization.com"
                  icon={<Mail className="h-4 w-4" />}
                  value={form.email}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, email: e.target.value }));
                    if (errors.email) setErrors((e) => ({ ...e, email: '' }));
                  }}
                  error={errors.email}
                  required
                  fullWidth
                />
              )}

              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  placeholder="John"
                  icon={<User className="h-4 w-4" />}
                  value={form.firstName}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, firstName: e.target.value }));
                    if (errors.firstName) setErrors((e) => ({ ...e, firstName: '' }));
                  }}
                  error={errors.firstName}
                  required
                  fullWidth
                />
                <Input
                  label="Last Name"
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, lastName: e.target.value }));
                    if (errors.lastName) setErrors((e) => ({ ...e, lastName: '' }));
                  }}
                  error={errors.lastName}
                  required
                  fullWidth
                />
              </div>

              {/* Phone */}
              <Input
                label="Phone (optional)"
                type="tel"
                placeholder="+250 7XX XXX XXX"
                icon={<Phone className="h-4 w-4" />}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                fullWidth
              />

              {/* Error */}
              {submitError && (
                <div className="flex items-start gap-2 rounded-xl border border-error/20 bg-error-light p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
                  <p className="text-sm text-error-dark">{submitError}</p>
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  loading={submitting}
                  onClick={handleSubmit}
                >
                  {isEditing ? 'Save Changes' : 'Create Account'}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && createdUser && (
            <motion.div
              key="step-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Success Message */}
              <div className="flex flex-col items-center py-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-light">
                  <CheckCircle2 className="h-7 w-7 text-success" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-text-primary">
                  Account Created
                </h3>
                <p className="mt-1 text-sm text-text-tertiary max-w-sm">
                  Staff account has been created successfully. Share the temporary
                  password with the user.
                </p>
              </div>

              {/* User Details */}
              <div className="rounded-xl border border-border bg-surface-secondary p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                    {createdUser.firstName[0]}
                    {createdUser.lastName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {createdUser.firstName} {createdUser.lastName}
                    </p>
                    <p className="text-xs text-text-tertiary">{createdUser.email}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-white p-3">
                  <label className="text-xs font-medium text-text-secondary mb-1.5 block">
                    Temporary Password
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        readOnly
                        value={createdUser.temporaryPassword}
                        className="w-full rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm font-mono text-text-primary"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-tertiary hover:text-text-secondary"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
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
                  <p className="mt-1.5 text-xs text-text-tertiary">
                    User will be prompted to change password on first login.
                  </p>
                </div>
              </div>

              {/* Done */}
              <div className="flex justify-end pt-1">
                <Button size="sm" onClick={handleDone}>
                  Done
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}

export default UserEditModal;
