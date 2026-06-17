import { app, BrowserWindow, ipcMain, globalShortcut, screen } from 'electron'
import * as path from 'path'

let mainWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let isOverlayVisible = false

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icon.png'),
    title: 'MindNotes Pro',
  })

  // 开发模式加载 localhost，生产模式加载打包后的文件
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createOverlayWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  overlayWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  // 加载覆盖层 HTML
  overlayWindow.loadFile(path.join(__dirname, 'overlay.html'))

  // 默认隐藏
  overlayWindow.hide()

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })
}

// 注册全局快捷键
function registerShortcuts() {
  // Ctrl+Shift+P 切换屏幕画笔
  globalShortcut.register('CommandOrControl+Shift+P', () => {
    if (!overlayWindow) return

    if (isOverlayVisible) {
      overlayWindow.hide()
      isOverlayVisible = false
    } else {
      overlayWindow.show()
      overlayWindow.focus()
      isOverlayVisible = true
    }
  })

  // Escape 关闭屏幕画笔
  globalShortcut.register('Escape', () => {
    if (overlayWindow && isOverlayVisible) {
      overlayWindow.hide()
      isOverlayVisible = false
    }
  })
}

// IPC 通信
ipcMain.on('close-overlay', () => {
  if (overlayWindow) {
    overlayWindow.hide()
    isOverlayVisible = false
  }
})

ipcMain.on('clear-canvas', () => {
  if (overlayWindow) {
    overlayWindow.webContents.send('clear-canvas')
  }
})

ipcMain.on('set-pen-color', (_event, color: string) => {
  if (overlayWindow) {
    overlayWindow.webContents.send('set-pen-color', color)
  }
})

ipcMain.on('set-pen-size', (_event, size: number) => {
  if (overlayWindow) {
    overlayWindow.webContents.send('set-pen-size', size)
  }
})

// 应用准备就绪
app.whenReady().then(() => {
  createMainWindow()
  createOverlayWindow()
  registerShortcuts()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

// 所有窗口关闭时
app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出时清理
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
