import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PNG } from 'pngjs'
import { isDeepStrictEqual } from 'node:util'
import {
  launchIsolated,
  withDesktopWorkspace,
  verifyOwnedX11,
  prepareFixture,
  openLibrary,
  measureGesture,
  currentDisplay,
} from '../../benchmark/local/electron-harness.mjs'
import type { DesktopSession } from '../../benchmark/local/electron-harness.mjs'
import type { ScreenNote } from '../../src/notes/screenNotebook'
import type { PageNotebook } from '../../src/notes/model'
import { createLinuxNativeFixture } from './linux-native-fixture'

const linuxEnabled = process.platform === 'linux' && process.env.MINDNOTES_LINUX_SUITE === '1'
const diagnosticNoSandbox = process.env.MINDNOTES_LINUX_DIAGNOSTIC_NO_SANDBOX === '1'

if (linuxEnabled)
  test.beforeAll(async () => {
    expect(process.env.MINDNOTES_BASELINE_ALLOW_VISIBLE).toBe('1')
    await verifyOwnedX11()
  })

async function withLinuxTestEnvironment<T>(
  sessionType: 'x11' | 'wayland',
  work: () => Promise<T>
): Promise<T> {
  const previous = {
    XDG_SESSION_TYPE: process.env.XDG_SESSION_TYPE,
    WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY,
  }
  process.env.XDG_SESSION_TYPE = sessionType
  if (sessionType === 'wayland') process.env.WAYLAND_DISPLAY = 'wayland-owned-probe'
  else delete process.env.WAYLAND_DISPLAY
  try {
    await verifyOwnedX11()
    return await work()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

async function actualRuntimeEnvironment(session: DesktopSession) {
  return session.app.evaluate(() => ({
    DISPLAY: process.env.DISPLAY,
    XDG_SESSION_TYPE: process.env.XDG_SESSION_TYPE,
    WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY ?? '',
    XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR,
  }))
}

async function launch(directory: string, offline = true) {
  const session = await launchIsolated({
    directory,
    executable: process.env.MINDNOTES_BASELINE_EXECUTABLE,
    allowVisible: process.env.MINDNOTES_BASELINE_ALLOW_VISIBLE === '1',
    offline,
    diagnosticNoSandbox,
  })
  try {
    expect(session.runtime.backend).toBe('x11')
    expect(session.runtime.actualExecutablePath).toBe(session.runtime.executablePath)
    expect(session.runtime.ozonePlatform).toBe('x11')
    if (process.env.MINDNOTES_BASELINE_EXECUTABLE) {
      expect(session.runtime.launchExecutablePath).not.toBe(session.runtime.executablePath)
      expect(session.runtime.sandbox.actualSwitches[0]).toBe(session.runtime.launchExecutablePath)
      expect(
        session.runtime.launchArguments.some((argument) =>
          /^--ozone-platform(?:=|$)/.test(argument)
        )
      ).toBe(false)
    }
    expect(session.runtime.sandbox.chromiumSandbox).toBe(!diagnosticNoSandbox)
    expect(session.runtime.sandbox.actualSwitches.includes('--no-sandbox')).toBe(
      diagnosticNoSandbox
    )
    expect(session.runtime.sandbox.kernelSandboxVerified).toBe(false)
    if (offline) {
      expect(session.offlineEvidence?.directControl).toBe(true)
      expect(session.offlineEvidence?.directApplicationHits).toBe(0)
      expect(session.offlineEvidence?.defaultControl.response).toBe(503)
      expect(session.offlineEvidence?.pageControl.response).toBe(503)
      expect(session.offlineEvidence?.pageControl.partition).toBe('persist:mindnotes-pages')
      for (const control of [
        session.offlineEvidence!.defaultControl,
        session.offlineEvidence!.lazyNavigation,
        session.offlineEvidence!.pageControl,
      ])
        expect(
          control.proxyRequests.some(
            (request) =>
              request.method === 'GET' && request.url === control.target && request.status === 503
          )
        ).toBe(true)
    }
  } catch (error) {
    await session.close()
    throw error
  }
  return session
}

async function closeSessions(sessions: Set<DesktopSession>) {
  const results = await Promise.allSettled([...sessions].map((session) => session.close()))
  if (results.some((result) => result.status === 'rejected'))
    throw Object.assign(new Error('Linux app cleanup failed.'), {
      cause: results.find((result) => result.status === 'rejected'),
    })
}
async function savedPage(shell: Page, url: string, comment: string) {
  await shell.evaluate(() => window.mindnotesNotebook!.flushEdits())
  await expect
    .poll(async () => {
      const state = await shell.evaluate(() => window.mindnotes!.getState())
      return {
        comment: state.pages.find((page) => page.url === url)?.annotations[0]?.comment,
        saved: state.saveState,
      }
    })
    .toEqual({ comment, saved: 'saved' })
}
async function saveDialog(session: DesktopSession, filePath: string) {
  await session.app.evaluate(({ dialog }, target) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: target })
  }, filePath)
}
async function openDialog(session: DesktopSession, filePath: string) {
  await session.app.evaluate(({ dialog }, target) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [target] })
  }, filePath)
}

