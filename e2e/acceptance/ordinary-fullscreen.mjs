import { _electron as electron, chromium, expect } from '@playwright/test'
import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { PNG } from 'pngjs'

const execute = promisify(execFile)
const executable = process.env.MINDNOTES_EXECUTABLE
const version = JSON.parse(await readFile('package.json', 'utf8')).version
const releaseLabel = version.replace(/^6\.0\.0-beta\./, 'beta')
if (!executable) throw new Error('Set MINDNOTES_EXECUTABLE to the packaged app before acceptance.')
const chromeExecutable =
  process.env.MINDNOTES_CHROME_EXECUTABLE ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-fullscreen-'))
const title = 'MindNotes ordinary fullscreen acceptance'
const server = createServer((_request, response) => {
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.end(
    `<!doctype html><html><head><title>${title}</title><style>html,body{margin:0;width:100%;height:100%;background:rgb(25,87,147);color:white;font:24px system-ui}main{padding:50px}button{font:inherit;padding:20px}</style></head><body><main><h1>Ordinary Chrome fullscreen</h1><button id="underlying">Underlying software</button></main></body></html>`
  )
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const url = `http://127.0.0.1:${server.address().port}`
let chromeContext
let app
const result = {
  version,
  executable,
  chromeExecutable,
  at: new Date().toISOString(),
  directory,
  scope:
    'Installed Chrome in an isolated profile, ordinary OS fullscreen; native hit-testing and actual desktopCapturer pixels. No exclusive fullscreen or secure desktop.',
}

async function activateFixtureChrome() {
  const script = `[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);Add-Type -TypeDefinition 'using System; using System.Text; using System.Runtime.InteropServices;
public static class MindNotesFullscreenActivation {
  public delegate bool Visitor(IntPtr window, IntPtr parameter);
  [DllImport("user32.dll")] public static extern bool EnumWindows(Visitor visitor,IntPtr parameter);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr window,StringBuilder text,int length);
  [DllImport("user32.dll",SetLastError=true)] public static extern bool SetWindowPos(IntPtr window,IntPtr after,int x,int y,int width,int height,uint flags);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
  public static long Activate() {
    long found=0;
    EnumWindows((window,parameter)=>{var text=new StringBuilder(512);GetWindowText(window,text,512);
      if(text.ToString().Contains("MindNotes ordinary fullscreen acceptance")) {
        found=window.ToInt64();if(!SetWindowPos(window,new IntPtr(0),0,0,0,0,0x43))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());SetForegroundWindow(window);return false;
      }return true;},IntPtr.Zero);return found;
  }
}';[MindNotesFullscreenActivation]::Activate()`
  const output = await execute(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { windowsHide: true }
  )
  const handle = output.stdout.trim()
  if (!handle || handle === '0')
    throw new Error('The isolated Chrome test window is not available.')
  return handle
}

async function fixtureWindowInfo(handle) {
  const script = `[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;
public static class MindNotesFullscreenWindowInfo {
  [StructLayout(LayoutKind.Sequential)] public struct Rect {public int left,top,right,bottom;}
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr window,out Rect rect);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr window);
  [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window,out uint pid);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr window,uint attribute,out uint value,uint size);
  [DllImport("user32.dll",EntryPoint="GetWindowLongW")] public static extern int GetWindowLong(IntPtr window,int index);
  [DllImport("gdi32.dll")] public static extern IntPtr CreateRectRgn(int left,int top,int right,int bottom);
  [DllImport("user32.dll")] public static extern int GetWindowRgn(IntPtr window,IntPtr region);
  [DllImport("gdi32.dll")] public static extern int GetRgnBox(IntPtr region,out Rect rect);
  [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr value);
}';[void][MindNotesFullscreenWindowInfo]::SetThreadDpiAwarenessContext([IntPtr]::new(-4));$qaWindow=[IntPtr]::new([long]${handle});$qaRect=New-Object MindNotesFullscreenWindowInfo+Rect
[void][MindNotesFullscreenWindowInfo]::GetWindowRect($qaWindow,[ref]$qaRect)
$qaProcessId=0;[void][MindNotesFullscreenWindowInfo]::GetWindowThreadProcessId($qaWindow,[ref]$qaProcessId);$qaCloaked=[uint32]0;[void][MindNotesFullscreenWindowInfo]::DwmGetWindowAttribute($qaWindow,14,[ref]$qaCloaked,4)
$qaRegion=[MindNotesFullscreenWindowInfo]::CreateRectRgn(0,0,0,0);$qaRegionType=[MindNotesFullscreenWindowInfo]::GetWindowRgn($qaWindow,$qaRegion);$qaRegionBounds=New-Object MindNotesFullscreenWindowInfo+Rect;[void][MindNotesFullscreenWindowInfo]::GetRgnBox($qaRegion,[ref]$qaRegionBounds);[void][MindNotesFullscreenWindowInfo]::DeleteObject($qaRegion)
@{bounds=@{left=$qaRect.left;top=$qaRect.top;right=$qaRect.right;bottom=$qaRect.bottom};visible=[MindNotesFullscreenWindowInfo]::IsWindowVisible($qaWindow);minimized=[MindNotesFullscreenWindowInfo]::IsIconic($qaWindow);extendedStyle=[MindNotesFullscreenWindowInfo]::GetWindowLong($qaWindow,-20);pid=$qaProcessId;cloaked=$qaCloaked;region=@{type=$qaRegionType;left=$qaRegionBounds.left;top=$qaRegionBounds.top;right=$qaRegionBounds.right;bottom=$qaRegionBounds.bottom}}|ConvertTo-Json -Compress`
  const output = await execute(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { windowsHide: true }
  )
  return JSON.parse(output.stdout)
}

async function nativeHit(point) {
  const script = `[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);Add-Type -TypeDefinition 'using System; using System.Text; using System.Runtime.InteropServices;
public static class MindNotesFullscreenHit {
  [StructLayout(LayoutKind.Sequential)] public struct Point { public int x,y; }
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int left,top,right,bottom; }
  [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(Point point);
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr window,uint flags);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window,out uint pid);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr window,out Rect rect);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr window,StringBuilder text,int length);
}';
[void][MindNotesFullscreenHit]::SetThreadDpiAwarenessContext([IntPtr]::new(-4))
$qaPoint=New-Object MindNotesFullscreenHit+Point
$qaPoint.x=${Math.round(point.x)};$qaPoint.y=${Math.round(point.y)}
$qaWindow=[MindNotesFullscreenHit]::GetAncestor([MindNotesFullscreenHit]::WindowFromPoint($qaPoint),2)
$qaProcessId=0;[void][MindNotesFullscreenHit]::GetWindowThreadProcessId($qaWindow,[ref]$qaProcessId)
$qaRect=New-Object MindNotesFullscreenHit+Rect;[void][MindNotesFullscreenHit]::GetWindowRect($qaWindow,[ref]$qaRect)
$qaTitle=New-Object System.Text.StringBuilder 512;[void][MindNotesFullscreenHit]::GetWindowText($qaWindow,$qaTitle,512)
@{handle=$qaWindow.ToInt64().ToString();app=(Get-Process -Id $qaProcessId).ProcessName;title=$qaTitle.ToString();bounds=@{left=$qaRect.left;top=$qaRect.top;right=$qaRect.right;bottom=$qaRect.bottom}}|ConvertTo-Json -Compress`
  const output = await execute(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { windowsHide: true }
  )
  return JSON.parse(output.stdout)
}

async function screenPixels(points) {
  const capture = await app.evaluate(async ({ BrowserWindow, screen, desktopCapturer }, points) => {
    const toolbar = BrowserWindow.getAllWindows().find((window) =>
      window.webContents.getURL().includes('surface=toolbar')
    )
    const display = screen.getDisplayMatching(toolbar.getBounds())
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.ceil(display.bounds.width * display.scaleFactor),
        height: Math.ceil(display.bounds.height * display.scaleFactor),
      },
    })
    const image = sources.find((source) => source.display_id === String(display.id)).thumbnail
    const bitmap = image.toBitmap(),
      size = image.getSize()
    return {
      size,
      pixels: points.map((point) => {
        const x = Math.round((point.x * size.width) / display.bounds.width)
        const y = Math.round((point.y * size.height) / display.bounds.height)
        return [...bitmap.subarray((y * size.width + x) * 4, (y * size.width + x) * 4 + 4)]
      }),
    }
  }, points)
  return capture
}

