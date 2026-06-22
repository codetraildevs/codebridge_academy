/**
 * Performance Budget Check Script
 *
 * Reads the latest Lighthouse report and checks metrics against defined thresholds.
 * Supports both CI (report-full.report.json) and local (report.report.json) output paths.
 *
 * Usage: node scripts/check-budget.js
 * Exit code: 0 if all budgets pass, 1 if any are exceeded
 */

const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.join(__dirname, '..', 'lighthouse-report');

// Possible report output filenames (checked in order)
const REPORT_CANDIDATES = [
  'report-ci.report.json',
  'report-full.report.json',
  'report.report.json',
  'report.json',
];

// Budget thresholds (keys match Lighthouse metrics object — camelCase)
const BUDGETS = {
  timings: {
    firstContentfulPaint:   { warn: 3000, error: 3500, label: 'FCP' },
    largestContentfulPaint: { warn: 6000, error: 7000, label: 'LCP' },
    speedIndex:             { warn: 4500, error: 5500, label: 'SI' },
    totalBlockingTime:      { warn: 2000, error: 3000, label: 'TBT' },
    cumulativeLayoutShift:  { warn: 0.05, error: 0.10, label: 'CLS' },
    interactive:            { warn: 6000, error: 7000, label: 'TTI' },
  },
  performanceScore: { warn: 50, error: 40, label: 'Performance Score' },
  resourceSizes: {
    total:      { warn: 800,  error: 900,  label: 'Total Size', unit: 'KB' },
    document:   { warn: 120,  error: 150,  label: 'Document',   unit: 'KB' },
    stylesheet: { warn: 100,  error: 120,  label: 'Stylesheet', unit: 'KB' },
    image:      { warn: 300,  error: 400,  label: 'Image',      unit: 'KB' },
    font:       { warn: 300,  error: 400,  label: 'Font',       unit: 'KB' },
    script:     { warn: 40,   error: 50,   label: 'Script',     unit: 'KB' },
    other:      { warn: 50,   error: 100,  label: 'Other',      unit: 'KB' },
    thirdParty: { warn: 300,  error: 400,  label: 'Third Party',unit: 'KB' },
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────

function findReport() {
  for (const candidate of REPORT_CANDIDATES) {
    const fullPath = path.join(REPORT_DIR, candidate);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
}

function loadReport() {
  const reportPath = findReport();
  if (!reportPath) {
    const candidateList = REPORT_CANDIDATES.join(', ');
    console.error(`❌ Lighthouse report not found in ${REPORT_DIR}/`);
    console.error(`   Looked for: ${candidateList}`);
    console.error('   Run the audit first: npm run lighthouse:ci-full');
    process.exit(1);
  }
  console.log(`📄 Using report: ${path.relative(__dirname + '/..', reportPath)}\n`);
  return JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
}

// ── Checks ───────────────────────────────────────────────────────────────

function checkTimings(report) {
  const metrics = report.audits?.metrics?.details?.items?.[0];
  if (!metrics) {
    console.log('⚠️  Metrics audit not available — skipping timing checks');
    return true;
  }

  let allPassed = true;

  for (const [metricKey, budget] of Object.entries(BUDGETS.timings)) {
    const value = metrics[metricKey];

    if (value === undefined) {
      console.log(`⚠️  ${budget.label}: data not available (key: ${metricKey})`);
      continue;
    }

    const isCls = metricKey === 'cumulativeLayoutShift';
    const displayValue  = isCls ? value.toFixed(3) : `${(value / 1000).toFixed(1)}s`;
    const displayBudget = isCls ? budget.error.toFixed(3) : `${(budget.error / 1000).toFixed(1)}s`;

    if (value > budget.error) {
      console.log(`❌ ${budget.label}: ${displayValue} (budget: ${displayBudget}) — EXCEEDED`);
      allPassed = false;
    } else if (value > budget.warn) {
      console.log(`⚠️  ${budget.label}: ${displayValue} (budget: ${displayBudget}) — warning`);
    } else {
      console.log(`✅ ${budget.label}: ${displayValue} (budget: ${displayBudget})`);
    }
  }

  return allPassed;
}

function checkPerformanceScore(report) {
  const score = report.categories?.performance?.score;
  if (score === undefined) {
    console.log('⚠️  Performance score not available');
    return true;
  }

  const numericScore = score * 100;
  const budget = BUDGETS.performanceScore;

  const status = numericScore < budget.error ? '❌' : numericScore < budget.warn ? '⚠️' : '✅';
  console.log(`${status} ${budget.label}: ${numericScore}/100 (budget: ${budget.error}/100)`);

  return numericScore >= budget.error;
}

function checkResourceBudgets(report) {
  const budgetAudit = report.audits?.['performance-budget'];
  const items = budgetAudit?.details?.items;

  if (!items || items.length === 0) {
    console.log('⚠️  Performance-budget audit not available — run with --budget-file=lighthouse-budget.json');
    return true;
  }

  let allPassed = true;

  for (const item of items) {
    const passed = item.statusCode === 'passed';
    const metric = item.metric || item.resourceType || 'unknown';
    const label = item.label || metric;
    const actual = item.measurementInMs != null
      ? `${(item.measurementInMs / 1000).toFixed(1)}s`
      : item.measurementInKB != null
        ? `${item.measurementInKB.toFixed(0)} KB`
        : '?';
    const budget = item.budget
      ? (item.budget.inMs ? `${(item.budget.inMs / 1000).toFixed(1)}s` : item.budget.inKB ? `${item.budget.inKB.toFixed(0)} KB` : '?')
      : '?';

    console.log(`${passed ? '✅' : '❌'} ${label}: ${actual} / ${budget}`);
    if (!passed) allPassed = false;
  }

  return allPassed;
}

// ── Main ─────────────────────────────────────────────────────────────────

function main() {
  console.log('══════════════════════════════════');
  console.log('  Performance Budget Check');
  console.log('══════════════════════════════════\n');

  const report = loadReport();

  const timingsOk = checkTimings(report);
  const scoreOk   = checkPerformanceScore(report);
  const resourcesOk = checkResourceBudgets(report);

  const allOk = timingsOk && scoreOk && resourcesOk;

  console.log('');
  if (allOk) {
    console.log('✅ All budgets passed!');
    process.exit(0);
  } else {
    console.log('❌ Some budgets were exceeded — check the details above.');
    process.exit(1);
  }
}

main();
