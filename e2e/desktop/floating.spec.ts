import { _electron as electron, expect, test } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { DatabaseSync } from 'node:sqlite'
import { performance } from 'node:perf_hooks'
import { PNG } from 'pngjs'
import { seedScreenNote } from './screen-fixtures'
import { withNativeCaptureFixture } from './native-capture-fixture'
import type {} from '../../src/notes/floating'

const runFile = promisify(execFile)

async function ignoresMouse(app: ElectronApplication): Promise<boolean> {
  const handle = await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows().find((item) =>
      item.webContents.getURL().includes('surface=screen')
    )!
    return window.getNativeWindowHandle().readBigUInt64LE().toString()
  })
  // Read WS_EX_TRANSPARENT from our own test window; no system input is synthesized.
  const script = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class InkWindowStyle { [DllImport("user32.dll", EntryPoint="GetWindowLongW")] public static extern int Read(IntPtr window, int index); }'; [InkWindowStyle]::Read([IntPtr]::new([long]${handle}), -20)`
  const result = await runFile(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { windowsHide: true }
  )
  return Boolean(Number(result.stdout.trim()) & 0x20)
}

async function nativeWindowAt(x: number, y: number): Promise<string> {
  const script = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices;
public static class MindNotesPanelHit {
  [StructLayout(LayoutKind.Sequential)] public struct Point { public int x,y; }
  [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(Point point);
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr window,uint flags);
}';[void][MindNotesPanelHit]::SetThreadDpiAwarenessContext([IntPtr]::new(-4));$qaPoint=New-Object MindNotesPanelHit+Point;$qaPoint.x=${Math.round(x)};$qaPoint.y=${Math.round(y)};[MindNotesPanelHit]::GetAncestor([MindNotesPanelHit]::WindowFromPoint($qaPoint),2).ToInt64().ToString()`
  const result = await runFile(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { windowsHide: true }
  )
  return result.stdout.trim()
}

async function launch(existingDirectory?: string): Promise<{
  app: ElectronApplication
  toolbar: Page
  overlay: Page
  directory: string
}> {
  const directory =
    existingDirectory ?? (await mkdtemp(path.join(os.tmpdir(), 'mindnotes-floating-')))
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env))
    if (
      value !== undefined &&
      key !== 'ELECTRON_RUN_AS_NODE' &&
      key !== 'MINDNOTES_START_WORKSPACE'
    )
      env[key] = value
  const app = await electron.launch({
    ...(process.env.MINDNOTES_EXECUTABLE
      ? { executablePath: process.env.MINDNOTES_EXECUTABLE, args: [] }
      : { args: ['.'] }),
    env: { ...env, MINDNOTES_USE_DIST: '1', MINDNOTES_USER_DATA_DIR: directory },
  })
  await expect.poll(() => app.windows().length).toBe(2)
  const toolbar = app
    .windows()
    .find((page) => new URL(page.url()).searchParams.get('surface') === 'toolbar')!
  const overlay = app
    .windows()
    .find((page) => new URL(page.url()).searchParams.get('surface') === 'screen')!
  await expect(toolbar.getByRole('button', { name: '展开悬浮批注' })).toBeVisible()
  await toolbar.getByRole('button', { name: '展开悬浮批注' }).click()
  await expect(toolbar.getByRole('toolbar', { name: '悬浮批注工具条' })).toBeVisible()
  await expect(overlay.locator('.screen-ink-canvas')).toBeAttached()
  return { app, toolbar, overlay, directory }
}

async function nativeState(app: ElectronApplication) {
  return app.evaluate(({ BrowserWindow, screen }) => {
    const windows = BrowserWindow.getAllWindows()
    const toolbar = windows.find((window) =>
      window.webContents.getURL().includes('surface=toolbar')
    )!
    const overlay = windows.find((window) =>
      window.webContents.getURL().includes('surface=screen')
    )!
    const preferences = (
      overlay.webContents as unknown as {
        getLastWebPreferences(): {
          sandbox: boolean
          contextIsolation: boolean
          nodeIntegration: boolean
        }
      }
    ).getLastWebPreferences()
    return {
      toolbar: {
        bounds: toolbar.getBounds(),
        top: toolbar.isAlwaysOnTop(),
        focusable: toolbar.isFocusable(),
        visible: toolbar.isVisible(),
      },
      overlay: {
        bounds: overlay.getBounds(),
        top: overlay.isAlwaysOnTop(),
        focusable: overlay.isFocusable(),
        visible: overlay.isVisible(),
      },
      display: screen.getDisplayMatching(toolbar.getBounds()).bounds,
      security: {
        sandbox: preferences.sandbox,
        contextIsolation: preferences.contextIsolation,
        nodeIntegration: preferences.nodeIntegration,
      },
    }
  })
}

async function draw(overlay: Page, x: number, y: number) {
  await overlay.mouse.move(x, y)
  await overlay.mouse.down()
  await overlay.mouse.move(x + 180, y + 10, { steps: 16 })
  await overlay.mouse.up()
}

async function traceScreenInput(overlay: Page): Promise<void> {
  await overlay.evaluate(() => {
    const events: unknown[] = []
    ;(window as unknown as { qaPointerEvents: unknown[] }).qaPointerEvents = events
    for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'lostpointercapture'])
      document.addEventListener(
        type,
        (event) => {
          const pointer = event as PointerEvent
          events.push({
            type,
            at: performance.now(),
            x: pointer.clientX,
            y: pointer.clientY,
            buttons: pointer.buttons,
            pointerId: pointer.pointerId,
            pointerType: pointer.pointerType,
            pressure: pointer.pressure,
            trusted: pointer.isTrusted,
          })
        },
        true
      )
    window.mindnotesScreen!.subscribe((state) =>
      events.push({ type: 'state', at: performance.now(), state })
    )
  })
}

async function saveScreenInputTrace(overlay: Page, name: string): Promise<void> {
  await writeFile(
    test.info().outputPath(name),
    JSON.stringify(
      await overlay.evaluate(
        () => (window as unknown as { qaPointerEvents: unknown[] }).qaPointerEvents
      ),
      null,
      2
    )
  )
}

