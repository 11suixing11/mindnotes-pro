/* global process, fetch, Buffer */
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
const parent = path.join(root, process.platform === 'linux' ? 'tmp/linux-desktop-20261114/tool-tests' : 'tmp/local-baseline-20261113/sdd')
await mkdir(parent, { recursive: true })
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
    assert.ok(path.dirname(record.directory).startsWith(path.join(root, process.platform === 'linux' ? 'tmp/linux-desktop-20261114/runtime/sdk-' : 'tmp/local-baseline-20261113/runtime/sdk-')))
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
    await mkdir(path.join(directory, 'electron'))
    await copyFile(path.join(root, 'electron/linuxLaunch.mjs'), path.join(directory, 'electron/linuxLaunch.mjs'))
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
            { cwd: directory, timeout: 20_000, env: { ...process.env, DISPLAY: '', WAYLAND_DISPLAY: '', TEMP: directory, TMP: directory, TMPDIR: directory } })
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


test('binary preflight validates Linux ELF class/machine and rejects PE without executing fixtures', async () => {
  assert.equal(typeof harness.validateDesktopBinary, 'function')
  const scratch = await mkdtemp(path.join(parent, 'binary-'))
  const candidate = path.join(scratch, 'electron')
  const elf = Buffer.alloc(64)
  elf.set([127, 69, 76, 70, 2, 1, 1]); elf.writeUInt16LE(3, 16); elf.writeUInt16LE(62, 18); elf.writeUInt32LE(1, 20)
  try {
    await writeFile(candidate, elf, { mode: 0o700 })
    assert.deepEqual(await harness.validateDesktopBinary(candidate, 'linux', 'x64'), { format: 'ELF', arch: 'x64' })
    await assert.rejects(harness.validateDesktopBinary(candidate, 'linux', 'arm64'), /architecture/)
    const wrongClass = Buffer.from(elf); wrongClass[4] = 1
    await writeFile(candidate, wrongClass)
    await assert.rejects(harness.validateDesktopBinary(candidate, 'linux', 'x64'), /architecture/)
    const pe = Buffer.alloc(134); pe.write('MZ'); pe.writeUInt32LE(128, 60); pe.set([80, 69, 0, 0, 100, 134], 128)
    await writeFile(candidate, pe)
    assert.deepEqual(await harness.validateDesktopBinary(candidate, 'win32', 'x64'), { format: 'PE', arch: 'x64' })
    await assert.rejects(harness.validateDesktopBinary(candidate, 'linux', 'x64'), /ELF/)
    if (process.platform === 'linux') {
      await writeFile(candidate, elf); await import('node:fs/promises').then(fs => fs.chmod(candidate, 0o600))
      await assert.rejects(harness.validateDesktopBinary(candidate, 'linux', 'x64'), /executable permission/)
    }
  } finally { await rm(scratch, { recursive: true, force: true }) }
})

test('desktop backend requires Linux X11/XWayland DISPLAY and reports native Wayland floating unsupported', () => {
  assert.equal(typeof harness.desktopBackend, 'function')
  assert.equal(harness.desktopBackend('linux', { DISPLAY: ':90', WAYLAND_DISPLAY: 'wayland-0' }), 'x11')
  assert.equal(harness.desktopBackend('linux', { DISPLAY: ':90' }, 'x11'), 'x11')
  assert.throws(() => harness.desktopBackend('linux', { DISPLAY: ':90' }, 'wayland'), /native Wayland.*floating/i)
  assert.throws(() => harness.desktopBackend('linux', { WAYLAND_DISPLAY: 'wayland-0' }), /native Wayland.*floating/i)
  assert.throws(() => harness.desktopBackend('linux', {}), /DISPLAY/)
  assert.equal(harness.desktopBackend('win32', {}), 'windows')
  assert.throws(() => harness.desktopBackend('darwin', {}), /unsupported/i)
})

test('isolated paths compare case exactly on Linux and fold only Windows', () => {
  assert.equal(typeof harness.pathsMatch, 'function')
  assert.equal(harness.pathsMatch('/tmp/App', '/tmp/app', 'linux'), false)
  assert.equal(harness.pathsMatch('/tmp/App', '/tmp/App', 'linux'), true)
  assert.equal(harness.pathsMatch('C:\\App', 'c:\\app', 'win32'), true)
})

