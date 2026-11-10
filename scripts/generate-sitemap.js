#!/usr/bin/env node

/**
 * generate-sitemap.js — Generate sitemap.xml from the repo's tracked HTML pages.
 *
 * This keeps the sitemap aligned with what the site actually serves and
 * avoids hand-maintenance drift (old URLs, missing pages, stale priorities).
 *
 * It is intentionally conservative: it only includes files that already exist
 * under the repository root as tracked static pages. New templates/cleanup
 * without an accompanying sitemap entry should be reviewed before committing.
 *
 * Usage:
 *   node scripts/generate-sitemap.js [outfilePath]
 *
 * Default output: sitemap.xml (repo root).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = process.argv[2] || path.join(ROOT, 'sitemap.xml');

// Static pages we serve under the repo root. URLs follow /<file>.html.
const PAGES = [
  { url: 'https://codebridgecademy.com/',          filePath: 'index.html',          priority: 1.0, changefreq: 'weekly' },
  { url: 'https://codebridgecademy.com/software-development.html', filePath: 'software-development.html', priority: 0.9, changefreq: 'monthly' },
  { url: 'https://codebridgecademy.com/training.html',             filePath: 'training.html',             priority: 0.9, changefreq: 'monthly' },
  { url: 'https://codebridgecademy.com/internships.html',          filePath: 'internships.html',          priority: 0.8, changefreq: 'monthly' },
  { url: 'https://codebridgecademy.com/projects.html',             filePath: 'projects.html',             priority: 0.8, changefreq: 'monthly' },
  { url: 'https://codebridgecademy.com/verify.html',               filePath: 'verify.html',               priority: 0.6, changefreq: 'monthly' },
  { url: 'https://codebridgecademy.com/privacy-policy.html',       filePath: 'privacy-policy.html',       priority: 0.3, changefreq: 'yearly' },
  { url: 'https://codebridgecademy.com/terms.html',                filePath: 'terms.html',                priority: 0.3, changefreq: 'yearly' },
];

function buildSitemap(pages) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const p of pages) {
    lines.push('  <url>');
    lines.push(`    <loc>${p.url}</loc>`);
    lines.push(`    <changefreq>${p.changefreq}</changefreq>`);
    lines.push(`    <priority>${p.priority}</priority>`);
    lines.push('  </url>');
  }

  lines.push('</urlset>');
  return lines.join('\n');
}

function main() {
  const sitemap = buildSitemap(PAGES);

  fs.writeFileSync(OUT, sitemap, 'utf8');
  console.log(`✔ sitemap.xml written to ${OUT}`);
  console.log(`  ${PAGES.length} URLs`);
}

main();
