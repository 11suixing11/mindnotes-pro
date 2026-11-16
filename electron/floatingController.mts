import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  globalShortcut,
  ipcMain,
  nativeImage,
  powerMonitor,
  screen,
} from 'electron'
import type { Display, IpcMainEvent, IpcMainInvokeEvent, Rectangle } from 'electron'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { ANNOTATION_COLORS } from '../src/notes/model.js'
import type { AnnotationColor } from '../src/notes/model.js'
import type { FloatingCommand, FloatingState, ScreenInkState } from '../src/notes/floating.js'
import {
  commitScreenHistory,
  emptyScreenHistory,
  MAX_SCREEN_STROKES,
  MAX_SCREEN_TOTAL_POINTS,
  redoScreenHistory,
  screenEraserHitTest,
  screenStrokeWidth,
  undoScreenHistory,
  validScreenPoints,
  validScreenStroke,
} from '../src/notes/screenInk.js'
import type { ScreenBrushSize, ScreenHistory, ScreenTool } from '../src/notes/screenInk.js'
import {
  MAX_SCREEN_BACKUP_BYTES,
  MAX_SCREEN_NOTE_PIXELS,
  resizeScreenDraft,
  validateScreenDraft,
  validScreenId,
} from '../src/notes/screenNotebook.js'
import type { ScreenDraft, ScreenPreferences, ScreenSource } from '../src/notes/screenNotebook.js'
import type { ScreenNotebookRepository } from './screenNotebookRepository.mjs'
import type { ScreenNotebookService } from './screenNotebookService.mjs'
import { currentScreenSource } from './screenSource.mjs'
import { validScreenPng } from './screenNotebookService.mjs'
import { readLimitedFile, writeLocalFile } from './localFiles.mjs'
import {
  hideScreenInk,
  surfaceFocusable,
  toolbarWindowShape,
} from '../src/notes/desktopPlatform.js'
import { observeLinuxSession } from './linuxSession.mjs'
import type { LinuxSessionState } from './linuxSession.mjs'

const TOOLBAR_SIZE = { width: 438, height: 122 }
const PANEL_HEIGHT = 400
const TOOLBAR_HOST_SIZE = { width: TOOLBAR_SIZE.width, height: PANEL_HEIGHT }
const BUBBLE_SIZE = { width: 72, height: 64 }
const SHORTCUT = 'Alt+Shift+M'
const CHANNELS = [
  'floating:state',
  'floating:configure',
  'floating:command',
  'floating:stroke',
  'floating:erase',
]

interface FloatingOptions {
  directory: string
  repository: ScreenNotebookRepository
  notebook: ScreenNotebookService
  openWorkspace(): Promise<void>
  quit(): void
  forceQuit(): Promise<void>
}

export class FloatingController {
  private toolbar: BrowserWindow | null = null
  private overlay: BrowserWindow | null = null
  private histories = new Map<number, ScreenHistory>()
  private display: Display = screen.getPrimaryDisplay()
  private tool: ScreenTool = 'pointer'
  private color: AnnotationColor = '#e05d52'
  private size: ScreenBrushSize = 'medium'
  private collapsed = true
  private capturing = false
  private captureHidden = false
  private suspended = false
  private systemLocked = false
  private systemSuspended = false
  private linuxSession: LinuxSessionState = { known: false, locked: false, active: false }
  private stopLinuxSession: (() => Promise<void>) | null = null
  private stopped = false
  private layerAlive = true
  private resizing = false
  private shortcutAvailable = false
  private message: string | null = null
  private messageTimer: ReturnType<typeof setTimeout> | null = null
  private expandedBounds: Rectangle | null = null
  private panel: 'brush' | 'more' | null = null
  private saveState: 'saved' | 'saving' | 'error' = 'saved'
  private readonly draftRevisions = new Map<number, number>()
  private readonly failedDisplays = new Set<number>()
  private preferenceRevision = 0
  private preferencesPending = false
  private readonly drafts = new Map<number, ScreenDraft>()
  private readonly backgrounds = new Map<string, string>()
  private recovered = false
  private source: ScreenSource = { app: '', title: '', display: '' }
  private frozen: {
    id: string
    image: string
    width: number
    height: number
    source: ScreenSource
  } | null = null
  private preferences: ScreenPreferences | null = null
  private persistenceFailed = false
  private readonly dirtyDisplays = new Set<number>()
  private surfaceRevision = 0
  private surfaceOperation: Promise<void> | null = null
  private lastInkBroadcast: ScreenInkState | null = null
  private displayRestore = 0

  constructor(private readonly options: FloatingOptions) {}

  private get history(): ScreenHistory {
    return this.histories.get(this.display.id) ?? emptyScreenHistory()
  }

  private get inputEnabled(): boolean {
    return (
      !this.stopped &&
      !this.suspended &&
      !this.drawingRestricted &&
      this.layerAlive &&
      !this.collapsed &&
      !this.capturing &&
      this.tool !== 'pointer'
    )
  }

  get state(): FloatingState {
    const history = this.history
    return {
      tool: this.tool,
      color: this.color,
      size: this.size,
      collapsed: this.collapsed,
      capturing: this.capturing,
      count: history.present.length,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      message: this.message,
      shortcutAvailable: this.shortcutAvailable,
      frozen: Boolean(this.frozen),
      recovered: this.recovered,
      saveState: this.saveState,
      panel: this.panel,
      ...(hideScreenInk(process.platform, 'pointer', false) ? { mouseModeHidesInk: true } : {}),
    }
  }

