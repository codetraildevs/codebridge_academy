import type { Dispatch, SetStateAction } from 'react';

export interface ValidateFieldsOptions<T extends string> {
  /** Field names to validate, in order. */
  fields: T[];
  /** Whether the terms checkbox must be accepted (adds a `terms` error). */
  requireTerms?: boolean;
  /** Current state of the terms checkbox. */
  acceptedTerms: boolean;
  /** Read the current value of a field. */
  getValue: (name: T) => string;
  /** Per-field validator; returns an error message or ''. */
  validateField: (name: T, value: string) => string;
  /** Persist the collected errors (replaces the whole error state). */
  setErrors: Dispatch<SetStateAction<Record<string, string>>>;
  /**
   * Mark every validated field as touched so its error renders. Optional so
   * callers that only need the boolean result can skip it.
   */
  setTouched?: Dispatch<SetStateAction<Record<string, boolean>>>;
}

/**
 * Per-field validator for the individual registration form. Extracted from the
 * component so the rules (notably the phone regex) are unit-testable.
 *
 * Accepts both E.164 (+250788123456) and local leading-zero (0788123456)
 * phone formats; anything else is rejected.
 */
export function validateIndividualField(name: string, value: string, password: string): string {
  switch (name) {
    case 'firstName': return !value.trim() ? 'First name is required' : value.trim().length < 2 ? 'At least 2 characters' : '';
    case 'lastName': return !value.trim() ? 'Last name is required' : value.trim().length < 2 ? 'At least 2 characters' : '';
    case 'email': return !value.trim() ? 'Email is required' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Valid email required' : '';
    case 'phone': return value && !/^\+?[0-9]\d{6,14}$/.test(value) ? 'Valid phone required' : '';
    case 'password':
      if (!value) return 'Password is required';
      if (value.length < 8) return 'Min 8 characters';
      if (!/(?=.*[a-z])/.test(value)) return 'Need a lowercase letter';
      if (!/(?=.*[A-Z])/.test(value)) return 'Need an uppercase letter';
      if (!/(?=.*\d)/.test(value)) return 'Need a number';
      if (!/(?=.*[@$!%*?&])/.test(value)) return 'Need a special character (@$!%*?&)';
      return '';
    case 'confirmPassword': return !value ? 'Confirm your password' : value !== password ? 'Passwords do not match' : '';
    default: return '';
  }
}

/**
 * Validate a list of fields, collect per-field errors, and return whether the
 * group is valid. Shared by the registration steppers so the individual and
 * organization forms don't each re-implement the same error-collection loop.
 */
export function validateFields<T extends string>(options: ValidateFieldsOptions<T>): boolean {
  const { fields, requireTerms = false, acceptedTerms, getValue, validateField, setErrors, setTouched } = options;

  const newErrors: Record<string, string> = {};
  fields.forEach((name) => {
    const error = validateField(name, getValue(name));
    if (error) newErrors[name] = error;
  });
  if (requireTerms && !acceptedTerms) newErrors.terms = 'Accept terms to continue';

  setErrors(newErrors);
  if (setTouched) {
    setTouched((prev) => ({ ...prev, ...Object.fromEntries(fields.map((k) => [k, true])) }));
  }
  return Object.keys(newErrors).length === 0;
}