test('native floating ink: tools, erasing, history, collapse and workspace switching', async () => {
  const { app, toolbar, overlay } = await launch()
  let closed = false
  try {
    const errors: string[] = []
    toolbar.on('pageerror', (error) => errors.push(error.message))
    overlay.on('pageerror', (error) => errors.push(error.message))
    const initial = await nativeState(app)
    expect(initial.toolbar.top).toBe(true)
    expect(initial.toolbar.focusable).toBe(false)
    expect(initial.overlay.top).toBe(true)
    expect(initial.overlay.focusable).toBe(false)
    if (process.platform === 'win32') expect(await ignoresMouse(app)).toBe(true)
    expect(initial.overlay.bounds.x).toBe(initial.display.x)
    expect(initial.overlay.bounds.y).toBe(initial.display.y)
    // Windows rounds DIP sizes at fractional display scale factors.
    expect(Math.abs(initial.overlay.bounds.width - initial.display.width)).toBeLessThanOrEqual(1)
    expect(Math.abs(initial.overlay.bounds.height - initial.display.height)).toBeLessThanOrEqual(1)
    expect(initial.security).toEqual({
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    })
    const shortcutAvailable = await toolbar.evaluate(() =>
      window.mindnotesFloating!.getState().then((state) => state.shortcutAvailable)
    )
    await expect(toolbar.locator('.floating-shortcut')).toHaveText(
      shortcutAvailable ? 'Alt+Shift+M' : '快捷键不可用'
    )
    if (!shortcutAvailable)
      await expect(toolbar.getByRole('button', { name: '收起悬浮批注' })).toHaveAttribute(
        'title',
        /快捷键不可用/
      )
    const alpha = await app.evaluate(async ({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows().find((item) =>
        item.webContents.getURL().includes('surface=screen')
      )!
      const pixel = (
        await window.webContents.capturePage({ x: 0, y: 0, width: 1, height: 1 })
      ).toBitmap()
      return pixel[3]
    })
    expect(alpha).toBe(0)
    expect(await toolbar.evaluate(() => 'mindnotes' in window || 'mindnotesScreen' in window)).toBe(
      false
    )
    expect(
      await overlay.evaluate(() => 'mindnotes' in window || 'mindnotesFloating' in window)
    ).toBe(false)
    // Inspect the whole toolbar at its native size, including rightmost exit control.
    for (const button of await toolbar.locator('.floating-toolbar button').all()) {
      await expect(button).toBeInViewport()
      const bounds = await button.boundingBox()
      expect(bounds!.width).toBeGreaterThanOrEqual(44)
      expect(bounds!.height).toBeGreaterThanOrEqual(44)
    }
    await toolbar.screenshot({ path: test.info().outputPath('floating-toolbar.png') })
    await toolbar.getByRole('button', { name: '画笔', exact: true }).click()
    await expect.poll(async () => (await nativeState(app)).overlay.focusable).toBe(true)
    if (process.platform === 'win32') expect(await ignoresMouse(app)).toBe(false)
    await draw(overlay, 150, 150)
    await expect(overlay.locator('[data-stroke-id]')).toHaveCount(1)
    await toolbar.getByRole('button', { name: '画笔设置', exact: true }).click()
    await toolbar.getByRole('button', { name: '荧光笔', exact: true }).click()
    await toolbar.getByRole('button', { name: '蓝色', exact: true }).click()
    for (const button of await toolbar.locator('.floating-panel button').all()) {
      await expect(button).toBeInViewport()
      const box = await button.boundingBox()
      expect(box!.width).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
    await toolbar.getByRole('button', { name: '关闭工具面板' }).click()
    await draw(overlay, 180, 280)
    await expect(overlay.locator('[data-stroke-id]')).toHaveCount(2)
    await expect(overlay.locator('[data-stroke-id]').last()).toHaveAttribute('opacity', '0.3')
    await toolbar.getByRole('button', { name: '橡皮', exact: true }).click()
    await overlay.mouse.move(240, 70)
    await overlay.mouse.down()
    await overlay.mouse.move(240, 230)
    await overlay.mouse.up()
    await expect(overlay.locator('[data-stroke-id]')).toHaveCount(1)
    await toolbar.getByRole('button', { name: '撤销屏幕批注' }).click()
    await expect(overlay.locator('[data-stroke-id]')).toHaveCount(2)
    await toolbar.getByRole('button', { name: '更多操作' }).click()
    await toolbar.getByRole('button', { name: '重做屏幕批注' }).click()
    await toolbar.getByRole('button', { name: '关闭工具面板' }).click()
    await expect(overlay.locator('[data-stroke-id]')).toHaveCount(1)
    await overlay.keyboard.press('Escape')
    await expect(toolbar.getByRole('button', { name: '鼠标', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await expect.poll(async () => (await nativeState(app)).overlay.focusable).toBe(false)
    if (process.platform === 'win32') expect(await ignoresMouse(app)).toBe(true)
    await toolbar.getByRole('button', { name: '画笔', exact: true }).click()
    await overlay.mouse.move(100, 370)
    await overlay.mouse.down()
    await overlay.mouse.move(200, 380)
    await overlay.keyboard.press('Escape')
    await expect(toolbar.getByRole('button', { name: '鼠标', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await overlay.mouse.up()
    await expect(overlay.locator('[data-stroke-id]')).toHaveCount(1)
    await toolbar.getByRole('button', { name: '收起悬浮批注' }).click()
    await expect(toolbar.getByRole('button', { name: '展开悬浮批注' })).toBeVisible()
    await expect.poll(async () => (await nativeState(app)).overlay.visible).toBe(false)
    await toolbar.screenshot({ path: test.info().outputPath('floating-collapsed.png') })
    await toolbar.getByRole('button', { name: '展开悬浮批注' }).click()
    await expect(overlay.locator('[data-stroke-id]')).toHaveCount(1)
    await expect.poll(async () => (await nativeState(app)).overlay.visible).toBe(true)
    await toolbar.getByRole('button', { name: '更多操作' }).click()
    await toolbar.getByRole('button', { name: '清空笔迹', exact: true }).click()
    await toolbar.getByRole('button', { name: '关闭工具面板' }).click()
    await expect(overlay.locator('[data-stroke-id]')).toHaveCount(0)
    await toolbar.getByRole('button', { name: '撤销屏幕批注' }).click()
    await expect(overlay.locator('[data-stroke-id]')).toHaveCount(1)
    const workspacePromise = app.waitForEvent('window', {
      predicate: (page) => page !== toolbar && page !== overlay,
    })
    await toolbar.getByRole('button', { name: '更多操作' }).click()
    await toolbar.getByRole('button', { name: '我的笔记', exact: true }).click()
    const workspace = await workspacePromise
    await expect(workspace.getByRole('region', { name: '统一笔记库' })).toBeVisible()
    await workspace.getByRole('button', { name: '悬浮批注', exact: true }).click()
    await toolbar.getByRole('button', { name: '展开悬浮批注' }).click()
    await expect(toolbar.getByRole('toolbar', { name: '悬浮批注工具条' })).toBeVisible()
    await toolbar.getByRole('button', { name: '更多操作' }).click()
    await toolbar.getByRole('button', { name: '我的笔记', exact: true }).click()
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()
        .find((window) => !window.webContents.getURL().includes('surface='))!
        .close()
    })
    await expect.poll(async () => (await nativeState(app)).toolbar.visible).toBe(true)
    await expect(toolbar.getByRole('button', { name: '展开悬浮批注' })).toBeVisible()
    await toolbar.getByRole('button', { name: '展开悬浮批注' }).click()
    await expect.poll(async () => (await nativeState(app)).overlay.visible).toBe(true)
    expect(errors).toEqual([])
    await toolbar.getByRole('button', { name: '更多操作' }).click()
    await Promise.all([
      app.waitForEvent('close'),
      toolbar.getByRole('button', { name: '退出 MindNotes Pro' }).click(),
    ])
    closed = true
  } finally {
    if (!closed) await app.close()
  }
})

test('floating panels keep controls stationary and release the unused native input area', async () => {
  const { app, toolbar } = await launch()
  try {
    // Keep this test's input points away from the desktop notification corner.
    await app.evaluate(({ BrowserWindow, screen }) => {
      const window = BrowserWindow.getAllWindows().find((item) =>
        item.webContents.getURL().includes('surface=toolbar')
      )!
      const area = screen.getDisplayMatching(window.getBounds()).workArea
      const bounds = window.getBounds()
      window.setPosition(
        area.x + 80,
        area.y + Math.max(0, Math.round((area.height - bounds.height) / 2))
      )
    })
    const controls = ['画笔设置', '更多操作']
    const initial = await nativeState(app)
    const positions = new Map<string, { x: number; y: number }>()
    for (const name of controls) {
      const bounds = await toolbar.getByRole('button', { name, exact: true }).boundingBox()
      expect(bounds).not.toBeNull()
      positions.set(name, { x: bounds!.x, y: bounds!.y })
    }
    const native = await app.evaluate(({ BrowserWindow, screen }) => {
      const window = BrowserWindow.getAllWindows().find((item) =>
        item.webContents.getURL().includes('surface=toolbar')
      )!
      const bounds = window.getBounds()
      return {
        handle: window.getNativeWindowHandle().readBigUInt64LE().toString(),
        upper: screen.dipToScreenPoint({ x: bounds.x + 80, y: bounds.y + 60 }),
        lower: screen.dipToScreenPoint({
          x: bounds.x + 80,
          y: bounds.y + bounds.height - 90,
        }),
      }
    })
    if (process.platform === 'win32') {
      await expect.poll(() => nativeWindowAt(native.lower.x, native.lower.y)).toBe(native.handle)
      expect(await nativeWindowAt(native.upper.x, native.upper.y)).not.toBe(native.handle)
    }
    for (const name of controls) {
      await toolbar.getByRole('button', { name, exact: true }).click()
      await expect(toolbar.getByRole('region', { name, exact: true })).toBeVisible()
      expect((await nativeState(app)).toolbar.bounds).toEqual(initial.toolbar.bounds)
      for (const control of controls) {
        const bounds = await toolbar
          .getByRole('button', { name: control, exact: true })
          .boundingBox()
        expect(bounds!.x).toBe(positions.get(control)!.x)
        expect(bounds!.y).toBe(positions.get(control)!.y)
      }
      for (const button of await toolbar.locator('.floating-panel button').all()) {
        await expect(button).toBeInViewport()
        const bounds = await button.boundingBox()
        expect(bounds!.width).toBeGreaterThanOrEqual(44)
        expect(bounds!.height).toBeGreaterThanOrEqual(44)
      }
      await toolbar.getByRole('button', { name: '关闭工具面板' }).click()
      if (process.platform === 'win32')
        expect(await nativeWindowAt(native.upper.x, native.upper.y)).not.toBe(native.handle)
    }
    await writeFile(
      test.info().outputPath('panel-native-evidence.json'),
      JSON.stringify(
        {
          status: 'passed',
          bounds: initial.toolbar.bounds,
          checks: [
            'fixed-window-bounds',
            'stationary-controls',
            '44px-panel-targets',
            'unused-region-native-pass-through',
          ],
        },
        null,
        2
      )
    )
  } finally {
    await app.close()
  }
})

test('captures the real underlying screen and composites ink without either floating window', async () => {
  await withNativeCaptureFixture(async () => {
    const { app, toolbar, overlay, directory } = await launch()
    try {
      const target = path.join(directory, 'screen-note.png')
      const cancelled = path.join(directory, 'cancelled.png')
      const baseline = await app.evaluate(async ({ BrowserWindow, screen, desktopCapturer }) => {
        const windows = BrowserWindow.getAllWindows()
        const toolbarWindow = windows.find((window) =>
          window.webContents.getURL().includes('surface=toolbar')
        )!
        const display = screen.getDisplayMatching(toolbarWindow.getBounds())
        for (const window of windows) window.hide()
        await new Promise((resolve) => setTimeout(resolve, 180))
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: {
            width: Math.ceil(display.bounds.width * display.scaleFactor),
            height: Math.ceil(display.bounds.height * display.scaleFactor),
          },
        })
        const image = sources.find((source) => source.display_id === String(display.id))!.thumbnail
        const size = image.getSize()
        const bounds = toolbarWindow.getBounds()
        const pixel = (x: number, y: number) => [
          ...image
            .crop({
              x: Math.round((x * size.width) / display.bounds.width),
              y: Math.round((y * size.height) / display.bounds.height),
              width: 1,
              height: 1,
            })
            .toBitmap(),
        ]
        const result = {
          inkPixel: pixel(230, 125),
          toolbarPixel: pixel(
            bounds.x - display.bounds.x + 80,
            bounds.y - display.bounds.y + bounds.height - 90
          ),
          referencePixel: pixel(display.bounds.width / 2, display.bounds.height / 2),
        }
        for (const window of windows) window.showInactive()
        toolbarWindow.moveTop()
        return result
      })
      await toolbar.getByRole('button', { name: '画笔', exact: true }).click()
      await draw(overlay, 140, 120)
      await expect(overlay.locator('[data-stroke-id]')).toHaveCount(1)
      const captureBounds = await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((window) => window.webContents.getURL().includes('surface=toolbar'))!
          .getBounds()
      )
      await toolbar.getByRole('button', { name: '保存笔记', exact: true }).click()
      await expect(toolbar.getByRole('status')).toContainText('笔记已保存在')
      await expect(toolbar.getByRole('button', { name: '鼠标', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
      const workspacePromise = app.waitForEvent('window', {
        predicate: (page) =>
          page !== toolbar && page !== overlay && !page.url().startsWith('data:'),
      })
      await toolbar.getByRole('button', { name: '更多操作' }).click()
      await toolbar.getByRole('button', { name: '我的笔记', exact: true }).click()
      const workspace = await workspacePromise
      await expect(workspace.getByRole('button', { name: /^打开屏幕笔记/ })).toHaveCount(1)
      await workspace.getByRole('button', { name: /^打开屏幕笔记/ }).click()
      await expect(workspace.getByRole('region', { name: '屏幕笔记编辑器' })).toBeVisible()
      await expect(workspace.locator('[data-stroke-id]')).toHaveCount(1)
      // The real desktop source was captured; only the export chooser is automated.
      await app.evaluate(({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath })
      }, target)
      await workspace.getByRole('button', { name: '导出 PNG', exact: true }).click()
      await expect
        .poll(async () => {
          const error = (await workspace.getByRole('alert').allTextContents()).join('')
          if (error) throw new Error(error)
          return readFile(target)
            .then((bytes) => bytes.length)
            .catch(() => 0)
        })
        .toBeGreaterThan(0)
      const content = await readFile(target)
      expect(content.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      const result = await app.evaluate(
        async ({ BrowserWindow, nativeImage, screen }, data) => {
          const toolbarWindow = BrowserWindow.getAllWindows().find((window) =>
            window.webContents.getURL().includes('surface=toolbar')
          )!
          const display = screen.getDisplayMatching(toolbarWindow.getBounds())
          const image = nativeImage.createFromPath(data.filePath)
          const size = image.getSize()
          const pixel = image
            .crop({
              x: Math.round((230 * size.width) / display.bounds.width),
              y: Math.round((125 * size.height) / display.bounds.height),
              width: 1,
              height: 1,
            })
            .toBitmap()
          const bounds = data.bounds
          const toolbarPixel = image
            .crop({
              x: Math.round(
                ((bounds.x - display.bounds.x + 80) * size.width) / display.bounds.width
              ),
              y: Math.round(
                ((bounds.y - display.bounds.y + bounds.height - 90) * size.height) /
                  display.bounds.height
              ),
              width: 1,
              height: 1,
            })
            .toBitmap()
          const referencePixel = image
            .crop({
              x: Math.round(size.width / 2),
              y: Math.round(size.height / 2),
              width: 1,
              height: 1,
            })
            .toBitmap()
          return {
            size,
            expected: {
              width: Math.ceil(display.bounds.width * display.scaleFactor),
              height: Math.ceil(display.bounds.height * display.scaleFactor),
            },
            pixel: [...pixel],
            toolbarPixel: [...toolbarPixel],
            referencePixel: [...referencePixel],
          }
        },
        { filePath: target, bounds: captureBounds }
      )
      expect(result.size).toEqual(result.expected)
      expect(result.pixel[2]).toBeGreaterThan(180) // red pen was added to the captured software
      expect(result.pixel[1]).toBeLessThan(140)
      // Compare to the actual desktop immediately before drawing, including the covered toolbar area.
      for (const index of [0, 1, 2]) {
        expect(
          Math.abs(result.referencePixel[index] - baseline.referencePixel[index])
        ).toBeLessThanOrEqual(3)
        expect(
          Math.abs(result.toolbarPixel[index] - baseline.toolbarPixel[index])
        ).toBeLessThanOrEqual(3)
      }
      await writeFile(test.info().outputPath('screen-note.png'), content)
      await app.evaluate(({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: true, filePath })
      }, cancelled)
      await workspace.getByRole('button', { name: '导出 PNG', exact: true }).click()
      await expect(workspace.locator('[data-stroke-id]')).toHaveCount(1)
      await app.evaluate(
        ({ dialog }, filePath) => {
          dialog.showSaveDialog = async () => ({ canceled: false, filePath })
        },
        path.join(directory, 'missing-parent', 'screen.png')
      )
      await workspace.getByRole('button', { name: '导出 PNG', exact: true }).click()
      await expect(workspace.getByRole('alert')).toContainText('ENOENT')
      await expect.poll(async () => (await nativeState(app)).overlay.focusable).toBe(false)
    } finally {
      await app.close()
    }
  })
})

test('ink process failure releases input and leaves a usable exit control', async () => {
  const { app, toolbar } = await launch()
  try {
    await toolbar.getByRole('button', { name: '画笔', exact: true }).click()
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()
        .find((window) => window.webContents.getURL().includes('surface=screen'))!
        .webContents.forcefullyCrashRenderer()
    })
    await expect(toolbar.getByRole('status')).toContainText('批注层已退出')
    await expect.poll(async () => (await nativeState(app)).overlay.focusable).toBe(false)
    await expect.poll(async () => (await nativeState(app)).overlay.visible).toBe(false)
    await toolbar.getByRole('button', { name: '画笔', exact: true }).click()
    await expect(toolbar.getByRole('status')).toContainText('批注层已退出')
    await expect.poll(async () => (await nativeState(app)).overlay.focusable).toBe(false)
  } finally {
    await app.close()
  }
})

test('lock during capture cancels it, preserves ink and keeps both windows hidden until unlock', async () => {
  const { app, toolbar, overlay, directory } = await launch()
  const connection = new DatabaseSync(path.join(directory, 'screen-notes.sqlite'))
  try {
    await traceScreenInput(overlay)
    await toolbar.getByRole('button', { name: '画笔', exact: true }).click()
    await draw(overlay, 150, 200)
    // Establish a completed gesture before testing capture cancellation. This
    // also distinguishes lost/interfered input from a lock-time ink loss.
    await expect(overlay.locator('[data-stroke-id]')).toHaveCount(1)
    await expect
      .poll(() =>
        toolbar.evaluate(() =>
          window.mindnotesFloating!.getState().then((state) => state.saveState)
        )
      )
      .toBe('saved')
    await app.evaluate(({ ipcMain, powerMonitor, desktopCapturer }) => {
      const handlers = ipcMain as unknown as {
        _invokeHandlers: Map<
          string,
          (event: Electron.IpcMainInvokeEvent, command: string) => Promise<void>
        >
      }
      const original = handlers._invokeHandlers.get('floating:command')!
      const getSources = desktopCapturer.getSources.bind(desktopCapturer)
      const calls = { value: 0 }
      Object.assign(globalThis, { captureCalls: calls })
      desktopCapturer.getSources = (options) => {
        calls.value += 1
        return getSources(options)
      }
      ipcMain.removeHandler('floating:command')
      ipcMain.handle('floating:command', (event, command: string) => {
        const operation = original(event, command)
        if (command === 'save') powerMonitor.emit('lock-screen')
        return operation
      })
    })
    await toolbar.evaluate(() => window.mindnotesFloating!.command('save'))
    expect((await toolbar.evaluate(() => window.mindnotesFloating!.getState())).message).toContain(
      '截图已取消'
    )
    expect(await toolbar.evaluate(() => window.mindnotesFloating!.getState())).toMatchObject({
      collapsed: true,
      capturing: false,
      tool: 'pointer',
      count: 1,
    })
    expect(await nativeState(app)).toMatchObject({
      toolbar: { visible: false },
      overlay: { visible: false, focusable: false },
    })
    expect(
      await app.evaluate(
        () => (globalThis as unknown as { captureCalls: { value: number } }).captureCalls.value
      )
    ).toBe(0)
    expect(connection.prepare('SELECT COUNT(*) AS count FROM notes').get()!.count).toBe(0)
    await app.evaluate(({ powerMonitor, screen }) => {
      screen.emit('display-metrics-changed', {}, screen.getPrimaryDisplay(), ['bounds'])
      powerMonitor.emit('suspend')
      powerMonitor.emit('resume')
    })
    // A resume event cannot undo a lock that is still in effect.
    expect(await nativeState(app)).toMatchObject({
      toolbar: { visible: false },
      overlay: { visible: false, focusable: false },
    })
    await app.evaluate(({ powerMonitor }) => powerMonitor.emit('unlock-screen'))
    await expect.poll(async () => (await nativeState(app)).toolbar.visible).toBe(true)
    await expect(toolbar.getByRole('button', { name: '展开悬浮批注' })).toBeVisible()
    await toolbar.getByRole('button', { name: '展开悬浮批注' }).click()
    await expect(overlay.locator('[data-stroke-id]')).toHaveCount(1)
    await toolbar.getByRole('button', { name: '画笔', exact: true }).click()
    await draw(overlay, 200, 320)
    await expect(overlay.locator('[data-stroke-id]')).toHaveCount(2)
    if (process.platform === 'win32') expect(await ignoresMouse(app)).toBe(false)
  } finally {
    connection.close()
    try {
      await saveScreenInputTrace(overlay, 'lock-capture-input-events.json')
    } finally {
      await app.close()
    }
  }
})

test('suspend during a gesture releases input, discards the unfinished stroke and restores only the bubble', async () => {
  const { app, toolbar, overlay } = await launch()
  try {
    await toolbar.getByRole('button', { name: '画笔', exact: true }).click()
    await draw(overlay, 150, 200)
    await overlay.mouse.move(200, 300)
    await overlay.mouse.down()
    await overlay.mouse.move(300, 310)
    await app.evaluate(({ powerMonitor }) => powerMonitor.emit('suspend'))
    await overlay.mouse.up()
    expect(await nativeState(app)).toMatchObject({
      toolbar: { visible: false },
      overlay: { visible: false, focusable: false },
    })
    if (process.platform === 'win32') expect(await ignoresMouse(app)).toBe(true)
    await app.evaluate(({ powerMonitor }) => powerMonitor.emit('resume'))
    await toolbar.getByRole('button', { name: '展开悬浮批注' }).click()
    await expect(overlay.locator('[data-stroke-id]')).toHaveCount(1)
    await toolbar.getByRole('button', { name: '画笔', exact: true }).click()
    await draw(overlay, 250, 350)
    await expect(overlay.locator('[data-stroke-id]')).toHaveCount(2)
  } finally {
    await app.close()
  }
})

test('native close while capturing cancels capture and exits without saving a changed screen', async () => {
  const { app, toolbar, overlay, directory } = await launch()
  const connection = new DatabaseSync(path.join(directory, 'screen-notes.sqlite'))
  let closed = false
  try {
    await toolbar.getByRole('button', { name: '画笔', exact: true }).click()
    await draw(overlay, 150, 200)
    await app.evaluate(({ ipcMain, BrowserWindow }) => {
      const handlers = ipcMain as unknown as {
        _invokeHandlers: Map<
          string,
          (event: Electron.IpcMainInvokeEvent, command: string) => Promise<void>
        >
      }
      const original = handlers._invokeHandlers.get('floating:command')!
      ipcMain.removeHandler('floating:command')
      ipcMain.handle('floating:command', (event, command: string) => {
        const operation = original(event, command)
        if (command === 'save')
          BrowserWindow.getAllWindows()
            .find((window) => window.webContents.getURL().includes('surface=toolbar'))!
            .close()
        return operation
      })
    })
    await Promise.all([
      app.waitForEvent('close'),
      toolbar.evaluate(() => window.mindnotesFloating!.command('save')).catch(() => undefined),
    ])
    closed = true
    expect(connection.prepare('SELECT COUNT(*) AS count FROM notes').get()!.count).toBe(0)
    const row = connection.prepare('SELECT document FROM drafts').get()!
    expect(JSON.parse(String(row.document)).strokes).toHaveLength(1)
  } finally {
    connection.close()
    if (!closed) await app.close()
  }
})

async function stopAbruptly(app: ElectronApplication): Promise<void> {
  const pid = await app.evaluate(() => process.pid)
  if (process.platform === 'win32')
    await runFile('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { windowsHide: true })
  else process.kill(pid, 'SIGKILL')
  await app.close().catch(() => undefined)
}

test('screen and saved-note gestures keep released endpoints and survive interrupted capture', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-screen-endpoint-'))
  const initial = await launch(directory)
  const errors: string[] = []
  let screenStrokes
  let editorStrokes
  const releaseLine = async (page: Page, x: number, y: number) => {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      buttons: 1,
      clickCount: 1,
    })
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: x + 40,
      y: y + 5,
      buttons: 1,
    })
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: x + 120,
      y: y + 15,
      button: 'left',
      buttons: 0,
      clickCount: 1,
    })
    await cdp.detach()
  }
  const interruptedCapture = async (page: Page, selector: string) => {
    await page.locator(selector).evaluate((element) => {
      const svg = element as SVGSVGElement
      const original = svg.setPointerCapture
      svg.setPointerCapture = () => {
        throw new DOMException('Contact already cancelled', 'NotFoundError')
      }
      try {
        svg.dispatchEvent(
          new PointerEvent('pointerdown', {
            pointerId: 999,
            pointerType: 'pen',
            isPrimary: true,
            button: 0,
            buttons: 1,
            clientX: 80,
            clientY: 120,
            bubbles: true,
          })
        )
      } finally {
        svg.setPointerCapture = original
      }
    })
  }
  const openLibrary = async (app: ElectronApplication, toolbar: Page) => {
    await toolbar.getByRole('button', { name: '更多操作' }).click()
    const pagePromise = app.waitForEvent('window', {
      predicate: (page) => !page.url().includes('surface='),
    })
    await toolbar.getByRole('button', { name: '我的笔记', exact: true }).click()
    const workspace = await pagePromise
    await expect(workspace.getByRole('region', { name: '统一笔记库' })).toBeVisible()
    return workspace
  }
  try {
    initial.overlay.on('pageerror', (error) => errors.push(error.message))
    await initial.toolbar.getByRole('button', { name: '画笔', exact: true }).click()
    await interruptedCapture(initial.overlay, 'svg.screen-ink-canvas')
    await releaseLine(initial.overlay, 80, 160)
    await expect(initial.overlay.locator('[data-stroke-id]')).toHaveCount(1)
    await expect
      .poll(() =>
        initial.toolbar.evaluate(() =>
          window.mindnotesFloating!.getState().then((state) => state.saveState)
        )
      )
      .toBe('saved')
    const state = await initial.overlay.evaluate(() => window.mindnotesScreen!.getState())
    screenStrokes = state.strokes
    const viewport = await initial.overlay.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
    }))
    expect(screenStrokes[0].points[screenStrokes[0].points.length - 1]).toEqual({
      x: (200 * state.width) / viewport.width,
      y: (175 * state.height) / viewport.height,
    })
    await seedScreenNote(initial.app)
    const workspace = await openLibrary(initial.app, initial.toolbar)
    workspace.on('pageerror', (error) => errors.push(error.message))
    const note = await workspace.evaluate(() => window.mindnotesNotebook!.getNote('fixture_note'))
    await workspace.getByRole('button', { name: `打开屏幕笔记 ${note.title}` }).click()
    const editor = workspace.getByLabel('可编辑截图批注')
    const bounds = (await editor.boundingBox())!
    const x = Math.floor(bounds.x + 30)
    const y = Math.floor(bounds.y + 30)
    await interruptedCapture(workspace, 'svg[aria-label="可编辑截图批注"]')
    await releaseLine(workspace, x, y)
    await workspace.evaluate(() => window.mindnotesNotebook!.flushEdits())
    const saved = await workspace.evaluate((id) => window.mindnotesNotebook!.getNote(id), note.id)
    editorStrokes = saved.strokes
    expect(editorStrokes).toHaveLength(note.strokes.length + 1)
    const lastStroke = editorStrokes[editorStrokes.length - 1]
    const end = lastStroke.points[lastStroke.points.length - 1]
    expect(Math.abs(end.x - ((x + 120 - bounds.x) * note.width) / bounds.width)).toBeLessThan(1)
    expect(Math.abs(end.y - ((y + 15 - bounds.y) * note.height) / bounds.height)).toBeLessThan(1)
    expect(errors).toEqual([])
  } finally {
    await initial.app.close()
  }
  const reopened = await launch(directory)
  try {
    expect(
      (await reopened.overlay.evaluate(() => window.mindnotesScreen!.getState())).strokes
    ).toEqual(screenStrokes)
    const workspace = await openLibrary(reopened.app, reopened.toolbar)
    expect(
      (await workspace.evaluate(() => window.mindnotesNotebook!.getNote('fixture_note'))).strokes
    ).toEqual(editorStrokes)
    await writeFile(
      test.info().outputPath('released-endpoint-evidence.json'),
      JSON.stringify(
        {
          status: 'passed',
          screenStrokes,
          editorStrokes,
          exactRestart: true,
          scope:
            'Actual candidate renderer receives browser CDP release at a distinct endpoint; explicitly simulated capture failure. Generated saved-note background. No physical device claim.',
        },
        null,
        2
      )
    )
  } finally {
    await reopened.app.close()
  }
})

