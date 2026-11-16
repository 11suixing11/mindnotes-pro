import { app, BrowserWindow, dialog, ipcMain, Menu, WebContentsView } from 'electron'
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import { writeLocalFile } from './localFiles.mjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createBackup,
  decodeBackup,
  exportFilename,
  normalizePageUrl,
  notebookMarkdown,
  pageKey,
} from '../src/notes/model.js'
import type { AnnotationColor, AnnotationTool } from '../src/notes/model.js'
import type { BrowserCommand, PageEdit } from '../src/notes/desktop.js'
import { pageInjectionSource } from '../src/notes/pageOverlay.js'
import { NotebookRepository } from './notebookRepository.mjs'
import { NotesWorkspace } from './notesWorkspace.mjs'
import { FloatingController } from './floatingController.mjs'
import { ScreenNotebookRepository } from './screenNotebookRepository.mjs'
import { ScreenNotebookService } from './screenNotebookService.mjs'
import { restrictPagePermissions } from './pagePermissions.mjs'
import { resolveDesktopBackend } from '../src/notes/desktopPlatform.js'

// Electron has already selected Ozone in C++; the launcher supplies defaults before startup.
const selectedOzone = app.commandLine.getSwitchValue('ozone-platform')
if (process.platform === 'linux') app.setDesktopName('com.mindnotes.pro.desktop')
const desktopBackend = resolveDesktopBackend(process.platform, process.env, selectedOzone)

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
let mainWindow: BrowserWindow | null = null
let browserView: WebContentsView | null = null
let repository: NotebookRepository
let workspace: NotesWorkspace
let pageReady = false
let closing = false
let closeRequested = false
let shellAlive = true
let shellLoad: Promise<void> | null = null
let lastShellRecovery = 0
let viewport: Electron.Rectangle | null = null
let floating: FloatingController | null = null
let floatingStart: Promise<void> | null = null
let quitting = false
let finishingClose = false
let closeHandshake: ReturnType<typeof setTimeout> | null = null
let screenRepository: ScreenNotebookRepository
let screenNotebook: ScreenNotebookService
const startWorkspace =
  process.argv.includes('--workspace') ||
  process.env.MINDNOTES_START_WORKSPACE === '1' ||
  (process.platform === 'linux' && desktopBackend !== 'x11')

async function showFloating(): Promise<void> {
  if (quitting) return
  if (process.platform === 'linux' && desktopBackend !== 'x11') {
    workspace.error(
      desktopBackend === 'wayland'
        ? '当前原生 Wayland 模式暂不支持悬浮屏幕批注。可继续使用本地笔记和网页批注；悬浮批注需要 X11/XWayland 模式。'
        : '当前桌面后端不支持悬浮屏幕批注。可继续使用本地笔记和网页批注。'
    )
    await showWorkspace()
    return
  }
  if (!floating) {
    floating = new FloatingController({
      directory: currentDirectory,
      repository: screenRepository,
      notebook: screenNotebook,
      openWorkspace: showWorkspace,
      quit: requestQuit,
      forceQuit,
    })
    floatingStart = floating.start()
  }
  await floatingStart
  mainWindow?.hide()
  floating.resume()
}

async function showWorkspace(): Promise<void> {
  if (quitting) return
  floating?.suspend()
  if (!mainWindow) await createMainWindow()
  else if (!shellAlive) await loadShell(mainWindow)
  mainWindow?.show()
  mainWindow?.focus()
}

function broadcast(): void {
  if (shellAlive && mainWindow && !mainWindow.webContents.isDestroyed())
    mainWindow.webContents.send('notes:changed', workspace.snapshot)
  if (pageReady && browserView && !browserView.webContents.isDestroyed())
    browserView.webContents.send('page:state', workspace.overlay)
  layoutBrowser()
}

function trustedShell(event: IpcMainInvokeEvent | IpcMainEvent): boolean {
  if (!mainWindow) return false
  return (
    event.sender === mainWindow?.webContents &&
    event.senderFrame === mainWindow.webContents.mainFrame
  )
}

function trustedPage(event: IpcMainEvent): boolean {
  if (
    !browserView ||
    event.sender !== browserView.webContents ||
    event.senderFrame !== browserView.webContents.mainFrame ||
    !workspace.snapshot.currentUrl
  )
    return false
  try {
    return pageKey(event.senderFrame.url) === workspace.snapshot.currentUrl
  } catch {
    return false
  }
}

