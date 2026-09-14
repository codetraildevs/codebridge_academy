import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { navLinks } from '@pages/landing/LandingNav';

/**
 * This test statically validates that every nav link href in LandingNav.tsx
 * has a corresponding `id` attribute on a section element in one of the
 * landing page components.
 *
 * Because it imports the actual `navLinks` array from LandingNav.tsx, the
 * test automatically reflects any changes to the navigation — no manual
 * sync needed.
 */

// ── Resolve landing-pages directory (ESM‑safe) ────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LANDING_COMPONENT_DIR = path.resolve(
  __dirname,
  '..',
  'pages',
  'landing',
);

// ── Landing component files to scan for section IDs ───────────────────────
const LANDING_COMPONENT_FILES = [
  'FeaturesSection.tsx',
  'HowItWorksSection.tsx',
  'PricingSection.tsx',
  'TestimonialsSection.tsx',
  'CTASection.tsx',
  'Footer.tsx',
];

// ── Extract all section IDs from landing components ───────────────────────
function collectAllLandingIds(): Set<string> {
  const ids = new Set<string>();
  for (const file of LANDING_COMPONENT_FILES) {
    const filePath = path.join(LANDING_COMPONENT_DIR, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Landing component file not found: ${filePath}. ` +
          'If a file was renamed, update LANDING_COMPONENT_FILES in this test.',
      );
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const idRegex = /id="([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = idRegex.exec(content)) !== null) {
      // match[1] is always defined because the regex has a required capture group
      ids.add(match[1]!);
    }
  }
  return ids;
}

const allLandingSectionIds = collectAllLandingIds();
const hrefTargets = navLinks.map((link): string => link.href.replace('#', ''));
const navLinkLabels = navLinks.map((link): string => link.label);

describe('Landing nav href → section ID validation', () => {
  // ── Nav href format: all must start with '#' ────────────────────────────
  it.each(navLinkLabels)(
    'nav link "%s" has a valid href starting with "#"',
    (label) => {
      const link = navLinks.find((l) => l.label === label)!;
      expect(link.href.startsWith('#')).toBe(true);
    },
  );

  // ── Each nav href must have a matching section id ───────────────────────
  it.each(hrefTargets)(
    'nav link "#%s" has a matching section id in a landing component',
    (hrefTarget) => {
      expect(allLandingSectionIds.has(hrefTarget)).toBe(true);
    },
  );

  // ── No duplicate ids across landing components ──────────────────────────
  it('should not have duplicate id attributes across landing components', () => {
    const seen = new Map<string, string[]>();
    for (const file of LANDING_COMPONENT_FILES) {
      const filePath = path.join(LANDING_COMPONENT_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const idRegex = /id="([^"]+)"/g;
      let match: RegExpExecArray | null;
      while ((match = idRegex.exec(content)) !== null) {
        const id = match[1]!;
        const files = seen.get(id) ?? [];
        files.push(file);
        seen.set(id, files);
      }
    }
    const duplicates = Array.from(seen.entries()).filter(
      ([, files]) => files.length > 1,
    );
    if (duplicates.length > 0) {
      const msg = duplicates
        .map(([id, files]) => `  id="${id}" found in: ${files.join(', ')}`)
        .join('\n');
      expect.fail(`Duplicate section IDs found:\n${msg}`);
    }
  });
});