if (linuxEnabled)
  test('Linux native X11 input releases focus, preserves toolbar stacking, saves/restores ink and captures owned pixels', async () => {
    await withLinuxTestEnvironment('x11', () =>
      withDesktopWorkspace(async (directory) => {
        const data = path.join(directory, 'native-data')
        await mkdir(data)
        const native = await createLinuxNativeFixture()
        const sessions = new Set<DesktopSession>()
        const evidence: Record<string, unknown> = {
          platform: process.platform,
          display: process.env.DISPLAY,
          ownedServer: await verifyOwnedX11(),
          scope:
            'Explicit X11 capture scope: XDG_SESSION_TYPE=x11, no WAYLAND_DISPLAY; owned Xvfb/current recorded WM X11; system logind session queried read-only. Real GNOME compositor, Wayland clients, portal, mixed DPI and hardware pen remain unverified.',
          nativeFixtureWindow: native.window,
          diagnosticNoSandbox,
          checks: [],
          windowManager: await readFile(
            'tmp/linux-desktop-20261114/test-display/openbox/state/owner.json',
            'utf8'
          )
            .then(JSON.parse)
            .catch(() => undefined),
        }
        try {
          const session = await launch(data, false)
          sessions.add(session)
          evidence.runtime = session.runtime
          evidence.actualEnvironment = await actualRuntimeEnvironment(session)
          const handles = await session.app.evaluate(({ BrowserWindow }) => {
            const windows = BrowserWindow.getAllWindows()
            const handle = (surface: string) =>
              windows
                .find(
                  (window) =>
                    new URL(window.webContents.getURL()).searchParams.get('surface') === surface
                )!
                .getNativeWindowHandle()
                .readUInt32LE(0)
            return { overlay: handle('screen'), toolbar: handle('toolbar') }
          })
          const targets = [handles.overlay, handles.toolbar]
          const clickButton = async (button: ReturnType<Page['getByRole']>) => {
            const label = await button.getAttribute('aria-label')
            const box = await button.boundingBox()
            expect(box).not.toBeNull()
            const bounds = await session.app.evaluate(({ BrowserWindow }) =>
              BrowserWindow.getAllWindows()
                .find(
                  (window) =>
                    new URL(window.webContents.getURL()).searchParams.get('surface') === 'toolbar'
                )!
                .getBounds()
            )
            const server = await native.input({ action: 'state', windows: targets })
            const geometry = server.hierarchy[String(handles.toolbar)]
            const viewport = await session.toolbar.evaluate(() => ({
              width: innerWidth,
              height: innerHeight,
            }))
            const target = {
              x: geometry.x + ((box!.x + box!.width / 2) * geometry.width) / viewport.width,
              y: geometry.y + ((box!.y + box!.height / 2) * geometry.height) / viewport.height,
            }
            const observed = await native.input({ action: 'click', ...target, windows: targets })
            const clicks = (evidence.buttonClicks ??= []) as unknown[]
            clicks.push({
              label,
              box,
              electronBounds: bounds,
              nativeGeometry: geometry,
              target,
              before: server,
              after: observed,
              state: await session.toolbar.evaluate(() => window.mindnotesFloating!.getState()),
            })
          }
          // Re-collapse, then prove the physical button hit expands instead of a CDP click.
          await session.toolbar.evaluate(() => window.mindnotesFloating!.command('collapse'))
          await clickButton(session.toolbar.getByRole('button', { name: '展开悬浮批注' }))
          await expect(
            session.toolbar.getByRole('toolbar', { name: '悬浮批注工具条' })
          ).toBeVisible()
          await clickButton(session.toolbar.getByRole('button', { name: '鼠标', exact: true }))
          const before = await native.input({ action: 'state', windows: targets })
          await native.input({ action: 'click', x: 220, y: 230, windows: targets })
          await native.input({ action: 'key', key: 'a', windows: targets })
          const pointer = await native.input({ action: 'state', windows: targets })
          expect(pointer.clicks).toBe(before.clicks + 1)
          expect(pointer.keys).toBe(before.keys + 1)
          expect(pointer.hierarchy[String(pointer.focus)].rootChild).toBe(
            pointer.hierarchy[String(native.window)].rootChild
          )
          expect(pointer.hierarchy[String(handles.overlay)].mapState).toBe(0)
          expect(pointer.compositorOwner).toBe(0)
          evidence.pointer = pointer
          const strip = pointer.hierarchy[String(handles.toolbar)]
          const unused = await native.input({
            action: 'click',
            x: strip.x + 20,
            y: strip.y + 20,
            windows: targets,
          })
          expect(unused.clicks).toBe(pointer.clicks + 1)
          evidence.unusedToolbarRegion = unused
          const panels: Record<string, unknown>[] = []
          for (const [buttonName, panelName] of [
            ['画笔设置', 'brush'],
            ['更多操作', 'more'],
          ]) {
            await clickButton(
              session.toolbar.getByRole('button', { name: buttonName, exact: true })
            )
            await expect
              .poll(() =>
                session.toolbar.evaluate(
                  async () => (await window.mindnotesFloating!.getState()).panel
                )
              )
              .toBe(panelName)
            const opened = await native.input({ action: 'state', windows: targets })
            await clickButton(session.toolbar.getByRole('button', { name: '关闭工具面板' }))
            await expect
              .poll(() =>
                session.toolbar.evaluate(
                  async () => (await window.mindnotesFloating!.getState()).panel
                )
              )
              .toBeNull()
            panels.push({
              panel: panelName,
              opened,
              closed: await native.input({ action: 'state', windows: targets }),
            })
          }
          evidence.nativePanels = panels
          await clickButton(session.toolbar.getByRole('button', { name: '画笔', exact: true }))
          await expect
            .poll(() =>
              session.overlay.evaluate(
                async () => (await window.mindnotesScreen!.getState()).inputEnabled
              )
            )
            .toBe(true)
          const drawing = await native.input({ action: 'state', windows: targets })
          expect(drawing.hierarchy[String(handles.overlay)].parent).not.toBe(
            drawing.hierarchy[String(handles.toolbar)].parent
          )
          expect(drawing.hierarchy[String(drawing.focus)].rootChild).toBe(
            drawing.hierarchy[String(handles.overlay)].rootChild
          )
          const toolbarRank = drawing.rootStack.indexOf(
            drawing.hierarchy[String(handles.toolbar)].rootChild
          )
          const overlayRank = drawing.rootStack.indexOf(
            drawing.hierarchy[String(handles.overlay)].rootChild
          )
          expect(toolbarRank).toBeGreaterThan(overlayRank)
          const points = Array.from({ length: 24 }, (_, index) => ({
            x: 240 + index * 7,
            y: 280 + index * 3,
          }))
          await native.input({ action: 'drag', points, windows: targets })
          await expect
            .poll(() =>
              session.overlay.evaluate(
                async () => (await window.mindnotesScreen!.getState()).strokes.length
              )
            )
            .toBe(1)
          let strokes = (await session.overlay.evaluate(() => window.mindnotesScreen!.getState()))
            .strokes
          expect(strokes[0].points.length).toBeGreaterThanOrEqual(12)
          await expect
            .poll(() =>
              session.toolbar.evaluate(
                async () => (await window.mindnotesFloating!.getState()).saveState
              )
            )
            .toBe('saved')
          await native.input({ action: 'key', key: 'Escape', windows: targets })
          await expect
            .poll(() =>
              session.toolbar.evaluate(
                async () => (await window.mindnotesFloating!.getState()).tool
              )
            )
            .toBe('pointer')
          const escapedBefore = await native.input({ action: 'state', windows: targets })
          expect(escapedBefore.hierarchy[String(handles.overlay)].mapState).toBe(0)
          expect(escapedBefore.hierarchy[String(escapedBefore.focus)].rootChild).toBe(
            escapedBefore.hierarchy[String(native.window)].rootChild
          )
          expect(
            (await session.overlay.evaluate(() => window.mindnotesScreen!.getState())).strokes
          ).toEqual(strokes)
          await native.input({ action: 'key', key: 'b', windows: targets })
          const escaped = await native.input({ action: 'click', x: 220, y: 230, windows: targets })
          expect(escaped.clicks).toBe(escapedBefore.clicks + 1)
          expect(escaped.keys).toBe(escapedBefore.keys + 1)
          await clickButton(session.toolbar.getByRole('button', { name: '画笔', exact: true }))
          await expect
            .poll(
              async () =>
                (await native.input({ action: 'state', windows: targets })).hierarchy[
                  String(handles.overlay)
                ].mapState
            )
            .toBe(2)
          const restoredPen = await native.input({ action: 'state', windows: targets })
          expect(restoredPen.hierarchy[String(restoredPen.focus)].rootChild).toBe(
            restoredPen.hierarchy[String(handles.overlay)].rootChild
          )
          expect(
            (await session.overlay.evaluate(() => window.mindnotesScreen!.getState())).strokes
          ).toEqual(strokes)
          expect(await session.overlay.locator('[data-stroke-id]').count()).toBe(strokes.length)
          const restoredStrokeCount = strokes.length
          const restoredPoints = points.map((point) => ({ x: point.x + 50, y: point.y + 90 }))
          await native.input({ action: 'drag', points: restoredPoints, windows: targets })
          await expect
            .poll(() =>
              session.overlay.evaluate(
                async () => (await window.mindnotesScreen!.getState()).strokes.length
              )
            )
            .toBe(restoredStrokeCount + 1)
          strokes = (await session.overlay.evaluate(() => window.mindnotesScreen!.getState()))
            .strokes
          expect(strokes[restoredStrokeCount].points.length).toBeGreaterThanOrEqual(12)
          await expect
            .poll(() =>
              session.toolbar.evaluate(
                async () => (await window.mindnotesFloating!.getState()).saveState
              )
            )
            .toBe('saved')
          evidence.restoredPenNewStroke = strokes[restoredStrokeCount]
          evidence.restoredPen = restoredPen
          evidence.drawing = drawing
          evidence.escaped = escaped
          evidence.nativeStroke = strokes[0]
          // Freeze the real other-client pixels; changing that client afterward cannot alter the saved frozen image.
          await session.toolbar.evaluate(() => window.mindnotesFloating!.command('freeze'))
          await expect
            .poll(() =>
              session.toolbar.evaluate(
                async () => (await window.mindnotesFloating!.getState()).frozen
              )
            )
            .toBe(true)
          const frozen = (await session.overlay.evaluate(() => window.mindnotesScreen!.getState()))
            .background
          expect(frozen).toMatch(/^data:image\/png;base64,/)
          await native.input({ action: 'color', rgb: 0x884422 })
          await session.toolbar.evaluate(() => window.mindnotesFloating!.command('save'))
          const shell = await openLibrary(session)
          await expect
            .poll(async () => (await shell.evaluate(() => window.mindnotesNotebook!.list())).total)
            .toBe(1)
          const id = (await shell.evaluate(() => window.mindnotesNotebook!.list())).notes[0].id
          const captured = await shell.evaluate(
            (noteId) => window.mindnotesNotebook!.getNote(noteId),
            id
          )
          const image = await shell.evaluate(
            (noteId) => window.mindnotesNotebook!.getImage(noteId),
            id
          )
          expect(captured.source.app).toBe('')
          expect(captured.source.title).toBe('')
          expect(captured.strokes).toEqual(strokes)
          const png = PNG.sync.read(
            Buffer.from(image.slice('data:image/png;base64,'.length), 'base64')
          )
          const display = await currentDisplay(session)
          expect(png.width).toBe(display.bounds.width * display.scaleFactor)
          expect(png.height).toBe(display.bounds.height * display.scaleFactor)
          const pixel = (Math.floor(png.height / 2) * png.width + Math.floor(png.width / 2)) * 4
          for (const [index, color] of [25, 87, 147].entries())
            expect(Math.abs(png.data[pixel + index] - color)).toBeLessThanOrEqual(3)
          expect(png.data[pixel + 3]).toBe(255)
          expect(
            isDeepStrictEqual(
              PNG.sync.read(Buffer.from(frozen!.split(',')[1], 'base64')).data,
              png.data
            )
          ).toBe(true)
          evidence.capture = {
            width: png.width,
            height: png.height,
            centerPixel: [...png.data.subarray(pixel, pixel + 4)],
            source: captured.source,
          }
          await session.close()
          const restarted = await launch(data, false)
          sessions.add(restarted)
          await expect
            .poll(() =>
              restarted.overlay.evaluate(
                async () => (await window.mindnotesScreen!.getState()).strokes
              )
            )
            .toEqual(strokes)
          const library = await openLibrary(restarted)
          expect(
            await library.evaluate((noteId) => window.mindnotesNotebook!.getNote(noteId), id)
          ).toEqual(captured)
          expect(
            await library.evaluate((noteId) => window.mindnotesNotebook!.getImage(noteId), id)
          ).toBe(image)
          evidence.checks = [
            'native-bubble-expansion',
            'native-mouse-keyboard-pass-through',
            'native-unused-toolbar-region-pass-through',
            'native-brush-and-more-panels-open-close',
            'managed-overlay-focus',
            'toolbar-above-overlay',
            'native-stroke-input',
            'native-Esc-release',
            'mouse-native-overlay-unmapped-canonical-ink-retained',
            'pen-native-overlay-remapped-exact-ink-restored',
            'pen-native-input-after-remapping-second-stroke-saved',
            'Esc-native-WM-background-keyboard-focus-restored',
            'durable-stroke-restart',
            'real-owned-X11-frozen-pixels',
            'saved-note-image-restart',
          ]
          evidence.status = 'passed'
        } catch (error) {
          evidence.status = 'failed'
          evidence.error = error instanceof Error ? error.message : String(error)
          throw error
        } finally {
          try {
            await closeSessions(sessions)
          } finally {
            try {
              await native.close()
            } finally {
              await writeFile(
                'tmp/linux-desktop-20261114/native-evidence.json',
                `${JSON.stringify(evidence, null, 2)}\n`
              )
            }
          }
        }
      })
    )
  })