function layoutBrowser(): void {
  if (!browserView || !mainWindow) return
  const visible = Boolean(shellAlive && viewport && workspace.snapshot.currentUrl)
  browserView.setVisible(visible)
  if (!viewport || !visible) return
  const [width, height] = mainWindow.getContentSize()
  const x = Math.max(0, Math.min(width, Math.round(viewport.x)))
  const y = Math.max(0, Math.min(height, Math.round(viewport.y)))
  browserView.setBounds({
    x,
    y,
    width: Math.max(1, Math.min(width - x, Math.round(viewport.width))),
    height: Math.max(1, Math.min(height - y, Math.round(viewport.height))),
  })
}

function syncBrowser(): void {
  const contents = browserView?.webContents
  if (!contents || contents.isDestroyed()) return
  workspace.browserState(
    contents.isLoading(),
    contents.navigationHistory.canGoBack(),
    contents.navigationHistory.canGoForward()
  )
}

async function navigate(input: string): Promise<void> {
  if (!mainWindow) return
  const url = normalizePageUrl(input)
  browserView ??= createBrowser(mainWindow)
  pageReady = false
  workspace.open(url, '')
  workspace.browserState(
    true,
    browserView.webContents.navigationHistory.canGoBack(),
    browserView.webContents.navigationHistory.canGoForward()
  )
  try {
    await browserView.webContents.loadURL(url)
  } catch (error) {
    if (error instanceof Error && !error.message.includes('ERR_ABORTED'))
      workspace.error('网页暂时无法打开，请检查地址或网络后重试。')
  }
  syncBrowser()
}

async function runCommand(command: BrowserCommand): Promise<void> {
  if (command === 'force-quit') {
    await forceQuit()
    return
  }
  if (command === 'floating') {
    await workspace.flush()
    await showFloating()
    return
  }
  if (command === 'home') {
    browserView?.webContents.stop()
    pageReady = false
    workspace.home()
    return
  }
  if (command === 'undo' || command === 'redo') {
    workspace.history(command)
    return
  }
  const contents = browserView?.webContents
  if (!contents || contents.isDestroyed()) return
  if (command === 'back' && contents.navigationHistory.canGoBack())
    contents.navigationHistory.goBack()
  if (command === 'forward' && contents.navigationHistory.canGoForward())
    contents.navigationHistory.goForward()
  if (command === 'reload') {
    workspace.error(null)
    contents.reload()
  }
  if (command === 'capture') {
    const captured = await contents
      .executeJavaScript('Boolean(window.__mindnotesOverlay?.captureSelection())', true)
      .catch(() => false)
    if (!captured) workspace.error('先在网页中选中一段文字，再点击“摘录”。')
  }
}

