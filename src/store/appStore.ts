import { create } from 'zustand'
import type { CanvasElement, CanvasDoc, CanvasFolder, ToolType, BrushType, ShapeKind } from './types'
import { moveElement, resizeElement, elementBounds } from './types'
import * as storage from './storage'
import { useViewStore } from './useViewStore'

const SAVE_DELAY = 1500
const MAX_HISTORY = 50
const MIGRATE_KEY = 'mindnotes-drawing-data'

type Snapshot = CanvasElement[]

interface AppState {
  // Canvas
  elements: CanvasElement[]
  tool: ToolType
  brush: BrushType
  color: string
  size: number
  bgColor: string
  selectedId: string | null
  undoStack: Snapshot[]
  redoStack: Snapshot[]

  // Docs
  docs: CanvasDoc[]
  folders: CanvasFolder[]
  currentDocId: string | null
  loaded: boolean
  sidebarOpen: boolean
}

interface AppActions {
  // Init
  init: () => Promise<void>

  // Tools
  setTool: (t: ToolType) => void
  setBrush: (b: BrushType) => void
  setColor: (c: string) => void
  setSize: (s: number) => void
  setBgColor: (c: string) => void
  setSelectedId: (id: string | null) => void

  // Elements
  addElement: (el: CanvasElement) => void
  addElements: (els: CanvasElement[]) => void
  updateElement: (id: string, update: (el: CanvasElement) => CanvasElement) => void
  removeElement: (id: string) => void
  moveElementById: (id: string, dx: number, dy: number) => void
  resizeElementById: (id: string, ax: number, ay: number, sx: number, sy: number) => void
  clearAll: () => void
  undo: () => void
  redo: () => void

  // Docs
  createDoc: (title?: string, folderId?: string | null) => Promise<string>
  openDoc: (id: string) => Promise<void>
  renameDoc: (id: string, title: string) => Promise<void>
  deleteDoc: (id: string) => Promise<void>
  duplicateDoc: (id: string) => Promise<void>

  // Folders
  createFolder: (name: string, parentId?: string | null) => Promise<string>
  renameFolder: (id: string, name: string) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  toggleFolder: (id: string) => void

  // Sidebar
  setSidebarOpen: (open: boolean) => void

  // Save
  saveNow: () => Promise<void>
}

function snapshot(els: CanvasElement[]): Snapshot {
  return els.map((e) => ({ ...e, ...(e.type === 'stroke' ? { points: [...e.points.map((p) => [...p])] } : {}) }))
}

function calcWords(els: CanvasElement[]): number {
  return els.filter((e) => e.type === 'text').reduce((s, e) => s + ((e as any).content?.length || 0), 0)
}

