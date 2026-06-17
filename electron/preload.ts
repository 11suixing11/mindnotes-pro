import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 屏幕画笔控制
  closeOverlay: () => ipcRenderer.send('close-overlay'),
  clearCanvas: () => ipcRenderer.send('clear-canvas'),
  setPenColor: (color: string) => ipcRenderer.send('set-pen-color', color),
  setPenSize: (size: number) => ipcRenderer.send('set-pen-size', size),

  // 接收来自主进程的消息
  onClearCanvas: (callback: () => void) => {
    ipcRenderer.on('clear-canvas', callback)
  },
  onSetPenColor: (callback: (color: string) => void) => {
    ipcRenderer.on('set-pen-color', (_event, color) => callback(color))
  },
  onSetPenSize: (callback: (size: number) => void) => {
    ipcRenderer.on('set-pen-size', (_event, size) => callback(size))
  },
})
