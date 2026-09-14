import { describe, expect, it, vi } from 'vitest';
import { validateFields, validateIndividualField } from '../register-validation';

function setup(values: Record<string, string>, acceptedTerms = true) {
  const setErrors = vi.fn();
  const setTouched = vi.fn();
  const api = {
    fields: Object.keys(values),
    acceptedTerms,
    getValue: (name: string) => values[name] ?? '',
    validateField: (name: string, value: string) => (value ? '' : `${name} is required`),
    setErrors,
    setTouched,
  };
  return { api, setErrors, setTouched };
}

describe('validateFields', () => {
  it('returns true and marks fields touched when every field is valid', () => {
    const { api, setErrors, setTouched } = setup({ firstName: 'Jean', email: 'jean@example.com' });

    const valid = validateFields(api);

    expect(valid).toBe(true);
    expect(setErrors).toHaveBeenCalledWith({});
    expect(setTouched).toHaveBeenCalledWith(expect.any(Function));
    const updater = setTouched.mock.calls[0][0] as (prev: Record<string, boolean>) => Record<string, boolean>;
    expect(updater({})).toEqual({ firstName: true, email: true });
  });

  it('returns false and records per-field errors for invalid values', () => {
    const { api, setErrors } = setup({ firstName: '', email: 'not-an-email' });
    api.validateField = (name: string, value: string) =>
      name === 'email' ? 'Valid email required' : value ? '' : 'First name is required';

    const valid = validateFields(api);

    expect(valid).toBe(false);
    expect(setErrors).toHaveBeenCalledWith({ firstName: 'First name is required', email: 'Valid email required' });
  });

  it('adds a terms error when requireTerms is set and terms are not accepted', () => {
    const { api, setErrors } = setup({ email: 'jean@example.com' }, false);

    const valid = validateFields({ ...api, requireTerms: true });

    expect(valid).toBe(false);
    expect(setErrors).toHaveBeenCalledWith({ terms: 'Accept terms to continue' });
  });

  it('passes when requireTerms is set and terms are accepted', () => {
    const { api } = setup({ email: 'jean@example.com' }, true);

    expect(validateFields({ ...api, requireTerms: true })).toBe(true);
  });

  it('does not mark touched when setTouched is omitted', () => {
    const { api } = setup({ email: 'jean@example.com' });

    expect(validateFields({ ...api, setTouched: undefined })).toBe(true);
  });
});

describe('validateIndividualField — phone regex', () => {
  it.each([
    ['0788123456', 'local leading-zero format'],
    ['+250788123456', 'E.164 format'],
    ['+2507912345678', 'E.164 with 12 digits'],
  ])('accepts %s (%s)', (phone) => {
    expect(validateIndividualField('phone', phone, 'x')).toBe('');
  });

  it.each([
    ['abc', 'letters'],
    ['123', 'too short'],
    ['12345678901234567890', 'too long (20 digits)'],
    ['0788 123 456', 'spaces'],
    ['07881234567890123', 'too long after leading zero'],
    ['phone', 'word'],
  ])('rejects %s (%s)', (phone) => {
    expect(validateIndividualField('phone', phone, 'x')).toBe('Valid phone required');
  });

  it('treats an empty phone as optional (no error)', () => {
    expect(validateIndividualField('phone', '', 'x')).toBe('');
  });
});

describe('validateIndividualField — other rules', () => {
  it('validates email format', () => {
    expect(validateIndividualField('email', 'not-an-email', 'x')).toBe('Valid email required');
    expect(validateIndividualField('email', 'jean@example.com', 'x')).toBe('');
  });

  it('requires names to be at least 2 characters', () => {
    expect(validateIndividualField('firstName', '', 'x')).toBe('First name is required');
    expect(validateIndividualField('lastName', 'A', 'x')).toBe('At least 2 characters');
    expect(validateIndividualField('firstName', 'Jean', 'x')).toBe('');
  });

  it('enforces password complexity', () => {
    expect(validateIndividualField('password', 'short', 'x')).toBe('Min 8 characters');
    expect(validateIndividualField('password', 'nouppercase1@', 'x')).toBe('Need an uppercase letter');
    expect(validateIndividualField('password', 'NoSpecial1', 'x')).toBe('Need a special character (@$!%*?&)');
    expect(validateIndividualField('password', 'Skills@123', 'x')).toBe('');
  });

  it('checks the confirm-password match against the password', () => {
    expect(validateIndividualField('confirmPassword', 'Other@123', 'Skills@123')).toBe('Passwords do not match');
    expect(validateIndividualField('confirmPassword', 'Skills@123', 'Skills@123')).toBe('');
  });
});