test('floating pointer ownership survives unrelated cancellation and exact restart', async () => {
  const initial = await launch()
  let strokes
  try {
    await initial.toolbar.getByRole('button', { name: '画笔', exact: true }).click()
    await initial.overlay.mouse.move(80, 180)
    await initial.overlay.mouse.down()
    await initial.overlay.mouse.move(140, 185)
    await initial.overlay
      .locator('svg')
      .dispatchEvent('pointercancel', { pointerId: 99, pointerType: 'touch' })
    expect(
      await initial.overlay
        .locator('svg')
        .evaluate((svg) => (svg as SVGSVGElement).hasPointerCapture(1))
    ).toBe(true)
    await initial.overlay.mouse.move(200, 190)
    await initial.overlay.mouse.up()
    await expect(initial.overlay.locator('[data-stroke-id]')).toHaveCount(1)
    await expect
      .poll(() =>
        initial.toolbar.evaluate(() =>
          window.mindnotesFloating!.getState().then((state) => state.saveState)
        )
      )
      .toBe('saved')
    strokes = (await initial.overlay.evaluate(() => window.mindnotesScreen!.getState())).strokes
    expect(strokes).toHaveLength(1)
    expect(strokes[0].points).toHaveLength(3)
    await initial.overlay.mouse.move(300, 280)
    await initial.overlay.mouse.down()
    await initial.overlay.mouse.move(360, 285)
    await initial.overlay
      .locator('svg')
      .dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' })
    await expect(initial.overlay.locator('[data-stroke-id]')).toHaveCount(1)
    expect(
      await initial.overlay
        .locator('svg')
        .evaluate((svg) => (svg as SVGSVGElement).hasPointerCapture(1))
    ).toBe(false)
    await initial.overlay.mouse.up()
    expect(
      (await initial.overlay.evaluate(() => window.mindnotesScreen!.getState())).strokes
    ).toEqual(strokes)
  } finally {
    await initial.app.close()
  }
  const reopened = await launch(initial.directory)
  try {
    expect(
      (await reopened.overlay.evaluate(() => window.mindnotesScreen!.getState())).strokes
    ).toEqual(strokes)
    await writeFile(
      test.info().outputPath('floating-pointer-cancellation.json'),
      JSON.stringify(
        {
          status: 'passed',
          scope:
            'Actual packaged floating layer with Playwright mouse and explicitly synthetic unrelated/owned cancellation.',
          strokes,
          discardedOwnedDraft: true,
          exactRestart: true,
        },
        null,
        2
      )
    )
  } finally {
    await reopened.app.close()
  }
})

