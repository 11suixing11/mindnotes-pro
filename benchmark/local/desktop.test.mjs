/* global process, fetch */
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import net from 'node:net'
import { execFile, spawn } from 'node:child_process'
import { once } from 'node:events'
import { promisify } from 'node:util'
import { mkdtemp, writeFile, readFile, readdir, rm, access, mkdir, copyFile, symlink } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const execute = promisify(execFile)
const root = process.cwd()
const parent = path.join(root, 'tmp/local-baseline-20261113/sdd')
const inventory = directory => readdir(path.join(directory, 'tmp/local-baseline-20261113/runtime'))
  .catch(error => error.code === 'ENOENT' ? [] : Promise.reject(error))
const harness = await import('./electron-harness.mjs').catch(error => error.code === 'ERR_MODULE_NOT_FOUND' ? {} : Promise.reject(error))

const buildReferences = ['js/index.js', 'js/preload.js', 'css/index.css', 'css/preload.css', 'manifest.json', 'icons/icon.svg', 'icons/touch.png']
const buildHtml = `<!doctype html><html><head>
  <script type="module" crossorigin src="./js/index.js"></script>
  <link rel="modulepreload" href="./js/preload.js">
  <link rel="stylesheet" href="./css/index.css">
  <link rel="preload" as="style" href="./css/preload.css">
  <link rel="manifest" href="./manifest.json">
  <link rel="icon" href="./icons/icon.svg">
  <link rel="apple-touch-icon" href="./icons/touch.png">
  <!-- <script src="https://comment.invalid/not-an-asset"></script> -->
</head><body><div id="root"></div></body></html>`

async function withSourceBuild(work) {
  const scratch = await mkdtemp(path.join(parent, 'source-build-'))
  const directory = path.join(scratch, 'dist')
  await mkdir(directory)
  await writeFile(path.join(directory, 'index.html'), buildHtml)
  for (const reference of buildReferences) {
    const file = path.join(directory, reference)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, 'fixture')
  }
  try { return await work(directory, scratch) }
  finally { await rm(scratch, { recursive: true, force: true }) }
}

test('source asset validator accepts the emitted js/css layout and checks every linked production asset', async () => {
  assert.equal(typeof harness.validateSourceAssets, 'function')
  await withSourceBuild(async directory => {
    assert.deepEqual(await harness.validateSourceAssets(directory), buildReferences.map(reference => `./${reference}`))
    for (const reference of buildReferences) {
      await rm(path.join(directory, reference))
      await assert.rejects(harness.validateSourceAssets(directory), /asset/i, `missing ${reference} must fail`)
      await writeFile(path.join(directory, reference), 'fixture')
    }
  })
})

test('source asset validator rejects absolute, external, escaping and symlinked-outside assets', async () => {
  assert.equal(typeof harness.validateSourceAssets, 'function')
  await withSourceBuild(async (directory, scratch) => {
    for (const reference of ['/js/index.js', '//cdn.invalid/index.js', 'https://cdn.invalid/index.js',
      'file:///outside.js', '../outside.js', './../outside.js', './%2e%2e/outside.js', './js\\index.js']) {
      await writeFile(path.join(directory, 'index.html'), buildHtml.replace('./js/index.js', reference))
      await assert.rejects(harness.validateSourceAssets(directory), /asset/i, reference)
    }
    await writeFile(path.join(directory, 'index.html'), buildHtml.replace('</head>', '<base href="https://base.invalid/"></head>'))
    await assert.rejects(harness.validateSourceAssets(directory), /asset/i)
    await writeFile(path.join(directory, 'index.html'), buildHtml)
    await writeFile(path.join(scratch, 'outside.js'), 'outside')
    await rm(path.join(directory, 'js/index.js'))
    await symlink(path.join(scratch, 'outside.js'), path.join(directory, 'js/index.js'))
    await assert.rejects(harness.validateSourceAssets(directory), /asset/i)
  })
})

