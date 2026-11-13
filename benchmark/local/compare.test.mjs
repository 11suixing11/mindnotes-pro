import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createReport, summarize } from './report.mjs'
import { collectEnvironment } from './runtime.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const task = path.join(root, 'tmp/local-baseline-20261113/sdd')
const command = path.join(root, 'benchmark/local/compare.mjs')
function report(value = 10) {
  return createReport({ runner: 'storage', status: 'passed', identity: {
    applicationVersion: '1.2.3', gitHead: 'a'.repeat(40), workingTree: { dirty: false, summary: '' }, files: { 'source.mjs': 'b'.repeat(64) },
  }, environment: collectEnvironment(root), parameters: { iterations: 1, warmups: 0, notes: 100, measurementVersion: 'local-measurement-v1' },
  fixture: { version: 'local-fixture-v1', seed: 20261113, sha256: 'c'.repeat(64) },
  metrics: { saveMs: summarize([value], 'ms', 'Durable save') }, checks: [{ name: 'restart', status: 'passed' }], limitations: ['Generated workload.'] })
}
async function fixture(callback) {
  await mkdir(task, { recursive: true })
  const directory = await mkdtemp(path.join(task, 'compare-'))
  const baseline = path.join(directory, 'baseline.json'), current = path.join(directory, 'current.json')
  const run = args => spawnSync(process.execPath, [command, ...args], { cwd: root, encoding: 'utf8', timeout: 10000 })
  try { await callback({ baseline, current, run }) }
  finally { await rm(directory, { recursive: true, force: true }) }
}

test('compare CLI uses exits 0 and 1 for compatible p95 changes and accepts changed source identity', async () => {
  await fixture(async ({ baseline, current, run }) => {
    await writeFile(baseline, JSON.stringify(report()))
    const next = report(12)
    next.identity.gitHead = 'd'.repeat(40)
    await writeFile(current, JSON.stringify(next))
    let result = run([baseline, current])
    assert.equal(result.status, 0, result.stderr)
    assert.equal(JSON.parse(result.stdout).passed, true)
    await writeFile(current, JSON.stringify(report(13)))
    result = run([baseline, current])
    assert.equal(result.status, 1, result.stderr)
    assert.equal(JSON.parse(result.stdout).comparisons[0].ratio, .3)
    assert.equal(run([baseline, current, '0.3']).status, 0)
  })
})

test('zero baseline positive current is a regression with an explicit Infinity string', async () => {
  await fixture(async ({ baseline, current, run }) => {
    await writeFile(baseline, JSON.stringify(report(0)))
    await writeFile(current, JSON.stringify(report(1)))
    const result = run([baseline, current])
    assert.equal(result.status, 1, result.stderr)
    assert.deepEqual(JSON.parse(result.stdout).comparisons[0], { metric: 'saveMs', unit: 'ms', meaning: 'Durable save',
      baseline: 0, current: 1, ratio: 'Infinity', passed: false })
    await writeFile(current, JSON.stringify(report(0)))
    assert.equal(run([baseline, current]).status, 0)
  })
})

test('incompatible, missing, malformed, failed reports and invalid arguments exit 2 with diagnostics', async () => {
  await fixture(async ({ baseline, current, run }) => {
    await writeFile(baseline, JSON.stringify(report()))
    for (const mutate of [r => { r.parameters.notes = 1000 }, r => { r.metrics = {} },
      r => { r.environment.arch = 'other' }, r => { r.metrics.saveMs.unit = 'bytes' },
      r => { r.status = 'failed'; r.checks[0] = { name: 'restart', status: 'failed', error: 'Persistence failed' } }]) {
      const next = report(); mutate(next)
      await writeFile(current, JSON.stringify(next))
      const result = run([baseline, current])
      assert.equal(result.status, 2, result.stderr)
      assert.equal(JSON.parse(result.stdout).compatible, false)
      assert.ok(JSON.parse(result.stdout).reason.length > 0)
    }
    await writeFile(current, '{malformed')
    for (const args of [[baseline, current], [baseline, `${current}.missing`], [], [baseline],
      [baseline, baseline, '-1'], [baseline, baseline, 'Infinity'], [baseline, baseline, 'NaN'],
      [baseline, baseline, '0.2', 'extra']]) {
      const result = run(args)
      assert.equal(result.status, 2, result.stderr)
      assert.equal(JSON.parse(result.stdout).compatible, false)
      assert.ok(JSON.parse(result.stdout).reason.length > 0)
    }
  })
})