if (linuxEnabled)
  test('Wayland bootstrap AppRun preserves early X11 startup and native input without portal capture', async () => {
    await withLinuxTestEnvironment('wayland', () =>
      withDesktopWorkspace(async (directory) => {
        const data = path.join(directory, 'wayland-bootstrap')
        await mkdir(data)
        const native = await createLinuxNativeFixture()
        let session: DesktopSession | undefined
        const evidence: Record<string, unknown> = {
          status: 'running',
          scope:
            'Wayland-session bootstrap/input regression on owned X11; portal capture is not invoked or validated.',
          checks: [],
        }
        try {
          session = await launch(data, false)
          const current = session
          evidence.runtime = current.runtime
          const environment = await actualRuntimeEnvironment(current)
          evidence.actualEnvironment = environment
          expect(environment.XDG_SESSION_TYPE).toBe('wayland')
          expect(environment.WAYLAND_DISPLAY).toBe('wayland-owned-probe')
          expect(current.runtime.ozonePlatform).toBe('x11')
          expect(current.runtime.actualExecutablePath).toBe(current.runtime.executablePath)
          expect(
            current.runtime.launchArguments.some((arg) => /^--ozone-platform(?:=|$)/.test(arg))
          ).toBe(false)
          const handles = await current.app.evaluate(({ BrowserWindow }) => {
            const surfaces = Object.fromEntries(
              BrowserWindow.getAllWindows().map((window) => [
                new URL(window.webContents.getURL()).searchParams.get('surface'),
                window.getNativeWindowHandle().readUInt32LE(0),
              ])
            )
            return { toolbar: surfaces.toolbar, overlay: surfaces.screen }
          })
          const targets = [handles.toolbar, handles.overlay]
          const screenState = () =>
            current.overlay.evaluate(() => window.mindnotesScreen!.getState())
          const toolbarState = () =>
            current.toolbar.evaluate(() => window.mindnotesFloating!.getState())
          const click = async (name: string) => {
            const box = await current.toolbar
              .getByRole('button', { name, exact: true })
              .boundingBox()
            expect(box).not.toBeNull()
            const state = await native.input({ action: 'state', windows: targets })
            const geometry = state.hierarchy[String(handles.toolbar)]
            const viewport = await current.toolbar.evaluate(() => ({
              width: innerWidth,
              height: innerHeight,
            }))
            await native.input({
              action: 'click',
              x: geometry.x + ((box!.x + box!.width / 2) * geometry.width) / viewport.width,
              y: geometry.y + ((box!.y + box!.height / 2) * geometry.height) / viewport.height,
              windows: targets,
            })
          }
          await current.toolbar.evaluate(() => window.mindnotesFloating!.command('collapse'))
          await click('展开悬浮批注')
          await expect(
            current.toolbar.getByRole('toolbar', { name: '悬浮批注工具条' })
          ).toBeVisible()
          const initial = await native.input({ action: 'state', windows: targets })
          await native.input({ action: 'click', x: 220, y: 230, windows: targets })
          const consumer = await native.input({ action: 'key', key: 'a', windows: targets })
          expect(consumer.clicks).toBe(initial.clicks + 1)
          expect(consumer.keys).toBe(initial.keys + 1)
          evidence.initialConsumer = consumer
          await click('画笔')
          await expect.poll(async () => (await screenState()).inputEnabled).toBe(true)
          const focused = await native.input({ action: 'state', windows: targets })
          expect(focused.hierarchy[String(focused.focus)].rootChild).toBe(
            focused.hierarchy[String(handles.overlay)].rootChild
          )
          await native.input({
            action: 'drag',
            points: Array.from({ length: 24 }, (_, i) => ({ x: 240 + i * 7, y: 280 + i * 3 })),
            windows: targets,
          })
          await expect.poll(async () => (await screenState()).strokes.length).toBe(1)
          const strokes = (await screenState()).strokes
          expect(strokes[0].points.length).toBeGreaterThanOrEqual(12)
          await expect.poll(async () => (await toolbarState()).saveState).toBe('saved')
          await native.input({ action: 'key', key: 'Escape', windows: targets })
          await expect.poll(async () => (await toolbarState()).tool).toBe('pointer')
          const released = await native.input({ action: 'state', windows: targets })
          expect(released.hierarchy[String(handles.overlay)].mapState).toBe(0)
          expect(released.hierarchy[String(released.focus)].rootChild).toBe(
            released.hierarchy[String(native.window)].rootChild
          )
          evidence.focused = focused
          evidence.released = released
          const key = await native.input({ action: 'key', key: 'b', windows: targets })
          evidence.releasedKey = key
          expect(key.keys).toBe(released.keys + 1)
          const clicked = await native.input({ action: 'click', x: 220, y: 230, windows: targets })
          expect(clicked.clicks).toBe(released.clicks + 1)
          await click('画笔')
          const restored = await native.input({ action: 'state', windows: targets })
          expect(restored.hierarchy[String(handles.overlay)].mapState).toBe(2)
          expect((await screenState()).strokes).toEqual(strokes)
          evidence.focused = focused
          evidence.released = released
          evidence.restored = restored
          evidence.checks = [
            'packaged-AppRun-early-X11-under-Wayland-env',
            'native-bubble-consumer',
            'native-pen-focus-and-saved-stroke',
            'native-Esc-mouse-keyboard-release',
            'pen-remap-canonical-ink-restore',
          ]
          evidence.status = 'passed'
        } catch (error) {
          evidence.status = 'failed'
          evidence.error = error instanceof Error ? error.message : String(error)
          throw error
        } finally {
          try {
            await session?.close()
          } finally {
            try {
              await native.close()
            } finally {
              await writeFile(
                'tmp/linux-launch-20261114/native-wayland-bootstrap-evidence.json',
                `${JSON.stringify(evidence, null, 2)}\n`
              )
            }
          }
        }
      })
    )
  })

