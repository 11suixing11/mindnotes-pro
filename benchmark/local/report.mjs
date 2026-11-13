import { isDeepStrictEqual } from 'node:util'

const FORMAT = 'mindnotes-pro.local-baseline'
const SCHEMA_VERSION = 1
const units = ['ms', 'bytes', 'percent']
const statuses = ['passed', 'failed', 'unavailable']
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = value => typeof value === 'string' && value.trim().length > 0
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message)
}

function validateJson(value, active = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value === 'number' && Number.isFinite(value)) return
  requireCondition(value && typeof value === 'object' && !active.has(value) &&
    (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype), 'Report must contain finite JSON data.')
  active.add(value)
  for (const item of Array.isArray(value) ? Array.from(value) : Object.values(value)) validateJson(item, active)
  active.delete(value)
}

/** Nearest-rank percentiles deliberately retain the tail of small sample sets. */
export function summarize(samples, unit, meaning) {
  requireCondition(Array.isArray(samples) && samples.length > 0 &&
    Array.from(samples).every(finite), 'Samples must be finite, nonnegative and nonempty.')
  requireCondition(units.includes(unit), 'Metric unit is invalid.')
  requireCondition(text(meaning), 'Metric meaning is required.')
  const retained = [...samples]
  const sorted = [...samples].sort((a, b) => a - b)
  const rank = fraction => sorted[Math.ceil(fraction * sorted.length) - 1]
  return { unit, meaning, samples: retained, count: sorted.length, min: sorted[0],
    p50: rank(.5), p95: rank(.95), max: sorted.at(-1) }
}

function validateIdentity(identity) {
  requireCondition(record(identity) && text(identity.applicationVersion) &&
    typeof identity.gitHead === 'string' && /^[a-f0-9]{40,64}$/.test(identity.gitHead), 'Report identity is incomplete.')
  requireCondition(record(identity.workingTree) && typeof identity.workingTree.dirty === 'boolean' &&
    typeof identity.workingTree.summary === 'string', 'Working tree metadata is incomplete.')
  requireCondition(record(identity.files) && Object.keys(identity.files).length > 0 &&
    Object.entries(identity.files).every(([name, value]) => text(name) && !name.startsWith('/') &&
      !name.includes('\\') && !name.split('/').includes('..') && hash(value)), 'Measured file hashes are invalid.')
}

function validateEnvironment(environment) {
  requireCondition(record(environment) && ['platform', 'arch', 'osRelease', 'node', 'cpuModel']
    .every(key => text(environment[key])), 'Report environment is incomplete.')
  requireCondition(integer(environment.cpuCount, 1, Number.MAX_SAFE_INTEGER) &&
    finite(environment.totalMemoryBytes) && environment.totalMemoryBytes > 0, 'Machine capacity is invalid.')
  const fs = environment.fileSystemType
  requireCondition(text(fs) || (record(fs) && fs.available === false && text(fs.error)), 'Filesystem identity is missing.')
}