function registerIpc(): void {
  const handle = (name: string, callback: (...args: unknown[]) => unknown) => {
    ipcMain.handle(name, (event, ...args: unknown[]) => {
      if (!trustedShell(event)) throw new Error('不支持的请求。')
      return callback(...args)
    })
  }
  handle('notes:state', () => workspace.snapshot)
  handle('notes:navigate', (url) => {
    if (typeof url !== 'string' || url.length > 8_000) throw new Error('网页地址无效。')
    return navigate(url)
  })
  handle('notes:command', (command) => runCommand(command as BrowserCommand))
  handle('notes:configure', (tool, color) =>
    workspace.configure(tool as AnnotationTool, color as AnnotationColor)
  )
  handle('notes:update', (url, id, comment) => {
    if (typeof url !== 'string' || url.length > 8_000) throw new Error('网页地址无效。')
    workspace.update(url, String(id), comment as string)
  })
  handle('notes:delete', (id) => workspace.remove(String(id)))
  handle('notes:reveal', async (id) => {
    const annotationId = String(id)
    workspace.select(annotationId)
    const found = await browserView?.webContents.executeJavaScript(
      `window.__mindnotesOverlay?.reveal(${JSON.stringify(annotationId)})`,
      true
    )
    if (found !== true) throw new Error('原文位置暂时无法确认。笔记仍可编辑和导出。')
  })
  handle('notes:import', (content) => {
    if (typeof content !== 'string') throw new Error('笔记文件无效。')
    return workspace.import(decodeBackup(content).pages)
  })
  handle('notes:export', async (format, scope) => {
    if (
      !mainWindow ||
      !['markdown', 'json'].includes(String(format)) ||
      !['page', 'all'].includes(String(scope))
    )
      return null
    const pages =
      scope === 'all' ? workspace.snapshot.pages : workspace.current ? [workspace.current] : []
    if (!pages.some((page) => page.annotations.length)) throw new Error('还没有可导出的笔记。')
    const isJson = format === 'json'
    const result = await dialog.showSaveDialog(mainWindow, {
      title: isJson ? '导出可编辑笔记备份' : '导出 Markdown 笔记',
      defaultPath: path.join(
        app.getPath('downloads'),
        exportFilename(
          scope === 'all' ? 'MindNotes Pro 全部笔记' : workspace.current?.title || '网页笔记',
          isJson ? 'json' : 'md'
        )
      ),
      filters: [
        {
          name: isJson ? 'MindNotes Pro 笔记备份' : 'Markdown 笔记',
          extensions: [isJson ? 'json' : 'md'],
        },
      ],
    })
    if (result.canceled || !result.filePath) return null
    await writeLocalFile(
      result.filePath,
      isJson ? JSON.stringify(createBackup(pages), null, 2) : notebookMarkdown(pages)
    )
    return result.filePath
  })
  ipcMain.on('notes:viewport', (event, rect: unknown) => {
    if (!trustedShell(event)) return
    if (rect === null) {
      viewport = null
      layoutBrowser()
      return
    }
    if (!rect || typeof rect !== 'object') return
    const value = rect as Record<string, unknown>
    if (
      ![value.x, value.y, value.width, value.height].every(
        (item) => typeof item === 'number' && Number.isFinite(item) && Math.abs(item) <= 100_000
      )
    )
      return
    viewport = value as unknown as Electron.Rectangle
    layoutBrowser()
  })
  ipcMain.on('page:ready', (event) => {
    if (trustedPage(event)) {
      pageReady = true
      broadcast()
    }
  })
  ipcMain.on('page:edit', (event, edit: PageEdit) => {
    if (trustedPage(event)) workspace.edit(edit)
  })
  ipcMain.on('page:positions', (event, ids: unknown) => {
    if (trustedPage(event)) workspace.reportPositions(ids)
  })
  ipcMain.on('notes:close-ready', (event) => {
    if (trustedShell(event) && closeRequested) {
      if (closeHandshake) clearTimeout(closeHandshake)
      finishClose()
    }
  })
  ipcMain.on('notes:close-failed', (event) => {
    if (trustedShell(event) && closeRequested)
      cancelClose('有屏幕笔记尚未保存，请在编辑器中重试保存后再退出。')
  })
}

function cancelClose(message: string): void {
  if (closeHandshake) clearTimeout(closeHandshake)
  closeHandshake = null
  closeRequested = false
  quitting = false
  finishingClose = false
  workspace.error(message)
  mainWindow?.webContents.send('notes:close-cancelled')
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  } else floating?.resume()
}

function beginCloseHandshake(): void {
  if (!mainWindow) return
  closeRequested = true
  mainWindow.webContents.send('notes:before-close')
  if (closeHandshake) clearTimeout(closeHandshake)
  closeHandshake = setTimeout(() => {
    cancelClose('笔记窗口未完成保存，退出已取消。请重试保存后退出。')
  }, 20_000)
}

function requestQuit(): void {
  if (quitting) return
  quitting = true
  floating?.suspend()
  if (mainWindow && shellAlive && !mainWindow.webContents.isLoading()) {
    beginCloseHandshake()
  } else finishClose()
}

function finishClose(): void {
  if (finishingClose) return
  finishingClose = true
  if (closeHandshake) clearTimeout(closeHandshake)
  void Promise.all([workspace.flush(), floating ? floating.flush() : screenRepository.flush()])
    .then(async () => {
      if (quitting) {
        closing = true
        if (process.platform === 'linux') await floating?.stopSessionObserver()
        floating?.dispose()
        await screenRepository
          ?.close()
          .catch((error: unknown) => console.error('[notebook:close]', error))
        mainWindow?.close()
        app.quit()
      } else {
        closeRequested = false
        mainWindow?.webContents.send('notes:close-cancelled')
        mainWindow?.hide()
        void showFloating()
      }
      finishingClose = false
    })
    .catch((error: unknown) => {
      console.error('[notes:close-save]', error)
      cancelClose('保存未完成，退出已取消。请重试保存或导出备份。')
      floating?.notifySaveFailure()
    })
}