test('source asset validator reads the existing production dist without launching Electron or rebuilding it', async () => {
  assert.equal(typeof harness.validateSourceAssets, 'function')
  const before = await readFile(path.join(root, 'dist/index.html'))
  const references = await harness.validateSourceAssets(path.join(root, 'dist'))
  assert.ok(references.some(reference => reference.startsWith('./js/')))
  assert.ok(references.some(reference => reference.startsWith('./css/')))
  assert.ok(references.includes('./manifest.json'))
  assert.ok(references.some(reference => reference.startsWith('./icons/')))
  assert.deepEqual(await readFile(path.join(root, 'dist/index.html')), before)
})

test('executable selection uses explicit option before MINDNOTES_EXECUTABLE and preserves the environment', async () => {
  const desktop = await import('./run-desktop.mjs'), offline = await import('./run-offline.mjs')
  assert.equal(typeof harness.selectDesktopExecutable, 'function')
  assert.equal(typeof desktop.desktopLaunchOptions, 'function')
  assert.equal(typeof offline.offlineLaunchOptions, 'function')
  const environment = Object.freeze({ MINDNOTES_EXECUTABLE: 'env-package.exe' })
  assert.deepEqual(harness.selectDesktopExecutable(undefined, environment), { executable: 'env-package.exe', packaged: true })
  assert.deepEqual(harness.selectDesktopExecutable('explicit-package.exe', environment), { executable: 'explicit-package.exe', packaged: true })
  assert.deepEqual(harness.selectDesktopExecutable(undefined, {}), { executable: undefined, packaged: false })
  assert.deepEqual(harness.selectDesktopExecutable(undefined, { MINDNOTES_EXECUTABLE: '  ' }), { executable: undefined, packaged: false })
  assert.equal(desktop.desktopLaunchOptions({}, environment).executable, 'env-package.exe')
  assert.equal(desktop.desktopLaunchOptions({ executable: 'explicit-package.exe' }, environment).executable, 'explicit-package.exe')
  assert.equal(offline.offlineLaunchOptions([], environment).executable, 'env-package.exe')
  assert.equal(offline.offlineLaunchOptions(['--executable', 'explicit-package.exe'], environment).executable, 'explicit-package.exe')
  assert.equal(desktop.desktopLaunchOptions({}, {}).executable, undefined)
  assert.equal(offline.offlineLaunchOptions([], {}).executable, undefined)
  assert.deepEqual(environment, { MINDNOTES_EXECUTABLE: 'env-package.exe' })
  const previous = process.env.MINDNOTES_EXECUTABLE
  try {
    process.env.MINDNOTES_EXECUTABLE = 'process-env-package.exe'
    assert.equal(desktop.desktopLaunchOptions({}).executable, 'process-env-package.exe')
    assert.equal(offline.offlineLaunchOptions([]).executable, 'process-env-package.exe')
    assert.equal(process.env.MINDNOTES_EXECUTABLE, 'process-env-package.exe')
  } finally {
    if (previous === undefined) delete process.env.MINDNOTES_EXECUTABLE
    else process.env.MINDNOTES_EXECUTABLE = previous
  }
  assert.equal(process.env.MINDNOTES_EXECUTABLE, previous)
})

for (const stage of ['pre-close', 'app.close']) {
  test(`desktop cleanup bounds a never-resolving ${stage}, observes real child exit and releases proxy`, async () => {
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' })
    await once(child, 'spawn')
    const exited = once(child, 'exit')
    const proxy = await harness.startDenyProxy()
    const never = () => new Promise(() => {})
    try {
      assert.equal(typeof harness.createDesktopCloser, 'function')
      const close = harness.createDesktopCloser({ child, proxy, graceMs: 80, killMs: 1000,
        beforeClose: stage === 'pre-close' ? never : async () => {},
        closeApplication: stage === 'app.close' ? never : async () => { child.kill('SIGTERM') } })
      const start = Date.now()
      await assert.rejects(close(), /teardown failed/)
      await exited
      assert.ok(Date.now() - start < 2000)
      assert.equal(child.exitCode, null)
      assert.equal(child.signalCode, 'SIGKILL')
      await assert.rejects(execute(process.execPath, ['-e', `require('node:net').connect(${proxy.port}, '127.0.0.1').on('error', () => process.exit(7))`]), error => error.code === 7)
      await assert.rejects(close(), /teardown failed/)
    } finally {
      if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await exited }
      await proxy.close()
    }
  })
}

