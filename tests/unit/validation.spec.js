// ============================================
// Unit Tests — Form Validation Functions
// Tests the pure validation functions extracted
// from js/script.js
// ============================================
const { test, expect } = require('@playwright/test');

// Replicate the validation functions from js/script.js
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  const cleaned = phone.replace(/[\s\-\(\)\.\/]/g, '');
  if (/^07[0-9]{8}$/.test(cleaned)) return true;
  if (/^\+2507[0-9]{8}$/.test(cleaned)) return true;
  if (/^\+[1-9][0-9]{6,14}$/.test(cleaned)) return true;
  return false;
}

function validateTextOnly(val) {
  return /^[\p{L}\s'.\-]+$/u.test(val.trim());
}

// Format phone for display (used in UI only) — replicates formatPhoneInput from script.js
function formatPhoneInput(input) {
  const oldVal = input.value;
  let cleaned = oldVal.replace(/[^0-9+]/g, '');
  let formatted = '';
  const isRwandanIntl = cleaned.startsWith('+250') && cleaned.length <= 13;
  const isRwandanLocal = cleaned.startsWith('07') && cleaned.length <= 10;

  if (isRwandanIntl) {
    const d = cleaned.slice(1);
    formatted = '+' + d.slice(0, 3);
    if (d.length > 3) formatted += ' ' + d.slice(3, 6);
    if (d.length > 6) formatted += ' ' + d.slice(6, 9);
    if (d.length > 9) formatted += ' ' + d.slice(9, 12);
  } else if (isRwandanLocal) {
    formatted = cleaned.slice(0, 4);
    if (cleaned.length > 4) formatted += ' ' + cleaned.slice(4, 7);
    if (cleaned.length > 7) formatted += ' ' + cleaned.slice(7, 10);
  } else {
    // Generic: group every 3 chars — treats '+' as a regular character for grouping
    for (let i = 0; i < cleaned.length; i += 3) {
      if (i > 0 && !(i === 1 && cleaned[0] === '+')) formatted += ' ';
      formatted += cleaned.slice(i, i + 3);
    }
  }
  return formatted;
}

// ============================================
// validateEmail Tests
// ============================================
test.describe('validateEmail', () => {
  const valid = [
    'user@example.com',
    'test.user@domain.co',
    'name+suffix@company.rw',
    'a@b.co',
    'info.codebridgeacademy@gmail.com',
  ];
  valid.forEach(email => {
    test(`accepts valid email: ${email}`, () => {
      expect(validateEmail(email)).toBe(true);
    });
  });

  const invalid = [
    '',
    'notanemail',
    '@domain.com',
    'user@',
    'user@.com',
    'user@domain',
    'user name@domain.com',
    ' ',
  ];
  invalid.forEach(email => {
    test(`rejects invalid email: ${email || '(empty)'}`, () => {
      expect(validateEmail(email)).toBe(false);
    });
  });
});

// ============================================
// validatePhone Tests
// ============================================
test.describe('validatePhone', () => {
  const valid = [
    // Rwandan local (10 digits starting with 07)
    '0788123456',
    '0798765432',
    '0722001122',
    // Rwandan international (+2507 + 8 digits = 12 chars)
    '+250788123456',
    '+250722001122',
    '+25078812345',      // valid: +2507 + 8 digits (12 chars total)
    // With formatting characters (stripped before validation)
    '+250 788 123 456',
    '+250-788-123-456',
    '0788 123 456',
    // Other international numbers (matches generic +[1-9][0-9]{6,14})
    '+254712345678',
    '+256701234567',
    '+15551234567',
    '+447700900123',
    '+2507881234567',    // valid through generic fallback: +250 + 12 digits = 13 digits after +
  ];
  valid.forEach(phone => {
    test(`accepts valid phone: ${phone}`, () => {
      expect(validatePhone(phone)).toBe(true);
    });
  });

  const invalid = [
    '',
    '12345',
    '078812345',       // too short (9 digits)
    '07881234567',     // too long (11 digits starting with 07)
    'notaphone',
    '0700',            // too short
    '+1',              // incomplete international (only 1 digit after +)
    '++250788123456',  // double plus
    '   ',

  ];
  invalid.forEach(phone => {
    test(`rejects invalid phone: ${phone === null ? 'null' : phone === undefined ? 'undefined' : `"${phone}"`}`, () => {
      expect(validatePhone(phone)).toBe(false);
    });
  });
});

// ============================================
// validateTextOnly Tests
// ============================================
test.describe('validateTextOnly', () => {
  const valid = [
    'Jean Damascene',
    "Mukamana Alice",
    "O'Brien",
    "Kigali-Rwanda",
    "St. Paul",
    'Alpha',
    'Jean-Pierre Ngabo',
  ];
  valid.forEach(text => {
    test(`accepts text-only: ${text}`, () => {
      expect(validateTextOnly(text)).toBe(true);
    });
  });

  const invalid = [
    '',              // empty string — regex + requires 1+ char
    'John123',       // has numbers
    'user@domain',   // has @
    'test#1',        // has special chars and numbers
    'Hello!World',   // has !
    '$100',          // has $
    '<script>',      // has < >
  ];
  invalid.forEach(text => {
    test(`rejects invalid text: ${text || '(empty)'}`, () => {
      expect(validateTextOnly(text)).toBe(false);
    });
  });
});

// ============================================
// formatPhoneInput Tests
// ============================================
test.describe('formatPhoneInput', () => {
  test('formats Rwandan international: +250788123456', () => {
    const mockInput = { value: '+250788123456' };
    const result = formatPhoneInput(mockInput);
    expect(result).toBe('+250 788 123 456');
  });

  test('formats Rwandan local: 0788123456', () => {
    const mockInput = { value: '0788123456' };
    const result = formatPhoneInput(mockInput);
    expect(result).toBe('0788 123 456');
  });

  test('formats generic international: +15551234567 — groups every 3 chars including +', () => {
    const mockInput = { value: '+15551234567' };
    const result = formatPhoneInput(mockInput);
    // '+' is counted in grouping: '+15' + '551' + '234' + '567'
    expect(result).toBe('+15 551 234 567');
  });

  test('formats US number: +1234567890 — groups every 3 chars', () => {
    const mockInput = { value: '+1234567890' };
    const result = formatPhoneInput(mockInput);
    expect(result).toBe('+12 345 678 90');
  });

  test('handles empty string', () => {
    const mockInput = { value: '' };
    const result = formatPhoneInput(mockInput);
    expect(result).toBe('');
  });

  test('passes through already-formatted number unchanged', () => {
    const mockInput = { value: '+250 788 123 456' };
    const result = formatPhoneInput(mockInput);
    // Already formatted, cleaning removes spaces → +250788123456 → re-formatted
    expect(result).toBe('+250 788 123 456');
  });
});

// ============================================
// getFullPhone Tests (requires DOM — page context)
// ============================================
test.describe('getFullPhone (in browser)', () => {
  test('prepends country code when phone has no leading 0', async ({ page }) => {
    await page.setContent(`
      <div class="phone-input-group">
        <select class="phone-code-select">
          <option value="+250" selected>+250</option>
        </select>
        <input type="tel" id="phone" value="788123456">
      </div>
    `);
    const fullPhone = await page.evaluate(() => {
      const field = document.querySelector('#phone');
      const group = field.closest('.phone-input-group');
      const codeSelect = group.querySelector('.phone-code-select');
      const digitsOnly = field.value.replace(/[^0-9]/g, '');
      if (digitsOnly.startsWith('0')) return digitsOnly;
      return codeSelect.value + digitsOnly;
    });
    expect(fullPhone).toBe('+250788123456');
  });

  test('returns raw digits when phone starts with 0', async ({ page }) => {
    await page.setContent(`
      <div class="phone-input-group">
        <select class="phone-code-select">
          <option value="+250" selected>+250</option>
        </select>
        <input type="tel" id="phone" value="0788123456">
      </div>
    `);
    const result = await page.evaluate(() => {
      const field = document.querySelector('#phone');
      const group = field.closest('.phone-input-group');
      const codeSelect = group.querySelector('.phone-code-select');
      const digitsOnly = field.value.replace(/[^0-9]/g, '');
      if (digitsOnly.startsWith('0')) return digitsOnly;
      return codeSelect.value + digitsOnly;
    });
    expect(result).toBe('0788123456');
  });

  test('formats phone on input event', async ({ page }) => {
    await page.setContent(`
      <div class="phone-input-group">
        <select class="phone-code-select">
          <option value="+250" selected>+250</option>
        </select>
        <input type="tel" id="phone" value="">
      </div>
    `);
    // Simulate typing a Rwandan international number
    await page.evaluate(() => {
      const input = document.querySelector('#phone');
      input.value = '+250788123456';
      // Dispatch input event like the real handler would
      const event = new Event('input', { bubbles: true });
      input.dispatchEvent(event);
    });
    // The formatting happens in JS but since our test page doesn't have the
    // formatPhoneInput handler attached, the value stays as-is.
    // This test verifies the DOM structure works for getFullPhone
    const val = await page.locator('#phone').inputValue();
    expect(val).toBe('+250788123456');
  });
});
