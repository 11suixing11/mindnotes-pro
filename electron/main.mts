import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
let mainWindow: BrowserWindow | null = null

function openExternalUrl(url: string): void {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      void shell.openExternal(parsed.toString())
    }
  } catch {
    // Invalid URLs stay blocked inside the desktop shell.
  }
}

async function createMainWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    title: 'MindNotes Pro',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  mainWindow = window

  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (url === window.webContents.getURL()) return
    event.preventDefault()
    openExternalUrl(url)
  })
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })

  if (app.isPackaged) {
    await window.loadFile(path.join(currentDirectory, '../dist/index.html'))
  } else {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:3000')
  }
}

void app.whenReady().then(async () => {
  await createMainWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
