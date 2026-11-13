/* global process, Buffer, fetch, setTimeout, clearTimeout, AbortController, URL, window, innerWidth, innerHeight, PerformanceObserver, requestAnimationFrame, cancelAnimationFrame */
import http from 'node:http'
import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { access, mkdir, open, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'
import { isDeepStrictEqual } from 'node:util'
import { makeStrokes, makeScreenEntries, makePageNotebooks } from './fixtures.mjs'
import { withWorkspace } from './runtime.mjs'

const require = createRequire(import.meta.url)
const localRoot = 'tmp/local-baseline-20261113/runtime'
const sdkTempRoot = path.resolve(localRoot, `sdk-${randomUUID()}`)
let workspaceUsers = 0
export class DesktopUnavailable extends Error {}

async function bounded(work, milliseconds, description) {
  let timer
  const controller = new AbortController()
  try {
    return await Promise.race([Promise.resolve().then(() => work(controller.signal)), new Promise((_resolve, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error(`Timed out: ${description}`)) }, milliseconds)
    })])
  } finally { clearTimeout(timer); controller.abort() }
}

function pidAlive(pid) {
  try { process.kill(pid, 0); return true }
  catch (error) { if (error.code === 'ESRCH') return false; throw error }
}

/** Attach the exit observer immediately after launch, before any renderer/main evaluation. */
export function createDesktopCloser(options) {
  const { child, proxy, beforeClose, closeApplication, graceMs = 5000, killMs = 5000 } = options
  const hasExited = () => child.exitCode !== null || child.signalCode !== null
  let exitListener, closing
  const exited = hasExited() ? Promise.resolve() : new Promise(resolve => {
    exitListener = () => resolve()
    child.once('exit', exitListener)
    if (hasExited()) resolve()
  })
  const waitForExit = async signal => {
    await exited
    // On Windows Playwright owns cmd.exe; Electron's real main PID can outlive it.
    if (process.platform === 'win32' && options.mainPid && options.mainPid !== child.pid)
      while (!signal.aborted && pidAlive(options.mainPid)) await new Promise(resolve => setTimeout(resolve, 25))
  }
  return () => {
    closing ??= (async () => {
      const errors = []
      try {
        await bounded(async signal => {
          try { await beforeClose() } catch (error) { errors.push(error) }
          if (signal.aborted) return
          await closeApplication()
          await waitForExit(signal)
        }, graceMs, 'complete graceful desktop teardown')
      } catch (error) { errors.push(error) }
      try {
        const mainAlive = process.platform === 'win32' && options.mainPid && options.mainPid !== child.pid && pidAlive(options.mainPid)
        if (!hasExited() || mainAlive) {
          errors.push(new Error('Desktop required forced process-tree termination.'))
          await bounded(async signal => {
            if (process.platform === 'win32') {
              const pids = new Set([!hasExited() && child.pid, mainAlive && options.mainPid].filter(Boolean))
              for (const pid of pids) {
                if (signal.aborted) return
                await new Promise((resolve, reject) => {
                  execFile('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { timeout: killMs, windowsHide: true }, error => {
                    try {
                      if (error && pidAlive(pid)) reject(error)
                      else resolve()
                    } catch (observationError) { reject(observationError) }
                  })
                })
              }
            } else if (!child.kill('SIGKILL') && !hasExited()) throw new Error('Owned desktop child could not be killed.')
            await waitForExit(signal)
          }, killMs, 'owned desktop process-tree exit')
        }
      } catch (error) { errors.push(error) }
      finally {
        if (exitListener) child.removeListener('exit', exitListener)
        if (proxy) { try { await bounded(() => proxy.close(), killMs, 'deny proxy cleanup') } catch (error) { errors.push(error) } }
      }
      if (errors.length) throw new AggregateError(errors, 'Desktop teardown failed.')
    })()
    return closing
  }
}

export async function withDesktopWorkspace(work) {
  return withWorkspace(await realpath(process.cwd()), async directory => {
    // The SDK caches its artifact prefix. Recreate this same owned root for later runs.
    await mkdir(sdkTempRoot, { recursive: true })
    workspaceUsers++
    try { return await withDesktopTempDirectory(sdkTempRoot, () => work(directory)) }
    finally {
      workspaceUsers--
      if (workspaceUsers === 0) await rm(sdkTempRoot, { recursive: true, force: true })
    }
  })
}

