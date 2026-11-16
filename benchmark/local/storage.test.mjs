import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync, execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readdir, readFile, writeFile, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeScreenEntries, makePageNotebooks } from './fixtures.mjs'
import { createBackup, decodeBackup } from '../../dist-electron/src/notes/model.js'
import { validateScreenNote } from '../../dist-electron/src/notes/screenNotebook.js'
import { ScreenNotebookRepository } from '../../dist-electron/electron/screenNotebookRepository.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const task = path.join(root, 'tmp/local-baseline-20261113/sdd')
const runner = path.join(root, 'benchmark/local/run-storage.mjs')
const module = await import('./run-storage.mjs').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {}
  throw error
})
const cli = (args, cwd = root) => spawnSync(process.execPath, [runner, ...args], {
  cwd, encoding: 'utf8', env: { ...process.env, TEMP: task, TMP: task, TMPDIR: task }, timeout: 120000,
})

test('runner rejects a missing thumbnail in a real SQLite export response', async t => {
  const parent = path.join(root, 'tmp/local-baseline-20261113/runtime')
  await mkdir(parent, { recursive: true })
  const sentinel = await mkdtemp(path.join(parent, 'storage-neighbor-'))
  await writeFile(path.join(sentinel, 'keep.txt'), 'owned neighbor')
  let ownDirectory
  const originalExport = ScreenNotebookRepository.prototype.export

  t.mock.method(ScreenNotebookRepository.prototype, 'export', async function (...args) {
    ownDirectory = process.env.TEMP
    const entries = await originalExport.apply(this, args)
    return entries.map((entry, index) => {
      if (index !== 0) return entry
      const withoutThumbnail = { ...entry }
      delete withoutThumbnail.thumbnail
      return withoutThumbnail
    })
  })

  try {
    const report = await module.runStorageBenchmark({ iterations: 1, warmups: 0, notes: 100 })
    assert.equal(report.status, 'failed')
    const failedCheck = report.checks.find(check => check.name === 'prepare-library')
    assert.equal(failedCheck?.status, 'failed')
    assert.match(failedCheck.error, /thumbnail/i)
    await assert.rejects(stat(ownDirectory), { code: 'ENOENT' })
    assert.equal(await readFile(path.join(sentinel, 'keep.txt'), 'utf8'), 'owned neighbor')
  } finally {
    t.mock.restoreAll()
    await rm(sentinel, { recursive: true, force: true })
  }
})