async function forceQuit(): Promise<void> {
  const result = await dialog.showMessageBox({
    type: 'warning',
    title: '异常退出',
    message: '退出后，尚未保存的修改会丢失。',
    detail:
      '请先在编辑器导出“当前修改备份”，或在悬浮条“更多”中备份草稿。已保存的笔记和原文件会保留。',
    buttons: ['返回继续处理', '仍然退出'],
    defaultId: 0,
    cancelId: 0,
  })
  if (result.response !== 1) return
  quitting = true
  closing = true
  if (closeHandshake) clearTimeout(closeHandshake)
  if (process.platform === 'linux') await floating?.stopSessionObserver()
  floating?.dispose()
  mainWindow?.destroy()
  app.quit()
}

function createBrowser(window: BrowserWindow): WebContentsView {
  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(currentDirectory, 'pagePreload.cjs'),
      partition: 'persist:mindnotes-pages',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  window.contentView.addChildView(view)
  view.setVisible(false)
  const contents = view.webContents
  restrictPagePermissions(contents.session)
  const restrictNavigation = (event: Electron.Event, url: string) => {
    try {
      normalizePageUrl(url)
    } catch {
      event.preventDefault()
    }
  }
  contents.on('will-navigate', restrictNavigation)
  contents.on('will-redirect', restrictNavigation)
  contents.setWindowOpenHandler(({ url }) => {
    try {
      void navigate(normalizePageUrl(url))
    } catch {
      /* Unsupported protocols stay blocked. */
    }
    return { action: 'deny' }
  })
  contents.on('did-start-navigation', (_event, url, _inPlace, isMainFrame) => {
    if (!isMainFrame) return
    pageReady = false
    try {
      workspace.open(url, '')
    } catch {
      /* Internal initial pages have no notebook. */
    }
  })
  contents.on('dom-ready', async () => {
    if (!workspace.snapshot.currentUrl) return
    try {
      await contents.executeJavaScript(pageInjectionSource())
    } catch (error) {
      console.error('[notes:injection]', error)
      workspace.error('当前页面无法加载批注层，请刷新重试。')
    }
  })
  contents.on('did-navigate', (_event, url) => {
    try {
      workspace.open(url, contents.getTitle())
    } catch {
      /* Ignore internal pages. */
    }
    syncBrowser()
  })
  contents.on('did-navigate-in-page', async (_event, url, isMainFrame) => {
    if (!isMainFrame) return
    try {
      workspace.open(url, contents.getTitle())
      pageReady = true
      await contents.executeJavaScript(pageInjectionSource())
      broadcast()
    } catch {
      /* The previous document remains readable. */
    }
    syncBrowser()
  })
  contents.on('page-title-updated', (_event, title) => {
    if (!workspace.snapshot.currentUrl) return
    try {
      workspace.open(contents.getURL(), title)
    } catch {
      /* Ignore blank page. */
    }
  })
  contents.on('did-start-loading', syncBrowser)
  contents.on('did-stop-loading', syncBrowser)
  contents.on('did-fail-load', (_event, errorCode, _description, _url, isMainFrame) => {
    if (isMainFrame && errorCode !== -3)
      workspace.error('网页暂时无法打开，请检查地址或网络后重试。')
    syncBrowser()
  })
  contents.on('render-process-gone', () => {
    pageReady = false
    workspace.error('网页进程已退出，请点击刷新重新打开。')
  })
  contents.on('context-menu', (_event, params) => {
    const items: Electron.MenuItemConstructorOptions[] = []
    if (params.selectionText.trim() && !params.isEditable)
      items.push(
        {
          label: '摘录到 MindNotes Pro',
          click: () => {
            void runCommand('capture')
          },
        },
        { type: 'separator' }
      )
    if (params.isEditable) items.push({ role: 'cut' }, { role: 'copy' }, { role: 'paste' })
    else if (params.selectionText) items.push({ role: 'copy' })
    if (!items.length)
      items.push({
        label: '刷新网页',
        click: () => {
          contents.reload()
        },
      })
    Menu.buildFromTemplate(items).popup({ window })
  })
  return view
}

