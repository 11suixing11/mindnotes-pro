import { _electron as electron, expect } from '@playwright/test'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import { createHash } from 'node:crypto'
import path from 'node:path'
import os from 'node:os'

const executable = process.env.MINDNOTES_EXECUTABLE
if (!executable && process.env.MINDNOTES_PEN_SOURCE !== '1')
  throw new Error(
    'Set MINDNOTES_EXECUTABLE to the final packaged app, or explicitly use MINDNOTES_PEN_SOURCE=1.'
  )
const output = path.resolve('tmp/qa')
const version = JSON.parse(await readFile('package.json', 'utf8')).version
const run = process.env.MINDNOTES_PEN_RUN ?? `${version.replace(/^6\.0\.0-beta\./, 'beta')}-release`
if (!/^[a-zA-Z0-9-]+$/.test(run)) throw new Error('Invalid pen acceptance run name.')
await mkdir(output, { recursive: true })
const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-native-pen-'))
const commands = path.join(output, 'native-pen-command.json')
await writeFile(commands, '{}')
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !['ELECTRON_RUN_AS_NODE', 'MINDNOTES_START_WORKSPACE'].includes(key)
  )
)
const result = {
  version,
  executable: executable ?? 'source production assets',
  directory,
  startedAt: new Date().toISOString(),
  device: 'User reported GAOMON 1060 Pro, Windows Ink enabled; HID pen and digitizer present.',
  scope:
    'User-operated physical pen; capture-phase trusted PointerEvents in the actual packaged overlay. No synthetic drawing input. Preparation and commands use the existing toolbar.',
  status: 'waiting-for-native-input',
  stages: [],
  restarts: [],
  commands: [],
  errors: [],
}
let active
let lastCommand = ''
let currentStage = 'pen-input'

async function launch() {
  const app = await electron.launch({
    ...(executable ? { executablePath: executable, args: [] } : { args: ['.'] }),
    env: { ...env, MINDNOTES_USER_DATA_DIR: directory, MINDNOTES_USE_DIST: '1' },
  })
  active = { app }
  await expect.poll(() => app.windows().length).toBe(2)
  const toolbar = app.windows().find((page) => page.url().includes('surface=toolbar'))
  const overlay = app.windows().find((page) => page.url().includes('surface=screen'))
  await expect(overlay.locator('svg')).toBeAttached()
  await app.evaluate(({ BrowserWindow }) => {
    const layer = BrowserWindow.getAllWindows().find((window) =>
      window.webContents.getURL().includes('surface=screen')
    )
    layer.webContents.__acceptancePenKeyboardEvents = []
    layer.webContents.on('before-input-event', (_event, input) => {
      if (input.key === 'Escape')
        layer.webContents.__acceptancePenKeyboardEvents.push({
          type: input.type,
          key: input.key,
          code: input.code,
          at: Date.now(),
        })
    })
  })
  await toolbar.evaluate(() => {
    window.__nativeToolbarEvents = []
    for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'click']) {
      document.addEventListener(
        type,
        (event) => {
          const button = event.target.closest?.('button')
          window.__nativeToolbarEvents.push({
            type,
            trusted: event.isTrusted,
            pointerType: event.pointerType,
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            at: event.timeStamp,
            button: button?.getAttribute('aria-label') ?? button?.textContent ?? '',
            expanded: button?.getAttribute('aria-expanded') ?? '',
            height: innerHeight,
          })
        },
        true
      )
    }
    window.mindnotesFloating.subscribe((state) => {
      window.__nativeToolbarEvents.push({
        type: 'state',
        tool: state.tool,
        panel: state.panel,
        capturing: state.capturing,
        at: performance.now(),
        height: innerHeight,
      })
    })
  })
  for (const page of app.windows())
    page.on('pageerror', (error) => result.errors.push(error.message))
  await overlay.evaluate(() => {
    window.__nativePenEvents = []
    const svg = document.querySelector('svg')
    for (const type of [
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel',
      'gotpointercapture',
      'lostpointercapture',
    ]) {
      svg.addEventListener(
        type,
        (event) => {
          window.__nativePenEvents.push({
            type,
            trusted: event.isTrusted,
            pointerType: event.pointerType,
            pointerId: event.pointerId,
            button: event.button,
            buttons: event.buttons,
            pressure: event.pressure,
            tiltX: event.tiltX,
            tiltY: event.tiltY,
            twist: event.twist,
            x: event.clientX,
            y: event.clientY,
            at: event.timeStamp,
            coalesced: event.getCoalescedEvents?.().length ?? 0,
          })
          if (window.__nativePenEvents.length > 100000) window.__nativePenEvents.shift()
        },
        true
      )
    }
  })
  await toolbar.getByRole('button', { name: '展开悬浮批注' }).click()
  await toolbar.getByRole('button', { name: '画笔', exact: true }).click()
  return { app, toolbar, overlay }
}

