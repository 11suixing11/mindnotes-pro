const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  onSave: (callback) => ipcRenderer.on('save-note', callback),
  onNew: (callback) => ipcRenderer.on('new-note', callback),
})