test('desktop cleanup handles an already-signaled real child without waiting for a second exit event', async () => {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' })
  await once(child, 'spawn')
  const exited = once(child, 'exit')
  child.kill('SIGTERM')
  await exited
  assert.equal(child.exitCode, null)
  assert.equal(child.signalCode, 'SIGTERM')
  assert.equal(typeof harness.createDesktopCloser, 'function')
  const close = harness.createDesktopCloser({ child, graceMs: 80, killMs: 1000,
    beforeClose: async () => {}, closeApplication: async () => { throw new Error('already closed') } })
  await assert.rejects(close(), /teardown failed/)
})

test('desktop cleanup observes graceful child exit and releases proxy', async () => {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' })
  await once(child, 'spawn')
  const exited = once(child, 'exit')
  const proxy = await harness.startDenyProxy()
  try {
    assert.equal(typeof harness.createDesktopCloser, 'function')
    const close = harness.createDesktopCloser({ child, proxy, graceMs: 1000, killMs: 1000,
      beforeClose: async () => {}, closeApplication: async () => { child.kill('SIGTERM'); await exited } })
    await close()
    assert.equal(child.signalCode, 'SIGTERM')
    await close()
    await assert.rejects(new Promise((resolve, reject) => {
      const socket = net.connect(proxy.port, '127.0.0.1')
      socket.on('connect', () => { socket.destroy(); resolve() })
      socket.on('error', reject)
    }), { code: 'ECONNREFUSED' })
  } finally {
    if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await exited }
    await proxy.close()
  }
})

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

test('offline control requires its own fresh matching GET and 503, unrelated proxy traffic cannot satisfy it', async () => {
  const proxy = await harness.startDenyProxy()
  const request = target => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: proxy.port, path: target }, response => {
      response.resume()
      resolve(response.statusCode)
    })
    req.on('error', reject)
    req.end()
  })
  const target = 'http://127.0.0.1:9/actual-page-fetch'
  try {
    const response = await request(target)
    const before = proxy.requests.length
    await request('http://127.0.0.1:9/unrelated')
    assert.equal(typeof harness.proxyControlEvidence, 'function')
    const control = { route: `PROXY 127.0.0.1:${proxy.port}`, response }
    assert.throws(() => harness.proxyControlEvidence(proxy, before, target, control, 0), /proxy control failed/)
    const ownStart = proxy.requests.length
    await request(target)
    assert.throws(() => harness.proxyControlEvidence(proxy, ownStart, target, { ...control, response: 0 }, 0), /proxy control failed/)
    assert.throws(() => harness.proxyControlEvidence(proxy, ownStart, target, { ...control, response: 200 }, 0), /proxy control failed/)
    assert.throws(() => harness.proxyControlEvidence(proxy, ownStart, target, control, 1), /proxy control failed/)
    const evidence = harness.proxyControlEvidence(proxy, ownStart, target, control, 0)
    assert.equal(evidence.target, target)
    assert.equal(evidence.response, 503)
    assert.deepEqual(evidence.proxyRequests, [{ method: 'GET', url: target, status: 503 }])
  } finally { await proxy.close() }
})

