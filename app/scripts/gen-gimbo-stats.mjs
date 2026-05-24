/**
 * Reads coverage and unit test result artifacts and writes a combined
 * public/gimbo-stats.json consumed by the /gimbo Easter-egg page at runtime.
 *
 * Run after: vitest run --coverage
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

// ── Coverage summary ──────────────────────────────────────────────────────────
const coverageSummary = readJson(path.join(root, 'coverage', 'coverage-summary.json'))
const coverageFinal = readJson(path.join(root, 'coverage', 'coverage-final.json'))

let coverage = null

if (coverageSummary?.total) {
  const t = coverageSummary.total
  // Count instrumented files: all keys in summary except "total"
  const fileCount = Object.keys(coverageSummary).filter((k) => k !== 'total').length
  coverage = {
    statements: { covered: t.statements.covered, total: t.statements.total, pct: t.statements.pct },
    branches: { covered: t.branches.covered, total: t.branches.total, pct: t.branches.pct },
    functions: { covered: t.functions.covered, total: t.functions.total, pct: t.functions.pct },
    files: fileCount || (coverageFinal ? Object.keys(coverageFinal).length : null),
  }
} else if (coverageFinal) {
  // Fallback: derive totals from coverage-final.json
  let ts = 0, tsf = 0, tb = 0, tbf = 0, tf = 0, tff = 0
  for (const info of Object.values(coverageFinal)) {
    const s = info.s ?? {}, sm = info.statementMap ?? {}
    const b = info.b ?? {}, fn = info.f ?? {}, fnm = info.fnMap ?? {}
    tsf += Object.keys(sm).length
    ts += Object.values(s).filter((v) => v > 0).length
    for (const bvals of Object.values(b)) {
      for (const v of bvals) { tbf++; if (v > 0) tb++ }
    }
    tff += Object.keys(fnm).length
    tf += Object.values(fn).filter((v) => v > 0).length
  }
  coverage = {
    statements: { covered: ts, total: tsf, pct: tsf ? parseFloat((100 * ts / tsf).toFixed(1)) : 0 },
    branches: { covered: tb, total: tbf, pct: tbf ? parseFloat((100 * tb / tbf).toFixed(1)) : 0 },
    functions: { covered: tf, total: tff, pct: tff ? parseFloat((100 * tf / tff).toFixed(1)) : 0 },
    files: Object.keys(coverageFinal).length,
  }
}

// ── Unit test results ─────────────────────────────────────────────────────────
const unitResults = readJson(path.join(root, 'coverage', 'unit-results.json'))

let unitTests = null
if (unitResults) {
  unitTests = {
    total: unitResults.numTotalTests ?? 0,
    passed: unitResults.numPassedTests ?? 0,
    failed: unitResults.numFailedTests ?? 0,
    suites: unitResults.numTotalTestSuites ?? 0,
  }
}

// ── E2E test results (playwright last run) ────────────────────────────────────
const e2eLastRun = readJson(path.join(root, 'test-results', '.last-run.json'))
const playwrightReport = readJson(path.join(root, 'playwright-report', 'report.json'))

let e2eTests = null
if (playwrightReport) {
  const stats = playwrightReport.stats
  e2eTests = {
    total: (stats?.expected ?? 0) + (stats?.unexpected ?? 0) + (stats?.skipped ?? 0),
    passed: stats?.expected ?? 0,
    failed: stats?.unexpected ?? 0,
    status: stats?.unexpected === 0 ? 'passed' : 'failed',
  }
} else if (e2eLastRun) {
  e2eTests = {
    status: e2eLastRun.status,
    failed: e2eLastRun.failedTests?.length ?? 0,
  }
}

// ── Write output ──────────────────────────────────────────────────────────────
const output = {
  generatedAt: new Date().toISOString(),
  coverage,
  unitTests,
  e2eTests,
}

const outPath = path.join(root, 'public', 'gimbo-stats.json')
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8')
console.log('✓ gimbo-stats.json written to public/')
console.log(JSON.stringify(output, null, 2))