/** os.tmpdir is consumed by the SDK in this parent process at import/initialization time. */
export async function withDesktopTempDirectory(directory, work) {
  directory = await ownedDirectory(directory)
  const previous = { TEMP: process.env.TEMP, TMP: process.env.TMP, TMPDIR: process.env.TMPDIR }
  Object.assign(process.env, { TEMP: directory, TMP: directory, TMPDIR: directory })
  try { return await work() }
  finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

/** Read-only guard: never runs a candidate binary, creates a database or downloads Electron. */
export async function preflightDesktop({ allowVisible = false, executable } = {}) {
  if (allowVisible !== true) throw new DesktopUnavailable('Visible desktop launch requires --allow-visible.')
  if (process.platform !== 'win32') throw new DesktopUnavailable('A visible target Windows environment is required; this host cannot execute the Windows desktop baseline.')
  let executablePath
  try { executablePath = await realpath(executable ?? require('electron')) }
  catch { throw new DesktopUnavailable('Electron executable is unavailable; prepare the target installation or pass --executable.') }
  const file = await open(executablePath, 'r').catch(() => { throw new DesktopUnavailable('Electron executable cannot be read.') })
  try {
    const header = Buffer.alloc(64)
    const { bytesRead } = await file.read(header, 0, header.length, 0)
    if (bytesRead !== 64 || header.toString('ascii', 0, 2) !== 'MZ') throw new DesktopUnavailable('Executable is not a runnable Windows PE image.')
    const signature = Buffer.alloc(4)
    await file.read(signature, 0, 4, header.readUInt32LE(60))
    if (!signature.equals(Buffer.from([80, 69, 0, 0]))) throw new DesktopUnavailable('Executable has no valid Windows PE signature.')
  } finally { await file.close() }
  if (executable) {
    await access(path.join(path.dirname(executablePath), 'resources/app.asar'))
      .catch(() => { throw new DesktopUnavailable('Packaged mode requires the executable and its sibling resources/app.asar.') })
  } else {
    try {
      await access('dist-electron/electron/main.mjs')
      const html = await readFile('dist/index.html', 'utf8')
      if (!/\b(?:src|href)=["']\.\/assets\//.test(html) || /\b(?:src|href)=["'](?:\/assets\/|https?:\/\/)/.test(html))
        throw new Error('nonlocal assets')
      for (const reference of html.matchAll(/\b(?:src|href)=["'](\.\/assets\/[^"']+)["']/g))
        await access(path.resolve('dist', reference[1]))
    } catch { throw new DesktopUnavailable('Local production assets are unavailable. Run npm run build:electron and npm run build -- --base=./ explicitly.') }
  }
  try {
    await access('dist-electron/electron/screenNotebookRepository.mjs')
    await access('dist-electron/electron/notebookRepository.mjs')
  } catch { throw new DesktopUnavailable('Current compiled fixture repositories are unavailable; run npm run build:electron explicitly.') }
  try { require.resolve('@playwright/test') }
  catch { throw new DesktopUnavailable('The existing Playwright development dependency is unavailable.') }
  return { executablePath, packaged: Boolean(executable) }
}

async function ownedDirectory(directory) {
  const root = await realpath(path.resolve(localRoot))
  const actual = await realpath(directory)
  const relative = path.relative(root, actual)
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error('Desktop data must be a disposable child of the local-baseline runtime workspace.')
  return actual
}

/** Never forwards: both clear HTTP and TLS CONNECT terminate here. */
export async function startDenyProxy() {
  const requests = [], sockets = new Set()
  let overflow = false, closing
  const record = request => {
    if (requests.length < 10000) requests.push({ method: request.method ?? '', url: request.url ?? '', status: 503 })
    else overflow = true
  }
  const server = http.createServer((request, response) => {
    record(request)
    response.writeHead(503, { Connection: 'close', 'Content-Type': 'text/plain' })
    response.end('Local baseline network denied')
  })
  server.on('connect', (request, socket) => {
    record(request)
    socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nContent-Length: 0\r\n\r\n')
  })
  server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)) })
  server.on('clientError', (_error, socket) => socket.destroy())
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  return { port: server.address().port, requests, get overflow() { return overflow },
    close() {
      closing ??= new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve())
        for (const socket of sockets) socket.destroy()
      })
      return closing
    } }
}

export async function waitUntil(read, accepts, description, timeout = 15000) {
  const end = performance.now() + timeout
  do {
    const value = await read()
    if (accepts(value)) return value
    if (performance.now() >= end) break
    await new Promise(resolve => setTimeout(resolve, 25))
  } while (performance.now() <= end)
  throw new Error(`Timed out: ${description}`)
}