test('rapid consecutive screen strokes survive delayed pointer-release events and restart', async () => {
  const initial = await launch()
  try {
    await initial.toolbar.getByRole('button', { name: '画笔', exact: true }).click()
    for (let index = 0; index < 30; index++) {
      await initial.overlay.mouse.move(80, 100 + (index % 10) * 20)
      await initial.overlay.mouse.down()
      // Delayed pointer-release notification from the prior mouse gesture. The
      // SVG still owns capture for the current stroke, which must continue.
      await initial.overlay.locator('svg').dispatchEvent('lostpointercapture', {
        pointerId: 1,
        pointerType: 'mouse',
        bubbles: true,
      })
      await initial.overlay.mouse.move(200, 108 + (index % 10) * 20, { steps: 3 })
      await initial.overlay.mouse.up()
    }
    await expect(initial.overlay.locator('[data-stroke-id]')).toHaveCount(30)
    await expect
      .poll(() =>
        initial.toolbar.evaluate(() =>
          window.mindnotesFloating!.getState().then((state) => state.saveState)
        )
      )
      .toBe('saved')
  } finally {
    await initial.app.close()
  }
  const reopened = await launch(initial.directory)
  try {
    await expect(reopened.overlay.locator('[data-stroke-id]')).toHaveCount(30)
  } finally {
    await reopened.app.close()
  }
})

