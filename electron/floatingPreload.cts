import type * as ElectronApi from 'electron'
import type {
  FloatingBridge,
  FloatingState,
  ScreenInkBridge,
  ScreenInkState,
} from '../src/notes/floating.js'
const { contextBridge, ipcRenderer } = require('electron') as typeof ElectronApi

function subscribe<T>(listener: (state: T) => void): () => void {
  const receive = (_event: Electron.IpcRendererEvent, state: T) => listener(state)
  ipcRenderer.on('floating:changed', receive)
  return () => ipcRenderer.removeListener('floating:changed', receive)
}

if (process.argv.includes('--mindnotes-surface=toolbar')) {
  const bridge: FloatingBridge = {
    surface: 'toolbar',
    getState: () => ipcRenderer.invoke('floating:state') as Promise<FloatingState>,
    subscribe,
    configure: (tool, color, size) => ipcRenderer.invoke('floating:configure', tool, color, size),
    command: (command) => ipcRenderer.invoke('floating:command', command),
  }
  contextBridge.exposeInMainWorld('mindnotesFloating', bridge)
} else {
  const bridge: ScreenInkBridge = {
    surface: 'screen',
    getState: () => ipcRenderer.invoke('floating:state') as Promise<ScreenInkState>,
    subscribe,
    addStroke: (stroke) => ipcRenderer.invoke('floating:stroke', stroke),
    erase: (points) => ipcRenderer.invoke('floating:erase', points),
    releasePointer: () => ipcRenderer.send('floating:release'),
  }
  contextBridge.exposeInMainWorld('mindnotesScreen', bridge)
}
