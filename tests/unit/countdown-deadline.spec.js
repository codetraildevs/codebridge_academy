// ============================================
// Unit Tests — Countdown Registration Deadline
// Verifies the countdown deadline hardcoded in
// js/script.js is always at least 30 days in
// the future, and that the deployed minified
// bundle (js/script.min.js) matches the source.
//
// NOTE: This test is a deliberate "renewal
// reminder" — it will go red as soon as the
// deadline is less than 30 calendar days away,
// forcing the team to extend registration before
// the deadline expires. If it fails, extend the
// deadline in js/script.js (then run
// `npm run build:js`); do NOT weaken the
// assertion to make it pass.
// ============================================
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MIN_DAYS_AHEAD = 30;

// Matches `const deadline = new Date('...')` in the source. The minified
// bundle is checked separately via string containment (see below), so this
// regex does not depend on identifiers surviving terser mangling.
const DEADLINE_PATTERN = /deadline\s*=\s*new Date\(['"]([^'"]+)['"]\)/;

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', '..', relativePath), 'utf8');
}

// Returns { deadline, raw } — `raw` is the extracted date literal, used for
// the minified-bundle consistency check. `deadline` is the parsed Date.
function extractDeadline(source) {
  const match = source.match(DEADLINE_PATTERN);
  if (!match) return { deadline: null, raw: null };
  return { deadline: new Date(match[1]), raw: match[1] };
}

// Whole-day number for a date's calendar day (local y/m/d) expressed on a
// DST-free UTC scale, so 23/25-hour DST days cannot cause ±1 day flakiness.
function calendarDayNumber(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY;
}

test.describe('Countdown registration deadline', () => {
  test('js/script.js deadline is a valid date at least 30 days in the future', () => {
    const source = readProjectFile('js/script.js');
    const { deadline } = extractDeadline(source);

    expect(deadline, 'could not find `deadline = new Date(...)` in js/script.js').not.toBeNull();
    expect(Number.isNaN(deadline.getTime()), 'invalid deadline date in js/script.js').toBe(false);

    const daysAhead = calendarDayNumber(deadline) - calendarDayNumber(new Date());
    expect(
      daysAhead,
      `deadline ${deadline.toDateString()} is only ${daysAhead} days away — extend it in js/script.js`
    ).toBeGreaterThanOrEqual(MIN_DAYS_AHEAD);
  });

  test('deployed js/script.min.js contains the same deadline', () => {
    const source = readProjectFile('js/script.js');
    const { raw } = extractDeadline(source);

    expect(raw, 'could not find deadline in js/script.js').not.toBeNull();

    // Minifiers preserve string literals verbatim, so a substring check is
    // robust even if terser renames the `deadline` variable. The minified
    // bundle uses double quotes around the literal.
    const minifiedSource = readProjectFile('js/script.min.js');
    expect(minifiedSource, 'js/script.min.js is stale — run `npm run build:js`').toContain(`"${raw}"`);
  });
});