test('diagnostic sandbox disable requires the explicit flag and normal launch always enables Chromium sandbox', async () => {
  const desktop = await import('./run-desktop.mjs'), offline = await import('./run-offline.mjs')
  assert.equal(desktop.desktopLaunchOptions({}, {}).diagnosticNoSandbox, false)
  assert.equal(desktop.desktopLaunchOptions({ diagnosticNoSandbox: true }, {}).diagnosticNoSandbox, true)
  assert.equal(offline.offlineLaunchOptions([], {}).diagnosticNoSandbox, false)
  assert.equal(offline.offlineLaunchOptions(['--diagnostic-no-sandbox'], {}).diagnosticNoSandbox, true)
  assert.throws(() => desktop.desktopLaunchOptions({ diagnosticNoSandbox: 'true' }, {}), /boolean/)
  assert.throws(() => offline.offlineLaunchOptions(['--diagnostic-no-sandbox', '--diagnostic-no-sandbox'], {}), /Repeated/)
  assert.equal(typeof harness.desktopSandboxOptions, 'function')
  assert.deepEqual(harness.desktopSandboxOptions(false), { chromiumSandbox: true, mode: 'normal', kernelSandboxVerified: false })
  assert.deepEqual(harness.desktopSandboxOptions(true), { chromiumSandbox: false, mode: 'diagnostic-no-sandbox', kernelSandboxVerified: false })
  assert.throws(() => harness.desktopSandboxOptions('true'), /boolean/)
})

test('Linux teardown terminates and observes an owned detached group even after its leader exits', { skip: process.platform !== 'linux' }, async () => {
  const script = `const {spawn}=require('node:child_process'); const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'}); console.log(c.pid); setInterval(()=>{},1000)`
  const child = spawn(process.execPath, ['-e', script], { detached: true, stdio: ['ignore', 'pipe', 'ignore'] })
  await once(child, 'spawn')
  const [chunk] = await once(child.stdout, 'data')
  const descendant = Number(String(chunk).trim())
  const exited = once(child, 'exit')
  const unrelated = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { detached: true, stdio: 'ignore' })
  await once(unrelated, 'spawn')
  try {
    const close = harness.createDesktopCloser({ child, ownedProcessGroup: child.pid, graceMs: 100, killMs: 1500,
      beforeClose: async () => {}, closeApplication: async () => { child.kill('SIGTERM'); await exited } })
    await assert.rejects(close(), /teardown failed/)
    await exited
    const state = await readFile(`/proc/${descendant}/stat`, 'utf8').then(text => text.split(') ')[1].split(' ')[0], error => error.code === 'ENOENT' ? 'gone' : Promise.reject(error))
    assert.ok(['Z', 'gone'].includes(state), `descendant must exit, observed ${state}`)
    process.kill(unrelated.pid, 0)
    await assert.rejects(close(), /teardown failed/)
  } finally {
    try { process.kill(-child.pid, 'SIGKILL') } catch (error) { assert.equal(error.code, 'ESRCH') }
    unrelated.kill('SIGKILL'); await once(unrelated, 'exit')
  }
})

test('Linux teardown refuses process-group ownership for a non-leader child', { skip: process.platform !== 'linux' }, async () => {
  const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' })
  await once(child, 'spawn')
  try {
    assert.throws(() => harness.createDesktopCloser({ child, ownedProcessGroup: child.pid,
      beforeClose: async () => {}, closeApplication: async () => {} }), /owned.*group.*leader/i)
  } finally { child.kill('SIGKILL'); await once(child, 'exit') }
})

test('Linux source preflight accepts the installed ELF read-only and rejects missing display before workspace creation', { skip: process.platform !== 'linux' }, async () => {
  const previous = { DISPLAY: process.env.DISPLAY, WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY }
  try {
    process.env.DISPLAY = ':90'; delete process.env.WAYLAND_DISPLAY
    const before = await inventory(root)
    const ready = await harness.preflightDesktop({ allowVisible: true })
    assert.equal(ready.binary.format, 'ELF')
    assert.equal(ready.backend, 'x11')
    assert.equal(ready.sandbox.chromiumSandbox, true)
    assert.deepEqual(await inventory(root), before)
    process.env.DISPLAY = ''
    await assert.rejects(harness.preflightDesktop({ allowVisible: true }), /DISPLAY/)
    await assert.rejects(harness.preflightDesktop({ allowVisible: true, diagnosticNoSandbox: true }), /DISPLAY/)
  } finally {
    for (const [key, value] of Object.entries(previous)) if (value === undefined) delete process.env[key]; else process.env[key] = value
  }
})