test('real mixed-DPI displays keep separate ink, scale screen captures and restore both drafts', async () => {
  const initial = await launch()
  await traceScreenInput(initial.overlay)
  const displays = await initial.app.evaluate(({ screen }) =>
    screen.getAllDisplays().map((display) => ({
      id: display.id,
      label: display.label,
      bounds: display.bounds,
      workArea: display.workArea,
      scaleFactor: display.scaleFactor,
      physical: screen.dipToScreenRect(null, display.bounds),
    }))
  )
  if (displays.length < 2) {
    await initial.app.close()
    test.skip(true, 'Requires two real connected displays; no mocked compatibility result.')
    return
  }
  const primaryId = await initial.app.evaluate(({ screen }) => screen.getPrimaryDisplay().id)
  const primary = displays.find((display) => display.id === primaryId)!
  const secondary = displays.find((display) => display.id !== primary.id)!
  const savedDrafts = new Map<string, unknown>()
  let secondaryCapture: unknown
  const moveToolbar = async (app: ElectronApplication, display: typeof primary) => {
    await app.evaluate(({ BrowserWindow }, area) => {
      const toolbar = BrowserWindow.getAllWindows().find((window) =>
        window.webContents.getURL().includes('surface=toolbar')
      )!
      toolbar.setPosition(area.x + 40, area.y + area.height - toolbar.getBounds().height - 40)
    }, display.workArea)
    await expect
      .poll(async () => {
        const bounds = (await nativeState(app)).overlay.bounds
        return (
          bounds.x === display.bounds.x &&
          bounds.y === display.bounds.y &&
          Math.abs(bounds.width - display.bounds.width) <= 1 &&
          Math.abs(bounds.height - display.bounds.height) <= 1
        )
      })
      .toBe(true)
    const toolbarHit = await app.evaluate(({ BrowserWindow, screen }) => {
      const toolbar = BrowserWindow.getAllWindows().find((window) =>
        window.webContents.getURL().includes('surface=toolbar')
      )!
      const bounds = toolbar.getBounds()
      return {
        handle: toolbar.getNativeWindowHandle().readBigUInt64LE().toString(),
        point: screen.dipToScreenPoint({
          x: bounds.x + 80,
          y: bounds.y + bounds.height - 90,
        }),
      }
    })
    await expect
      .poll(() => nativeWindowAt(toolbarHit.point.x, toolbarHit.point.y))
      .toBe(toolbarHit.handle)
  }
  try {
    await moveToolbar(initial.app, primary)
    await initial.toolbar.getByRole('button', { name: '画笔', exact: true }).click()
    await draw(initial.overlay, 110, 120)
    await expect(initial.overlay.locator('[data-stroke-id]')).toHaveCount(1)
    await moveToolbar(initial.app, secondary)
    await expect(initial.overlay.locator('[data-stroke-id]')).toHaveCount(0)
    expect(await ignoresMouse(initial.app)).toBe(true)
    await initial.toolbar.getByRole('button', { name: '画笔', exact: true }).click()
    await draw(initial.overlay, 230, 170)
    await draw(initial.overlay, 270, 260)
    await expect(initial.overlay.locator('[data-stroke-id]')).toHaveCount(2)
    await expect
      .poll(() =>
        initial.toolbar.evaluate(() =>
          window.mindnotesFloating!.getState().then((state) => state.saveState)
        )
      )
      .toBe('saved')
    await withNativeCaptureFixture(async (fixture) => {
      await initial.toolbar.getByRole('button', { name: '保存笔记', exact: true }).click()
      await expect(initial.toolbar.getByRole('status')).toContainText('笔记已保存在')
      const db = new DatabaseSync(path.join(initial.directory, 'screen-notes.sqlite'), {
        readOnly: true,
      })
      try {
        const row = db.prepare('SELECT document,image FROM notes').get()!
        const note = JSON.parse(String(row.document))
        const image = PNG.sync.read(Buffer.from(row.image as Uint8Array))
        expect({ width: note.width, height: note.height }).toEqual({
          width: secondary.bounds.width,
          height: secondary.bounds.height,
        })
        expect(note.source.display).toBe(secondary.label)
        expect(note.source.title).toBe('MindNotes capture fixture A')
        expect({ width: image.width, height: image.height }).toEqual({
          width: Math.ceil(secondary.bounds.width * secondary.scaleFactor),
          height: Math.ceil(secondary.bounds.height * secondary.scaleFactor),
        })
        const center =
          (Math.round(image.height / 2) * image.width + Math.round(image.width / 2)) * 4
        for (const channel of [0, 1, 2])
          expect(
            Math.abs(image.data[center + channel] - [25, 87, 147][channel])
          ).toBeLessThanOrEqual(3)
        for (const draft of db.prepare('SELECT display_id,document FROM drafts').all())
          savedDrafts.set(String(draft.display_id), JSON.parse(String(draft.document)).strokes)
        secondaryCapture = {
          width: image.width,
          height: image.height,
          source: note.source,
          nativeFixture: fixture.native,
          centerPixel: [...image.data.subarray(center, center + 4)],
        }
      } finally {
        db.close()
      }
    }, secondary.physical)
    await moveToolbar(initial.app, primary)
    await expect(initial.overlay.locator('[data-stroke-id]')).toHaveCount(1)
  } finally {
    try {
      await saveScreenInputTrace(initial.overlay, 'mixed-DPI-input-events.json')
    } finally {
      await initial.app.close()
    }
  }
  const reopened = await launch(initial.directory)
  try {
    await traceScreenInput(reopened.overlay)
    await moveToolbar(reopened.app, primary)
    await expect(reopened.overlay.locator('[data-stroke-id]')).toHaveCount(1)
    expect(
      await reopened.overlay.evaluate(() =>
        window.mindnotesScreen!.getState().then((state) => state.strokes)
      )
    ).toEqual(savedDrafts.get(String(primary.id)))
    await moveToolbar(reopened.app, secondary)
    await expect(reopened.overlay.locator('[data-stroke-id]')).toHaveCount(2)
    expect(
      await reopened.overlay.evaluate(() =>
        window.mindnotesScreen!.getState().then((state) => state.strokes)
      )
    ).toEqual(savedDrafts.get(String(secondary.id)))
  } finally {
    try {
      await saveScreenInputTrace(reopened.overlay, 'mixed-DPI-restart-input-events.json')
    } finally {
      await reopened.app.close()
    }
  }
  await writeFile(
    test.info().outputPath('mixed-DPI-evidence.json'),
    JSON.stringify(
      {
        status: 'passed',
        displays,
        secondaryCapture,
        primaryStrokes: 1,
        secondaryStrokes: 2,
        checks: [
          'display-local-ink',
          'toolbar-native-hit-after-display-switch',
          'switch-releases-input',
          'real-secondary-pixels-and-source',
          'capture-scaling',
          'both-drafts-exact-restart-recovery',
        ],
        simulatedDisplays: false,
      },
      null,
      2
    )
  )
})