export async function openLibrary(session) {
  const existing = session.app.windows().find(page => page.url().startsWith('file:') && !new URL(page.url()).searchParams.has('surface'))
  if (existing) {
    await session.toolbar.evaluate(() => window.mindnotesFloating.command('workspace'))
    await existing.evaluate(() => window.mindnotes.command('home'))
  } else {
    await session.toolbar.getByRole('button', { name: '更多操作' }).click()
    await session.toolbar.getByRole('button', { name: '我的笔记', exact: true }).click()
  }
  const shell = await waitUntil(() => session.app.windows().find(page => {
    const url = page.url()
    return url.startsWith('file:') && !new URL(url).searchParams.has('surface')
  }), Boolean, 'trusted library window')
  await shell.getByRole('region', { name: '统一笔记库' }).waitFor({ state: 'visible' })
  await shell.locator('.screen-library-grid[aria-busy="false"]').waitFor({ state: 'attached' })
  return shell
}

function matchingProxyRequests(proxy, before, target) {
  return proxy.requests.slice(before).filter(request => request.method === 'GET' && request.url === target && request.status === 503)
}

/** Evidence is confined to this request interval; an old canary or unrelated traffic is insufficient. */
export function proxyControlEvidence(proxy, before, target, control, directHits) {
  const proxyRequests = matchingProxyRequests(proxy, before, target)
  if (control.route !== `PROXY 127.0.0.1:${proxy.port}` || control.response !== 503 || !proxyRequests.length || directHits !== 0 || proxy.overflow)
    throw new Error('Session proxy control failed.')
  return { ...control, target, proxyRequests: proxyRequests.map(request => ({ ...request })) }
}

/** Controls run before broad cancellation, against actual default and lazily created page sessions. */
async function proveOffline(session, proxy) {
  let hits = 0
  const canary = http.createServer((_request, response) => { hits++; response.end('baseline-canary') })
  await new Promise((resolve, reject) => { canary.once('error', reject); canary.listen(0, '127.0.0.1', resolve) })
  const base = `http://127.0.0.1:${canary.address().port}/${randomUUID()}`
  const defaultUrl = `${base}/default-fetch`, navigationUrl = `${base}/lazy-navigation`, pageUrl = `${base}/page-fetch`
  try {
    if (await (await fetch(`${base}/node-direct`)).text() !== 'baseline-canary') throw new Error('Direct Node canary control failed.')
    hits = 0
    await session.app.evaluate(async ({ app, session: sessions }, port) => {
      const state = { sessions: new Set(), pending: [], cancel: false, listener: undefined }
      const configure = async actual => {
        state.sessions.add(actual)
        await actual.setProxy({ mode: 'fixed_servers', proxyRules: `http=127.0.0.1:${port};https=127.0.0.1:${port}`, proxyBypassRules: '<-loopback>' })
        await actual.closeAllConnections()
        if (state.cancel) actual.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true }))
      }
      state.listener = actual => {
        const pending = configure(actual)
        state.pending.push(pending)
        void pending.catch(() => {})
      }
      globalThis.__mindnotesBaselineIsolation = state
      app.on('session-created', state.listener)
      await configure(sessions.defaultSession)
    }, proxy.port)
    const beforeDefault = proxy.requests.length
    const defaultResult = await session.app.evaluate(async ({ session: sessions }, target) => {
      const route = await sessions.defaultSession.resolveProxy(target)
      const response = await sessions.defaultSession.fetch(target).then(value => value.status, () => 0)
      return { route, response }
    }, defaultUrl)
    const defaultControl = proxyControlEvidence(proxy, beforeDefault, defaultUrl, defaultResult, hits)
    const shell = await openLibrary(session)
    const beforeNavigation = proxy.requests.length
    await shell.evaluate(target => window.mindnotes.navigate(target), navigationUrl)
    const navigationRequests = matchingProxyRequests(proxy, beforeNavigation, navigationUrl)
    if (!navigationRequests.length || hits !== 0 || proxy.overflow) throw new Error('Initial lazy navigation proxy control failed.')
    const lazyNavigation = { target: navigationUrl, proxyRequests: navigationRequests.map(request => ({ ...request })) }
    const beforePage = proxy.requests.length
    const pageResult = await session.app.evaluate(async ({ BrowserWindow }, target) => {
      const state = globalThis.__mindnotesBaselineIsolation
      await Promise.all(state.pending)
      const shellWindow = BrowserWindow.getAllWindows().find(window => {
        const address = window.webContents.getURL()
        return address.startsWith('file:') && !new URL(address).searchParams.has('surface')
      })
      const page = shellWindow?.contentView.children.find(view => 'webContents' in view)?.webContents
      if (!page || page.getLastWebPreferences().partition !== 'persist:mindnotes-pages' || !state.sessions.has(page.session))
        throw new Error('Actual lazy page session was not observed.')
      const route = await page.session.resolveProxy(target)
      const response = await page.session.fetch(target).then(value => value.status, () => 0)
      return { route, response, partition: page.getLastWebPreferences().partition }
    }, pageUrl)
    const pageControl = proxyControlEvidence(proxy, beforePage, pageUrl, pageResult, hits)
    await session.app.evaluate(async () => {
      const state = globalThis.__mindnotesBaselineIsolation
      await Promise.all(state.pending)
      state.cancel = true
      for (const actual of state.sessions)
        actual.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true }))
    })
    await shell.evaluate(() => window.mindnotes.command('home'))
    return { directControl: true, directApplicationHits: hits, defaultControl, lazyNavigation, pageControl,
      proxyRequests: proxy.requests.map(request => ({ ...request })) }
  } finally {
    canary.closeAllConnections()
    await new Promise((resolve, reject) => canary.close(error => error ? reject(error) : resolve()))
  }
}