  private get inkState(): ScreenInkState {
    return {
      tool: this.tool,
      color: this.color,
      size: this.size,
      strokes: this.history.present,
      inputEnabled: this.inputEnabled,
      capturing: this.capturing,
      width: this.frozen?.width ?? this.display.bounds.width,
      height: this.frozen?.height ?? this.display.bounds.height,
      background: this.frozen?.image ?? null,
      source: this.frozen?.source ?? this.source,
    }
  }

  async start(): Promise<void> {
    try {
      const restored = await this.options.repository.load()
      this.color = restored.preferences.color
      this.size = restored.preferences.size
      this.collapsed = restored.preferences.collapsed
      this.preferences = restored.preferences
      for (const draft of restored.drafts) {
        const displayId = Number(draft.displayId)
        this.drafts.set(displayId, draft)
        this.histories.set(displayId, { ...emptyScreenHistory(), present: draft.strokes })
      }
      if (restored.drafts.some((draft) => draft.strokes.length || draft.backgroundId)) {
        this.recovered = true
        this.collapsed = true
        this.message = '上次的批注已恢复，展开后可继续。'
      }
    } catch (error) {
      console.error('[floating:recovery]', error)
      this.persistenceFailed = true
      this.saveState = 'error'
      this.message = '草稿无法读取，原文件已保留。请先备份后重试。'
      this.collapsed = true
    }
    this.registerIpc()
    // Create the full-screen layer first, then keep the toolbar above it.
    this.overlay = this.createSurface('screen', this.display.bounds)
    const area = this.display.workArea
    this.toolbar = this.createSurface('toolbar', {
      x: area.x + Math.max(0, Math.round((area.width - TOOLBAR_SIZE.width) / 2)),
      y: area.y + Math.max(0, area.height - TOOLBAR_HOST_SIZE.height - 28),
      ...TOOLBAR_HOST_SIZE,
    })
    if (this.collapsed)
      this.toolbar.setBounds(
        this.clampBounds({
          x: this.preferences?.toolbar?.x ?? area.x + area.width - BUBBLE_SIZE.width - 28,
          y: this.preferences?.toolbar?.y ?? area.y + area.height - BUBBLE_SIZE.height - 28,
          ...BUBBLE_SIZE,
        })
      )
    else if (this.preferences?.toolbar)
      this.toolbar.setBounds(
        this.clampBounds({
          ...this.toolbar.getBounds(),
          x: this.preferences.toolbar.x,
          y: this.preferences.toolbar.y - (PANEL_HEIGHT - TOOLBAR_SIZE.height),
        })
      )
    this.resizePanel()
    this.display = screen.getDisplayMatching(this.toolbar.getBounds())
    this.overlay.setBounds(this.display.bounds)
    await this.restoreDisplayDraft()
    this.overlay.setIgnoreMouseEvents(true)
    this.overlay.on('focus', () => this.toolbar?.moveTop())
    this.overlay.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') {
        event.preventDefault()
        this.releasePointer()
      }
    })
    this.overlay.webContents.on('render-process-gone', () => {
      this.layerAlive = false
      this.releasePointer()
      this.overlay?.hide()
      this.report('批注层已退出，请重新启动应用。')
    })
    this.overlay.on('unresponsive', () => this.releasePointer())
    this.overlay.on('close', (event) => {
      if (this.stopped) return
      event.preventDefault()
      this.options.quit()
    })
    this.toolbar.on('move', this.onToolbarMove)
    this.toolbar.on('moved', this.onToolbarMoved)
    this.toolbar.on('close', (event) => {
      if (this.stopped) return
      event.preventDefault()
      this.options.quit()
    })
    this.toolbar.webContents.on('render-process-gone', () => {
      this.releasePointer()
      this.options.quit()
    })
    screen.on('display-added', this.onDisplaysChanged)
    screen.on('display-removed', this.onDisplaysChanged)
    screen.on('display-metrics-changed', this.onDisplaysChanged)
    powerMonitor.on('lock-screen', this.onLockScreen)
    powerMonitor.on('unlock-screen', this.onUnlockScreen)
    powerMonitor.on('suspend', this.onSystemSuspend)
    powerMonitor.on('resume', this.onSystemResume)
    if (process.platform === 'linux')
      this.stopLinuxSession = observeLinuxSession(this.onLinuxSessionState)
    await this.loadSurface(this.overlay, 'screen')
    await this.loadSurface(this.toolbar, 'toolbar')
    this.shortcutAvailable = globalShortcut.register(SHORTCUT, () => {
      if (this.capturing || this.stopped || this.suspended || this.systemRestricted) return
      this.setCollapsed(!this.collapsed)
    })
    this.broadcast()
    this.applyWindowState()
  }

  private createSurface(surface: 'toolbar' | 'screen', bounds: Rectangle): BrowserWindow {
    const window = new BrowserWindow({
      ...bounds,
      show: false,
      frame: false,
      thickFrame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: surfaceFocusable(process.platform, surface),
      resizable: false,
      movable: surface === 'toolbar',
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      hasShadow: false,
      autoHideMenuBar: true,
      title: surface === 'toolbar' ? 'MindNotes Pro · 悬浮批注' : 'MindNotes Pro · 透明批注层',
      webPreferences: {
        preload: path.join(this.options.directory, 'floatingPreload.cjs'),
        additionalArguments: [`--mindnotes-surface=${surface}`],
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
      },
    })
    window.setAlwaysOnTop(true, 'screen-saver')
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    window.webContents.on('will-navigate', (event) => event.preventDefault())
    return window
  }

  private async loadSurface(window: BrowserWindow, surface: string): Promise<void> {
    if (app.isPackaged || process.env.MINDNOTES_USE_DIST === '1')
      await window.loadFile(path.join(this.options.directory, '../../dist/index.html'), {
        query: { surface },
      })
    else {
      const url = new URL(process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:3000')
      url.searchParams.set('surface', surface)
      await window.loadURL(url.href)
    }
  }

  private trusted(event: IpcMainInvokeEvent | IpcMainEvent, window: BrowserWindow | null): boolean {
    return Boolean(
      window &&
      !window.isDestroyed() &&
      event.sender === window.webContents &&
      event.senderFrame === window.webContents.mainFrame
    )
  }

  private registerIpc(): void {
    ipcMain.handle('floating:state', (event) => {
      if (this.trusted(event, this.toolbar)) return this.state
      if (this.trusted(event, this.overlay)) return this.inkState
      throw new Error('不支持的请求。')
    })
    const handle = (
      channel: string,
      surface: 'toolbar' | 'screen',
      callback: (...args: unknown[]) => unknown
    ) => {
      ipcMain.handle(channel, (event, ...args: unknown[]) => {
        if (
          !this.trusted(event, surface === 'toolbar' ? this.toolbar : this.overlay) ||
          this.stopped
        )
          throw new Error('不支持的请求。')
        return callback(...args)
      })
    }
    handle('floating:configure', 'toolbar', (tool, color, size) => {
      if (this.capturing || this.suspended || this.systemRestricted) return
      if (this.sessionRestricted && tool !== 'pointer') {
        this.releasePointer()
        this.report(
          this.linuxSession.reason ?? 'Linux 桌面已锁定或会话未激活，绘制和截图暂不可用。'
        )
        return
      }
      if (!this.layerAlive && tool !== 'pointer') throw new Error('批注层已退出，请重新启动应用。')
      if (
        !['pointer', 'pen', 'highlight', 'erase'].includes(String(tool)) ||
        !ANNOTATION_COLORS.includes(color as AnnotationColor) ||
        !['thin', 'medium', 'thick'].includes(String(size))
      )
        throw new Error('画笔设置无效。')
      this.tool = tool as ScreenTool
      this.color = color as AnnotationColor
      this.size = size as ScreenBrushSize
      if (this.tool !== 'pointer') this.recovered = false
      this.report(null)
      this.broadcast()
      void this.persistPreferences()
      this.applyWindowState(true)
    })
    handle('floating:command', 'toolbar', (command) => this.command(command as FloatingCommand))
    handle('floating:stroke', 'screen', async (input) => {
      if (!this.inputEnabled || this.tool === 'erase') return
      if (!validScreenStroke(input)) throw new Error('笔迹无效。')
      const history = this.history
      if (history.present.some((stroke) => stroke.id === input.id)) return
      if (
        history.present.length >= MAX_SCREEN_STROKES ||
        history.present.reduce(
          (total, stroke) => total + stroke.points.length,
          input.points.length
        ) > MAX_SCREEN_TOTAL_POINTS
      ) {
        this.report('当前屏幕笔迹较多，请保存图片后清空。')
        throw new Error('当前屏幕笔迹较多，请保存图片后清空。')
      }
      const stroke = {
        id: input.id,
        tool: this.tool as 'pen' | 'highlight',
        color: this.color,
        width: screenStrokeWidth(this.tool, this.size),
        points: input.points.map(({ x, y }) => ({
          x: Math.min(x, this.inkState.width),
          y: Math.min(y, this.inkState.height),
        })),
      }
      this.histories.set(
        this.display.id,
        commitScreenHistory(history, [...history.present, stroke])
      )
      this.report(null)
      this.broadcast()
      await this.persistDraft()
    })
    handle('floating:erase', 'screen', async (points) => {
      if (!this.inputEnabled || this.tool !== 'erase') return
      if (!validScreenPoints(points)) throw new Error('擦除位置无效。')
      const history = this.history
      const hit = screenEraserHitTest(points)
      const remaining = history.present.filter((stroke) => !hit(stroke))
      if (remaining.length === history.present.length) return
      this.histories.set(this.display.id, commitScreenHistory(history, remaining))
      this.report(null)
      this.broadcast()
      await this.persistDraft()
    })
    ipcMain.on('floating:release', this.onRelease)
  }

  private readonly onRelease = (event: IpcMainEvent): void => {
    if (this.trusted(event, this.overlay)) this.releasePointer()
  }

  private readonly onLockScreen = (): void => {
    this.systemLocked = true
    this.interruptSurface()
  }

  private readonly onUnlockScreen = (): void => {
    this.systemLocked = false
    this.releasePointer()
  }

  private readonly onSystemSuspend = (): void => {
    this.systemSuspended = true
    this.interruptSurface()
  }

  private readonly onSystemResume = (): void => {
    this.systemSuspended = false
    this.releasePointer()
  }

  private get systemRestricted(): boolean {
    return this.systemLocked || this.systemSuspended
  }

  private get sessionRestricted(): boolean {
    return (
      process.platform === 'linux' &&
      (!this.linuxSession.known || this.linuxSession.locked || !this.linuxSession.active)
    )
  }

  private get drawingRestricted(): boolean {
    return this.systemRestricted || this.sessionRestricted
  }

  private readonly onLinuxSessionState = (next: LinuxSessionState): void => {
    if (this.stopped) return
    const previous = this.linuxSession
    const wasRestricted = this.sessionRestricted
    this.linuxSession = next
    const changed =
      previous.known !== next.known ||
      previous.locked !== next.locked ||
      previous.active !== next.active ||
      previous.sessionId !== next.sessionId
    if (this.sessionRestricted && changed) {
      this.interruptSurface()
      this.report(next.reason ?? 'Linux 桌面已锁定或会话未激活，绘制和截图暂不可用。')
    } else if (wasRestricted && !this.sessionRestricted) {
      this.releasePointer()
      this.report(null)
    } else if (previous.sessionId && previous.sessionId !== next.sessionId) {
      this.interruptSurface()
    }
  }

  private interruptSurface(): void {
    this.surfaceRevision += 1
    this.setCollapsed(true)
    this.releasePointer()
  }

  private broadcast(): void {
    if (this.stopped) return
    if (this.toolbar && !this.toolbar.webContents.isDestroyed())
      this.toolbar.webContents.send('floating:changed', this.state)
    if (this.overlay && !this.overlay.webContents.isDestroyed()) {
      const next = this.inkState
      const patch: Record<string, unknown> = {}
      for (const key of Object.keys(next) as (keyof ScreenInkState)[]) {
        if (!this.lastInkBroadcast || next[key] !== this.lastInkBroadcast[key])
          patch[key] = next[key]
      }
      this.lastInkBroadcast = next
      if (Object.keys(patch).length) this.overlay.webContents.send('floating:changed', patch)
    }
  }

  private report(message: string | null): void {
    if (this.messageTimer) clearTimeout(this.messageTimer)
    this.message = message
    if (message)
      this.messageTimer = setTimeout(() => {
        this.message = null
        this.broadcast()
      }, 8_000)
    this.broadcast()
  }

  releasePointer(): void {
    this.tool = 'pointer'
    this.broadcast()
    this.applyWindowState()
  }

  private applyWindowState(focus = false): void {
    const { overlay, toolbar } = this
    if (!overlay || !toolbar || overlay.isDestroyed() || toolbar.isDestroyed() || this.stopped)
      return
    overlay.setIgnoreMouseEvents(!this.inputEnabled)
    if (process.platform !== 'linux' && overlay.isFocusable() !== this.inputEnabled)
      overlay.setFocusable(this.inputEnabled)
    if (!this.inputEnabled) overlay.blur()
    // Linux withdraws the managed layer in mouse mode so its WM frame releases input.
    // Frozen images also hide in mouse mode so clicks match the live software.
    if (
      this.collapsed ||
      this.captureHidden ||
      this.suspended ||
      this.drawingRestricted ||
      !this.layerAlive ||
      hideScreenInk(process.platform, this.tool, Boolean(this.frozen))
    )
      overlay.hide()
    else {
      overlay.showInactive()
      overlay.setBounds(this.display.bounds)
      if (focus && this.inputEnabled) overlay.focus()
    }
    if (this.captureHidden || this.suspended || this.systemRestricted) toolbar.hide()
    else {
      toolbar.showInactive()
      toolbar.moveTop()
    }
  }

  private clampBounds(bounds: Rectangle): Rectangle {
    const area = screen.getDisplayMatching(bounds).workArea
    return {
      ...bounds,
      x: Math.max(area.x, Math.min(bounds.x, area.x + area.width - bounds.width)),
      y: Math.max(area.y, Math.min(bounds.y, area.y + area.height - bounds.height)),
    }
  }

  private readonly onToolbarMove = (): void => {
    if (this.resizing || this.capturing || this.stopped || !this.toolbar || !this.overlay) return
    const bounds = this.toolbar.getBounds()
    const display = screen.getDisplayMatching(bounds)
    if (display.id !== this.display.id) {
      // Histories use display-local DIP coordinates. Moving the toolbar selects that screen.
      this.releasePointer()
      this.display = display
      // Windows retains the native region in physical pixels after a DPI move.
      // Reapply the DIP shape on the target display so visible controls remain hit-testable.
      this.resizePanel()
      this.overlay.setBounds(display.bounds)
      this.frozen = null
      this.surfaceRevision += 1
      void this.restoreDisplayDraft()
        .then(() => {
          this.broadcast()
          this.applyWindowState()
        })
        .catch(() => this.report('这块屏幕的草稿无法读取。'))
      this.broadcast()
    }
  }

  private readonly onToolbarMoved = (): void => {
    if (this.resizing || this.capturing || this.stopped || !this.toolbar) return
    const bounds = this.toolbar.getBounds()
    const clamped = this.clampBounds(bounds)
    if (clamped.x !== bounds.x || clamped.y !== bounds.y) {
      this.resizing = true
      this.toolbar.setBounds(clamped)
      this.resizing = false
    }
    this.onToolbarMove()
    this.resizePanel()
    void this.persistPreferences()
  }

  private readonly onDisplaysChanged = (): void => {
    if (!this.toolbar || !this.overlay || this.stopped) return
    this.releasePointer()
    const bounds = this.clampBounds(this.toolbar.getBounds())
    this.resizing = true
    this.toolbar.setBounds(bounds)
    this.resizing = false
    this.display = screen.getDisplayMatching(bounds)
    this.resizePanel()
    this.overlay.setBounds(this.display.bounds)
    this.expandedBounds = null
    this.surfaceRevision += 1
    void this.restoreDisplayDraft()
      .then(() => {
        this.broadcast()
        this.applyWindowState()
      })
      .catch(() => this.report('屏幕变化后无法读取草稿。原草稿已保留，可导出备份。'))
  }

  private setCollapsed(collapsed: boolean): void {
    if (
      this.stopped ||
      !this.toolbar ||
      this.toolbar.isDestroyed() ||
      (!collapsed && (this.capturing || this.suspended || this.systemRestricted))
    )
      return
    const wasCollapsed = this.collapsed
    this.collapsed = collapsed
    this.tool = 'pointer'
    this.panel = null
    if (wasCollapsed !== collapsed) {
      const bounds = this.toolbar.getBounds()
      this.resizing = true
      if (collapsed) {
        this.expandedBounds = bounds
        this.toolbar.setBounds(
          this.clampBounds({
            x: bounds.x + bounds.width - BUBBLE_SIZE.width,
            y: bounds.y + bounds.height - BUBBLE_SIZE.height,
            ...BUBBLE_SIZE,
          })
        )
      } else {
        const origin = this.expandedBounds
        const untouched =
          origin &&
          bounds.x === origin.x + origin.width - BUBBLE_SIZE.width &&
          bounds.y === origin.y + origin.height - BUBBLE_SIZE.height
        this.toolbar.setBounds(
          this.clampBounds(
            untouched
              ? origin
              : {
                  x: bounds.x + bounds.width - TOOLBAR_SIZE.width,
                  y: bounds.y + bounds.height - TOOLBAR_HOST_SIZE.height,
                  ...TOOLBAR_HOST_SIZE,
                }
          )
        )
      }
      this.resizing = false
      this.onToolbarMove()
    }
    this.resizePanel()
    this.broadcast()
    this.applyWindowState()
    void this.persistPreferences()
  }

  resume(): void {
    this.suspended = false
    this.broadcast()
    this.applyWindowState()
  }

  suspend(): void {
    this.suspended = true
    this.interruptSurface()
  }

  private async command(command: FloatingCommand): Promise<void> {
    if (command === 'force-quit') {
      await this.options.forceQuit()
      return
    }
    if (command === 'quit') {
      this.options.quit()
      return
    }
    if (this.capturing || this.stopped || this.suspended || this.systemRestricted) return
    if (this.sessionRestricted && (command === 'freeze' || command === 'save')) {
      this.releasePointer()
      this.report(this.linuxSession.reason ?? 'Linux 桌面已锁定或会话未激活，截图暂不可用。')
      return
    }
    if (command === 'collapse' || command === 'expand') {
      if (command === 'expand') this.recovered = false
      this.setCollapsed(command === 'collapse')
      return
    }
    if (command === 'pointer') {
      this.releasePointer()
      return
    }
    if (command === 'brush-panel' || command === 'more-panel' || command === 'close-panel') {
      this.panel = command === 'close-panel' ? null : command === 'brush-panel' ? 'brush' : 'more'
      this.resizePanel()
      this.broadcast()
      return
    }
    if (command === 'freeze') {
      this.surfaceOperation = this.freezeScreen()
      await this.surfaceOperation
      this.surfaceOperation = null
      return
    }
    if (command === 'live') {
      this.frozen = null
      const draft = this.drafts.get(this.display.id)
      if (draft) {
        const resized = resizeScreenDraft(
          { ...draft, strokes: this.history.present, backgroundId: null },
          this.display.bounds.width,
          this.display.bounds.height
        )
        this.histories.set(this.display.id, { ...emptyScreenHistory(), present: resized.strokes })
      }
      this.releasePointer()
      await this.persistDraft()
      return
    }
    if (command === 'retry-save') {
      await this.retryPersistence()
      return
    }
    if (command === 'export-draft') {
      await this.exportDraft()
      return
    }
    if (command === 'import-draft') {
      await this.importDraft()
      return
    }
    if (command === 'workspace') {
      this.suspend()
      await this.options.openWorkspace()
      return
    }
    if (command === 'save') {
      this.surfaceOperation = this.saveCapture()
      await this.surfaceOperation
      this.surfaceOperation = null
      return
    }
    const history = this.history
    if (command === 'undo') this.histories.set(this.display.id, undoScreenHistory(history))
    else if (command === 'redo') this.histories.set(this.display.id, redoScreenHistory(history))
    else if (command === 'clear' && history.present.length)
      this.histories.set(this.display.id, commitScreenHistory(history, []))
    else return
    this.report(null)
    this.broadcast()
    await this.persistDraft()
  }

  private draftSnapshot(): ScreenDraft {
    return {
      displayId: String(this.display.id),
      width: this.frozen?.width ?? this.display.bounds.width,
      height: this.frozen?.height ?? this.display.bounds.height,
      strokes: this.history.present,
      backgroundId: this.frozen?.id ?? null,
      source: this.frozen?.source ?? this.source,
      updatedAt: Date.now(),
    }
  }

  private updateSaveState(): void {
    this.saveState =
      this.failedDisplays.size || this.persistenceFailed
        ? 'error'
        : this.dirtyDisplays.size || this.preferencesPending
          ? 'saving'
          : 'saved'
    this.broadcast()
  }

  private pruneBackgroundCache(): void {
    const used = new Set([...this.drafts.values()].map((draft) => draft.backgroundId))
    if (this.frozen) used.add(this.frozen.id)
    for (const id of this.backgrounds.keys()) if (!used.has(id)) this.backgrounds.delete(id)
  }

  private async persistDraft(draft = this.draftSnapshot(), png?: Uint8Array): Promise<void> {
    const displayId = Number(draft.displayId)
    const generation = (this.draftRevisions.get(displayId) ?? 0) + 1
    this.draftRevisions.set(displayId, generation)
    this.drafts.set(displayId, draft)
    this.dirtyDisplays.add(displayId)
    this.updateSaveState()
    try {
      await this.options.repository.saveDraft(draft, png)
      if (generation === this.draftRevisions.get(displayId)) {
        this.dirtyDisplays.delete(displayId)
        this.failedDisplays.delete(displayId)
      }
      this.pruneBackgroundCache()
    } catch (error) {
      console.error('[floating:autosave]', error)
      if (generation === this.draftRevisions.get(displayId)) this.failedDisplays.add(displayId)
      this.report('自动保存失败，当前笔迹仍保留。可重试或备份草稿。')
      throw error
    } finally {
      this.updateSaveState()
    }
  }

  private async persistPreferences(): Promise<void> {
    if (this.stopped || !this.toolbar) return
    const bounds = this.toolbar.getBounds()
    const generation = ++this.preferenceRevision
    this.preferencesPending = true
    this.updateSaveState()
    try {
      await this.options.repository.savePreferences({
        color: this.color,
        size: this.size,
        tool: this.tool,
        collapsed: this.collapsed,
        toolbar: {
          x: bounds.x,
          y: bounds.y + (this.collapsed ? 0 : PANEL_HEIGHT - TOOLBAR_SIZE.height),
        },
      })
      if (generation === this.preferenceRevision) this.persistenceFailed = false
    } catch (error) {
      console.error('[floating:preferences]', error)
      if (generation === this.preferenceRevision) this.persistenceFailed = true
    } finally {
      if (generation === this.preferenceRevision) this.preferencesPending = false
      this.updateSaveState()
    }
  }

  private async retryPersistence(): Promise<void> {
    const drafts = [...this.dirtyDisplays]
      .map((id) => this.drafts.get(id))
      .filter((draft): draft is ScreenDraft => Boolean(draft))
    for (const draft of drafts) {
      const image = draft.backgroundId ? this.backgrounds.get(draft.backgroundId) : null
      await this.persistDraft(
        draft,
        image ? nativeImage.createFromDataURL(image).toPNG() : undefined
      )
    }
    await this.persistPreferences()
    if (this.saveState === 'error') throw new Error('自动保存仍未完成，请先备份草稿。')
    this.report('草稿已保存在本地。')
  }

  async flush(): Promise<void> {
    await this.surfaceOperation
    await this.options.repository.flush()
    if (this.dirtyDisplays.size || this.persistenceFailed) await this.retryPersistence()
    await this.options.repository.flush()
  }

  notifySaveFailure(): void {
    this.setCollapsed(false)
    this.report('保存未完成，退出已取消。请重试保存或备份草稿。')
  }

  private async restoreDisplayDraft(): Promise<void> {
    const generation = ++this.displayRestore
    const displayId = this.display.id
    const stored = this.drafts.get(displayId)
    this.frozen = null
    this.source = { app: '', title: '', display: this.display.label }
    if (!stored) return
    const draft = resizeScreenDraft(stored, this.display.bounds.width, this.display.bounds.height)
    if (draft !== stored || !this.histories.has(displayId))
      this.histories.set(displayId, { ...emptyScreenHistory(), present: draft.strokes })
    if (draft !== stored) await this.persistDraft(draft)
    if (generation !== this.displayRestore || this.display.id !== displayId) return
    this.source = draft.source
    if (draft.backgroundId) {
      let image = this.backgrounds.get(draft.backgroundId)
      if (!image) {
        image = `data:image/png;base64,${Buffer.from(await this.options.repository.getBackground(draft.backgroundId)).toString('base64')}`
        this.backgrounds.set(draft.backgroundId, image)
      }
      if (generation !== this.displayRestore || this.display.id !== displayId) return
      this.frozen = {
        id: draft.backgroundId,
        image,
        width: draft.width,
        height: draft.height,
        source: draft.source,
      }
    }
  }

  private resizePanel(): void {
    if (!this.toolbar || this.stopped) return
    // Keep the compositor surface and bottom toolbar stationary while panels
    // open. Native shaping also lets clicks through the unused upper area.
    if (process.platform === 'win32' || process.platform === 'linux')
      this.toolbar.setShape(
        toolbarWindowShape(
          process.platform,
          Boolean(this.collapsed || this.panel),
          this.toolbar.getBounds(),
          { x: 0, y: PANEL_HEIGHT - TOOLBAR_SIZE.height, ...TOOLBAR_SIZE }
        )
      )
  }

  private async captureBackground(): Promise<{
    image: string
    png: Buffer
    width: number
    height: number
    source: ScreenSource
  }> {
    const display = this.display
    const revision = this.surfaceRevision
    this.tool = 'pointer'
    this.capturing = true
    this.captureHidden = true
    this.panel = null
    this.resizePanel()
    this.broadcast()
    this.applyWindowState()
    await delay(180)
    this.assertSurfaceCurrent(revision)
    // Topmost software can be visible without owning keyboard focus. Record the
    // visible window at this display's center after hiding our own surfaces.
    const center =
      process.platform === 'win32'
        ? screen.dipToScreenPoint({
            x: Math.round(display.bounds.x + display.bounds.width / 2),
            y: Math.round(display.bounds.y + display.bounds.height / 2),
          })
        : undefined
    const source = await currentScreenSource(display.label || `屏幕 ${display.id}`, center)
    this.assertSurfaceCurrent(revision)
    if (source.restricted)
      throw new Error(
        process.platform === 'win32'
          ? 'Windows 已锁定或正在显示受保护画面，请回到普通桌面后再保存。'
          : 'Linux 桌面已锁定或会话未激活，请回到普通桌面后再保存。'
      )
    if (source.unavailable) throw new Error('无法确认当前桌面状态，请稍后重试。')
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.ceil(display.bounds.width * display.scaleFactor),
        height: Math.ceil(display.bounds.height * display.scaleFactor),
      },
    })
    this.assertSurfaceCurrent(revision)
    const selected =
      sources.find((item) => item.display_id === String(display.id)) ??
      (sources.length === 1 &&
      (process.platform !== 'linux' || screen.getAllDisplays().length === 1)
        ? sources[0]
        : undefined)
    if (!selected || selected.thumbnail.isEmpty()) throw new Error('无法截取当前屏幕。')
    const size = selected.thumbnail.getSize()
    if (size.width * size.height > MAX_SCREEN_NOTE_PIXELS)
      throw new Error('当前屏幕截图超过支持尺寸。')
    this.source = source
    // Restore controls as soon as the compositor image is available. Disk work
    // continues with saving feedback instead of keeping the toolbar absent.
    this.captureHidden = false
    this.applyWindowState()
    return {
      image: selected.thumbnail.toDataURL(),
      png: selected.thumbnail.toPNG(),
      width: display.bounds.width,
      height: display.bounds.height,
      source,
    }
  }

  private assertSurfaceCurrent(revision: number): void {
    if (
      this.stopped ||
      this.suspended ||
      this.drawingRestricted ||
      revision !== this.surfaceRevision
    )
      throw new Error('截图已取消：桌面状态或屏幕发生变化，请回到普通桌面后重试。')
  }

  private async freezeScreen(): Promise<void> {
    if (this.frozen) return
    const revision = this.surfaceRevision
    try {
      const captured = await this.captureBackground()
      const id = randomUUID()
      this.backgrounds.set(id, captured.image)
      this.frozen = { id, ...captured }
      await this.persistDraft(this.draftSnapshot(), captured.png)
      if (
        revision !== this.surfaceRevision ||
        this.stopped ||
        this.suspended ||
        this.drawingRestricted
      )
        return
      this.tool = 'pen'
      this.report('画面已冻结，可以继续标注。')
    } catch (error) {
      console.error('[floating:freeze]', error)
      this.report(error instanceof Error ? error.message : '冻结画面失败，笔迹仍然保留。请重试。')
    } finally {
      this.capturing = false
      this.captureHidden = false
      this.broadcast()
      this.resizePanel()
      this.applyWindowState(this.tool !== 'pointer')
    }
  }

  private async saveCapture(): Promise<void> {
    if (!this.overlay || !this.toolbar || !this.layerAlive) return
    const revision = this.surfaceRevision
    const strokes = this.history.present
    try {
      const captured = this.frozen
        ? {
            image: this.frozen.image,
            png: nativeImage.createFromDataURL(this.frozen.image).toPNG(),
            width: this.frozen.width,
            height: this.frozen.height,
            source: this.frozen.source,
          }
        : await this.captureBackground()
      this.assertSurfaceCurrent(revision)
      this.capturing = true
      this.tool = 'pointer'
      this.broadcast()
      this.applyWindowState()
      const now = Date.now()
      const title = (
        captured.source.title || `屏幕批注 ${new Date(now).toLocaleString('zh-CN')}`
      ).slice(0, 200)
      await this.options.notebook.create(
        {
          id: randomUUID(),
          title,
          comment: '',
          source: captured.source,
          width: captured.width,
          height: captured.height,
          strokes,
          createdAt: now,
          updatedAt: now,
          revision: 1,
          trashedAt: null,
        },
        captured.png
      )
      this.report('笔记已保存在“我的笔记”，可继续编辑。')
    } catch (error) {
      console.error('[floating:save-note]', error)
      this.report(
        error instanceof Error ? error.message : '笔记保存失败，当前笔迹仍保留。可重试或导出恢复。'
      )
    } finally {
      this.capturing = false
      this.captureHidden = false
      this.broadcast()
      this.resizePanel()
      this.applyWindowState()
    }
  }

  private async exportDraft(): Promise<void> {
    const result = await dialog.showSaveDialog({
      title: '导出当前批注恢复备份',
      defaultPath: path.join(
        app.getPath('downloads'),
        `MindNotes-draft-${new Date().toISOString().slice(0, 10)}.json`
      ),
      filters: [{ name: 'MindNotes 草稿恢复备份', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) return
    const drafts = [...this.drafts.values()]
    const active = this.draftSnapshot()
    const selectedDrafts = [
      ...drafts.filter((draft) => draft.displayId !== active.displayId),
      active,
    ]
    const backgrounds = []
    for (const id of new Set(selectedDrafts.map((draft) => draft.backgroundId))) {
      if (!id) continue
      const image =
        this.backgrounds.get(id) ??
        `data:image/png;base64,${Buffer.from(await this.options.repository.getBackground(id)).toString('base64')}`
      backgrounds.push({ id, image })
    }
    const content = JSON.stringify({
      format: 'mindnotes-pro.screen-drafts',
      version: 1,
      drafts: selectedDrafts,
      backgrounds,
    })
    if (Buffer.byteLength(content) > MAX_SCREEN_BACKUP_BYTES)
      throw new Error('草稿备份超过 256 MB，请先保存屏幕笔记。')
    await writeLocalFile(result.filePath, content)
    this.report('当前批注恢复备份已导出。')
  }

  private async importDraft(): Promise<void> {
    this.releasePointer()
    const result = await dialog.showOpenDialog({
      title: '恢复屏幕草稿备份',
      properties: ['openFile'],
      filters: [{ name: 'MindNotes 草稿备份', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePaths[0]) return
    const value = JSON.parse(
      (await readLimitedFile(result.filePaths[0], MAX_SCREEN_BACKUP_BYTES)).toString('utf8')
    ) as {
      format?: unknown
      version?: unknown
      drafts?: unknown
      backgrounds?: unknown
    }
    if (
      !value ||
      value.format !== 'mindnotes-pro.screen-drafts' ||
      value.version !== 1 ||
      !Array.isArray(value.drafts) ||
      value.drafts.length > 32 ||
      !Array.isArray(value.backgrounds) ||
      value.backgrounds.length > 32
    )
      throw new Error('不支持的草稿备份。')
    const drafts = value.drafts.map(validateScreenDraft)
    if (new Set(drafts.map((draft) => draft.displayId)).size !== drafts.length)
      throw new Error('备份包含重复屏幕草稿。')
    const images = new Map<string, { image: string; png: Buffer }>()
    for (const input of value.backgrounds) {
      const background = input as { id?: unknown; image?: unknown }
      if (
        !background ||
        !validScreenId(background.id) ||
        images.has(background.id) ||
        typeof background.image !== 'string' ||
        !background.image.startsWith('data:image/png;base64,')
      )
        throw new Error('草稿背景无效。')
      const png = Buffer.from(background.image.slice(22), 'base64')
      if (!validScreenPng(png) || nativeImage.createFromBuffer(png).isEmpty())
        throw new Error('草稿背景无法读取。')
      images.set(background.id, { image: background.image, png })
    }
    for (const draft of drafts)
      if (draft.backgroundId && !images.has(draft.backgroundId))
        throw new Error('备份缺少草稿背景。')
    const activeId = String(this.display.id)
    const active =
      drafts.find((draft) => draft.displayId === activeId) ??
      (drafts.length === 1 ? drafts[0] : null)
    if (!active)
      throw new Error('备份中有多个屏幕，请在原屏幕恢复草稿。屏幕笔记备份可导入笔记库跨电脑使用。')
    if (this.history.present.length || this.frozen) {
      const current = this.draftSnapshot()
      const previous = JSON.stringify({
        format: 'mindnotes-pro.screen-drafts',
        version: 1,
        drafts: [current],
        backgrounds: this.frozen ? [{ id: this.frozen.id, image: this.frozen.image }] : [],
      })
      const choice = await dialog.showMessageBox({
        type: 'question',
        title: '恢复草稿',
        message: '恢复会替换当前屏幕的批注。',
        detail: '当前草稿会先保存在本地恢复副本中，随时可以再次导入。',
        buttons: ['恢复草稿', '取消'],
        defaultId: 1,
        cancelId: 1,
      })
      if (choice.response !== 0) return
      await writeLocalFile(
        path.join(app.getPath('userData'), 'screen-draft-before-restore.json'),
        previous
      )
    }
    const restored = resizeScreenDraft(
      { ...active, displayId: activeId, updatedAt: Date.now() },
      this.display.bounds.width,
      this.display.bounds.height
    )
    const background = restored.backgroundId ? images.get(restored.backgroundId) : null
    await this.options.repository.saveDraft(restored, background?.png)
    this.drafts.set(this.display.id, restored)
    this.histories.set(this.display.id, { ...emptyScreenHistory(), present: restored.strokes })
    if (restored.backgroundId && background)
      this.backgrounds.set(restored.backgroundId, background.image)
    await this.restoreDisplayDraft()
    this.pruneBackgroundCache()
    this.panel = null
    this.resizePanel()
    this.report('草稿已恢复，可以继续批注。')
    this.applyWindowState()
  }

  stopSessionObserver(): Promise<void> {
    return this.stopLinuxSession?.() ?? Promise.resolve()
  }

  dispose(): void {
    if (this.stopped) return
    this.releasePointer()
    this.stopped = true
    void this.stopSessionObserver()
    if (this.messageTimer) clearTimeout(this.messageTimer)
    if (this.shortcutAvailable) globalShortcut.unregister(SHORTCUT)
    screen.removeListener('display-added', this.onDisplaysChanged)
    screen.removeListener('display-removed', this.onDisplaysChanged)
    screen.removeListener('display-metrics-changed', this.onDisplaysChanged)
    powerMonitor.removeListener('lock-screen', this.onLockScreen)
    powerMonitor.removeListener('unlock-screen', this.onUnlockScreen)
    powerMonitor.removeListener('suspend', this.onSystemSuspend)
    powerMonitor.removeListener('resume', this.onSystemResume)
    ipcMain.removeListener('floating:release', this.onRelease)
    for (const channel of CHANNELS) ipcMain.removeHandler(channel)
    this.toolbar?.destroy()
    this.overlay?.destroy()
    this.toolbar = null
    this.overlay = null
  }
}