try {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !['ELECTRON_RUN_AS_NODE', 'MINDNOTES_START_WORKSPACE'].includes(key)
    )
  )
  app = await electron.launch({
    executablePath: executable,
    args: [],
    env: { ...env, MINDNOTES_USER_DATA_DIR: path.join(directory, 'notes') },
  })
  await expect.poll(() => app.windows().length).toBe(2)
  const targetDisplay = await app.evaluate(({ screen }, useSecondary) => {
    const primary = screen.getPrimaryDisplay()
    const display =
      (useSecondary && screen.getAllDisplays().find((item) => item.id !== primary.id)) || primary
    return {
      id: display.id,
      label: display.label,
      bounds: display.bounds,
      workArea: display.workArea,
      physical: screen.dipToScreenRect(null, display.bounds),
    }
  }, process.env.MINDNOTES_FULLSCREEN_SECONDARY === '1')
  result.targetDisplay = targetDisplay
  chromeContext = await chromium.launchPersistentContext(path.join(directory, 'chrome'), {
    executablePath: chromeExecutable,
    headless: false,
    viewport: null,
    args: ['--no-first-run', '--no-default-browser-check'],
  })
  const webpage = chromeContext.pages()[0]
  await webpage.goto(url)
  const cdp = await chromeContext.newCDPSession(webpage)
  const chromeWindow = await cdp.send('Browser.getWindowForTarget')
  await cdp.send('Browser.setWindowBounds', {
    windowId: chromeWindow.windowId,
    bounds: { windowState: 'normal' },
  })
  // CDP positions are in physical pixels on this Windows Chrome runtime. Native
  // bounds below must still confirm that it reached the selected real display.
  await cdp.send('Browser.setWindowBounds', {
    windowId: chromeWindow.windowId,
    bounds: {
      left: targetDisplay.physical.x + 40,
      top: targetDisplay.physical.y + 40,
      width: 1100,
      height: 800,
    },
  })
  await cdp.send('Browser.setWindowBounds', {
    windowId: chromeWindow.windowId,
    bounds: { windowState: 'fullscreen' },
  })
  await expect
    .poll(
      async () =>
        (await cdp.send('Browser.getWindowBounds', { windowId: chromeWindow.windowId })).bounds
          .windowState
    )
    .toBe('fullscreen')
  await webpage.bringToFront()
  result.chromeNativeHandle = await activateFixtureChrome()
  result.fixtureTopmost = false
  result.chromeBeforeApp = await fixtureWindowInfo(result.chromeNativeHandle)
  const toolbar = app.windows().find((page) => page.url().includes('surface=toolbar'))
  const overlay = app.windows().find((page) => page.url().includes('surface=screen'))
  await toolbar.getByRole('button', { name: '展开悬浮批注' }).click()
  await app.evaluate(({ BrowserWindow }, area) => {
    const toolbar = BrowserWindow.getAllWindows().find((window) =>
      window.webContents.getURL().includes('surface=toolbar')
    )
    toolbar.setPosition(area.x + 40, area.y + area.height - toolbar.getBounds().height - 40)
  }, targetDisplay.workArea)
  await expect
    .poll(() =>
      app.evaluate(
        ({ BrowserWindow, screen }) =>
          screen.getDisplayMatching(
            BrowserWindow.getAllWindows()
              .find((window) => window.webContents.getURL().includes('surface=toolbar'))
              .getBounds()
          ).id
      )
    )
    .toBe(targetDisplay.id)
  const state = await app.evaluate(({ BrowserWindow, screen }) => {
    const windows = BrowserWindow.getAllWindows()
    const toolbar = windows.find((window) =>
      window.webContents.getURL().includes('surface=toolbar')
    )
    const overlay = windows.find((window) => window.webContents.getURL().includes('surface=screen'))
    const display = screen.getDisplayMatching(toolbar.getBounds())
    return {
      display: {
        bounds: display.bounds,
        scale: display.scaleFactor,
        physical: screen.dipToScreenRect(null, display.bounds),
      },
      inkHandle: overlay.getNativeWindowHandle().readBigUInt64LE().toString(),
      toolbarHandle: toolbar.getNativeWindowHandle().readBigUInt64LE().toString(),
      toolbar: toolbar.getBounds(),
      physicalInkPoint: screen.dipToScreenPoint({
        x: display.bounds.x + 230,
        y: display.bounds.y + 145,
      }),
      physicalToolbarPoint: screen.dipToScreenPoint({
        x: toolbar.getBounds().x + 50,
        y: toolbar.getBounds().y + toolbar.getBounds().height - 87,
      }),
      physicalCenter: screen.dipToScreenPoint({
        x: display.bounds.x + Math.round(display.bounds.width / 2),
        y: display.bounds.y + Math.round(display.bounds.height / 2),
      }),
    }
  })
  result.window = state
  result.chromeBounds = (
    await cdp.send('Browser.getWindowBounds', { windowId: chromeWindow.windowId })
  ).bounds
  // App startup can change the native z order even though its toolbar is
  // nonactivating. Put only this isolated Chrome window back in the foreground.
  await activateFixtureChrome()
  result.chromeNativeState = await fixtureWindowInfo(result.chromeNativeHandle)
  result.toolbarNativeState = await fixtureWindowInfo(state.toolbarHandle)
  result.toolbarLayout = await toolbar.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    scale: devicePixelRatio,
    bounds: document.querySelector('.floating-toolbar').getBoundingClientRect().toJSON(),
  }))
  await expect.poll(async () => (await nativeHit(state.physicalInkPoint)).title).toContain(title)
  result.pointerBeforeInk = await nativeHit(state.physicalInkPoint)
  expect(result.pointerBeforeInk.app).toBe('chrome')
  const physical = state.display.physical
  expect(result.pointerBeforeInk.bounds.left).toBe(physical.x)
  expect(result.pointerBeforeInk.bounds.top).toBe(physical.y)
  expect(
    Math.abs(result.pointerBeforeInk.bounds.right - (physical.x + physical.width))
  ).toBeLessThanOrEqual(2)
  expect(
    Math.abs(result.pointerBeforeInk.bounds.bottom - (physical.y + physical.height))
  ).toBeLessThanOrEqual(2)
  result.toolbarHit = await nativeHit(state.physicalToolbarPoint)
  expect(result.toolbarHit.handle).toBe(state.toolbarHandle)
  result.pageStyle = await webpage.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    html: getComputedStyle(document.documentElement).backgroundColor,
    body: getComputedStyle(document.body).backgroundColor,
    hidden: document.hidden,
  }))
  result.baselinePixels = await screenPixels([{ x: 900, y: 600 }])
  result.baselineNativeCenter = await nativeHit(state.physicalCenter)
  await mkdir('tmp/qa', { recursive: true })
  await webpage.screenshot({ path: 'tmp/qa/ordinary-fullscreen-fixture.png' })
  await toolbar.getByRole('button', { name: '画笔', exact: true }).click()
  await overlay.mouse.move(140, 140)
  await overlay.mouse.down()
  await overlay.mouse.move(320, 150, { steps: 16 })
  await overlay.mouse.up()
  await expect(overlay.locator('[data-stroke-id]')).toHaveCount(1)
  result.inkHit = await nativeHit(state.physicalInkPoint)
  expect(result.inkHit.handle).toBe(state.inkHandle)
  await expect
    .poll(async () => (await screenPixels([{ x: 230, y: 145 }])).pixels[0][2])
    .toBeGreaterThan(180)
  result.liveInkPixels = await screenPixels([
    { x: 230, y: 145 },
    { x: 900, y: 600 },
  ])
  expect(result.liveInkPixels.pixels[1]).toEqual(result.baselinePixels.pixels[0])
  await toolbar.getByRole('button', { name: '橡皮', exact: true }).click()
  await overlay.mouse.move(230, 100)
  await overlay.mouse.down()
  await overlay.mouse.move(230, 200)
  await overlay.mouse.up()
  await expect(overlay.locator('[data-stroke-id]')).toHaveCount(0)
  await toolbar.getByRole('button', { name: '撤销屏幕批注' }).click()
  await expect(overlay.locator('[data-stroke-id]')).toHaveCount(1)
  await overlay.keyboard.press('Escape')
  result.pointerAfterEscape = await nativeHit(state.physicalInkPoint)
  expect(result.pointerAfterEscape.app).toBe('chrome')
  await webpage.locator('#underlying').click()
  await activateFixtureChrome()
  result.beforeSaveNativeCenter = await nativeHit(state.physicalCenter)
  expect(result.beforeSaveNativeCenter.title).toContain(title)
  expect(result.beforeSaveNativeCenter.handle).toBe(result.chromeNativeHandle)
  await toolbar.getByRole('button', { name: '保存笔记', exact: true }).click()
  await expect(toolbar.getByRole('status')).toContainText('笔记已保存在', { timeout: 15000 })
  await toolbar.getByRole('button', { name: '更多操作' }).click()
  await toolbar.getByRole('button', { name: '我的笔记', exact: true }).click()
  await expect.poll(() => app.windows().some((page) => !page.url().includes('surface='))).toBe(true)
  const shell = app.windows().find((page) => !page.url().includes('surface='))
  await expect(shell.getByRole('region', { name: '统一笔记库' })).toBeVisible()
  const notes = await shell.evaluate(() => window.mindnotesNotebook.list('', 0, false))
  expect(notes.notes).toHaveLength(1)
  expect(notes.notes[0].source.app).toBe('chrome')
  expect(notes.notes[0].source.title).toContain(title)
  const note = await shell.evaluate((id) => window.mindnotesNotebook.getNote(id), notes.notes[0].id)
  result.snapshotSource = note.source
  expect(note.strokes).toHaveLength(1)
  const image = await shell.evaluate(
    (id) => window.mindnotesNotebook.getImage(id),
    notes.notes[0].id
  )
  const bitmap = PNG.sync.read(Buffer.from(image.split(',')[1], 'base64'))
  const center = (Math.floor(bitmap.height / 2) * bitmap.width + Math.floor(bitmap.width / 2)) * 4
  result.rawSnapshotPixel = [...bitmap.data.subarray(center, center + 4)]
  expect(result.rawSnapshotPixel[2]).toBeGreaterThan(130)
  await mkdir('tmp/qa', { recursive: true })
  await shell.screenshot({ path: 'tmp/qa/ordinary-fullscreen-library.png' })
  result.checks = [
    'actual-Chrome-fullscreen-bounds',
    'toolbar-above-fullscreen',
    'native-ink-hit-target',
    'compositor-ink-pixels',
    'erase-undo',
    'native-Escape-pass-through',
    'Chrome-control-usable',
    'snapshot-Chrome-source-and-pixels',
  ]
  result.status = 'passed'
} catch (error) {
  result.status = 'failed'
  result.error = String(error.stack ?? error)
  process.exitCode = 1
} finally {
  await app?.close().catch(() => {})
  await chromeContext?.close().catch(() => {})
  await new Promise((resolve) => server.close(resolve))
  await mkdir('tmp/qa', { recursive: true })
  await writeFile(
    `tmp/qa/ordinary-fullscreen-${releaseLabel}-release.json`,
    JSON.stringify(result, null, 2)
  )
  console.log(JSON.stringify(result))
}