async function loadShell(window: BrowserWindow): Promise<void> {
  if (shellLoad) return shellLoad
  const pending = (async () => {
    shellAlive = false
    viewport = null
    layoutBrowser()
    if (app.isPackaged || process.env.MINDNOTES_USE_DIST === '1')
      await window.loadFile(path.join(currentDirectory, '../../dist/index.html'))
    else await window.loadURL(process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:3000')
    if (mainWindow === window && !window.isDestroyed()) {
      shellAlive = true
      broadcast()
    }
  })()
  shellLoad = pending
  try {
    await pending
  } finally {
    if (shellLoad === pending) shellLoad = null
  }
}

async function recoverShell(window: BrowserWindow): Promise<void> {
  // Bound automatic retries; reopening the library explicitly starts another attempt.
  if (Date.now() - lastShellRecovery < 30_000) {
    window.hide()
    await showFloating()
    return
  }
  lastShellRecovery = Date.now()
  try {
    await loadShell(window)
  } catch (error) {
    console.error('[notes:shell-recovery]', error)
    if (!window.isDestroyed()) window.hide()
    await showFloating()
  }
}

async function createMainWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 1380,
    height: 920,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#f5f5f0',
    show: false,
    autoHideMenuBar: true,
    title: 'MindNotes Pro · 我的笔记',
    webPreferences: {
      preload: path.join(currentDirectory, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  mainWindow = window
  shellAlive = true
  lastShellRecovery = 0
  closeRequested = false
  window.webContents.on('render-process-gone', () => {
    if (closing || mainWindow !== window) return
    shellAlive = false
    viewport = null
    workspace.configure('browse', workspace.snapshot.color)
    workspace.error('笔记窗口异常中断，已保存的笔记仍保留；尚未保存的输入可能丢失。')
    layoutBrowser()
    if (closeRequested) finishClose()
    else
      void recoverShell(window).catch((error: unknown) => console.error('[notes:recover]', error))
  })
  window.webContents.on('did-finish-load', () => {
    if (mainWindow !== window) return
    shellAlive = true
    broadcast()
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => {
    event.preventDefault()
  })
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape' && workspace.snapshot.currentUrl) {
      event.preventDefault()
      workspace.configure('browse', workspace.snapshot.color)
    }
  })
  window.on('resize', layoutBrowser)
  window.on('close', (event) => {
    if (closing) return
    event.preventDefault()
    if (startWorkspace && !floating) {
      requestQuit()
      return
    }
    if (closeRequested) return
    if (shellAlive) beginCloseHandshake()
    else finishClose()
  })
  window.on('closed', () => {
    browserView?.webContents.close()
    browserView = null
    mainWindow = null
    viewport = null
  })
  await loadShell(window)
}

if (process.env.MINDNOTES_USER_DATA_DIR)
  app.setPath('userData', process.env.MINDNOTES_USER_DATA_DIR)
const hasLock = app.requestSingleInstanceLock()
if (!hasLock) app.quit()
else {
  app.on('second-instance', () => {
    if (mainWindow?.isVisible()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    } else void showFloating()
  })
  void app
    .whenReady()
    .then(async () => {
      Menu.setApplicationMenu(null)
      repository = new NotebookRepository(app.getPath('userData'))
      workspace = new NotesWorkspace(repository, broadcast)
      await workspace.load()
      screenRepository = new ScreenNotebookRepository(app.getPath('userData'))
      screenNotebook = new ScreenNotebookService({
        repository: screenRepository,
        window: () => mainWindow,
        compose: async (source) => {
          if (!mainWindow || mainWindow.webContents.isDestroyed())
            throw new Error('笔记窗口未就绪。')
          const image: unknown = await mainWindow.webContents.executeJavaScript(source)
          if (typeof image !== 'string') throw new Error('无法生成批注图片。')
          return image
        },
      })
      registerIpc()
      screenNotebook.register()
      if (startWorkspace) await showWorkspace()
      else await showFloating()
      app.on('activate', () => {
        if (!quitting) void showFloating()
      })
    })
    .catch(async (error: unknown) => {
      console.error('[notes:startup]', error)
      closing = true
      if (process.platform === 'linux') await floating?.stopSessionObserver()
      floating?.dispose()
      app.quit()
    })
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
  app.on('before-quit', (event) => {
    if (closing) return
    event.preventDefault()
    requestQuit()
  })
}