if (linuxEnabled)
  test('Linux generated screen/page notes stay editable offline, survive restart, and restore into an empty directory', async () => {
    await withLinuxTestEnvironment('wayland', () =>
      withDesktopWorkspace(async (directory) => {
        const original = path.join(directory, 'original')
        const fixture = await prepareFixture(original, 100)
        const sessions = new Set<DesktopSession>()
        const evidence: {
          status: string
          checkpoints: string[]
          sessions: DesktopSession['runtime'][]
          actualEnvironments: Awaited<ReturnType<typeof actualRuntimeEnvironment>>[]
          error?: string
          cleanupError?: string
        } = {
          status: 'running',
          checkpoints: [],
          sessions: [],
          actualEnvironments: [],
        }
        const checkpoint = async (name: string) => {
          evidence.checkpoints.push(name)
          await writeFile(
            'tmp/linux-desktop-20261114/generated-offline-evidence.json',
            `${JSON.stringify(evidence, null, 2)}\n`
          )
        }
        const finalizeEvidence = async () => {
          try {
            await closeSessions(sessions)
            if (evidence.status !== 'failed') evidence.status = 'passed'
          } catch (error) {
            evidence.status = 'failed'
            evidence.cleanupError = error instanceof Error ? error.message : String(error)
            throw error
          } finally {
            await writeFile(
              'tmp/linux-desktop-20261114/generated-offline-evidence.json',
              `${JSON.stringify(evidence, null, 2)}\n`
            )
          }
        }
        const own = async (data: string) => {
          const session = await launch(data)
          sessions.add(session)
          evidence.sessions.push(session.runtime)
          evidence.actualEnvironments.push(await actualRuntimeEnvironment(session))
          return session
        }
        try {
          const session = await own(original)
          await checkpoint('actual-default-and-lazy-page-session-deny-proxy-controls')
          const shell = await openLibrary(session)
          const search = shell.getByRole('textbox', { name: '搜索全部笔记' })
          await search.fill('Baseline screen note 0')
          await shell
            .getByRole('button', { name: '打开屏幕笔记 Baseline screen note 0', exact: true })
            .click()
          await expect(shell.getByRole('region', { name: '屏幕笔记编辑器' })).toBeVisible()
          await shell.getByRole('textbox', { name: '屏幕笔记标题' }).fill('Offline edited screen')
          await shell
            .getByRole('textbox', { name: '屏幕笔记结论' })
            .fill('Offline durable screen comment')
          await shell.evaluate(() => window.mindnotesNotebook!.flushEdits())
          const screen = await shell.evaluate(() =>
            window.mindnotesNotebook!.getNote('fixture-screen-0')
          )
          expect(screen.title).toBe('Offline edited screen')
          expect(screen.comment).toBe('Offline durable screen comment')
          expect(screen.revision).toBeGreaterThan(fixture.entries[0].note.revision)
          expect(screen.strokes).toEqual(fixture.entries[0].note.strokes)
          await expect(shell.getByRole('status', { name: '屏幕笔记保存状态' })).toContainText(
            '已保存'
          )
          await checkpoint('screen-search-edit-revision-exact-strokes-flush-saved')
          await shell.getByRole('button', { name: '返回笔记', exact: true }).click()
          await search.fill('Baseline article 0')
          await shell
            .getByRole('button', { name: '打开网页笔记 Baseline article 0', exact: true })
            .click()
          await shell
            .getByRole('textbox', { name: '第 1 条批注的笔记' })
            .fill('Offline durable page comment')
          await savedPage(shell, fixture.pages[0].url, 'Offline durable page comment')
          await shell.evaluate(() => window.mindnotes!.navigate('https://baseline.invalid/blocked'))
          await expect(
            shell.getByText('网页暂时无法打开，请检查地址或网络后重试。', { exact: true })
          ).toBeVisible()
          await shell.evaluate(() => window.mindnotes!.command('home'))
          await expect(shell.getByRole('region', { name: '统一笔记库' })).toBeVisible()
          await savedPage(shell, fixture.pages[0].url, 'Offline durable page comment')
          expect((await shell.evaluate(() => window.mindnotesNotebook!.list())).total).toBe(100)

          await checkpoint('page-search-edit-flush-blocked-navigation-local-library-100')
          // This command also awaits page workspace.flush, independently of the editor IPC queue.
          await shell.evaluate(() => window.mindnotes!.command('floating'))
          const gesture = await measureGesture(session)
          expect(gesture.stroke.points).toHaveLength(24)
          await session.toolbar.evaluate(() => window.mindnotesFloating!.command('undo'))
          await expect
            .poll(() =>
              session.overlay.evaluate(
                async () => (await window.mindnotesScreen!.getState()).strokes
              )
            )
            .toEqual([])
          await session.toolbar.evaluate(() => window.mindnotesFloating!.command('redo'))
          await expect
            .poll(() =>
              session.overlay.evaluate(
                async () => (await window.mindnotesScreen!.getState()).strokes
              )
            )
            .toEqual([gesture.stroke])
          await expect
            .poll(() =>
              session.toolbar.evaluate(
                async () => (await window.mindnotesFloating!.getState()).saveState
              )
            )
            .toBe('saved')

          const draftFile = path.join(directory, 'draft-backup.json')
          await saveDialog(session, draftFile)
          await session.toolbar.evaluate(() => window.mindnotesFloating!.command('export-draft'))
          const draftBackup = JSON.parse(await readFile(draftFile, 'utf8')) as {
            drafts: { strokes: (typeof gesture.stroke)[] }[]
          }
          expect(draftBackup.drafts).toHaveLength(1)
          expect(draftBackup.drafts[0].strokes).toEqual([gesture.stroke])
          await checkpoint('24-point-draft-undo-redo-saved-exact-backup')
          await session.close()
          await checkpoint('ordinary-product-quit-zero-exit-before-sdk-artifacts')

          const restarted = await own(original)
          await expect
            .poll(() =>
              restarted.overlay.evaluate(
                async () => (await window.mindnotesScreen!.getState()).strokes
              )
            )
            .toEqual([gesture.stroke])
          const restartedShell = await openLibrary(restarted)
          expect(
            await restartedShell.evaluate(() =>
              window.mindnotesNotebook!.getNote('fixture-screen-0')
            )
          ).toEqual(screen)
          await savedPage(restartedShell, fixture.pages[0].url, 'Offline durable page comment')
          const pages = (await restartedShell.evaluate(() => window.mindnotes!.getState())).pages
          expect(pages).toHaveLength(fixture.pages.length)
          const screenFile = path.join(directory, 'screen-backup.json'),
            pageFile = path.join(directory, 'page-backup.json')
          await saveDialog(restarted, screenFile)
          expect(await restartedShell.evaluate(() => window.mindnotesNotebook!.exportAll())).toBe(
            screenFile
          )
          await saveDialog(restarted, pageFile)
          expect(
            await restartedShell.evaluate(() => window.mindnotes!.exportNotes('json', 'all'))
          ).toBe(pageFile)
          const exported = JSON.parse(await readFile(screenFile, 'utf8')) as {
            notes: { note: ScreenNote; image: string }[]
          }
          const exportedPages = JSON.parse(await readFile(pageFile, 'utf8')) as {
            pages: PageNotebook[]
          }
          expect(exported.notes).toHaveLength(100)
          expect(exported.notes.find((entry) => entry.note.id === screen.id)?.note).toEqual(screen)
          expect(
            Buffer.from(
              exported.notes.find((entry) => entry.note.id === screen.id)!.image,
              'base64'
            )
          ).toEqual(Buffer.from(fixture.entries[0].png))
          expect(exportedPages.pages).toEqual(pages)
          await checkpoint(
            'original-profile-restart-exact-screen-page-draft-and-100-note-page-backups'
          )
          await restarted.close()
          await checkpoint('restarted-profile-ordinary-zero-exit')

          const recovery = path.join(directory, 'recovery-empty')
          await mkdir(recovery)
          const restored = await own(recovery)
          const restoredShell = await openLibrary(restored)
          expect((await restoredShell.evaluate(() => window.mindnotesNotebook!.list())).total).toBe(
            0
          )
          expect((await restoredShell.evaluate(() => window.mindnotes!.getState())).pages).toEqual(
            []
          )
          await openDialog(restored, screenFile)
          expect(await restoredShell.evaluate(() => window.mindnotesNotebook!.importBackup())).toBe(
            100
          )
          await restoredShell.getByLabel('导入笔记文件').setInputFiles(pageFile)
          await savedPage(restoredShell, fixture.pages[0].url, 'Offline durable page comment')
          expect((await restoredShell.evaluate(() => window.mindnotesNotebook!.list())).total).toBe(
            100
          )
          expect(
            await restoredShell.evaluate(() =>
              window.mindnotesNotebook!.getNote('fixture-screen-0')
            )
          ).toEqual(screen)
          expect((await restoredShell.evaluate(() => window.mindnotes!.getState())).pages).toEqual(
            pages
          )
          expect(
            await restoredShell.evaluate(() =>
              window.mindnotesNotebook!.getImage('fixture-screen-0')
            )
          ).toBe(`data:image/png;base64,${Buffer.from(fixture.entries[0].png).toString('base64')}`)
          await restoredShell.evaluate(() => window.mindnotes!.command('floating'))
          await openDialog(restored, draftFile)
          await restored.toolbar.evaluate(() => window.mindnotesFloating!.command('import-draft'))
          await expect
            .poll(() =>
              restored.overlay.evaluate(
                async () => (await window.mindnotesScreen!.getState()).strokes
              )
            )
            .toEqual([gesture.stroke])
          await expect
            .poll(() =>
              restored.toolbar.evaluate(
                async () => (await window.mindnotesFloating!.getState()).saveState
              )
            )
            .toBe('saved')
          await checkpoint('empty-library-import-screen-image-page-draft-exact-saved')
          await restored.close()
          await checkpoint('recovery-profile-ordinary-zero-exit')
          const recoveredRestart = await own(recovery)
          expect(
            (await recoveredRestart.overlay.evaluate(() => window.mindnotesScreen!.getState()))
              .strokes
          ).toEqual([gesture.stroke])
          const recoveredShell = await openLibrary(recoveredRestart)
          expect(
            await recoveredShell.evaluate(() =>
              window.mindnotesNotebook!.getNote('fixture-screen-0')
            )
          ).toEqual(screen)
          await savedPage(recoveredShell, fixture.pages[0].url, 'Offline durable page comment')
          await checkpoint('recovery-second-restart-exact-screen-image-page-comment-and-draft')
        } catch (error) {
          evidence.status = 'failed'
          evidence.error = error instanceof Error ? error.message : String(error)
          throw error
        } finally {
          await finalizeEvidence()
        }
      })
    )
  })
