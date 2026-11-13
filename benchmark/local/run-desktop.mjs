/* global process, setTimeout, URL, window */
import { performance } from 'node:perf_hooks'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readdir, mkdir, realpath, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { collectIdentity, collectEnvironment, parseOptions, writeReport } from './runtime.mjs'
import { createReport, summarize } from './report.mjs'
import { fixtureIdentity, makeStrokes, makeScreenEntries, makePageNotebooks } from './fixtures.mjs'
import { DesktopUnavailable, preflightDesktop, selectDesktopExecutable, launchIsolated, prepareFixture, openLibrary,
  importFullDraft, measureGesture, observeFrames, waitUntil, withDesktopWorkspace } from './electron-harness.mjs'

export function desktopLaunchOptions(input = {}, environment = process.env) {
  const names = { iterations: '--iterations', warmups: '--warmups', notes: '--notes', output: '--output',
    allowVisible: '--allow-visible', executable: '--executable', idleSeconds: '--idle-seconds', frameSeconds: '--frame-seconds' }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Desktop options must be an object.')
  const args = []
  for (const [key, value] of Object.entries(input)) {
    if (!Object.hasOwn(names, key)) throw new TypeError('Unknown desktop option.')
    if (value === undefined) continue
    if (key === 'allowVisible') {
      if (typeof value !== 'boolean') throw new TypeError('allowVisible must be boolean.')
      if (value) args.push(names[key])
    } else args.push(names[key], String(value))
  }
  const options = parseOptions(args, 'desktop')
  return { ...options, executable: selectDesktopExecutable(options.executable, environment).executable }
}

async function assetFiles(directory) {
  const files = []
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name)
    if (item.isDirectory()) files.push(...await assetFiles(file))
    else if (item.isFile()) files.push(file)
  }
  return files
}

async function sha256(file) {
  const hash = createHash('sha256')
  for await (const bytes of createReadStream(file)) hash.update(bytes)
  return hash.digest('hex')
}

async function resources(session) {
  return session.app.evaluate(({ app, BrowserWindow }) => {
    const roles = new Map()
    for (const window of BrowserWindow.getAllWindows()) {
      const surface = new URL(window.webContents.getURL()).searchParams.get('surface')
      roles.set(window.webContents.getOSProcessId(), surface === 'toolbar' ? 'toolbarRenderer' : surface === 'screen' ? 'screenRenderer' : 'libraryRenderer')
    }
    const groups = {}
    for (const metric of app.getAppMetrics()) {
      const role = roles.get(metric.pid) ?? (metric.type === 'Browser' ? 'main' : metric.type === 'GPU' ? 'gpu' : metric.type === 'Utility' ? 'utility' : 'other')
      const group = groups[role] ??= { workingSetBytes: 0, cpuPercent: 0 }
      group.workingSetBytes += metric.memory.workingSetSize * 1024
      group.cpuPercent += metric.cpu.percentCPUUsage
    }
    return groups
  })
}