test('import provides the runner without starting a benchmark or printing output', () => {
  assert.equal(typeof module.runStorageBenchmark, 'function')
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(runner)})`], {
    cwd: root, encoding: 'utf8', timeout: 10000,
  })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout, '')
})

test('runner retains validation and cleanup failures while removing its own workspace', async t => {
  let ownDirectory
  const originalExport = ScreenNotebookRepository.prototype.export
  const originalClose = ScreenNotebookRepository.prototype.close
  t.mock.method(ScreenNotebookRepository.prototype, 'export', async function (...args) {
    ownDirectory = process.env.TEMP
    const entries = await originalExport.apply(this, args)
    delete entries[0].thumbnail
    return entries
  })
  t.mock.method(ScreenNotebookRepository.prototype, 'close', async function (...args) {
    await originalClose.apply(this, args)
    throw new Error('generated close failure')
  })
  try {
    const report = await module.runStorageBenchmark({ iterations: 1, warmups: 0, notes: 100 })
    assert.equal(report.status, 'failed')
    assert.match(report.checks.find(check => check.name === 'prepare-library').error, /thumbnail/i)
    assert.match(report.checks.find(check => check.name === 'runner').error, /operation and cleanup failed/i)
    await assert.rejects(stat(ownDirectory), { code: 'ENOENT' })
  } finally { t.mock.restoreAll() }
})

test('the runner checks real persistence and leaves no test database behind', async t => {
  assert.equal(typeof module.runStorageBenchmark, 'function')
  const parent = path.join(root, 'tmp/local-baseline-20261113/runtime')
  await mkdir(parent, { recursive: true })
  const sentinel = await mkdtemp(path.join(parent, 'storage-neighbor-'))
  await writeFile(path.join(sentinel, 'keep.txt'), 'owned neighbor')
  let ownDirectory
  const originalLoad = ScreenNotebookRepository.prototype.load
  t.mock.method(ScreenNotebookRepository.prototype, 'load', async function (...args) {
    ownDirectory = process.env.TEMP
    return originalLoad.apply(this, args)
  })
  try {
    const report = await module.runStorageBenchmark({ iterations: 1, warmups: 0, notes: 100 })
    assert.equal(report.status, 'passed', JSON.stringify(report.checks))
    for (const name of ['eraseMs', 'draftSaveMs', 'searchMs', 'detailReadMs', 'exportMs', 'streamImportMs',
      'pageJsonSaveMs', 'pageJsonReloadMs', 'rssBytes', 'heapUsedBytes', 'externalBytes']) {
      assert.equal(report.metrics[name].count, 1, name)
      assert.ok(report.metrics[name].samples.every(Number.isFinite), name)
    }
    assert.ok(report.metrics.repositoryReadyMs.count >= 4)
    for (const name of ['draft-restart', 'page-json-restart', 'search-results', 'detail-content',
      'export-content', 'stream-import-content', 'stream-import-restart', 'workspace-cleanup'])
      assert.equal(report.checks.find(check => check.name === name)?.status, 'passed', name)
    assert.deepEqual(report.parameters, { iterations: 1, warmups: 0, notes: 100, measurementVersion: 'local-measurement-v1' })
    assert.ok(report.identity.files['dist-electron/electron/screenRepositoryWorker.mjs'])
    assert.ok(report.identity.files['dist-electron/electron/screenBackup.mjs'])
    assert.ok(report.identity.files['dist-electron/src/notes/screenInk.js'])
    assert.match(report.limitations.join(' '), /Node/)
    assert.equal(JSON.stringify(report).includes('Generated offline page note'), false)
    assert.equal(JSON.stringify(report).includes('Generated local baseline note'), false)
    await assert.rejects(stat(ownDirectory), { code: 'ENOENT' })
    assert.equal(await readFile(path.join(sentinel, 'keep.txt'), 'utf8'), 'owned neighbor')
  } finally {
    t.mock.restoreAll()
    await rm(sentinel, { recursive: true, force: true })
  }
})

test('warmups do not enter steady operation samples and fresh-target import repeats persist all fixtures', async () => {
  assert.equal(typeof module.runStorageBenchmark, 'function')
  const report = await module.runStorageBenchmark({ iterations: 2, warmups: 1, notes: 100 })
  assert.equal(report.status, 'passed', JSON.stringify(report.checks))
  assert.equal(report.metrics.streamImportMs.count, 2)
  assert.equal(report.metrics.draftSaveMs.count, 2)
  // Independently exercise the same real boundary: an import must return every note/image unchanged.
  await mkdir(task, { recursive: true })
  const directory = await mkdtemp(path.join(task, 'fixtures-'))
  const repository = new ScreenNotebookRepository(directory)
  try {
    await repository.load()
    const entries = makeScreenEntries(100)
    assert.equal(await repository.import(entries), 100)
    const returned = await repository.export()
    assert.equal(returned.length, 100)
    const expected = new Map(entries.map(entry => [entry.note.id, entry]))
    for (const entry of returned) {
      assert.deepEqual(validateScreenNote(entry.note), expected.get(entry.note.id).note)
      assert.deepEqual(new Uint8Array(entry.png), expected.get(entry.note.id).png)
      assert.equal(entry.thumbnail, expected.get(entry.note.id).thumbnail)
    }
    assert.deepEqual(decodeBackup(JSON.stringify(createBackup(makePageNotebooks()))).pages, makePageNotebooks())
  } finally { await repository.close(); await rm(directory, { recursive: true, force: true }) }
})

test('CLI writes an atomic JSON report and rejects invalid workloads and outside paths', async () => {
  await mkdir(task, { recursive: true })
  const directory = await mkdtemp(path.join(task, 'cli-'))
  const output = path.join(directory, 'result.json')
  try {
    const result = cli(['--iterations', '1', '--warmups', '0', '--notes', '100', '--output', output])
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), JSON.parse(result.stdout))
    assert.deepEqual(await readdir(directory), ['result.json'])
    for (const args of [['--notes', '101'], ['--iterations', '0'], ['--output', '/tmp/local-baseline-outside.json'],
      ['--output', path.join(directory, 'report.txt')]]) {
      const invalid = cli(args)
      assert.notEqual(invalid.status, 0)
      assert.match(invalid.stderr, /range|path|workspace|json/i)
    }
    await assert.rejects(stat(path.join(directory, 'report.txt')), { code: 'ENOENT' })
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('missing compiled modules produce a failed report requiring an explicit build in an isolated cwd', async () => {
  await mkdir(task, { recursive: true })
  const project = await mkdtemp(path.join(task, 'missing-compiled-'))
  try {
    execFileSync('git', ['init', '--quiet', project])
    await writeFile(path.join(project, 'package.json'), '{"version":"1.2.3","type":"module"}')
    await writeFile(path.join(project, 'package-lock.json'), '{"lockfileVersion":3}')
    execFileSync('git', ['-C', project, 'add', 'package.json', 'package-lock.json'])
    execFileSync('git', ['-C', project, '-c', 'user.name=Codex', '-c', 'user.email=codex@localhost', 'commit', '--quiet', '-m', 'fixture'])
    const result = cli(['--iterations', '1', '--warmups', '0', '--notes', '100', '--output', 'diagnostic.json'], project)
    assert.equal(result.status, 1, result.stderr)
    const report = JSON.parse(result.stdout)
    assert.equal(report.status, 'failed')
    assert.match(report.checks.find(check => check.status === 'failed').error, /build:electron/)
    assert.deepEqual(report, JSON.parse(await readFile(path.join(project, 'diagnostic.json'), 'utf8')))
    assert.deepEqual(Object.keys(report.identity.files).sort(), ['package-lock.json', 'package.json'])
    const workspace = path.join(project, 'tmp/local-baseline-20261113/runtime')
    assert.deepEqual(await readdir(workspace), [])
  } finally { await rm(project, { recursive: true, force: true }) }
})