function validateReport(report) {
  validateJson(report)
  requireCondition(record(report) && report.format === FORMAT && report.schemaVersion === SCHEMA_VERSION,
    'Report format/schema is invalid.')
  requireCondition(text(report.generatedAt) && Number.isFinite(Date.parse(report.generatedAt)), 'Report timestamp is invalid.')
  requireCondition(['storage', 'desktop'].includes(report.runner) && statuses.includes(report.status), 'Report runner/status is invalid.')
  validateIdentity(report.identity)
  validateEnvironment(report.environment)
  const parameters = report.parameters
  requireCondition(record(parameters) && integer(parameters.iterations, 1, 30) &&
    integer(parameters.warmups, 0, 10) && [100, 1000, 10000].includes(parameters.notes) &&
    text(parameters.measurementVersion), 'Report workload parameters are invalid.')
  if (report.runner === 'desktop') requireCondition(integer(parameters.idleSeconds, 0, 900) &&
    integer(parameters.frameSeconds, 1, 60), 'Desktop workload parameters are invalid.')
  requireCondition(record(report.fixture) && report.fixture.version === 'local-fixture-v1' &&
    report.fixture.seed === 20261113 && hash(report.fixture.sha256), 'Fixture identity is invalid.')
  requireCondition(record(report.metrics), 'Report metrics must be an object.')
  for (const [name, metric] of Object.entries(report.metrics)) {
    requireCondition(text(name) && record(metric), 'Metric structure is invalid.')
    const expected = summarize(metric.samples, metric.unit, metric.meaning)
    requireCondition(['count', 'min', 'p50', 'p95', 'max'].every(key => metric[key] === expected[key]),
      `Metric summary disagrees with samples: ${name}`)
  }
  requireCondition(Array.isArray(report.checks), 'Report checks must be an array.')
  const names = new Set()
  for (const check of report.checks) {
    requireCondition(record(check) && text(check.name) && statuses.includes(check.status) &&
      (check.error === undefined || typeof check.error === 'string') && !names.has(check.name), 'Functional check is invalid or duplicated.')
    names.add(check.name)
  }
  requireCondition(Array.isArray(report.limitations) && report.limitations.every(text), 'Report limitations are invalid.')
  if (report.status === 'passed') requireCondition(Object.keys(report.metrics).length > 0 &&
    report.checks.length > 0 && report.checks.every(check => check.status === 'passed'), 'A passing report requires metrics and completed checks.')
}

export function createReport({ runner, status, identity, environment, parameters, fixture, metrics, checks, limitations }) {
  const report = { format: FORMAT, schemaVersion: SCHEMA_VERSION, generatedAt: new Date().toISOString(),
    runner, status, identity, environment, parameters, fixture, metrics, checks, limitations }
  validateReport(report)
  return structuredClone(report)
}

/** Incompatibility is a failure result, including malformed or diagnostic reports. */
export function compareReports(baseline, current, threshold = .2) {
  const incompatible = reason => ({ compatible: false, passed: false, reason, comparisons: [] })
  if (!finite(threshold)) return incompatible('Regression threshold must be finite and nonnegative.')
  try { validateReport(baseline); validateReport(current) }
  catch (error) { return incompatible(error.message) }
  if (baseline.status !== 'passed' || current.status !== 'passed') return incompatible('Both reports must have passed.')
  if (baseline.runner !== current.runner) return incompatible('Runners differ.')
  if (!text(baseline.environment.fileSystemType) || !text(current.environment.fileSystemType))
    return incompatible('Filesystem identity is unavailable.')
  for (const field of ['environment', 'parameters', 'fixture']) {
    if (!isDeepStrictEqual(baseline[field], current[field])) return incompatible(`Report ${field} differs.`)
  }
  const currentChecks = new Map(current.checks.map(check => [check.name, check]))
  for (const check of baseline.checks) {
    if (currentChecks.get(check.name)?.status !== 'passed') return incompatible(`Baseline check is missing or failed: ${check.name}`)
  }
  const comparisons = []
  for (const [name, metric] of Object.entries(baseline.metrics)) {
    const next = current.metrics[name]
    if (!next) return incompatible(`Baseline metric is missing: ${name}`)
    if (metric.unit !== next.unit || metric.meaning !== next.meaning) return incompatible(`Metric unit/meaning differs: ${name}`)
    const ratio = metric.p95 === 0 ? (next.p95 === 0 ? 0 : Infinity) : (next.p95 - metric.p95) / metric.p95
    comparisons.push({ metric: name, unit: metric.unit, meaning: metric.meaning,
      baseline: metric.p95, current: next.p95, ratio, passed: ratio <= threshold })
  }
  const passed = comparisons.every(comparison => comparison.passed)
  return { compatible: true, passed, reason: passed ? 'No observed regression above threshold.' : 'Observed regression above threshold.', comparisons }
}