function migrateOld(): CanvasDoc | null {
  try {
    const raw = localStorage.getItem(MIGRATE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    const elements: CanvasElement[] = []
    for (const s of data.strokes ?? []) {
      if (s.imageData) {
        elements.push({ type: 'image', id: s.id, x: s.points[0][0], y: s.points[0][1], width: s.imageWidth ?? 200, height: s.imageHeight ?? 200, dataUrl: s.imageData, opacity: s.opacity })
      } else if (s.name) {
        elements.push({ type: 'text', id: s.id, x: s.points[0][0], y: s.points[0][1], width: 200, height: 30, content: s.name, fontSize: Math.max(s.size * 4, 16), color: s.color })
      } else {
        elements.push({ type: 'stroke', id: s.id, points: s.points, color: s.color, size: s.size, brush: s.brush ?? 'pen', opacity: s.opacity })
      }
    }
    for (const s of data.shapes ?? []) {
      const sx = s.startX ?? s.x, sy = s.startY ?? s.y, ex = s.endX ?? s.x + s.width, ey = s.endY ?? s.y + s.height
      if (s.type === 'text') continue
      elements.push({ type: 'shape', id: s.id, kind: s.type, x: Math.min(sx, ex), y: Math.min(sy, ey), w: Math.abs(ex - sx), h: Math.abs(ey - sy), color: s.color, size: s.size })
    }
    if (elements.length === 0) return null
    const now = Date.now()
    return { id: `doc-${now}`, title: '我的画布', elements, bgColor: data.canvasBg ?? '#ffffff', createdAt: now, updatedAt: now }
  } catch { return null }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  elements: [],
  tool: 'pen',
  brush: 'pen',
  color: '#2c2416',
  size: 4,
  bgColor: '#ffffff',
  selectedId: null,
  undoStack: [],
  redoStack: [],
  docs: [],
  folders: [],
  currentDocId: null,
  loaded: false,
  sidebarOpen: true,

  init: async () => {
    let docs = await storage.getAll<CanvasDoc>('docs')
    let folders = await storage.getAll<CanvasFolder>('folders')

    if (docs.length === 0) {
      const migrated = migrateOld()
      if (migrated) {
        await storage.put('docs', migrated)
        docs = [migrated]
      } else {
        const now = Date.now()
        const welcome: CanvasDoc = {
          id: `doc-${now}`,
          title: '欢迎使用 MindNotes',
          elements: [
            { type: 'text', id: `txt-${now}`, x: 80, y: 60, width: 500, height: 120, content: '# 欢迎使用 MindNotes\n\n暖色纸纹画布笔记本。在这里你可以自由绘图、书写、记录。\n\n左侧边栏管理画布，右侧工具栏切换工具。', fontSize: 16, color: '#2c2416' },
          ],
          bgColor: '#ffffff',
          createdAt: now,
          updatedAt: now,
        }
        await storage.put('docs', welcome)
        docs = [welcome]
      }
    }

    if (folders.length === 0) {
      await storage.put('folders', { id: 'folder-default', name: '我的笔记', parentId: null, order: 0, expanded: true } as CanvasFolder)
      folders = await storage.getAll<CanvasFolder>('folders')
    }

    docs.sort((a, b) => b.updatedAt - a.updatedAt)
    const current = docs[0]
    set({ docs, folders, currentDocId: current?.id ?? null, elements: current?.elements ?? [], bgColor: current?.bgColor ?? '#ffffff', loaded: true })

    localStorage.removeItem(MIGRATE_KEY)
  },

  setTool: (t) => set({ tool: t, selectedId: null }),
  setBrush: (b) => set({ brush: b }),
  setColor: (c) => set({ color: c }),
  setSize: (s) => set({ size: s }),
  setBgColor: (c) => set({ bgColor: c }),
  setSelectedId: (id) => set({ selectedId: id }),

  addElement: (el) => {
    const state = get()
    const snap = snapshot(state.elements)
    const next = [...state.elements, el]
    set({ elements: next, undoStack: [...state.undoStack.slice(-MAX_HISTORY), snap], redoStack: [] })
    scheduleSave()
  },

  addElements: (els) => {
    const state = get()
    const snap = snapshot(state.elements)
    set({ elements: [...state.elements, ...els], undoStack: [...state.undoStack.slice(-MAX_HISTORY), snap], redoStack: [] })
    scheduleSave()
  },

  updateElement: (id, update) => {
    set((s) => ({ elements: s.elements.map((e) => e.id === id ? update(e) : e) }))
    scheduleSave()
  },

  removeElement: (id) => {
    const state = get()
    const snap = snapshot(state.elements)
    set({ elements: state.elements.filter((e) => e.id !== id), undoStack: [...state.undoStack.slice(-MAX_HISTORY), snap], redoStack: [], selectedId: state.selectedId === id ? null : state.selectedId })
    scheduleSave()
  },

  moveElementById: (id, dx, dy) => {
    set((s) => ({ elements: s.elements.map((e) => e.id === id ? moveElement(e, dx, dy) : e) }))
    scheduleSave()
  },

  resizeElementById: (id, ax, ay, sx, sy) => {
    set((s) => ({ elements: s.elements.map((e) => e.id === id ? resizeElement(e, ax, ay, sx, sy) : e) }))
    scheduleSave()
  },

  clearAll: () => {
    const state = get()
    const snap = snapshot(state.elements)
    set({ elements: [], undoStack: [...state.undoStack.slice(-MAX_HISTORY), snap], redoStack: [], selectedId: null })
    scheduleSave()
  },

  undo: () => {
    const { undoStack, elements, redoStack } = get()
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    set({ elements: prev, undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, snapshot(elements)], selectedId: null })
    scheduleSave()
  },

  redo: () => {
    const { redoStack, elements, undoStack } = get()
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    set({ elements: next, redoStack: redoStack.slice(0, -1), undoStack: [...undoStack, snapshot(elements)], selectedId: null })
    scheduleSave()
  },

  createDoc: async (title = '未命名画布', folderId = null) => {
    const id = `doc-${Date.now()}`
    const now = Date.now()
    const doc: CanvasDoc = { id, title, elements: [], bgColor: '#ffffff', createdAt: now, updatedAt: now }
    await storage.put('docs', doc)
    const docs = (await storage.getAll<CanvasDoc>('docs')).sort((a, b) => b.updatedAt - a.updatedAt)
    set({ docs, currentDocId: id, elements: [], bgColor: '#ffffff', undoStack: [], redoStack: [], selectedId: null })
    return id
  },

  openDoc: async (id) => {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
    const state = get()
    if (state.currentDocId) await saveDocNow()
    const doc = await storage.get<CanvasDoc>('docs', id)
    if (doc) {
      set({ currentDocId: id, elements: doc.elements, bgColor: doc.bgColor, undoStack: [], redoStack: [], selectedId: null })
      useViewStore.getState().resetView()
    }
  },

  renameDoc: async (id, title) => {
    const doc = await storage.get<CanvasDoc>('docs', id)
    if (doc) { await storage.put('docs', { ...doc, title, updatedAt: Date.now() }); set({ docs: (await storage.getAll<CanvasDoc>('docs')).sort((a, b) => b.updatedAt - a.updatedAt) }) }
  },

  deleteDoc: async (id) => {
    await storage.del('docs', id)
    const { currentDocId } = get()
    const docs = (await storage.getAll<CanvasDoc>('docs')).sort((a, b) => b.updatedAt - a.updatedAt)
    if (currentDocId === id) {
      const first = docs[0]
      set({ docs, currentDocId: first?.id ?? null, elements: first?.elements ?? [], bgColor: first?.bgColor ?? '#ffffff', undoStack: [], redoStack: [] })
    } else { set({ docs }) }
  },

  duplicateDoc: async (id) => {
    const doc = await storage.get<CanvasDoc>('docs', id)
    if (!doc) return
    const now = Date.now()
    const dup: CanvasDoc = { ...doc, id: `doc-${now}`, title: `${doc.title} (副本)`, createdAt: now, updatedAt: now }
    await storage.put('docs', dup)
    set({ docs: (await storage.getAll<CanvasDoc>('docs')).sort((a, b) => b.updatedAt - a.updatedAt) })
  },

  createFolder: async (name, parentId = null) => {
    const id = `folder-${Date.now()}`
    await storage.put('folders', { id, name, parentId, order: 0, expanded: true })
    set({ folders: await storage.getAll<CanvasFolder>('folders') })
    return id
  },

  renameFolder: async (id, name) => {
    const folder = await storage.get<CanvasFolder>('folders', id)
    if (folder) { await storage.put('folders', { ...folder, name }); set({ folders: await storage.getAll<CanvasFolder>('folders') }) }
  },

  deleteFolder: async (id) => {
    await storage.del('folders', id)
    set({ folders: await storage.getAll<CanvasFolder>('folders') })
  },

  toggleFolder: (id) => {
    set((s) => ({ folders: s.folders.map((f) => f.id === id ? { ...f, expanded: !f.expanded } : f) }))
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  saveNow: async () => { await saveDocNow() },
}))

async function saveDocNow() {
  const { currentDocId, elements, bgColor } = useAppStore.getState()
  if (!currentDocId) return
  const existing = await storage.get<CanvasDoc>('docs', currentDocId)
  const now = Date.now()
  await storage.put('docs', {
    id: currentDocId,
    title: existing?.title ?? '未命名画布',
    elements,
    bgColor,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  })
  const docs = (await storage.getAll<CanvasDoc>('docs')).sort((a, b) => b.updatedAt - a.updatedAt)
  useAppStore.setState({ docs })
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { saveDocNow() }, SAVE_DELAY)
}
