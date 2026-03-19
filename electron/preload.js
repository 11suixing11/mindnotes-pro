const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  // 可以添加更多 IPC 通信方法
  onSave: (callback) => ipcRenderer.on('save-note', callback),
  onNew: (callback) => ipcRenderer.on('new-note', callback),
})
