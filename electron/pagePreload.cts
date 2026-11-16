import type * as ElectronApi from 'electron'
const { contextBridge, ipcRenderer } = require('electron') as typeof ElectronApi
import type { PageBridge, PageOverlayState } from '../src/notes/desktop.js'

if (process.isMainFrame) {
  const bridge: PageBridge = {
    ready: () => {
      ipcRenderer.send('page:ready')
    },
    edit: (edit) => {
      ipcRenderer.send('page:edit', edit)
    },
    reportPositions: (unresolvedIds) => ipcRenderer.send('page:positions', unresolvedIds),
    subscribe(listener) {
      const receive = (_event: Electron.IpcRendererEvent, state: PageOverlayState) =>
        listener(state)
      ipcRenderer.on('page:state', receive)
      return () => {
        ipcRenderer.removeListener('page:state', receive)
      }
    },
  }
  contextBridge.exposeInMainWorld('__mindnotesPage', bridge)
}