test('Linux journeys require explicit standalone collection and ordinary Windows suites exclude them', async () => {
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli')
  const env = { ...process.env, DISPLAY: '', WAYLAND_DISPLAY: '', TEMP: parent, TMP: parent, TMPDIR: parent }
  delete env.MINDNOTES_LINUX_SUITE; delete env.MINDNOTES_BASELINE_ALLOW_VISIBLE
  await assert.rejects(execute(process.execPath, [cli, 'test', '--list', '--config', 'playwright.linux.config.ts'], { cwd: root, env }),
    error => error.code === 1 && error.stderr.includes('run-linux.mjs'))
  const enabled = await execute(process.execPath, [cli, 'test', '--list', '--config', 'playwright.linux.config.ts'],
    { cwd: root, env: { ...env, MINDNOTES_LINUX_SUITE: '1', MINDNOTES_BASELINE_ALLOW_VISIBLE: '1' } })
  assert.match(enabled.stdout, /linux.spec.ts/)
  assert.doesNotMatch(enabled.stdout, /offline.spec.ts|floating.spec.ts/)
  const ordinary = await execute(process.execPath, [cli, 'test', '--list', '--config', 'playwright.desktop.config.ts'], { cwd: root, env })
  assert.doesNotMatch(ordinary.stdout, /linux.spec.ts/)
})

test('diagnostic CLI rejects ambient sandbox environment and native helper refuses the user desktop', { skip: process.platform !== 'linux' }, async () => {
  const offline = await import('./run-offline.mjs')
  const environment = { MINDNOTES_LINUX_DIAGNOSTIC_NO_SANDBOX: '1', MINDNOTES_BASELINE_NO_SANDBOX: '1' }
  assert.equal(offline.offlineLaunchOptions([], environment).diagnosticNoSandbox, false)
  assert.throws(() => offline.offlineLaunchOptions(['--no-sandbox'], environment), /Unknown/)
  for (const display of ['', ':0', ':1']) {
    const env = { ...process.env, DISPLAY: display, WAYLAND_DISPLAY: '', TEMP: parent, TMP: parent, TMPDIR: parent }
    await assert.rejects(harness.verifyOwnedX11(env), /Owned X11/)
    await assert.rejects(execute('python3', ['e2e/desktop/linux-native.py'], { cwd: root, env, timeout: 2000 }),
      error => error.code === 2 && error.stderr.includes('task-owned virtual DISPLAY'))
    await assert.rejects(execute(process.execPath, ['benchmark/local/run-linux.mjs', '--allow-visible', '--diagnostic-no-sandbox'], { cwd: root, env, timeout: 2000 }),
      error => error.code === 2 && error.stderr.includes('Owned X11'))
  }
})

test('desktop closer observes ordinary zero exit before SDK artifact cleanup and ignores target-closed only then', async () => {
  const child = spawn(process.execPath, ['-e', "process.stdin.once('data',()=>process.exit(0))"], { stdio: ['pipe','ignore','ignore'] })
  await once(child, 'spawn')
  const exited = once(child, 'exit'), order = []
  try {
    const close = harness.createDesktopCloser({ child, graceMs: 1000, killMs: 500, requireNormalExit: true,
      beforeClose: async () => { order.push('flush') },
      closeApplication: async () => { order.push('product-quit'); child.stdin.end('quit'); await exited; throw new Error('Target page, context or browser has been closed') },
      expectedCloseError: error => /has been closed/.test(error.message),
      artifactCleanup: async () => { assert.equal(child.exitCode, 0); order.push('artifacts-after-exit') } })
    await close(); await close()
    assert.deepEqual(order, ['flush','product-quit','artifacts-after-exit'])
  } finally { if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await exited } }
})

test('desktop closer rejects nonzero exit despite a target-closed transport error and still cleans artifacts', async () => {
  const child = spawn(process.execPath, ['-e', "process.stdin.once('data',()=>process.exit(7))"], { stdio: ['pipe','ignore','ignore'] })
  await once(child, 'spawn'); const exited = once(child, 'exit'); let artifacts = false
  try {
    const close = harness.createDesktopCloser({ child, graceMs: 1000, killMs: 500, requireNormalExit: true,
      beforeClose: async () => {},
      closeApplication: async () => { child.stdin.end('quit'); await exited; throw new Error('Target has been closed') },
      expectedCloseError: () => true,
      artifactCleanup: async () => { artifacts = true } })
    await assert.rejects(close(), error => error.errors.some(item => /normal.*exit/i.test(item.message)))
    assert.equal(artifacts, true)
  } finally { if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await exited } }
})

test('desktop closer retains never-quit timeout/forced termination failure and bounds post-exit artifacts', async () => {
  const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' })
  await once(child, 'spawn'); const exited = once(child, 'exit'); let artifacts = false
  try {
    const close = harness.createDesktopCloser({ child, graceMs: 50, killMs: 80, requireNormalExit: true,
      beforeClose: async () => {}, closeApplication: async () => {},
      artifactCleanup: async () => { artifacts = true; assert.equal(child.signalCode, 'SIGKILL'); await new Promise(()=>{}) } })
    await assert.rejects(close(), error => error.errors.some(item => /artifact/.test(item.message)))
    assert.equal(artifacts, true); await exited
  } finally { if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await exited } }
})