async function snapshot(label) {
  const state = await active.toolbar.evaluate(() => window.mindnotesFloating.getState())
  const inkState = await active.overlay.evaluate(() => window.mindnotesScreen.getState())
  const strokes = inkState.strokes
  const events = await active.overlay.evaluate(() => window.__nativePenEvents)
  const toolbarEvents = await active.toolbar.evaluate(() => window.__nativeToolbarEvents)
  const escapeEvents = await active.app.evaluate(({ BrowserWindow }) => {
    const layer = BrowserWindow.getAllWindows().find((window) =>
      window.webContents.getURL().includes('surface=screen')
    )
    return layer.webContents.__acceptancePenKeyboardEvents
  })
  let stored = []
  try {
    const connection = new DatabaseSync(path.join(directory, 'screen-notes.sqlite'), {
      readOnly: true,
    })
    try {
      stored = connection
        .prepare('SELECT document FROM drafts')
        .all()
        .map((row) => JSON.parse(String(row.document)))
    } finally {
      connection.close()
    }
  } catch (error) {
    result.errors.push(String(error))
  }
  const native = events.filter((event) => event.trusted && event.pointerType === 'pen')
  const down = native.filter((event) => event.type === 'pointerdown')
  const up = native.filter((event) => event.type === 'pointerup')
  const pressedMoves = native.filter((event) => event.type === 'pointermove' && event.buttons !== 0)
  const value = {
    label,
    at: new Date().toISOString(),
    stage: currentStage,
    state,
    screen: {
      width: inkState.width,
      height: inkState.height,
      inputEnabled: inkState.inputEnabled,
      capturing: inkState.capturing,
    },
    strokeCount: strokes.length,
    geometrySha256: createHash('sha256').update(JSON.stringify(strokes)).digest('hex'),
    persistedMatch: stored.some(
      (draft) => JSON.stringify(draft.strokes) === JSON.stringify(strokes)
    ),
    input: {
      events: events.length,
      nativePenEvents: native.length,
      nativeDown: down.length,
      nativeUp: up.length,
      nativeCancel: native.filter((event) => event.type === 'pointercancel').length,
      mouseDown: events.filter(
        (event) => event.type === 'pointerdown' && event.pointerType === 'mouse'
      ).length,
      untrustedEvents: events.filter((event) => !event.trusted).length,
      pressedMoves: pressedMoves.length,
      minPressure: pressedMoves.length
        ? Math.min(...pressedMoves.map((event) => event.pressure))
        : null,
      maxPressure: pressedMoves.length
        ? Math.max(...pressedMoves.map((event) => event.pressure))
        : null,
    },
    strokes,
    events,
    toolbarEvents,
    escapeEvents,
  }
  value.overlayViewport = await active.overlay.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    scale: devicePixelRatio,
  }))
  await writeFile(path.join(output, 'native-pen-live.json'), `${JSON.stringify(value, null, 2)}\n`)
  await writeFile(
    path.join(output, `native-pen-${run}.json`),
    `${JSON.stringify(result, null, 2)}\n`
  )
  console.log(
    JSON.stringify({
      label,
      stage: currentStage,
      strokes: strokes.length,
      saved: state.saveState,
      persistedMatch: value.persistedMatch,
      input: value.input,
    })
  )
  return value
}

try {
  active = await launch()
  const baseline = await snapshot('initial-empty-baseline')
  expect(baseline.strokeCount).toBe(0)
  expect(baseline.input.nativeDown).toBe(0)
  result.stages.push(baseline)
  console.log(JSON.stringify({ ready: true, directory, commands, executable }))
  let intervals = 0
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const command = JSON.parse(await readFile(commands, 'utf8'))
    if (command.id && command.id !== lastCommand) {
      lastCommand = command.id
      result.commands.push({ ...command, at: new Date().toISOString() })
      if (command.action === 'snapshot') {
        const value = await snapshot(command.label ?? 'manual-snapshot')
        result.stages.push(value)
      } else if (command.action === 'restart') {
        await expect
          .poll(() =>
            active.toolbar.evaluate(() =>
              window.mindnotesFloating.getState().then((state) => state.saveState)
            )
          )
          .toBe('saved')
        const before = await snapshot('before-restart')
        result.stages.push(before)
        await active.app.close()
        active = null
        active = await launch()
        const after = await snapshot('after-restart')
        result.stages.push(after)
        const match = before.geometrySha256 === after.geometrySha256 && after.persistedMatch
        result.restarts.push({
          at: new Date().toISOString(),
          before: before.geometrySha256,
          after: after.geometrySha256,
          count: after.strokeCount,
          exact: match,
        })
        if (!match) throw new Error('Physical pen geometry changed across restart.')
      } else if (command.action === 'stop') {
        const final = await snapshot('final')
        result.stages.push(final)
        result.status = 'recorded-awaiting-review'
        break
      } else {
        const buttons = { pen: '画笔', eraser: '橡皮', pointer: '鼠标', undo: '撤销屏幕批注' }
        if (!buttons[command.action])
          throw new Error(`Unsupported native-pen command: ${command.action}`)
        result.stages.push(await snapshot(`before-${command.action}`))
        currentStage = command.label ?? command.action
        await active.overlay.evaluate(() => {
          window.__nativePenEvents = []
        })
        await active.toolbar
          .getByRole('button', { name: buttons[command.action], exact: true })
          .click()
      }
    }
    if (++intervals % 5 === 0) await snapshot('progress')
  }
} catch (error) {
  result.status = 'failed'
  result.error = String(error.stack ?? error)
  process.exitCode = 1
} finally {
  if (active) await active.app.close().catch(() => {})
  result.finishedAt = new Date().toISOString()
  await writeFile(
    path.join(output, `native-pen-${run}.json`),
    `${JSON.stringify(result, null, 2)}\n`
  )
}
