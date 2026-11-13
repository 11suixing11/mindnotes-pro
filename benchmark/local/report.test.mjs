import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarize, createReport, compareReports } from './report.mjs'

const hash = 'a'.repeat(64)
function input(value = 100) {
  return {
    runner: 'storage', status: 'passed',
    identity: { applicationVersion: '6.0.0-beta.12', gitHead: 'b'.repeat(40),
      workingTree: { dirty: true, summary: ' M package.json' }, files: { 'package-lock.json': hash } },
    environment: { platform: 'linux', arch: 'x64', osRelease: '6.0', node: 'v22.0.0',
      cpuModel: 'Test CPU', cpuCount: 4, totalMemoryBytes: 1000, fileSystemType: '123' },
    parameters: { iterations: 5, warmups: 1, notes: 1000, measurementVersion: 'local-measurement-v1' },
    fixture: { version: 'local-fixture-v1', seed: 20261113, sha256: hash },
    metrics: { saveMs: summarize([value, value, value, value, value], 'ms', 'durable save receipt') },
    checks: [{ name: 'reopened data', status: 'passed' }], limitations: ['Generated data only.'],
  }
}

test('nearest-rank metrics retain the slow tail without mutating samples', () => {
  const samples = [9, 1, 4, 2, 100]
  assert.deepEqual(summarize(samples, 'ms', 'save receipt'), {
    unit: 'ms', meaning: 'save receipt', samples: [9, 1, 4, 2, 100], count: 5,
    min: 1, p50: 4, p95: 100, max: 100,
  })
  assert.deepEqual(samples, [9, 1, 4, 2, 100])
  assert.equal(summarize([2, 1], 'bytes', 'memory').p50, 1)
})

test('empty, sparse, negative and nonfinite samples cannot pass', () => {
  for (const samples of [[], [-1], [NaN], [Infinity], Array(1), ['1']])
    assert.throws(() => summarize(samples, 'ms', 'save receipt'))
  assert.throws(() => summarize([1], 'seconds', 'save receipt'))
  assert.throws(() => summarize([1], 'ms', ''))
})

test('successful reports validate all metadata and recompute sample summaries', () => {
  const report = createReport(input())
  assert.equal(report.format, 'mindnotes-pro.local-baseline')
  assert.equal(report.schemaVersion, 1)
  assert.ok(Number.isFinite(Date.parse(report.generatedAt)))
  for (const mutate of [
    data => { data.metrics = {} },
    data => { data.metrics.saveMs.p95 = 1 },
    data => { data.metrics.saveMs.count = 1 },
    data => { data.checks = [] },
    data => { data.checks[0].status = 'failed' },
    data => { data.checks.push({ ...data.checks[0] }) },
    data => { delete data.identity.gitHead },
    data => { delete data.environment.cpuModel },
    data => { data.parameters.iterations = 0 },
    data => { data.fixture.sha256 = 'fake' },
    data => { data.limitations = [null] },
    data => { data.environment.display = { scaleFactor: NaN } },
    data => { data.parameters.extra = undefined },
    data => { data.limitations = Array(1) },
  ]) {
    const data = input(); mutate(data)
    assert.throws(() => createReport(data))
  }
})

test('failed and unavailable reports retain diagnostics without requiring metrics', () => {
  for (const status of ['failed', 'unavailable']) {
    const data = input(); data.status = status; data.metrics = {}
    data.checks = [{ name: 'operation', status, error: 'Not completed.' }]
    assert.equal(createReport(data).status, status)
  }
})

test('comparison applies p95 and handles hand-calculated regressions including zero', () => {
  for (const [baseline, current, passed, ratio] of [[100, 119, true, .19], [100, 121, false, .21],
    [0, 0, true, 0], [0, 1, false, Infinity], [100, 120, true, .2]]) {
    const result = compareReports(createReport(input(baseline)), createReport(input(current)))
    assert.equal(result.compatible, true)
    assert.equal(result.passed, passed)
    assert.equal(result.comparisons[0].ratio, ratio)
    assert.equal(result.comparisons[0].baseline, baseline)
    assert.equal(result.comparisons[0].current, current)
  }
  const data = input(1); data.metrics.saveMs = summarize([1, 1, 1, 1, 150], 'ms', 'durable save receipt')
  assert.equal(compareReports(createReport(input()), createReport(data)).passed, false)
})

test('comparison rejects incomplete, failed or incompatible reports', () => {
  const baseline = createReport(input())
  for (const mutate of [
    data => { delete data.metrics.saveMs },
    data => { data.checks = [{ name: 'different check', status: 'passed' }] },
    data => { data.metrics.saveMs.unit = 'bytes' },
    data => { data.metrics.saveMs.meaning = 'promise receipt' },
    data => { data.metrics.saveMs.p95 = 0 },
    data => { data.fixture.seed++ },
    data => { data.fixture.sha256 = 'c'.repeat(64) },
    data => { data.environment.node = 'v23.0.0' },
    data => { data.environment.fileSystemType = { available: false, error: 'not supported' } },
    data => { data.parameters.warmups++ },
    data => { data.status = 'failed' },
    data => { data.format = 'other' },
    data => { data.schemaVersion = 2 },
    data => { delete data.generatedAt },
  ]) {
    const current = structuredClone(baseline); mutate(current)
    const result = compareReports(baseline, current)
    assert.equal(result.compatible, false)
    assert.equal(result.passed, false)
    assert.ok(result.reason.length)
  }
  for (const invalid of [null, {}, 'bad JSON']) assert.equal(compareReports(baseline, invalid).compatible, false)
  for (const threshold of [-1, NaN, Infinity, '0.2'])
    assert.equal(compareReports(baseline, baseline, threshold).compatible, false)
  const unavailable = structuredClone(baseline)
  unavailable.environment.fileSystemType = { available: false, error: 'not supported' }
  assert.equal(compareReports(unavailable, unavailable).compatible, false)
})

test('comparison permits added metrics/checks and different code provenance', () => {
  const baseline = createReport(input()), current = createReport(input())
  current.identity.applicationVersion = '6.1.0'; current.identity.gitHead = 'c'.repeat(40)
  current.identity.files['package-lock.json'] = 'd'.repeat(64)
  current.identity.workingTree = { dirty: false, summary: '' }
  current.metrics.memory = summarize([10], 'bytes', 'runner memory')
  current.checks.push({ name: 'new check', status: 'passed' })
  assert.equal(compareReports(baseline, current).passed, true)
})
