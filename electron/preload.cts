import type * as ElectronApi from 'electron'
const { contextBridge, ipcRenderer } = require('electron') as typeof ElectronApi
import type { NotesBridge, NotesWorkspaceState } from '../src/notes/desktop.js'
import type {
  ScreenNotebookBridge,
  ScreenNotePatch,
  ScreenNoteReceipt,
} from '../src/notes/screenNotebook.js'

const pendingEdits = new Set<Promise<unknown>>()
const failedNotebookEdits = new Map<string, string>()
const notebookGenerations = new Map<string, number>()
let closingEdits = false

async function flushEdits(): Promise<void> {
  while (pendingEdits.size) await Promise.allSettled([...pendingEdits])
  if (failedNotebookEdits.size) throw new Error('屏幕笔记尚未保存，请返回编辑器重试保存。')
}
ipcRenderer.on('notes:before-close', () => {
  closingEdits = true
  void flushEdits().then(
    () => ipcRenderer.send('notes:close-ready'),
    () => ipcRenderer.send('notes:close-failed')
  )
})
ipcRenderer.on('notes:close-cancelled', () => {
  closingEdits = false
})

const bridge: NotesBridge = {
  isDesktop: true,
  getState: () => ipcRenderer.invoke('notes:state') as Promise<NotesWorkspaceState>,
  subscribe(listener) {
    const receive = (_event: Electron.IpcRendererEvent, state: NotesWorkspaceState) =>
      listener(state)
    ipcRenderer.on('notes:changed', receive)
    return () => {
      ipcRenderer.removeListener('notes:changed', receive)
    }
  },
  navigate: (url) => ipcRenderer.invoke('notes:navigate', url),
  setViewport: (rect) => {
    ipcRenderer.send('notes:viewport', rect)
  },
  command: (command) => ipcRenderer.invoke('notes:command', command),
  configure: (tool, color) => ipcRenderer.invoke('notes:configure', tool, color),
  updateAnnotation: (url, id, comment) => {
    if (closingEdits) return Promise.reject(new Error('正在完成保存，请稍候。'))
    const pending = ipcRenderer.invoke('notes:update', url, id, comment) as Promise<void>
    pendingEdits.add(pending)
    void pending.then(
      () => pendingEdits.delete(pending),
      () => pendingEdits.delete(pending)
    )
    return pending
  },
  deleteAnnotation: (id) => ipcRenderer.invoke('notes:delete', id),
  revealAnnotation: (id) => ipcRenderer.invoke('notes:reveal', id),
  exportNotes: (format, scope) => ipcRenderer.invoke('notes:export', format, scope),
  importNotes: (content) => {
    if (closingEdits) return Promise.reject(new Error('正在完成保存，请稍候。'))
    const pending = ipcRenderer.invoke('notes:import', content) as Promise<void>
    pendingEdits.add(pending)
    void pending.then(
      () => pendingEdits.delete(pending),
      () => pendingEdits.delete(pending)
    )
    return pending
  },
}

contextBridge.exposeInMainWorld('mindnotes', bridge)

interface NotebookEdits {
  patch: ScreenNotePatch | null
  failedPatch: ScreenNotePatch | null
  revision?: number
  saving: boolean
  timer: ReturnType<typeof setTimeout> | null
  waiters: { resolve(note: ScreenNoteReceipt): void; reject(reason: unknown): void }[]
}
const notebookQueues = new Map<string, NotebookEdits>()

function scheduleNotebookSave(id: string, edits: NotebookEdits): void {
  if (edits.saving || edits.timer || !edits.patch) return
  edits.timer = setTimeout(() => {
    edits.timer = null
    void saveNotebookEdits(id, edits)
  }, 120)
}

async function saveNotebookEdits(id: string, edits: NotebookEdits): Promise<void> {
  if (!edits.patch || edits.saving) return
  const patch = edits.patch
  const waiters = edits.waiters
  edits.patch = null
  edits.waiters = []
  edits.saving = true
  try {
    const saved = (await ipcRenderer.invoke('notebook:update', id, {
      ...patch,
      ...(edits.revision !== undefined ? { expectedRevision: edits.revision } : {}),
    })) as ScreenNoteReceipt
    edits.revision = saved.revision
    for (const waiter of waiters) waiter.resolve(saved)
  } catch (reason) {
    // Retain every failed field; subsequent typing retries it with the newest value.
    const newer = notebookQueues.get(id)?.patch
    if (newer) edits.patch = { ...patch, ...newer }
    else edits.failedPatch = patch
    for (const waiter of waiters) waiter.reject(reason)
  } finally {
    edits.saving = false
    if (!edits.patch && !edits.failedPatch) notebookQueues.delete(id)
    else scheduleNotebookSave(id, edits)
  }
}

const notebookBridge: ScreenNotebookBridge = {
  isDesktop: true,
  list: (query, offset, trash) => ipcRenderer.invoke('notebook:list', query, offset, trash),
  getNote: (id) => ipcRenderer.invoke('notebook:get', id),
  getImage: (id) => ipcRenderer.invoke('notebook:image', id),
  updateNote: (id, patch) => {
    if (closingEdits) return Promise.reject(new Error('正在完成保存，请稍候。'))
    const generation = (notebookGenerations.get(id) ?? 0) + 1
    notebookGenerations.set(id, generation)
    let edits = notebookQueues.get(id)
    if (!edits) {
      edits = { patch: null, failedPatch: null, saving: false, timer: null, waiters: [] }
      notebookQueues.set(id, edits)
    }
    edits.patch = { ...edits.failedPatch, ...edits.patch, ...patch }
    edits.failedPatch = null
    const pending = new Promise<ScreenNoteReceipt>((resolve, reject) => {
      edits.waiters.push({ resolve, reject })
    })
    pendingEdits.add(pending)
    const remove = () => {
      pendingEdits.delete(pending)
    }
    void pending.then(
      () => {
        if (generation === notebookGenerations.get(id)) failedNotebookEdits.delete(id)
        remove()
      },
      (error: unknown) => {
        if (generation === notebookGenerations.get(id)) failedNotebookEdits.set(id, String(error))
        remove()
      }
    )
    scheduleNotebookSave(id, edits)
    return pending
  },
  subscribe(listener) {
    const receive = () => listener()
    ipcRenderer.on('notebook:changed', receive)
    return () => ipcRenderer.removeListener('notebook:changed', receive)
  },
  exportNote: (id, format) => ipcRenderer.invoke('notebook:export', id, format),
  exportRecovery: (note, image) => ipcRenderer.invoke('notebook:export-recovery', note, image),
  exportAll: () => ipcRenderer.invoke('notebook:export-all'),
  importBackup: () => ipcRenderer.invoke('notebook:import'),
  flushEdits,
}
contextBridge.exposeInMainWorld('mindnotesNotebook', notebookBridge)