test('SDK initialization creates its real artifact tempfile in owned parent TEMP and restores environment after launch failure', async () => {
  await harness.withDesktopWorkspace(async directory => {
    const previous = { TEMP: process.env.TEMP, TMP: process.env.TMP, TMPDIR: process.env.TMPDIR }
    const sdkDirectory = path.join(directory, 'sdk')
    await mkdir(sdkDirectory)
    assert.equal(typeof harness.withDesktopTempDirectory, 'function')
    let artifactDirectory
    await assert.rejects(harness.withDesktopTempDirectory(sdkDirectory, async () => {
      assert.equal(await import('node:os').then(module => module.tmpdir()), sdkDirectory)
      const script = `
        const fs = await import('node:fs/promises');
        const os = await import('node:os');
        const original = fs.default.mkdtemp;
        fs.default.mkdtemp = async function(prefix, ...args) {
          const result = await original.call(this, prefix, ...args);
          process.stdout.write(JSON.stringify({ prefix, directory: result, tmpdir: os.tmpdir() }) + '\\n');
          return result;
        };
        const sdk = await import(${JSON.stringify(pathToFileURL(createRequire(import.meta.url).resolve('@playwright/test')).href)});
        const { _electron } = sdk.default;
        for (let iteration = 0; iteration < 2; iteration++) {
          const own = ${JSON.stringify(path.join(directory, 'first-session'))};
          await fs.mkdir(own, { recursive: true });
          try { await _electron.launch({ executablePath: own + '/absent-electron', timeout: 1000, env: { ...process.env, TEMP: own, TMP: own, TMPDIR: own } }); }
          catch { process.exitCode = 3; }
          await fs.rm(own, { recursive: true, force: true });
        }
      `
      let failure
      try { await execute(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env }, timeout: 10_000 }) }
      catch (error) { failure = error }
      assert.equal(failure?.code, 3)
      const records = failure.stdout.trim().split('\n').map(line => JSON.parse(line))
      assert.equal(records.length, 2)
      assert.notEqual(records[0].directory, records[1].directory)
      const record = records[0]
      artifactDirectory = record.directory
      assert.equal(record.tmpdir, sdkDirectory)
      assert.equal(path.dirname(record.prefix), sdkDirectory)
      assert.equal(path.dirname(artifactDirectory), sdkDirectory)
      assert.equal(path.dirname(records[1].directory), sdkDirectory)
      await assert.rejects(access(records[1].directory), { code: 'ENOENT' })
      throw new Error('intentional SDK launch failure')
    }), /intentional SDK launch failure/)
    assert.deepEqual({ TEMP: process.env.TEMP, TMP: process.env.TMP, TMPDIR: process.env.TMPDIR }, previous)
    assert.equal(os.tmpdir(), previous.TMPDIR)
    await assert.rejects(access(artifactDirectory), { code: 'ENOENT' })
  })
})

test('two sequential outer desktop runs recreate the cached SDK artifact parent after first-run cleanup', async () => {
  const script = `
    import fs from 'node:fs';
    const previous = { TEMP: process.env.TEMP, TMP: process.env.TMP, TMPDIR: process.env.TMPDIR };
    const original = fs.promises.mkdtemp;
    let artifactParent;
    fs.promises.mkdtemp = async function(prefix, ...args) {
      const directory = await original.call(this, prefix, ...args);
      if (prefix.includes('playwright-artifacts-')) {
        artifactParent = (await import('node:path')).dirname(directory);
        process.stdout.write(JSON.stringify({ prefix, directory }) + '\\n');
      }
      return directory;
    };
    const harness = await import(${JSON.stringify(pathToFileURL(path.join(root, 'benchmark/local/electron-harness.mjs')).href)});
    let sdk;
    for (let index = 0; index < 2; index++) {
      await harness.withDesktopWorkspace(async own => {
        sdk ??= (await import(${JSON.stringify(pathToFileURL(createRequire(import.meta.url).resolve('@playwright/test')).href)})).default;
        try { await sdk._electron.launch({ executablePath: own + '/absent-electron', timeout: 1000, env: { ...process.env, TEMP: own, TMP: own, TMPDIR: own } }); }
        catch (error) { if (!error.message.includes('Failed to launch')) throw error; }
      });
      await fs.promises.access(artifactParent).then(() => { throw new Error('artifact parent leaked'); }, error => { if (error.code !== 'ENOENT') throw error; });
      for (const [key, value] of Object.entries(previous)) if (process.env[key] !== value) throw new Error('parent environment not restored');
    }
  `
  const result = await execute(process.execPath, ['--input-type=module', '-e', script],
    { cwd: root, timeout: 10_000, env: { ...process.env, TEMP: parent, TMP: parent, TMPDIR: parent } })
  const records = result.stdout.trim().split('\n').map(line => JSON.parse(line))
  assert.equal(records.length, 2)
  assert.equal(records[0].prefix, records[1].prefix)
  assert.notEqual(records[0].directory, records[1].directory)
  for (const record of records) {
    assert.ok(path.dirname(record.directory).startsWith(path.join(root, 'tmp/local-baseline-20261113/runtime/sdk-')))
    await assert.rejects(access(record.directory), { code: 'ENOENT' })
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