export async function launchIsolated({ directory, executable, offline = false, allowVisible = false }) {
  const ready = await preflightDesktop({ allowVisible, executable })
  directory = await ownedDirectory(directory)
  if (!workspaceUsers) throw new Error('Desktop SDK launch requires withDesktopWorkspace to own its complete artifact lifetime.')
  const env = {}
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && !['ELECTRON_RUN_AS_NODE', 'MINDNOTES_START_WORKSPACE', 'NODE_OPTIONS'].includes(key)) env[key] = value
  Object.assign(env, { MINDNOTES_USE_DIST: '1', MINDNOTES_USER_DATA_DIR: directory, TEMP: directory, TMP: directory, TMPDIR: directory })
  let app, proxy, applicationClose
  const lifecycle = {}
  const close = async () => {
    if (applicationClose) return applicationClose()
    if (proxy) await proxy.close()
  }
  try {
    if (offline) proxy = await startDenyProxy()
    const args = ready.packaged ? [] : ['.']
    if (proxy) args.push(`--proxy-server=http://127.0.0.1:${proxy.port}`, '--proxy-bypass-list=<-loopback>')
    const start = performance.now()
    app = await withDesktopTempDirectory(sdkTempRoot, async () => {
      const { _electron } = await import('@playwright/test')
      return _electron.launch({ executablePath: ready.executablePath, args, env, timeout: 30000 })
    })
    Object.assign(lifecycle, { child: app.process(), proxy,
      beforeClose: async () => {
        const errors = []
        try {
          const toolbar = app.windows().find(page => page.url().includes('surface=toolbar'))
          await toolbar?.evaluate(() => window.mindnotesFloating.command('collapse'))
        } catch (error) { errors.push(error) }
        try { await app.evaluate(async ({ app: electronApp }) => {
          const state = globalThis.__mindnotesBaselineIsolation
          if (!state) return
          electronApp.removeListener('session-created', state.listener)
          await Promise.allSettled(state.pending)
          for (const actual of state.sessions) actual.webRequest.onBeforeRequest(null)
          delete globalThis.__mindnotesBaselineIsolation
        }) } catch (error) { errors.push(error) }
        if (errors.length) throw new AggregateError(errors, 'Desktop pre-close cleanup failed.')
      }, closeApplication: () => app.close() })
    applicationClose = createDesktopCloser(lifecycle)
    const actual = await app.evaluate(({ app: electronApp }) => ({ directory: electronApp.getPath('userData'), packaged: electronApp.isPackaged, mainPid: process.pid }))
    if (!Number.isSafeInteger(actual.mainPid) || actual.mainPid <= 0) throw new Error('Electron main PID was not captured.')
    lifecycle.mainPid = actual.mainPid
    if ((await realpath(actual.directory)).toLowerCase() !== directory.toLowerCase()) throw new Error('Electron userData does not match the isolated task directory.')
    if (actual.packaged !== ready.packaged) throw new Error('Actual app packaging mode differs from the requested launch mode.')
    const surface = name => waitUntil(() => app.windows().find(page => {
      try { return new URL(page.url()).searchParams.get('surface') === name } catch { return false }
    }), Boolean, `${name} window`)
    const toolbar = await surface('toolbar'), overlay = await surface('screen')
    await toolbar.getByRole('button', { name: '展开悬浮批注' }).waitFor({ state: 'visible' })
    const launchToBubbleReadyMs = performance.now() - start
    const expandStart = performance.now()
    await toolbar.getByRole('button', { name: '展开悬浮批注' }).click()
    await toolbar.getByRole('toolbar', { name: '悬浮批注工具条' }).waitFor({ state: 'visible' })
    await overlay.locator('.screen-ink-canvas').waitFor({ state: 'attached' })
    const result = { app, toolbar, overlay, directory, close,
      timings: { launchToBubbleReadyMs, expandToolbarMs: performance.now() - expandStart } }
    if (proxy) result.offlineEvidence = await proveOffline(result, proxy)
    return result
  } catch (error) {
    try { await close() } catch (cleanup) { throw new AggregateError([error, cleanup], 'Desktop launch and cleanup failed.', { cause: cleanup }) }
    throw error
  }
}

