#!/usr/bin/env node
/**
 * build-html.js — Production HTML build
 *
 * 1. Minifies index.src.html -> index.html (strips comments + whitespace)
 * 2. Minifies forms.partial.html -> forms.partial.min.html
 *
 * The source files stay readable; only the deployed artifacts are minified.
 * Run via: npm run build
 */
const { minify } = require('html-minifier-terser');
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

async function build(src, dest) {
  const html = fs.readFileSync(path.join(__dirname, '..', src), 'utf8');
  let result = await minify(html, OPTIONS);
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

  // Guard: the deployed document must stay under the 64KB checker threshold
  if (idx >= 64 * 1024) {
    console.error(`\n✖ index.html is ${idx} bytes — exceeds the 64KB limit!`);
    process.exit(1);
  }
  console.log(`\n✔ index.html: ${idx} bytes (${(idx / 1024).toFixed(1)} KB) — under the 64KB limit`);
})();