for (const diagnosticCode of ['ENOENT', 'EACCES']) {
  test(`owned Linux termination survives diagnostic cmdline ${diagnosticCode} and still reports forced failure`, { skip: process.platform !== 'linux' }, async () => {
    // Builtin mutation is confined to this disposable Node interpreter, never the shared test process.
    const script = `
      import fs from 'node:fs';
      import { syncBuiltinESMExports } from 'node:module';
      import { spawn } from 'node:child_process';
      import { once } from 'node:events';
      import assert from 'node:assert/strict';
      const { createDesktopCloser } = await import(${JSON.stringify(pathToFileURL(path.join(root, 'benchmark/local/electron-harness.mjs')).href)});
      const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { detached:true, stdio:'ignore' });
      await once(child,'spawn');
      const exited = once(child,'exit');
      const original = fs.readFileSync;
      let injections = 0, observation, closeError;
      const close = createDesktopCloser({ child, ownedProcessGroup:child.pid, graceMs:20, killMs:300,
        beforeClose:async()=>{}, closeApplication:async()=>{}, onTeardown:state=>{observation=state} });
      fs.readFileSync = function(file, ...args) {
        if (String(file) === '/proc/' + child.pid + '/cmdline') {
          injections++; throw Object.assign(new Error('Injected diagnostic only'), { code:${JSON.stringify(diagnosticCode)} });
        }
        return original.call(this,file,...args);
      };
      syncBuiltinESMExports();
      try {
        await assert.rejects(close(), error => { closeError = error; return error instanceof AggregateError; });
        assert.ok(injections > 0, 'diagnostic failure must actually occur');
        assert.equal(child.signalCode,'SIGKILL','diagnostic failure must not prevent bounded owned-group kill/exit observation');
        await exited;
        assert.equal(observation.forced,true);
        assert.deepEqual(observation.ownedRemaining,[]);
        assert.ok(closeError.errors.some(item=>/forced process-tree termination/.test(item.message)));
        assert.ok(observation.errors.some(message=>/forced process-tree termination/.test(message)));
        assert.ok(!observation.errors.some(message=>/Injected diagnostic only/.test(message)));
      } finally {
        fs.readFileSync = original; syncBuiltinESMExports();
        if (child.exitCode === null && child.signalCode === null) { process.kill(-child.pid,'SIGKILL'); await exited; }
      }
    `
    await execute(process.execPath, ['--input-type=module','-e',script],
      { cwd:root, timeout:5000, env:{ ...process.env, DISPLAY:'', WAYLAND_DISPLAY:'', TEMP:parent, TMP:parent, TMPDIR:parent } })
  })
}

test('early Linux source launch delegates argument policy while packaged AppRun receives the untouched arguments', async () => {
  assert.equal(typeof harness.desktopLaunchArgs, 'function')
  const environment = Object.freeze({ DISPLAY: ':90', XDG_SESSION_TYPE: 'wayland', WAYLAND_DISPLAY: 'wayland-owned-probe' })
  const original = Object.freeze(['.', '--workspace'])
  assert.deepEqual(harness.desktopLaunchArgs({ platform: 'linux', env: environment, packaged: false, args: original }), ['--ozone-platform=x11', ...original])
  assert.deepEqual(harness.desktopLaunchArgs({ platform: 'linux', env: environment, packaged: true, args: original }), [...original])
  assert.deepEqual(harness.desktopLaunchArgs({ platform: 'win32', env: environment, packaged: false, args: original }), [...original])
  for (const args of [['--ozone-platform=wayland','.'], ['--ozone-platform-hint','auto','.'], ['--ozone-platform=','.'], ['--','.','--ozone-platform=wayland']]) {
    const { linuxLaunchArgs } = await import('../../electron/linuxLaunch.mjs')
    assert.deepEqual(harness.desktopLaunchArgs({ platform: 'linux', env: environment, packaged: false, args }), linuxLaunchArgs('linux',environment,args))
    assert.deepEqual(harness.desktopLaunchArgs({ platform: 'linux', env: environment, packaged: true, args }), args)
  }
})