/** Existing repositories prepare generated data before Electron takes ownership of the database. */
export async function prepareFixture(directory, notes = 1000) {
  await ownedDirectory(path.dirname(directory))
  await mkdir(directory, { recursive: true })
  await ownedDirectory(directory)
  const entries = makeScreenEntries(notes), pages = makePageNotebooks()
  const { ScreenNotebookRepository } = await import(pathToFileURL(path.resolve('dist-electron/electron/screenNotebookRepository.mjs')).href)
  const { NotebookRepository } = await import(pathToFileURL(path.resolve('dist-electron/electron/notebookRepository.mjs')).href)
  const screen = new ScreenNotebookRepository(directory)
  const page = new NotebookRepository(directory)
  try {
    await screen.load()
    if ((await screen.list()).total !== 0 || (await page.load()).length !== 0) throw new Error('Fixture preparation requires an empty data directory.')
    if (await screen.import(entries) !== entries.length) throw new Error('Fixture note import count differs.')
    await page.save(pages)
    await page.flush()
  } finally { await screen.close() }
  return { entries, pages }
}

export async function currentDisplay(session) {
  return session.app.evaluate(({ BrowserWindow, screen }) => {
    const toolbar = BrowserWindow.getAllWindows().find(window => new URL(window.webContents.getURL()).searchParams.get('surface') === 'toolbar')
    if (!toolbar) throw new Error('Toolbar display unavailable.')
    const display = screen.getDisplayMatching(toolbar.getBounds())
    return { id: String(display.id), bounds: display.bounds, scaleFactor: display.scaleFactor }
  })
}

export async function importFullDraft(session, filePath) {
  const display = await currentDisplay(session)
  const strokes = makeStrokes().map(stroke => ({ ...stroke, points: stroke.points.map(point => ({
    x: point.x * display.bounds.width / 1920, y: point.y * display.bounds.height / 1080,
  })) }))
  const draft = { displayId: display.id, width: display.bounds.width, height: display.bounds.height,
    strokes, backgroundId: null, source: { app: 'Local baseline', title: 'Full generated draft', display: display.id }, updatedAt: 1794528000000 }
  await writeFile(filePath, JSON.stringify({ format: 'mindnotes-pro.screen-drafts', version: 1, drafts: [draft], backgrounds: [] }))
  await session.app.evaluate(({ dialog }, target) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [target] })
  }, filePath)
  await session.toolbar.evaluate(() => window.mindnotesFloating.command('import-draft'))
  await waitUntil(() => session.overlay.evaluate(() => window.mindnotesScreen.getState()), state => isDeepStrictEqual(state.strokes, strokes), 'full draft geometry')
  await waitUntil(() => session.toolbar.evaluate(() => window.mindnotesFloating.getState()), state => state.saveState === 'saved' && state.count === 1000, 'full draft durable save')
  return strokes
}

