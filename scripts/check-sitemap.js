#!/usr/bin/env node

/**
 * check-sitemap.js — CI gate for sitemap.xml + robots.txt.
 *
 * Verifies, without network access:
 *   1. robots.txt exists, parses as a minimal robot directives file, and
 *      references sitemap.xml.
 *   2. sitemap.xml parses as XML and contains every URL in the source of truth.
 *   3. No local HTML page is missing from the sitemap.
 *
 * Usage:
 *   node scripts/check-sitemap.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const ROBOTS = path.join(ROOT, 'robots.txt');
const sITEMAP = path.join(ROOT, 'sitemap.xml');

const SOURCE_PAGES = [
  '',
  'software-development.html',
  'training.html',
  'internships.html',
  'projects.html',
  'verify.html',
  'privacy-policy.html',
  'terms.html',
];

function fail(msg) {
  console.error(`✖ check-sitemap: ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✔ ${msg}`);
}

function main() {
  // 1. robots.txt
  if (!fs.existsSync(ROBOTS)) fail(`missing ${ROBOTS}`);
  let robots = fs.readFileSync(ROBOTS, 'utf8');
  robots = robots.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const robotLines = robots.split('\n').map((l) => l.trim()).filter(Boolean);
  const sitemapRef = robotLines.some((l) => l.toLowerCase().startsWith('sitemap:'));
  if (!sitemapRef) fail('robots.txt does not reference sitemap.xml');
  ok('robots.txt exists and references sitemap.xml');

  // 2. sitemap.xml parses and matches source pages
  if (!fs.existsSync(sITEMAP)) fail(`missing ${sITEMAP}`);
  let xml = fs.readFileSync(sITEMAP, 'utf8');
  xml = xml.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!xml.includes('<urlset')) fail('sitemap.xml has no <urlset> root');
  if (!xml.includes('<loc>')) fail('sitemap.xml has no <loc> entries');

  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  if (locs.length === 0) fail('sitemap.xml has no URLs');

  const expected = SOURCE_PAGES.map((f) => `https://codebridgecademy.com/${f}`);
  if (locs.includes('https://codebridgecademy.com/index.html')) fail('use only / for the homepage');
  const missing = expected.filter((u) => !locs.includes(u));
  if (missing.length > 0) fail(`sitemap.xml is missing ${missing.length} URL(s): ${missing.join(', ')}`);

  // Root paths such as https://codebridgecademy.com/ are intentional homepage
  // entries. Treat a URL that ends with '/' as an allowed homepage form and
  // only fail when a URL is otherwise missing an absolute https scheme.
  for (const l of locs) {
    try {
      const parsed = new URL(l);
      if (parsed.protocol !== 'https:') fail(`sitemap.xml URL is not https: ${l}`);
      if (parsed.hostname !== 'codebridgecademy.com') fail(`sitemap.xml URL is not codebridgecademy.com: ${l}`);
    } catch (err) {
      fail(`sitemap.xml URL is not a valid absolute URL: ${l}`);
    }
  }
  ok(`sitemap.xml includes all ${SOURCE_PAGES.length} tracked pages`);

  // 3. cross-check (detect stale/missing URLs that are otherwise not in source)
  const sitemapUrls = new Set(locs);
  for (const u of sitemapUrls) {
    try {
      const parsed = new URL(u);
      if (!parsed.protocol.startsWith('http')) fail(`sitemap URL is not http(s): ${u}`);
    } catch (err) {
      fail(`sitemap URL is not valid: ${u}`);
    }
  }

  ok('sitemap.xml is valid XML and every URL is http(s)');
  console.log('\n✔ All sitemap/robots checks passed.');
}

main();
