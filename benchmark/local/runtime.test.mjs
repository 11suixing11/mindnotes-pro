import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile, chmod, stat, symlink } from 'node:fs/promises'
import { statfsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { collectIdentity, collectEnvironment, withWorkspace, parseOptions } from './runtime.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const runtime = path.join(root, 'tmp/local-baseline-20261113/runtime')

test('workspace cleans successful and failed callbacks while preserving neighboring files', async () => {
  await mkdir(runtime, { recursive: true })
  const sentinel = path.join(runtime, `sentinel-${process.pid}`)
  await writeFile(sentinel, 'keep')
  let ownDirectory
  try {
    assert.equal(await withWorkspace(root, async directory => {
      ownDirectory = directory
      assert.equal(path.dirname(directory), runtime)
      await writeFile(path.join(directory, 'generated-note.json'), '{}')
      return 42
    }), 42)
    await assert.rejects(stat(ownDirectory), { code: 'ENOENT' })
    const failure = new Error('callback failure')
    await assert.rejects(withWorkspace(root, async directory => {
      ownDirectory = directory
      await writeFile(path.join(directory, 'generated-note.json'), '{}')
      throw failure
    }), error => error === failure)
    await assert.rejects(stat(ownDirectory), { code: 'ENOENT' })
    assert.equal(await readFile(sentinel, 'utf8'), 'keep')
  } finally { await rm(sentinel, { force: true }) }
})

test('cleanup failures reject and retain a diagnostic workspace path', {
  skip: process.platform === 'win32' || process.getuid?.() === 0 ? 'Permission-denied fixture requires an unprivileged POSIX user.' : false,
}, async () => {
  let directory
  try {
    await assert.rejects(withWorkspace(root, async own => {
      directory = own
      await mkdir(path.join(own, 'locked'))
      await writeFile(path.join(own, 'locked/data'), 'generated')
      await chmod(path.join(own, 'locked'), 0)
    }), error => error.message.includes(directory))
  } finally {
    if (directory) {
      await chmod(path.join(directory, 'locked'), 0o700)
      await rm(directory, { recursive: true, force: true })
    }
  }
})

test('environment describes the actual data filesystem and reports lookup failure', () => {
  const result = collectEnvironment(root)
  assert.equal(result.platform, process.platform)
  assert.equal(result.arch, process.arch)
  assert.equal(result.node, process.version)
  assert.equal(result.osRelease, os.release())
  assert.equal(result.cpuCount, os.cpus().length)
  assert.equal(result.totalMemoryBytes, os.totalmem())
  assert.equal(result.fileSystemType, String(statfsSync(root).type))
  const missing = collectEnvironment(path.join(runtime, 'does-not-exist'))
  assert.equal(missing.fileSystemType.available, false)
  assert.ok(missing.fileSystemType.error.length)
})

test('options apply workload defaults and desktop-specific flags', () => {
  assert.deepEqual(parseOptions([], 'storage'), { iterations: 5, warmups: 1, notes: 1000, output: undefined })
  assert.deepEqual(parseOptions(['--iterations', '30', '--warmups', '0', '--notes', '10000', '--output', 'tmp/result.json'], 'storage'),
    { iterations: 30, warmups: 0, notes: 10000, output: 'tmp/result.json' })
  assert.deepEqual(parseOptions([], 'desktop'), { iterations: 5, warmups: 1, notes: 1000, output: undefined,
    allowVisible: false, executable: undefined, idleSeconds: 5, frameSeconds: 5 })
  assert.deepEqual(parseOptions(['--allow-visible', '--executable', 'app.exe', '--idle-seconds', '900', '--frame-seconds', '60'], 'desktop'),
    { iterations: 5, warmups: 1, notes: 1000, output: undefined, allowVisible: true,
      executable: 'app.exe', idleSeconds: 900, frameSeconds: 60 })
})

test('options reject unknown, repeated, missing and invalid argument values', () => {
  for (const argv of [['--nope'], ['--iterations'], ['--output', '--notes', '100'],
    ['--notes', '200'], ['--iterations', '0'], ['--iterations', '31'], ['--warmups', '11'],
    ['--iterations', '1.2'], ['--iterations', 'NaN'], ['--iterations', 'Infinity'],
    ['--iterations', '1e1'], ['--iterations', '0xA'], ['--iterations', '-1'],
    ['--iterations', '5', '--iterations', '5'], ['--output', ''], ['--allow-visible']])
    assert.throws(() => parseOptions(argv, 'storage'))
  for (const argv of [['--allow-visible', '--allow-visible'], ['--idle-seconds', '901'],
    ['--frame-seconds', '0'], ['--frame-seconds', '61'], ['--allow-visible', 'true']])
    assert.throws(() => parseOptions(argv, 'desktop'))
  assert.throws(() => parseOptions([], 'other'))
})

test('identity hashes transitive loaded files and the lockfile without reading notebook data', async () => {
  await mkdir(runtime, { recursive: true })
  const project = await mkdtemp(path.join(runtime, 'identity-test-'))
  try {
    execFileSync('git', ['init', '--quiet', project])
    await writeFile(path.join(project, 'package.json'), '{"version":"1.2.3","type":"module"}')
    await writeFile(path.join(project, 'package-lock.json'), '{"lockfileVersion":3}')
    await mkdir(path.join(project, 'lib'))
    await writeFile(path.join(project, 'main.mjs'), "import './lib/dep.mjs'; new URL('./lib/worker.mjs', import.meta.url)\n")
    await writeFile(path.join(project, 'lib/dep.mjs'), "export { value } from './leaf.mjs'\n")
    await writeFile(path.join(project, 'lib/leaf.mjs'), 'export const value = 42\n')
    await writeFile(path.join(project, 'lib/worker.mjs'), 'export const worker = true\n')
    execFileSync('git', ['-C', project, 'add', '.'])
    execFileSync('git', ['-C', project, '-c', 'user.name=Codex', '-c', 'user.email=codex@localhost', 'commit', '--quiet', '-m', 'fixture'])
    await writeFile(path.join(project, 'private-notes.json'), '{"private":"must not enter provenance"}')
    const identity = await collectIdentity(project, ['main.mjs'])
    assert.equal(identity.applicationVersion, '1.2.3')
    assert.equal(identity.gitHead, execFileSync('git', ['-C', project, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim())
    assert.equal(identity.workingTree.dirty, true)
    assert.deepEqual(Object.keys(identity.files).sort(), ['lib/dep.mjs', 'lib/leaf.mjs', 'lib/worker.mjs', 'main.mjs', 'package-lock.json', 'package.json'])
    assert.equal(identity.files['lib/leaf.mjs'], createHash('sha256').update('export const value = 42\n').digest('hex'))
    await writeFile(path.join(project, 'lib/leaf.mjs'), 'export const value = 43\n')
    assert.notEqual((await collectIdentity(project, ['main.mjs'])).files['lib/leaf.mjs'], identity.files['lib/leaf.mjs'])
    await assert.rejects(collectIdentity(project, ['../outside.mjs']))
    await assert.rejects(collectIdentity(project, ['missing.mjs']))
    if (process.platform !== 'win32') {
      await symlink(path.join(root, 'package.json'), path.join(project, 'outside-link.json'))
      await assert.rejects(collectIdentity(project, ['outside-link.json']))
    }
    await mkdir(path.join(project, 'release'))
    await writeFile(path.join(project, 'release/app.exe'), Buffer.from([0, 1, 2]))
    await writeFile(path.join(project, 'release/app.asar'), Buffer.from([3, 4, 5]))
    const artifacts = await collectIdentity(project, ['release/app.exe', 'release/app.asar'])
    assert.equal(artifacts.files['release/app.exe'], createHash('sha256').update(Buffer.from([0, 1, 2])).digest('hex'))
    assert.equal(artifacts.files['release/app.asar'], createHash('sha256').update(Buffer.from([3, 4, 5])).digest('hex'))
    assert.ok((await readdir(project)).includes('private-notes.json'))
  } finally { await rm(project, { recursive: true, force: true }) }
})