/** A real pointer stream: expected geometry is derived from dispatched client coordinates. */
export async function measureGesture(session, count = 24) {
  if (!Number.isInteger(count) || count < 2 || count > 8000) throw new RangeError('Gesture point count must be 2..8000.')
  await session.toolbar.evaluate(async () => {
    await window.mindnotesFloating.command('expand')
    await window.mindnotesFloating.configure('pen', '#e05d52', 'medium')
  })
  const state = await waitUntil(() => session.overlay.evaluate(() => window.mindnotesScreen.getState()), value => value.inputEnabled && value.tool === 'pen', 'pen input enabled')
  if (state.strokes.length !== 0) throw new Error('Measured gesture requires its own empty draft.')
  const viewport = await session.overlay.evaluate(() => ({ width: innerWidth, height: innerHeight }))
  if (viewport.width < 300 || viewport.height < 200) throw new Error('Screen is too small for the deterministic pointer fixture.')
  // Fold inside a small upper-left rectangle; adjacent points are >= 2 client pixels.
  const points = Array.from({ length: count }, (_, index) => ({ x: 40 + (index % 80) * 2, y: 40 + (Math.floor(index / 80) % 40) * 2 }))
  const expected = points.map(point => ({ x: point.x * state.width / viewport.width, y: point.y * state.height / viewport.height }))
  if (expected.some((point, index) => index > 0 && Math.hypot(point.x - expected[index - 1].x, point.y - expected[index - 1].y) < 1))
    throw new Error('Display projection would filter expected pointer points.')
  const before = await session.overlay.locator('[data-stroke-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-stroke-id')))
  await session.overlay.mouse.move(points[0].x, points[0].y)
  const start = performance.now()
  let id, released = false
  try {
    await session.overlay.mouse.down()
    const added = await waitUntil(() => session.overlay.locator('[data-stroke-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-stroke-id'))),
      ids => ids.filter(value => !before.includes(value)).length === 1, 'new pointerdown preview UUID')
    id = added.find(value => !before.includes(value))
    if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)) throw new Error('Rendered stroke has no real UUID.')
    for (const point of points.slice(1)) await session.overlay.mouse.move(point.x, point.y)
    await session.overlay.mouse.up()
    released = true
    const pointerCommandMs = performance.now() - start
    const committed = await waitUntil(() => session.overlay.evaluate(() => window.mindnotesScreen.getState()),
      value => value.strokes.some(stroke => stroke.id === id && isDeepStrictEqual(stroke.points, expected)), 'latest committed UUID and complete point geometry', 30000)
    await waitUntil(() => session.toolbar.evaluate(() => window.mindnotesFloating.getState()),
      value => value.saveState === 'saved' && value.count === 1, 'latest gesture durable receipt', 30000)
    const stroke = committed.strokes.find(value => value.id === id)
    if (stroke.tool !== 'pen' || stroke.color !== '#e05d52' || stroke.width !== 4) throw new Error('Committed brush metadata differs.')
    return { stroke, pointerCommandMs, gestureToSavedMs: performance.now() - start, dispatchedPoints: points.length }
  } finally { if (!released) await session.overlay.mouse.up().catch(() => {}) }
}

/** Sampling owns and disconnects its RAF, timer and long-task observer on every path. */
export async function observeFrames(page, seconds, operation) {
  await page.evaluate(duration => {
    if (!PerformanceObserver.supportedEntryTypes.includes('longtask')) throw new Error('Chromium long-task observer unavailable.')
    const state = { frames: [], tasks: [], last: undefined, raf: 0, timer: 0, overflow: false, stopped: false }
    const append = (list, value) => { if (list.length < 20000) list.push(value); else state.overflow = true }
    const observer = new PerformanceObserver(list => { for (const entry of list.getEntries()) append(state.tasks, entry.duration) })
    observer.observe({ entryTypes: ['longtask'] })
    const tick = now => { if (state.last !== undefined) append(state.frames, now - state.last); state.last = now; state.raf = requestAnimationFrame(tick) }
    state.raf = requestAnimationFrame(tick)
    state.stop = () => {
      if (state.stopped) return
      state.stopped = true
      cancelAnimationFrame(state.raf)
      clearTimeout(state.timer)
      for (const entry of observer.takeRecords()) append(state.tasks, entry.duration)
      observer.disconnect()
    }
    state.timer = setTimeout(state.stop, duration)
    globalThis.__mindnotesBaselineFrames = state
  }, seconds * 1000)
  try {
    const result = await operation()
    await page.waitForFunction(() => globalThis.__mindnotesBaselineFrames.stopped, undefined, { timeout: (seconds + 10) * 1000 })
    const sample = await page.evaluate(() => {
      const state = globalThis.__mindnotesBaselineFrames
      return { frames: state.frames, tasks: state.tasks, overflow: state.overflow }
    })
    if (!sample.frames.length || sample.overflow) throw new Error('Frame sample is empty or exceeded its bounded capacity.')
    return { result, ...sample }
  } finally {
    await page.evaluate(() => {
      globalThis.__mindnotesBaselineFrames?.stop()
      delete globalThis.__mindnotesBaselineFrames
    }).catch(() => {})
  }
}