async function openLibrary(app: ElectronApplication, toolbar: Page, overlay: Page): Promise<Page> {
  const existing = app
    .windows()
    .find((page) => page !== toolbar && page !== overlay && !page.url().startsWith('data:'))
  const opened = existing
    ? Promise.resolve(existing)
    : app.waitForEvent('window', {
        predicate: (page) =>
          page !== toolbar && page !== overlay && !page.url().startsWith('data:'),
      })
  await toolbar.getByRole('button', { name: '更多操作' }).click()
  await toolbar.getByRole('button', { name: '我的笔记', exact: true }).click()
  const workspace = await opened
  await expect(workspace.getByRole('region', { name: '统一笔记库' })).toBeVisible()
  return workspace
}

test('completed screen gestures recover after forced termination and cleared drafts stay cleared', async () => {
  const initial = await launch()
  let initialStopped = false
  try {
    await initial.toolbar.getByRole('button', { name: '画笔', exact: true }).click()
    await draw(initial.overlay, 100, 150)
    await draw(initial.overlay, 160, 260)
    await expect
      .poll(() =>
        initial.toolbar.evaluate(() =>
          window.mindnotesFloating!.getState().then((state) => state.saveState)
        )
      )
      .toBe('saved')
    await stopAbruptly(initial.app)
    initialStopped = true
  } finally {
    if (!initialStopped) await initial.app.close()
  }
  const reopened = await launch(initial.directory)
  try {
    await expect(reopened.overlay.locator('[data-stroke-id]')).toHaveCount(2)
    expect(await ignoresMouse(reopened.app)).toBe(true)
    await reopened.toolbar.getByRole('button', { name: '更多操作' }).click()
    await reopened.toolbar.getByRole('button', { name: '清空笔迹' }).click()
    await expect(reopened.overlay.locator('[data-stroke-id]')).toHaveCount(0)
    await expect
      .poll(() =>
        reopened.toolbar.evaluate(() =>
          window.mindnotesFloating!.getState().then((state) => state.saveState)
        )
      )
      .toBe('saved')
  } finally {
    await reopened.app.close()
  }
  const cleared = await launch(initial.directory)
  try {
    await expect(cleared.overlay.locator('[data-stroke-id]')).toHaveCount(0)
  } finally {
    await cleared.app.close()
  }
})

test('frozen screen recovers, Escape shows the live desktop, and draft backups can be restored', async () => {
  await withNativeCaptureFixture(async () => {
    const initial = await launch()
    let stopped = false
    try {
      await initial.toolbar.getByRole('button', { name: '画笔', exact: true }).click()
      await draw(initial.overlay, 140, 220)
      await initial.toolbar.getByRole('button', { name: '更多操作' }).click()
      await initial.toolbar.getByRole('button', { name: '冻结画面' }).click()
      await expect(initial.overlay.locator('image')).toHaveCount(1)
      await expect
        .poll(() =>
          initial.toolbar.evaluate(() =>
            window.mindnotesFloating!.getState().then((state) => state.saveState)
          )
        )
        .toBe('saved')
      await initial.overlay.keyboard.press('Escape')
      await expect.poll(async () => (await nativeState(initial.app)).overlay.visible).toBe(false)
      expect(await ignoresMouse(initial.app)).toBe(true)
      await initial.toolbar.getByRole('button', { name: '画笔', exact: true }).click()
      await expect.poll(async () => (await nativeState(initial.app)).overlay.visible).toBe(true)
      await stopAbruptly(initial.app)
      stopped = true
    } finally {
      if (!stopped) await initial.app.close()
    }
    const reopened = await launch(initial.directory)
    try {
      await expect(reopened.overlay.locator('image')).toHaveCount(1)
      await expect(reopened.overlay.locator('[data-stroke-id]')).toHaveCount(1)
      const backup = path.join(initial.directory, 'draft.json')
      await reopened.app.evaluate(({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath })
      }, backup)
      await reopened.toolbar.getByRole('button', { name: '更多操作' }).click()
      await reopened.toolbar.getByRole('button', { name: '备份草稿' }).click()
      await expect
        .poll(() => readFile(backup, 'utf8').catch(() => ''))
        .toContain('mindnotes-pro.screen-drafts')
      const saved = JSON.parse(await readFile(backup, 'utf8'))
      expect(saved.backgrounds).toHaveLength(1)
      await reopened.toolbar.getByRole('button', { name: '清空笔迹' }).click()
      await reopened.toolbar.getByRole('button', { name: '返回实时画面' }).click()
      await expect(reopened.overlay.locator('image')).toHaveCount(0)
      await reopened.app.evaluate(({ dialog }, filePath) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] })
      }, backup)
      await reopened.toolbar.getByRole('button', { name: '恢复草稿' }).click()
      await expect(reopened.overlay.locator('image')).toHaveCount(1)
      await expect(reopened.overlay.locator('[data-stroke-id]')).toHaveCount(1)
    } finally {
      await reopened.app.close()
    }
  })
})

test('native screen changes preserve frozen pixels and source while live snapshots follow the desktop', async () => {
  await withNativeCaptureFixture(async (fixture) => {
    const { app, toolbar, overlay, directory } = await launch()
    const connection = new DatabaseSync(path.join(directory, 'screen-notes.sqlite'), {
      readOnly: true,
    })
    const expectedA = [25, 87, 147, 255]
    const expectedB = [46, 151, 81, 255]
    const records: { stage: string; source: unknown; referencePixel: number[] }[] = []
    try {
      const display = await nativeState(app)
      const pixel = (image: PNG, x: number, y: number) => {
        const offset = (Math.round(y) * image.width + Math.round(x)) * 4
        return [...image.data.subarray(offset, offset + 4)]
      }
      const expectColor = (actual: number[], expected: number[]) => {
        // The Windows capture compositor may apply a small color conversion.
        for (const channel of [0, 1, 2])
          expect(Math.abs(actual[channel] - expected[channel])).toBeLessThanOrEqual(3)
        expect(actual[3]).toBe(255)
      }
      const latest = () => {
        const row = connection
          .prepare('SELECT document,image FROM notes ORDER BY created_at DESC LIMIT 1')
          .get()!
        const note = JSON.parse(String(row.document))
        const image = PNG.sync.read(Buffer.from(row.image as Uint8Array))
        return { note, image }
      }
      const snapshot = async (stage: string, expected: number[], title: string) => {
        const previousCount = Number(
          connection.prepare('SELECT COUNT(*) AS count FROM notes').get()!.count
        )
        await toolbar.getByRole('button', { name: '保存笔记', exact: true }).click()
        await expect
          .poll(() =>
            Number(connection.prepare('SELECT COUNT(*) AS count FROM notes').get()!.count)
          )
          .toBe(previousCount + 1)
        const saved = latest()
        const referencePixel = pixel(saved.image, saved.image.width / 2, saved.image.height / 2)
        expectColor(referencePixel, expected)
        expect(saved.note.source.title).toBe(title)
        expect(saved.note.source.app.toLowerCase()).toBe('powershell')
        expect(saved.note.strokes).toHaveLength(1)
        // The raw snapshot excludes both original ink and the toolbar footprint.
        expectColor(
          pixel(
            saved.image,
            (230 * saved.image.width) / display.display.width,
            (125 * saved.image.height) / display.display.height
          ),
          expected
        )
        expectColor(
          pixel(
            saved.image,
            ((display.toolbar.bounds.x - display.display.x + 80) * saved.image.width) /
              display.display.width,
            ((display.toolbar.bounds.y - display.display.y + display.toolbar.bounds.height - 90) *
              saved.image.height) /
              display.display.height
          ),
          expected
        )
        records.push({ stage, source: saved.note.source, referencePixel })
        return saved
      }
      await toolbar.getByRole('button', { name: '画笔', exact: true }).click()
      await draw(overlay, 140, 120)
      await snapshot('live-A', expectedA, 'MindNotes capture fixture A')
      await toolbar.getByRole('button', { name: '更多操作' }).click()
      await toolbar.getByRole('button', { name: '冻结画面' }).click()
      await expect(overlay.locator('image')).toHaveCount(1)
      await expect
        .poll(() =>
          toolbar.evaluate(() =>
            window.mindnotesFloating!.getState().then((state) => state.saveState)
          )
        )
        .toBe('saved')
      const frozenA = await overlay.evaluate(() =>
        window.mindnotesScreen!.getState().then((state) => state.background)
      )
      await fixture.changeToB()
      await overlay.keyboard.press('Escape')
      await expect.poll(async () => (await nativeState(app)).overlay.visible).toBe(false)
      const livePixel = await app.evaluate(async ({ desktopCapturer, screen }) => {
        const display = screen.getPrimaryDisplay()
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: {
            width: Math.ceil(display.bounds.width * display.scaleFactor),
            height: Math.ceil(display.bounds.height * display.scaleFactor),
          },
        })
        const image = sources.find((source) => source.display_id === String(display.id))!.thumbnail
        const size = image.getSize()
        return [
          ...image
            .crop({
              x: Math.round(size.width / 2),
              y: Math.round(size.height / 2),
              width: 1,
              height: 1,
            })
            .toBitmap(),
        ]
      })
      expectColor(livePixel, [81, 151, 46, 255]) // Electron bitmap is BGRA.
      await toolbar.getByRole('button', { name: '画笔', exact: true }).click()
      expect(
        await overlay.evaluate(() =>
          window.mindnotesScreen!.getState().then((state) => state.background)
        )
      ).toBe(frozenA)
      await snapshot('frozen-A-over-live-B', expectedA, 'MindNotes capture fixture A')
      await toolbar.getByRole('button', { name: '更多操作' }).click()
      await toolbar.getByRole('button', { name: '返回实时画面' }).click()
      await expect(overlay.locator('image')).toHaveCount(0)
      await snapshot('live-B', expectedB, 'MindNotes capture fixture B')
      const workspace = await openLibrary(app, toolbar, overlay)
      await workspace
        .getByRole('button', { name: '打开屏幕笔记 MindNotes capture fixture B', exact: true })
        .click()
      const target = path.join(directory, 'native-live-B.png')
      await app.evaluate(({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath })
      }, target)
      await workspace.getByRole('button', { name: '导出 PNG', exact: true }).click()
      await expect
        .poll(() =>
          readFile(target)
            .then((bytes) => bytes.length)
            .catch(() => 0)
        )
        .toBeGreaterThan(0)
      const composed = PNG.sync.read(await readFile(target))
      const raw = latest().image
      expect({ width: composed.width, height: composed.height }).toEqual({
        width: raw.width,
        height: raw.height,
      })
      const inkPixel = pixel(
        composed,
        (230 * composed.width) / display.display.width,
        (125 * composed.height) / display.display.height
      )
      expectColor(inkPixel, [224, 93, 82, 255])
      expectColor(pixel(composed, composed.width / 2, composed.height / 2), expectedB)
      await writeFile(
        test.info().outputPath('native-capture-evidence.json'),
        JSON.stringify(
          {
            status: 'passed',
            fixture:
              'native per-monitor-aware Win32 window, actual desktopCapturer; no screenshot mock',
            display: display.display,
            records,
            export: { width: composed.width, height: composed.height, inkPixel },
            checks: [
              'underlying-A-source',
              'raw-pixels-exclude-ink-and-toolbar',
              'native-desktop-changes-to-B',
              'frozen-A-background-and-source-preserved',
              'live-B-background-and-source',
              'PNG-size-and-DIP-ink-coordinates',
            ],
          },
          null,
          2
        )
      )
    } finally {
      connection.close()
      await app.close()
    }
  })
})

