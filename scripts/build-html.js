#!/usr/bin/env node
/**
 * build-html.js — Production HTML build
 *
 * 1. Minifies index.src.html -> index.html (strips comments + whitespace)
 * 2. Minifies forms.partial.html -> forms.partial.min.html
 * 3. Rewrites local css/js references with content-hash query strings
 *    (?v=abcdef12) in index.html and verify.html, so the long-lived
 *    nginx asset cache (expires 30d) busts automatically whenever the
 *    asset content changes.
 *
 * The source files stay readable; only the deployed artifacts are minified.
 * Run via: npm run build  (css/js builds must run BEFORE this script so
 * the hashes are computed from the freshly minified assets)
 */
const { minify } = require('html-minifier-terser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const OPTIONS = {
  collapseWhitespace: true,
  removeComments: true,
  conservativeCollapse: false,
  minifyJS: true,
  minifyCSS: true,
  keepClosingSlash: true,
  removeAttributeQuotes: true,
  collapseBooleanAttributes: true,
  // Strips optional closers (</li>, </p>, </option>...) — spec-valid and
  // saves ~1KB. build() re-appends </body></html> afterwards so the
  // deployed document still *looks* complete when opened in an editor.
  removeOptionalTags: true,
  removeEmptyAttributes: true,
  // NOTE: removeRedundantAttributes is intentionally OFF — it strips
  // type="text" (default), but style.css targets input[type="text"]
  caseSensitive: true,
};

function assetVersion(filePath) {
  const content = fs.readFileSync(path.join(__dirname, '..', filePath));
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
}

// Rewrites local css/... and js/... references (href or src) to include
// ?v=<content-hash>. CDN/absolute URLs are untouched. Idempotent: an
// existing ?v=... is replaced with the current hash.
function applyVersionedAssets(html) {
  return html.replace(
    /\b(href|src)="((?:css|js)\/[A-Za-z0-9._-]+\.(?:css|js))(?:\?v=[a-f0-9]+)?"/g,
    (match, attr, file) => `${attr}="${file}?v=${assetVersion(file)}"`
  );
}

function versionAssetsInPlace(file) {
  const p = path.join(__dirname, '..', file);
  const html = fs.readFileSync(p, 'utf8');
  const out = applyVersionedAssets(html);
  if (out !== html) {
    fs.writeFileSync(p, out, 'utf8');
    console.log(`  ${file}: local asset URLs versioned`);
  } else {
    console.log(`  ${file}: asset URLs already up to date`);
  }
}

async function build(src, dest) {
  const html = fs.readFileSync(path.join(__dirname, '..', src), 'utf8');
  // Version local assets BEFORE minifying: the minifier strips attribute
  // quotes, which would defeat a post-minify rewrite. Values containing
  // ?v= keep their quotes ("=" is illegal in unquoted attribute values).
  const versioned = applyVersionedAssets(html);
  let result = await minify(versioned, OPTIONS);
  // removeOptionalTags strips document-level closers; re-append them so the
  // deployed artifact remains a visibly complete document
  if (OPTIONS.removeOptionalTags) {
    if (/<body/i.test(html)) result += '</body>';
    if (/<html/i.test(html)) result += '</html>';
  }
  fs.writeFileSync(path.join(__dirname, '..', dest), result, 'utf8');
  const before = Buffer.byteLength(html, 'utf8');
  const after = Buffer.byteLength(result, 'utf8');
  console.log(`  ${src} -> ${dest}: ${before} B -> ${after} B (-${Math.round((1 - after / before) * 100)}%)`);
  return after;
}

(async () => {
  console.log('Building HTML...');
  const idx = await build('index.src.html', 'index.html');
  const forms = await build('forms.partial.html', 'forms.partial.min.html');

  // verify.html is served as-is (no minified variant); version its
  // css/verify.css and js/verify.js references in place
  versionAssetsInPlace('verify.html');

  // Guard: the deployed document must stay under the 64KB checker threshold
  if (idx >= 64 * 1024) {
    console.error(`\n✖ index.html is ${idx} bytes — exceeds the 64KB limit!`);
    process.exit(1);
  }
  console.log(`\n✔ index.html: ${idx} bytes (${(idx / 1024).toFixed(1)} KB) — under the 64KB limit`);
})();
