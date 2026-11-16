import { _electron as electron, expect } from '@playwright/test'
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { DatabaseSync } from 'node:sqlite'
import os from 'node:os'
import path from 'node:path'

const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-production-soak-'))
const executable = process.env.MINDNOTES_EXECUTABLE
const version = JSON.parse(await readFile('package.json', 'utf8')).version
const releaseLabel = version.replace(/^6\.0\.0-beta\./, 'beta')
const coordinateInput = process.env.MINDNOTES_SOAK_COORDINATE === '1'
const commandFile = path.resolve('tmp/qa/soak-command.json')
if (coordinateInput) {
  await mkdir(path.dirname(commandFile), { recursive: true })
  await writeFile(commandFile, '{}\n')
}
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !['ELECTRON_RUN_AS_NODE', 'MINDNOTES_START_WORKSPACE'].includes(key)
  )
)
const metrics = {
  version,
  executable: executable ?? 'source production assets',
  directory,
  scope: 'Playwright pointer input into real Electron; no native touch/pen or power transitions',
  samples: [],
  phases: [],
}
let active
let connection
const errors = []
async function launch() {
  const app = await electron.launch({
    ...(executable ? { executablePath: executable, args: [] } : { args: ['.'] }),
    env: { ...env, MINDNOTES_USER_DATA_DIR: directory, MINDNOTES_USE_DIST: '1' },
  })
  const instance = { app }
  try {
    await expect.poll(() => app.windows().length).toBe(2)
    instance.toolbar = app.windows().find((page) => page.url().includes('surface=toolbar'))
    instance.overlay = app.windows().find((page) => page.url().includes('surface=screen'))
    for (const page of app.windows()) page.on('pageerror', (error) => errors.push(error.message))
    await expect(instance.toolbar.getByRole('button', { name: '展开悬浮批注' })).toBeVisible()
    return instance
  } catch (error) {
    await app.close()
    throw error
  }
}
async function sample(phase) {
  const value = await active.app.evaluate(async ({ app, BrowserWindow }) => {
    const processes = app.getAppMetrics().map((metric) => ({
      pid: metric.pid,
      type: metric.type,
      workingSetKB: metric.memory.workingSetSize,
      privateKB: metric.memory.privateBytes,
      cpuPercent: metric.cpu.percentCPUUsage,
      idleWakeupsPerSecond: metric.cpu.idleWakeupsPerSecond,
    }))
    const windows = []
    for (const window of BrowserWindow.getAllWindows()) {
      const stats = await window.webContents.executeJavaScript(
        '({usedJSHeap:performance.memory?.usedJSHeapSize,totalJSHeap:performance.memory?.totalJSHeapSize})'
      )
      windows.push({
        url: window.webContents.getURL().split('?')[1] ?? 'shell',
        visible: window.isVisible(),
        ...stats,
      })
    }
    return { processes, windows }
  })
  const result = { phase, at: new Date().toISOString(), ...value }
  metrics.samples.push(result)
  console.log(
    JSON.stringify({
      phase,
      workingSetKB: value.processes.reduce((sum, item) => sum + item.workingSetKB, 0),
      cpuPercent: value.processes.reduce((sum, item) => sum + item.cpuPercent, 0),
      heaps: value.windows,
    })
  )
}
async function settleSaved() {
  await expect
    .poll(
      () =>
        active.toolbar.evaluate(() =>
          window.mindnotesFloating.getState().then((state) => state.saveState)
        ),
      { timeout: 15_000 }
    )
    .toBe('saved')
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
try {
  active = await launch()
  await sample('fresh-bubble')
  await pause(10_000)
  await sample('bubble-idle-10s')
  await active.toolbar.getByRole('button', { name: '展开悬浮批注' }).click()
  await active.toolbar.getByRole('button', { name: '画笔', exact: true }).click()
  const width = await active.overlay.evaluate(() => innerWidth)
  const height = await active.overlay.evaluate(() => innerHeight)
  const started = performance.now()
  const durations = []
  await active.overlay.evaluate(() => {
    window.__soakEvents = []
    for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'lostpointercapture'])
      document.querySelector('svg').addEventListener(type, (event) => {
        window.__soakEvents.push({
          type,
          pointerId: event.pointerId,
          buttons: event.buttons,
          at: performance.now(),
        })
        if (window.__soakEvents.length > 300) window.__soakEvents.shift()
      })
  })
  const limit = Number(process.env.MINDNOTES_SOAK_STROKES ?? 1000)
  for (let index = 0; index < limit; index++) {
    const before = performance.now()
    const x = 70 + (index % 8) * Math.min(160, (width - 380) / 8)
    const y = 90 + (Math.floor(index / 8) % 12) * Math.min(55, (height - 250) / 12)
    await active.overlay.mouse.move(x, y)
    await active.overlay.mouse.down()
    await active.overlay.mouse.move(x + 100, y + 8, { steps: 12 })
    await active.overlay.mouse.up()
    durations.push(performance.now() - before)
    if ((index + 1) % 10 === 0) {
      const count = await active.toolbar.evaluate(() =>
        window.mindnotesFloating.getState().then((state) => state.count)
      )
      if (count !== index + 1) {
        metrics.lostGesture = {
          expected: index + 1,
          count,
          state: await active.toolbar.evaluate(() => window.mindnotesFloating.getState()),
          events: await active.overlay.evaluate(() => window.__soakEvents),
        }
        throw new Error(`Gesture count ${count} after ${index + 1}`)
      }
    }
    if ((index + 1) % 100 === 0) {
      await expect(active.overlay.locator('[data-stroke-id]')).toHaveCount(index + 1)
      await settleSaved()
      await sample(`draw-${index + 1}`)
    }
  }
  await settleSaved()
  connection = new DatabaseSync(path.join(directory, 'screen-notes.sqlite'), { readOnly: true })
  const draft = JSON.parse(String(connection.prepare('SELECT document FROM drafts').get().document))
  expect(draft.strokes).toHaveLength(1000)
  const beforeLimit = JSON.stringify(draft.strokes)
  await active.overlay.mouse.move(100, 100)
  await active.overlay.mouse.down()
  await active.overlay.mouse.move(200, 110, { steps: 5 })
  await active.overlay.mouse.up()
  await expect(active.toolbar.getByRole('status')).toContainText('笔迹较多')
  await expect(active.overlay.locator('[data-stroke-id]')).toHaveCount(1000)
  expect(
    JSON.stringify(
      JSON.parse(String(connection.prepare('SELECT document FROM drafts').get().document)).strokes
    )
  ).toBe(beforeLimit)
  const sorted = [...durations].sort((a, b) => a - b)
  metrics.phases.push({
    phase: '1000-completed-gestures-and-cap',
    durationMs: performance.now() - started,
    count: 1000,
    points: draft.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0),
    gestureMs: { p50: sorted[499], p95: sorted[949], max: sorted.at(-1) },
    limitPreservedInk: true,
  })
  await active.toolbar.getByRole('button', { name: '收起悬浮批注' }).click()
  await sample('1000-ink-collapsed')
  // Keep the process live for fifteen minutes; each sleep stays short and the
  // parent can inspect progress or stop it between samples.
  for (let interval = 1; interval <= 30; interval++) {
    await pause(30_000)
    await sample(`idle-${interval * 30}s`)
  }
  if (coordinateInput) {
    console.log(JSON.stringify({ phase: 'waiting-for-recovery-input', commandFile }))
    let resume
    do {
      await pause(2000)
      resume = JSON.parse(await readFile(commandFile, 'utf8'))
    } while (resume.action !== 'resume' || !resume.id)
    metrics.phases.push({
      phase: 'recovery-input-coordinated',
      at: new Date().toISOString(),
      commandId: resume.id,
    })
  }
  await active.app.close()
  active = null
  connection.close()
  connection = null
  active = await launch()
  await active.toolbar.getByRole('button', { name: '展开悬浮批注' }).click()
  await expect(active.overlay.locator('[data-stroke-id]')).toHaveCount(1000)
  const recovered = await active.overlay.evaluate(() =>
    window.mindnotesScreen.getState().then((state) => state.strokes)
  )
  expect(JSON.stringify(recovered)).toBe(beforeLimit)
  await sample('restart-1000-exact-recovery')
  await active.toolbar.getByRole('button', { name: '橡皮', exact: true }).click()
  await active.overlay.mouse.move(60, 80)
  await active.overlay.mouse.down()
  await active.overlay.mouse.move(width - 100, height - 140, { steps: 60 })
  await active.overlay.mouse.up()
  await settleSaved()
  const remaining = await active.toolbar.evaluate(() =>
    window.mindnotesFloating.getState().then((state) => state.count)
  )
  expect(remaining).toBeLessThan(1000)
  await active.toolbar.getByRole('button', { name: '撤销屏幕批注' }).click()
  await settleSaved()
  await expect(active.overlay.locator('[data-stroke-id]')).toHaveCount(1000)
  metrics.phases.push({
    phase: 'restart-erase-undo',
    recovered: 1000,
    afterErase: remaining,
    afterUndo: 1000,
  })
  expect(errors).toEqual([])
  await active.app.close()
  active = null
  metrics.status = 'passed'
} catch (error) {
  metrics.status = 'failed'
  metrics.error = String(error.stack ?? error)
  throw error
} finally {
  connection?.close()
  if (active) await active.app.close().catch(() => {})
  await mkdir('tmp/qa', { recursive: true })
  await writeFile(
    `tmp/qa/soak-${releaseLabel}-${executable ? 'release' : 'source'}.json`,
    JSON.stringify(metrics, null, 2)
  )
}