test('screen notes stay editable, fast changes survive native close, and backups preserve newer edits', async () => {
  const initial = await launch()
  let stopped = false
  try {
    await seedScreenNote(initial.app)
    const workspace = await openLibrary(initial.app, initial.toolbar, initial.overlay)
    await workspace.getByRole('button', { name: /^打开屏幕笔记/ }).click()
    await workspace.getByRole('textbox', { name: '屏幕笔记标题' }).fill('课程复盘')
    await workspace
      .getByRole('textbox', { name: '屏幕笔记结论' })
      .pressSequentially('meeting conclusion', { delay: 0 })
    const stage = await workspace.locator('.screen-note-stage svg').boundingBox()
    await workspace.mouse.move(stage!.x + 40, stage!.y + 80)
    await workspace.mouse.down()
    await workspace.mouse.move(stage!.x + 150, stage!.y + 90, { steps: 12 })
    await workspace.mouse.up()
    await expect(workspace.locator('[data-stroke-id]')).toHaveCount(2)
    await workspace.getByRole('button', { name: '撤销笔记笔迹' }).click()
    await expect(workspace.locator('[data-stroke-id]')).toHaveCount(1)
    await workspace.getByRole('button', { name: '重做笔记笔迹' }).click()
    await expect(workspace.locator('[data-stroke-id]')).toHaveCount(2)
    await workspace
      .getByRole('textbox', { name: '屏幕笔记结论' })
      .fill('刚写完就关闭，结论与两条笔迹必须保存。')
    await initial.app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((window) => !window.webContents.getURL().includes('surface='))!
        .close()
    )
    await expect.poll(async () => (await nativeState(initial.app)).toolbar.visible).toBe(true)
    await expect(initial.toolbar.getByRole('button', { name: '展开悬浮批注' })).toBeVisible()
    await initial.toolbar.getByRole('button', { name: '展开悬浮批注' }).click()
    await initial.toolbar.getByRole('button', { name: '更多操作' }).click()
    await Promise.all([
      initial.app.waitForEvent('close'),
      initial.toolbar.getByRole('button', { name: '退出 MindNotes Pro' }).click(),
    ])
    stopped = true
  } finally {
    if (!stopped) await initial.app.close()
  }
  const reopened = await launch(initial.directory)
  try {
    const workspace = await openLibrary(reopened.app, reopened.toolbar, reopened.overlay)
    await workspace.getByRole('textbox', { name: '搜索全部笔记' }).fill('刚写完就关闭')
    await expect(workspace.getByRole('button', { name: '打开屏幕笔记 课程复盘' })).toHaveCount(1)
    await workspace.getByRole('button', { name: '打开屏幕笔记 课程复盘' }).click()
    await expect(workspace.getByRole('textbox', { name: '屏幕笔记结论' })).toHaveValue(
      '刚写完就关闭，结论与两条笔迹必须保存。'
    )
    await expect(workspace.locator('[data-stroke-id]')).toHaveCount(2)
    const backup = path.join(initial.directory, 'screen-backup.json')
    await reopened.app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, backup)
    await workspace.getByRole('button', { name: '可编辑备份', exact: true }).click()
    await expect
      .poll(() => readFile(backup, 'utf8').catch(() => ''))
      .toContain('mindnotes-pro.screen-notes')
    await workspace.getByRole('textbox', { name: '屏幕笔记结论' }).fill('较新的本地修改')
    await workspace.getByRole('button', { name: '返回笔记' }).click()
    await workspace.getByRole('textbox', { name: '搜索全部笔记' }).fill('')
    await reopened.app.evaluate(({ dialog }, filePath) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] })
    }, backup)
    await workspace.getByText('备份与恢复', { exact: true }).click()
    await workspace.getByRole('button', { name: '导入屏幕备份' }).click()
    await expect(workspace.getByRole('alert')).toContainText('已导入 0 条')
    const damagedBackup = path.join(initial.directory, 'screen-backup-truncated.json')
    await writeFile(damagedBackup, (await readFile(backup, 'utf8')).slice(0, -1))
    await reopened.app.evaluate(({ dialog }, filePath) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] })
    }, damagedBackup)
    await workspace.getByRole('button', { name: '导入屏幕备份' }).click()
    await expect(workspace.getByRole('alert')).toContainText(
      '备份文件不完整或格式损坏，请重新导出后再导入。'
    )
    await expect(workspace.getByRole('button', { name: '打开屏幕笔记 课程复盘' })).toHaveCount(1)
    await workspace.getByRole('button', { name: '打开屏幕笔记 课程复盘' }).click()
    await expect(workspace.getByRole('textbox', { name: '屏幕笔记结论' })).toHaveValue(
      '较新的本地修改'
    )
    await workspace.getByRole('button', { name: '返回笔记' }).click()
    await workspace.getByRole('button', { name: '移到回收站 课程复盘' }).click()
    await workspace.getByRole('button', { name: '回收站', exact: true }).click()
    await expect(workspace.getByRole('button', { name: '打开屏幕笔记 课程复盘' })).toHaveCount(1)
    await workspace.getByRole('button', { name: '恢复屏幕笔记 课程复盘' }).click()
    await workspace.getByRole('button', { name: '全部', exact: true }).click()
    await expect(workspace.getByRole('button', { name: '打开屏幕笔记 课程复盘' })).toHaveCount(1)
  } finally {
    await reopened.app.close()
  }
})