async function withLaunchPackage(work) {
  const directory = await mkdtemp(path.join(root, 'tmp/linux-launch-20261114/tool-tests/package-'))
  const executable = path.join(directory, 'MindNotes Pro')
  const header = Buffer.alloc(64); header.set([127,69,76,70,2,1,1]); header.writeUInt16LE(3,16); header.writeUInt16LE(62,18); header.writeUInt32LE(1,20)
  await writeFile(executable,header,{mode:0o700}); await mkdir(path.join(directory,'resources')); await writeFile(path.join(directory,'resources/app.asar'),'read-only fixture')
  try { return await work({directory,executable,wrapper:path.join(directory,'AppRun')}) }
  finally { await rm(directory,{recursive:true,force:true}) }
}

test('Linux packaged entry verifies adjacent AppRun is a regular executable inside its actual app directory', { skip:process.platform!=='linux' }, async () => {
  assert.equal(typeof harness.validateLinuxAppRun,'function')
  await withLaunchPackage(async ({directory,executable,wrapper}) => {
    await assert.rejects(harness.validateLinuxAppRun(executable), /AppRun/)
    await writeFile(wrapper,'#!/bin/sh\nexit 0\n',{mode:0o700})
    assert.equal(await harness.validateLinuxAppRun(executable),wrapper)
    await import('node:fs/promises').then(fs=>fs.chmod(wrapper,0o600))
    await assert.rejects(harness.validateLinuxAppRun(executable), /executable/)
    await rm(wrapper)
    await mkdir(wrapper)
    await assert.rejects(harness.validateLinuxAppRun(executable), /regular file/)
    await rm(wrapper,{recursive:true})
    await symlink(process.execPath,wrapper)
    await assert.rejects(harness.validateLinuxAppRun(executable), /outside.*app|escapes.*app/i)
    await rm(wrapper)
    await writeFile(path.join(directory,'owned-wrapper'),'#!/bin/sh\nexit 0\n',{mode:0o700})
    await symlink(path.join(directory,'owned-wrapper'),wrapper)
    assert.equal(await harness.validateLinuxAppRun(executable),path.join(directory,'owned-wrapper'))
  })
})

test('Linux packaged preflight keeps expected ELF but selects AppRun launch without running either fixture', { skip:process.platform!=='linux' }, async () => {
  const previous = { DISPLAY:process.env.DISPLAY,WAYLAND_DISPLAY:process.env.WAYLAND_DISPLAY }
  try {
    process.env.DISPLAY=':90'; delete process.env.WAYLAND_DISPLAY
    await withLaunchPackage(async ({executable,wrapper}) => {
      await assert.rejects(harness.preflightDesktop({allowVisible:true,executable}),/AppRun/)
      await writeFile(wrapper,'#!/bin/sh\nexit 7\n',{mode:0o700})
      const ready=await harness.preflightDesktop({allowVisible:true,executable})
      assert.equal(ready.executablePath,executable)
      assert.equal(ready.launchExecutablePath,wrapper)
      assert.equal(ready.sandbox.chromiumSandbox,true)
      assert.equal(ready.binary.format,'ELF')
    })
  } finally { for(const[key,value]of Object.entries(previous)) if(value===undefined)delete process.env[key];else process.env[key]=value }
})

test('owned diagnostic accepts only nonexistent synthetic Wayland probe socket under its live runtime alias', { skip:process.platform!=='linux' }, async context => {
  let owner
  try { owner=JSON.parse(await readFile('tmp/linux-desktop-20261114/test-display/state/owner.json','utf8'));process.kill(owner.pid,0) }
  catch { context.skip('No task-owned virtual server; no GUI is launched.');return }
  const environment={DISPLAY:owner.display,XAUTHORITY:path.resolve('tmp/linux-desktop-20261114/test-display/state/Xauthority'),XDG_RUNTIME_DIR:owner.runtime_alias,XDG_SESSION_TYPE:'wayland'}
  try { await harness.verifyOwnedX11(environment) } catch { context.skip('Task virtual server identity is no longer live.');return }
  const probe={...environment,WAYLAND_DISPLAY:'wayland-owned-probe'}
  assert.equal((await harness.verifyOwnedX11(probe)).display,owner.display)
  await assert.rejects(harness.verifyOwnedX11({...probe,WAYLAND_DISPLAY:'wayland-0'}),/Wayland/)
  await assert.rejects(harness.verifyOwnedX11({...probe,XDG_RUNTIME_DIR:parent}),/runtime|Wayland/i)
  const socketPath=path.join(owner.runtime_alias,'wayland-owned-probe')
  await writeFile(socketPath,'owned fixture, not a compositor socket',{flag:'wx'})
  try { await assert.rejects(harness.verifyOwnedX11(probe),/socket|Wayland/i) }
  finally { await rm(socketPath) }
})
