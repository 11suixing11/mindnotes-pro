/* global process, fetch */
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import net from 'node:net'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, writeFile, readFile, readdir, rm, access, mkdir, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const execute = promisify(execFile)
const root = process.cwd()
const parent = path.join(root, 'tmp/local-baseline-20261113/sdd')
const inventory = directory => readdir(path.join(directory, 'tmp/local-baseline-20261113/runtime'))
  .catch(error => error.code === 'ENOENT' ? [] : Promise.reject(error))
const harness = await import('./electron-harness.mjs').catch(error => error.code === 'ERR_MODULE_NOT_FOUND' ? {} : Promise.reject(error))

test('offline proxy rejects HTTP and CONNECT without forwarding, then releases its socket', async () => {
  assert.equal(typeof harness.startDenyProxy, 'function', 'deny proxy must be implemented')
  let hits = 0
  const canary = http.createServer((_request, response) => { hits++; response.end('canary') })
  await new Promise(resolve => canary.listen(0, '127.0.0.1', resolve))
  const target = `127.0.0.1:${canary.address().port}`
  const proxy = await harness.startDenyProxy()
  const port = proxy.port
  try {
    assert.equal(await (await fetch(`http://${target}/`)).text(), 'canary')
    hits = 0
    const rejected = method => new Promise((resolve, reject) => {
      const request = http.request({ host: '127.0.0.1', port, method,
        path: method === 'CONNECT' ? target : `http://${target}/` })
      request.on('response', response => { response.resume(); resolve(response.statusCode) })
      request.on('connect', (response, socket) => { socket.destroy(); resolve(response.statusCode) })
      request.on('error', reject)
      request.end()
    })
    assert.equal(await rejected('GET'), 503)
    assert.equal(await rejected('CONNECT'), 503)
    assert.equal(hits, 0)
    assert.deepEqual(proxy.requests.map(item => item.method), ['GET', 'CONNECT'])
    const lingering = net.connect(port, '127.0.0.1')
    await new Promise(resolve => lingering.once('connect', resolve))
    await proxy.close()
    await proxy.close()
    await assert.rejects(new Promise((resolve, reject) => {
      const socket = net.connect(port, '127.0.0.1')
      socket.on('connect', () => { socket.destroy(); resolve() })
      socket.on('error', reject)
    }), { code: 'ECONNREFUSED' })
  } finally {
    await proxy.close()
    canary.closeAllConnections()
    await new Promise(resolve => canary.close(resolve))
  }
})

for (const runner of ['run-desktop.mjs', 'run-offline.mjs']) {
  test(`${runner} refuses missing consent, missing executable and unknown options before creating user data`, async () => {
    const directory = await mkdtemp(path.join(parent, 'guard-'))
    await mkdir(path.join(directory, 'benchmark/local'), { recursive: true })
    for (const name of ['run-desktop.mjs', 'electron-harness.mjs', 'runtime.mjs', 'report.mjs', 'fixtures.mjs'])
      await copyFile(path.join(root, 'benchmark/local', name), path.join(directory, 'benchmark/local', name))
    for (const name of ['package.json', 'package-lock.json']) await copyFile(path.join(root, name), path.join(directory, name))
    const before = await inventory(directory)
    const sentinel = path.join(directory, 'sentinel.exe')
    const touched = path.join(directory, 'executed.txt')
    await writeFile(sentinel, `#!/bin/sh\nprintf executed > '${touched}'\n`, { mode: 0o700 })
    try {
      for (const args of [[], ['--allow-visible', '--executable', path.join(directory, 'absent.exe')],
        ['--allow-visible', '--executable', sentinel], ['--unknown']]) {
        const output = path.join(directory, 'report.json')
        const invocation = [...args, ...(runner === 'run-desktop.mjs' && !args.includes('--unknown') ? ['--output', output] : [])]
        let failure
        try {
          await execute(process.execPath, [path.join(root, 'benchmark/local', runner), ...invocation],
            { cwd: directory, timeout: 20_000, env: { ...process.env, TEMP: directory, TMP: directory, TMPDIR: directory } })
        } catch (error) { failure = error }
        assert.equal(failure?.code, 2, `guard must exit unavailable/invalid (2): ${invocation.join(' ')}`)
        if (runner === 'run-desktop.mjs' && !args.includes('--unknown')) {
          const report = JSON.parse(await readFile(output, 'utf8'))
          assert.equal(report.status, 'unavailable')
          assert.equal(report.runner, 'desktop')
          assert.deepEqual(report.metrics, {})
          assert.ok(report.checks.some(check => check.status === 'unavailable'))
        }
        await assert.rejects(access(touched), { code: 'ENOENT' })
        assert.deepEqual(await inventory(directory), before)
      }
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
}

test('direct launch rejects missing consent before touching its data directory', async () => {
  assert.equal(typeof harness.launchIsolated, 'function', 'isolated launcher must be implemented')
  const directory = path.join(parent, 'must-not-create')
  await assert.rejects(harness.launchIsolated({ directory, allowVisible: false, offline: true }), /allow-visible/)
  await assert.rejects(access(directory), { code: 'ENOENT' })
})

test('offline journeys require their own explicit configuration and stay out of the ordinary desktop suite', async () => {
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli')
  const env = { ...process.env, TEMP: parent, TMP: parent, TMPDIR: parent }
  delete env.MINDNOTES_BASELINE_ALLOW_VISIBLE
  const ordinary = await execute(process.execPath, [cli, 'test', '--list', '--config', 'playwright.desktop.config.ts'], { cwd: root, env })
  assert.match(ordinary.stdout, /floating\.spec\.ts/)
  assert.doesNotMatch(ordinary.stdout, /offline\.spec\.ts/)
  await assert.rejects(execute(process.execPath, [cli, 'test', '--list', '--config', 'playwright.offline.config.ts'], { cwd: root, env }),
    error => error.code === 1 && error.stderr.includes('--allow-visible'))
  const offline = await execute(process.execPath, [cli, 'test', '--list', '--config', 'playwright.offline.config.ts'],
    { cwd: root, env: { ...env, MINDNOTES_BASELINE_ALLOW_VISIBLE: '1' } })
  assert.match(offline.stdout, /offline\.spec\.ts/)
  assert.match(offline.stdout, /Total: 2 tests in 1 file/)
  assert.doesNotMatch(offline.stdout, /floating\.spec\.ts/)
})
