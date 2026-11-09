#!/usr/bin/env node

/**
 * generate-robots.js — Generate robots.txt with a sitemap reference.
 *
 * Uses only static, explicit directives so the file stays small and
 * crawler-friendly. Add/block paths here when the site changes.
 *
 * Usage:
 *   node scripts/generate-robots.js [outfilePath]
 *
 * Default output: robots.txt (repo root).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = process.argv[2] || path.join(ROOT, 'robots.txt');

const CONTENT = [
  'User-agent: *',
  'Allow: /',
  '',
  'Sitemap: https://codebridgecademy.com/sitemap.xml',
  '',
].join('\n');

function main() {
  fs.writeFileSync(OUT, CONTENT, 'utf8');
  console.log(`✔ robots.txt written to ${OUT}`);
}

main();