test('storage failure keeps screen ink, blocks unsafe exit and retries without losing a gesture', async () => {
  const { app, toolbar, overlay, directory } = await launch()
  const connection = new DatabaseSync(path.join(directory, 'screen-notes.sqlite'))
  try {
    connection.exec(
      "CREATE TRIGGER reject_draft BEFORE INSERT ON drafts BEGIN SELECT RAISE(ABORT, 'storage failure fixture'); END"
    )
    await toolbar.getByRole('button', { name: '画笔', exact: true }).click()
    await draw(overlay, 150, 200)
    await expect(overlay.locator('[data-stroke-id]')).toHaveCount(1)
    await expect(toolbar.getByRole('status')).toContainText('自动保存失败')
    const retryBounds = await toolbar.getByRole('button', { name: '重试自动保存' }).boundingBox()
    expect(retryBounds!.width).toBeGreaterThanOrEqual(44)
    expect(retryBounds!.height).toBeGreaterThanOrEqual(44)
    expect(await ignoresMouse(app)).toBe(true)
    await toolbar.getByRole('button', { name: '更多操作' }).click()
    await toolbar.getByRole('button', { name: '退出 MindNotes Pro' }).click()
    await expect(toolbar.getByRole('status')).toContainText('退出已取消')
    expect(app.process().exitCode).toBeNull()
    await expect(overlay.locator('[data-stroke-id]')).toHaveCount(1)
    connection.exec('DROP TRIGGER reject_draft')
    await toolbar.getByRole('button', { name: '重试自动保存' }).click()
    await expect
      .poll(() =>
        toolbar.evaluate(() =>
          window.mindnotesFloating!.getState().then((state) => state.saveState)
        )
      )
      .toBe('saved')
    const row = connection.prepare('SELECT document FROM drafts').get()
    expect(JSON.parse(String(row!.document)).strokes).toHaveLength(1)
  } finally {
    connection.exec('DROP TRIGGER IF EXISTS reject_draft')
    connection.close()
    await app.close()
  }
})

test('a failed screen note edit stays visible across close attempts and saves completely on retry', async () => {
  const { app, toolbar, overlay, directory } = await launch()
  const connection = new DatabaseSync(path.join(directory, 'screen-notes.sqlite'))
  try {
    await seedScreenNote(app)
    const workspace = await openLibrary(app, toolbar, overlay)
    await workspace.getByRole('button', { name: /^打开屏幕笔记/ }).click()
    connection.exec(
      "CREATE TRIGGER reject_note_edit BEFORE UPDATE ON notes BEGIN SELECT RAISE(ABORT, 'storage failure fixture'); END"
    )
    await workspace.getByRole('textbox', { name: '屏幕笔记标题' }).fill('保存失败也不能丢')
    await workspace.getByRole('textbox', { name: '屏幕笔记结论' }).fill('保留这次修改')
    await expect(workspace.getByRole('status', { name: '屏幕笔记保存状态' })).toContainText(
      '保存失败'
    )
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((window) => !window.webContents.getURL().includes('surface='))!
        .close()
    )
    await expect(workspace.getByRole('textbox', { name: '屏幕笔记结论' })).toBeVisible()
    await expect(workspace.getByRole('textbox', { name: '屏幕笔记结论' })).toHaveValue(
      '保留这次修改'
    )
    await expect(workspace.getByRole('alert').last()).toContainText('尚未保存')
    const recoveryFile = path.join(directory, 'unsaved-recovery.json')
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, recoveryFile)
    await workspace.getByRole('button', { name: '当前修改备份' }).click()
    await expect
      .poll(() => readFile(recoveryFile, 'utf8').catch(() => ''))
      .toContain('保留这次修改')
    connection.exec('DROP TRIGGER reject_note_edit')
    await workspace.getByRole('button', { name: '重试保存' }).click()
    await expect(workspace.getByRole('status', { name: '屏幕笔记保存状态' })).toContainText(
      '已保存'
    )
    await workspace.getByRole('button', { name: '返回笔记' }).click()
    await expect(
      workspace.getByRole('button', { name: '打开屏幕笔记 保存失败也不能丢' })
    ).toHaveCount(1)
    const row = connection.prepare('SELECT document FROM notes').get()
    expect(JSON.parse(String(row!.document))).toMatchObject({
      title: '保存失败也不能丢',
      comment: '保留这次修改',
    })
  } finally {
    connection.exec('DROP TRIGGER IF EXISTS reject_note_edit')
    connection.close()
    await app.close()
  }
})

test('maximum-size note typing stays responsive, saves small patches and preserves geometry', async () => {
  const { app, toolbar, overlay, directory } = await launch()
  const connection = new DatabaseSync(path.join(directory, 'screen-notes.sqlite'))
  try {
    await seedScreenNote(app, { maximum: true, title: '大笔记性能验收' })
    const workspace = await openLibrary(app, toolbar, overlay)
    await workspace.getByRole('button', { name: '打开屏幕笔记 大笔记性能验收' }).click()
    await expect(workspace.locator('[data-stroke-id]')).toHaveCount(1000)
    await app.evaluate(({ ipcMain }) => {
      const handlers = ipcMain as unknown as {
        _invokeHandlers: Map<
          string,
          (
            event: Electron.IpcMainInvokeEvent,
            id: string,
            patch: { comment?: string; strokes?: unknown[] }
          ) => Promise<unknown>
        >
      }
      const original = handlers._invokeHandlers.get('notebook:update')!
      const metrics = { calls: 0, strokes: 0 }
      Object.assign(globalThis, { notePerformance: metrics })
      ipcMain.removeHandler('notebook:update')
      ipcMain.handle('notebook:update', (event, id: string, patch) => {
        metrics.calls += 1
        metrics.strokes += patch.strokes?.length ?? 0
        return original(event, id, patch)
      })
    })
    const comment =
      'This editable screen note must save quickly while writing a meeting conclusion.'
    const started = performance.now()
    await workspace
      .getByRole('textbox', { name: '屏幕笔记结论' })
      .pressSequentially(comment, { delay: 0 })
    const typingMs = performance.now() - started
    await expect(workspace.getByRole('status', { name: '屏幕笔记保存状态' })).toHaveText('已保存')
    const typingAndSaveMs = performance.now() - started
    const metrics = await app.evaluate(({ app }) => ({
      version: app.getVersion(),
      electron: process.versions.electron,
      saves: (globalThis as unknown as { notePerformance: { calls: number; strokes: number } })
        .notePerformance,
      processes: app.getAppMetrics().map((metric) => ({
        type: metric.type,
        workingSetKB: metric.memory.workingSetSize,
      })),
    }))
    await test.info().attach('maximum-note-performance.json', {
      body: JSON.stringify({ typingMs, typingAndSaveMs, ...metrics }, null, 2),
      contentType: 'application/json',
    })
    await writeFile(
      test.info().outputPath('maximum-note-performance.json'),
      JSON.stringify({ typingMs, typingAndSaveMs, ...metrics }, null, 2)
    )
    // Generous timing limits distinguish a regression from ordinary slower hardware.
    expect(typingMs).toBeLessThan(2500)
    expect(typingAndSaveMs).toBeLessThan(5000)
    expect(metrics.saves.calls).toBeLessThan(15)
    expect(metrics.saves.strokes).toBe(0)
    const row = connection.prepare("SELECT document FROM notes WHERE id='fixture_note'").get()!
    const saved = JSON.parse(String(row.document))
    expect(saved.comment).toBe(comment)
    expect(saved.strokes).toHaveLength(1000)
    expect(
      saved.strokes.reduce(
        (count: number, stroke: { points: unknown[] }) => count + stroke.points.length,
        0
      )
    ).toBe(160_000)
    await workspace.getByRole('button', { name: '返回笔记' }).click()
    await workspace.getByRole('textbox', { name: '搜索全部笔记' }).fill('meeting conclusion')
    await expect(
      workspace.getByRole('button', { name: '打开屏幕笔记 大笔记性能验收' })
    ).toHaveCount(1)
  } finally {
    connection.close()
    await app.close()
  }
})

test('permanent storage failure offers recoverable export and explicit abnormal exit', async () => {
  const { app, toolbar, overlay, directory } = await launch()
  const connection = new DatabaseSync(path.join(directory, 'screen-notes.sqlite'))
  let closed = false
  try {
    connection.exec(
      "CREATE TRIGGER reject_draft BEFORE INSERT ON drafts BEGIN SELECT RAISE(ABORT, 'permanent failure fixture'); END"
    )
    await toolbar.getByRole('button', { name: '画笔', exact: true }).click()
    await draw(overlay, 150, 200)
    await expect(toolbar.getByRole('status')).toContainText('自动保存失败')
    const backup = path.join(directory, 'unsaved-draft.json')
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, backup)
    await toolbar.getByRole('button', { name: '更多操作' }).click()
    await toolbar.getByRole('button', { name: '备份草稿' }).click()
    await expect
      .poll(() => readFile(backup, 'utf8').catch(() => ''))
      .toContain('mindnotes-pro.screen-drafts')
    expect(JSON.parse(await readFile(backup, 'utf8')).drafts[0].strokes).toHaveLength(1)
    await app.evaluate(({ dialog }) => {
      dialog.showMessageBox = async () => ({ response: 0, checkboxChecked: false })
    })
    await toolbar.getByRole('button', { name: '异常退出' }).click()
    await expect(toolbar.getByRole('toolbar', { name: '悬浮批注工具条' })).toBeVisible()
    await app.evaluate(({ dialog }) => {
      dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false })
    })
    await Promise.all([
      app.waitForEvent('close'),
      toolbar.getByRole('button', { name: '异常退出' }).click(),
    ])
    closed = true
  } finally {
    connection.exec('DROP TRIGGER IF EXISTS reject_draft')
    connection.close()
    if (!closed) await app.close()
  }
})

test('closing the native ink layer exits both floating windows', async () => {
  const { app, toolbar } = await launch()
  let closed = false
  try {
    await toolbar.getByRole('button', { name: '画笔', exact: true }).click()
    await Promise.all([
      app.waitForEvent('close'),
      app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()
          .find((window) => window.webContents.getURL().includes('surface=screen'))!
          .close()
      }),
    ])
    closed = true
  } finally {
    if (!closed) await app.close()
  }
})