/** Public runner returns diagnostic reports; only genuine target measurements can pass. */
export async function runDesktopBenchmark(input = {}) {
  const options = desktopLaunchOptions(input), root = await realpath(process.cwd())
  const parameters = { iterations: options.iterations, warmups: options.warmups, notes: options.notes,
    measurementVersion: 'local-measurement-v1', idleSeconds: options.idleSeconds, frameSeconds: options.frameSeconds }
  const fixture = fixtureIdentity({ strokes: makeStrokes(), entries: makeScreenEntries(options.notes), pages: makePageNotebooks(),
    ordinaryPoints: 24, longPoints: 8000, pointerPattern: 'x=40+(i%80)*2;y=40+(floor(i/80)%40)*2;client-projected-v1' })
  let identity = await collectIdentity(root, ['benchmark/local/run-desktop.mjs'])
  let environment = collectEnvironment(root), status = 'passed'
  const checks = new Map(), samples = {}, descriptions = {}
  const limitations = [
    'Visible target Windows automation only. Programmatic mouse commands, SVG presence and durable bridge state do not measure physical pen-to-pixel or GPU presentation latency.',
    'Every measured ordinary, full-draft restore and long-gesture scene launches a fresh application process. OS filesystem caches are not cleared; full-draft import/setup and fixture preparation are excluded from startup timing.',
    'Ordinary gesture uses 24 points on an empty draft; full-draft restore/static rendering uses 1000 strokes and 160000 points without adding ink; 8000-point gesture uses a separate empty draft.',
    'Frame intervals and long tasks observe the first configured frameSeconds of each named scene. Pointer timings share one gesture start; pointerCommandMs ends at mouse.up, gestureToSavedMs at exact new UUID/geometry plus current saved state.',
    'Working-set and CPU metrics are grouped by actual Electron process role at each named phase. Shared memory can be counted in multiple working sets; these values are not total physical RSS. CPU uses Electron getAppMetrics interval since the preceding resource sample.',
    'Default five measured repetitions use nearest-rank p95 (the maximum for five values); results are an exploratory machine baseline.',
    'No native screenshot or offline functionality is claimed by this performance runner; use the independent offline suite for those checks.',
    'Child launch filters NODE_OPTIONS, ELECTRON_RUN_AS_NODE and MINDNOTES_START_WORKSPACE; source mode requires an explicit local relative-base build.',
  ]
  const record = (name, values, unit, meaning, measured) => {
    if (!measured) return
    samples[name] ??= []
    samples[name].push(...(Array.isArray(values) ? values : [values]))
    descriptions[name] = { unit, meaning }
  }
  const checked = async (name, operation) => {
    try { const value = await operation(); checks.set(name, { name, status: 'passed' }); return value }
    catch (error) { checks.set(name, { name, status: 'failed', error: error.message }); throw error }
  }
  const resourceSample = async (session, scene, measured) => {
    for (const [role, value] of Object.entries(await resources(session))) {
      record(`${scene}.${role}.workingSetBytes`, value.workingSetBytes, 'bytes', `${scene}: sum of Electron working set sizes for ${role}, in bytes; shared pages are not deduplicated.`, measured)
      record(`${scene}.${role}.cpuPercent`, value.cpuPercent, 'percent', `${scene}: sum of Electron CPU usage percentages for ${role} since the preceding app metrics sample.`, measured)
    }
  }
  const frames = (scene, sample, measured) => {
    record(`${scene}.frameIntervalMs`, sample.frames, 'ms', `${scene}: requestAnimationFrame intervals during the first configured frameSeconds of this scene.`, measured)
    record(`${scene}.framesAbove16_7Percent`, 100 * sample.frames.filter(value => value > 16.7).length / sample.frames.length, 'percent', `${scene}: fraction of recorded frame intervals above 16.7 ms per repetition.`, measured)
    record(`${scene}.longTaskTotalMs`, sample.tasks.reduce((sum, value) => sum + value, 0), 'ms', `${scene}: total PerformanceObserver long-task duration during the configured observation window, zero if none.`, measured)
  }
  try {
    const ready = await preflightDesktop(options)
    const playwrightVersion = JSON.parse(await readFile(createRequire(import.meta.url).resolve('@playwright/test/package.json'), 'utf8')).version
    if (ready.packaged) {
      identity = await collectIdentity(root, ['benchmark/local/run-desktop.mjs',
        'dist-electron/electron/screenNotebookRepository.mjs', 'dist-electron/electron/notebookRepository.mjs'])
      identity.files['package/executable.exe'] = await sha256(ready.executablePath)
      identity.files['package/resources/app.asar'] = await sha256(path.join(path.dirname(ready.executablePath), 'resources/app.asar'))
    } else identity = await collectIdentity(root, ['benchmark/local/run-desktop.mjs', 'dist-electron/electron/main.mjs', ...await assetFiles('dist')])
    await withDesktopWorkspace(async directory => {
      environment = collectEnvironment(directory)
      for (let index = 0; index < options.warmups + options.iterations; index++) {
        const measured = index >= options.warmups
        const run = async (scene, operation, prepare = true) => {
          const own = path.join(directory, `${index}-${scene}`)
          if (prepare) await prepareFixture(own, options.notes)
          else await mkdir(own, { recursive: true })
          const session = await launchIsolated({ directory: own, allowVisible: true, executable: options.executable })
          try { return await operation(session) } finally { await session.close() }
        }
        await checked('ordinary-gesture-and-library', () => run('ordinary', async session => {
          const metadata = await session.app.evaluate(({ app, screen }) => ({ applicationVersion: app.getVersion(),
            electron: process.versions.electron, chromium: process.versions.chrome, packaged: app.isPackaged,
            displays: screen.getAllDisplays().map(display => ({ id: String(display.id), bounds: display.bounds, scaleFactor: display.scaleFactor })) }))
          identity.applicationVersion = metadata.applicationVersion
          const observed = { electron: metadata.electron, chromium: metadata.chromium, displays: metadata.displays,
            playwrightVersion, executionMode: metadata.packaged ? 'packaged' : 'source' }
          if (environment.electron && !isDeepStrictEqual(observed, { electron: environment.electron, chromium: environment.chromium,
            displays: environment.displays, playwrightVersion: environment.playwrightVersion, executionMode: environment.executionMode }))
            throw new Error('Runtime/display environment changed between repetitions.')
          Object.assign(environment, observed)
          record('launchToBubbleReadyMs', session.timings.launchToBubbleReadyMs, 'ms', 'Fresh prepared library process launch to visible collapsed bubble; OS caches retained.', measured)
          record('expandToolbarMs', session.timings.expandToolbarMs, 'ms', 'First bubble click to visible expanded toolbar and attached screen SVG in each fresh process.', measured)
          await resourceSample(session, 'ordinary.ready', measured)
          await new Promise(resolve => setTimeout(resolve, options.idleSeconds * 1000))
          await resourceSample(session, 'ordinary.idle', measured)
          const observedGesture = await observeFrames(session.overlay, options.frameSeconds, () => measureGesture(session))
          frames('ordinary', observedGesture, measured)
          record('pointerCommandMs', observedGesture.result.pointerCommandMs, 'ms', '24-point gesture from before mouse.down through mouse.up command completion; includes preview UUID observation.', measured)
          record('gestureToSavedMs', observedGesture.result.gestureToSavedMs, 'ms', 'Same 24-point gesture start through exact newly rendered UUID/geometry in committed bridge state and current saved state.', measured)
          await resourceSample(session, 'ordinary.afterGesture', measured)
          const start = performance.now()
          const shell = await openLibrary(session)
          const page = await shell.evaluate(() => window.mindnotesNotebook.list())
          if (page.total !== options.notes) throw new Error('Opened library total differs from prepared notes.')
          record('openLibraryMs', performance.now() - start, 'ms', 'Toolbar more/library UI action through visible ready library and verified repository count.', measured)
          await resourceSample(session, 'library.ready', measured)
        }))
        await checked('full-draft-restore-and-static-render', () => run('fullDraft', async setup => {
          const strokes = await importFullDraft(setup, path.join(directory, `full-${index}.json`))
          await setup.close()
          const restored = await launchIsolated({ directory: setup.directory, allowVisible: true, executable: options.executable })
          try {
            await waitUntil(() => restored.overlay.evaluate(() => window.mindnotesScreen.getState()),
              value => isDeepStrictEqual(value.strokes, strokes), 'restored full-draft geometry')
            await restored.overlay.locator('[data-stroke-id]').first().waitFor({ state: 'attached' })
            if (await restored.overlay.locator('[data-stroke-id]').count() !== 1000) throw new Error('Full draft SVG stroke count differs.')
            record('fullDraft.launchToBubbleReadyMs', restored.timings.launchToBubbleReadyMs, 'ms', 'Process restart with persisted 1000-stroke/160000-point draft to visible bubble; setup excluded and OS caches retained.', measured)
            record('fullDraft.expandToolbarMs', restored.timings.expandToolbarMs, 'ms', 'Full-draft process first expansion to toolbar visibility and attached SVG.', measured)
            frames('fullDraft', await observeFrames(restored.overlay, options.frameSeconds, async () => {}), measured)
            await resourceSample(restored, 'fullDraft.static', measured)
          } finally { await restored.close() }
        }))
        await checked('independent-8000-point-gesture', () => run('longGesture', async session => {
          await resourceSample(session, 'longGesture.ready', measured)
          const observed = await observeFrames(session.overlay, options.frameSeconds, () => measureGesture(session, 8000))
          if (observed.result.dispatchedPoints !== 8000 || observed.result.stroke.points.length !== 8000) throw new Error('Long gesture lost pointer samples.')
          frames('longGesture', observed, measured)
          record('longGesture.pointerCommandMs', observed.result.pointerCommandMs, 'ms', 'Independent 8000-point real pointer stream from mouse.down through mouse.up, including command transport.', measured)
          record('longGesture.gestureToSavedMs', observed.result.gestureToSavedMs, 'ms', 'Independent 8000-point gesture start through exact new UUID, all coordinates and current durable saved state.', measured)
          await resourceSample(session, 'longGesture.saved', measured)
        }, false))
      }
    })
    checks.set('workspace-cleanup', { name: 'workspace-cleanup', status: 'passed' })
  } catch (error) {
    status = error instanceof DesktopUnavailable ? 'unavailable' : 'failed'
    checks.set('desktop-run', { name: 'desktop-run', status, error: error.message })
  }
  const metrics = Object.fromEntries(Object.entries(samples).map(([name, values]) => [name, summarize(values, descriptions[name].unit, descriptions[name].meaning)]))
  const report = createReport({ runner: 'desktop', status, identity, environment, parameters, fixture,
    metrics, checks: [...checks.values()], limitations })
  await writeReport(report, options.output, root)
  return report
}

async function main() {
  try {
    const report = await runDesktopBenchmark(parseOptions(process.argv.slice(2), 'desktop'))
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    process.exitCode = report.status === 'passed' ? 0 : report.status === 'unavailable' ? 2 : 1
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 2 }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
