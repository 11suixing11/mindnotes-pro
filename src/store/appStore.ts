import { create } from 'zustand'
import type { CanvasElement, CanvasDoc, CanvasFolder, ToolType, BrushType, UndoAction } from './types'
import { moveElement, resizeElement } from './types'
import * as storage from './storage'
import { useViewStore } from './useViewStore'
import { shallowClone, snapshot, applyMoveDelta, reverseMoveDelta } from './helpers'
import { migrateOld, removeMigratedData } from './migration'
import { initSaveManager, scheduleSave, saveDocNow, clearSaveTimer } from './saveManager'

const MAX_HISTORY = 50

interface AppState {
  elements: CanvasElement[]
  tool: ToolType
  brush: BrushType
  color: string
  fillColor: string
  size: number
  bgColor: string
  selectedIds: string[]
  clipboard: CanvasElement[]
  undoStack: UndoAction[]
  redoStack: UndoAction[]

  docs: CanvasDoc[]
  folders: CanvasFolder[]
  currentDocId: string | null
  loaded: boolean
  sidebarOpen: boolean
  saveStatus: 'idle' | 'saving' | 'saved'
}

interface AppActions {
  init: () => Promise<void>
  setTool: (t: ToolType) => void
  setBrush: (b: BrushType) => void
  setColor: (c: string) => void
  setFillColor: (c: string) => void
  setSize: (s: number) => void
  setBgColor: (c: string) => void
  setSelectedIds: (ids: string[]) => void
  addElement: (el: CanvasElement) => void
  addElements: (els: CanvasElement[]) => void
  updateElement: (id: string, update: (el: CanvasElement) => CanvasElement) => void
  removeElement: (id: string) => void
  removeElements: (ids: string[]) => void
  moveElementById: (id: string, dx: number, dy: number) => void
  moveElementsById: (ids: string[], dx: number, dy: number) => void
  resizeElementById: (id: string, ax: number, ay: number, sx: number, sy: number) => void
  clearAll: () => void
  undo: () => void
  redo: () => void
  pushUndo: (action: UndoAction) => void
  copySelected: () => void
  paste: () => void
  createDoc: (title?: string, folderId?: string | null) => Promise<string>
  openDoc: (id: string) => Promise<void>
  renameDoc: (id: string, title: string) => Promise<void>
  deleteDoc: (id: string) => Promise<void>
  duplicateDoc: (id: string) => Promise<void>
  createFolder: (name: string, parentId?: string | null) => Promise<string>
  renameFolder: (id: string, name: string) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  toggleFolder: (id: string) => void
  setSidebarOpen: (open: boolean) => void
  batchErase: (beforeSnap: CanvasElement[], added: CanvasElement[]) => void
  saveNow: () => Promise<void>
}

export const useAppStore = create<AppState & AppActions>((set, get) => {
  // Initialize save manager with store reference
  const storeApi = { getState: get, setState: set }
  initSaveManager(storeApi)

  return {
    elements: [],
    tool: 'pen',
    brush: 'pen',
    color: '#2c2416',
    fillColor: 'transparent',
    size: 4,
    bgColor: '#ffffff',
    selectedIds: [],
    clipboard: [],
    undoStack: [],
    redoStack: [],
    docs: [],
    folders: [],
    currentDocId: null,
    loaded: false,
    sidebarOpen: true,
    saveStatus: 'idle',

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
              {
                type: 'text',
                id: `txt-${now}`,
                x: 80,
                y: 60,
                width: 500,
                height: 120,
                content: '# 欢迎使用 MindNotes\n\n温暖纸笔化风格笔记本，支持自由绘图、形状绘制和文字记录。\n\n点击左上角按钮探索更多功能。',
                fontSize: 16,
                color: '#2c2416',
              },
            ],
            bgColor: '#ffffff',
            folderId: null,
            createdAt: now,
            updatedAt: now,
          }
          await storage.put('docs', welcome)
          docs = [welcome]
        }
      }

      if (folders.length === 0) {
        await storage.put('folders', {
          id: 'folder-default',
          name: '我的笔记',
          parentId: null,
          order: 0,
          expanded: true,
        } as CanvasFolder)
        folders = await storage.getAll<CanvasFolder>('folders')
      }

      docs.sort((a, b) => b.updatedAt - a.updatedAt)
      const current = docs[0]

      set({
        docs,
        folders,
        currentDocId: current?.id ?? null,
        elements: current?.elements ?? [],
        bgColor: current?.bgColor ?? '#ffffff',
        undoStack: current?.undoStack ?? [],
        redoStack: current?.redoStack ?? [],
        loaded: true,
      })

      removeMigratedData()
    },

    setTool: (t) => set({ tool: t }),
    setBrush: (b) => set({ brush: b }),
    setColor: (c) => set({ color: c }),
    setFillColor: (c) => set({ fillColor: c }),
    setSize: (s) => set({ size: s }),
    setBgColor: (c) => {
      set({ bgColor: c })
      scheduleSave()
    },
    setSelectedIds: (ids) => set({ selectedIds: ids }),

    addElement: (el) => {
      const st = get()
      const action: UndoAction = { type: 'add', ids: [el.id], els: [shallowClone(el)] }
      set({
        elements: [...st.elements, el],
        undoStack: [...st.undoStack.slice(-MAX_HISTORY), action],
        redoStack: [],
      })
      scheduleSave()
    },

    addElements: (els) => {
      const st = get()
      const action: UndoAction = {
        type: 'add',
        ids: els.map((e) => e.id),
        els: els.map(shallowClone),
      }
      set({
        elements: [...st.elements, ...els],
        undoStack: [...st.undoStack.slice(-MAX_HISTORY), action],
        redoStack: [],
      })
      scheduleSave()
    },

    updateElement: (id, update) => {
      set((s) => ({
        elements: s.elements.map((el) => (el.id === id ? update(el) : el)),
      }))
      scheduleSave()
    },

    removeElement: (id) => {
      const st = get()
      const idx = st.elements.findIndex((e) => e.id === id)
      if (idx < 0) return
      const el = st.elements[idx]
      const action: UndoAction = {
        type: 'remove',
        items: [{ el: shallowClone(el), index: idx }],
      }
      const next = [...st.elements]
      next.splice(idx, 1)
      set({
        elements: next,
        undoStack: [...st.undoStack.slice(-MAX_HISTORY), action],
        redoStack: [],
        selectedIds: st.selectedIds.filter((i) => i !== id),
      })
      scheduleSave()
    },

    removeElements: (ids) => {
      const st = get()
      const idSet = new Set(ids)
      const items: { el: CanvasElement; index: number }[] = []
      st.elements.forEach((el, i) => {
        if (idSet.has(el.id)) items.push({ el: shallowClone(el), index: i })
      })
      const action: UndoAction = { type: 'remove', items }
      set({
        elements: st.elements.filter((e) => !idSet.has(e.id)),
        undoStack: [...st.undoStack.slice(-MAX_HISTORY), action],
        redoStack: [],
        selectedIds: [],
      })
      scheduleSave()
    },

    moveElementById: (id, dx, dy) => {
      set((s) => ({
        elements: s.elements.map((el) => (el.id === id ? moveElement(el, dx, dy) : el)),
      }))
      scheduleSave()
    },

    moveElementsById: (ids, dx, dy) => {
      const idSet = new Set(ids)
      set((s) => ({
        elements: s.elements.map((el) => (idSet.has(el.id) ? moveElement(el, dx, dy) : el)),
      }))
      scheduleSave()
    },

    resizeElementById: (id, ax, ay, sx, sy) => {
      set((s) => ({
        elements: s.elements.map((el) => (el.id === id ? resizeElement(el, ax, ay, sx, sy) : el)),
      }))
      scheduleSave()
    },

    clearAll: () => {
      const st = get()
      const action: UndoAction = { type: 'clear', snapshot: snapshot(st.elements) }
      set({
        elements: [],
        undoStack: [...st.undoStack.slice(-MAX_HISTORY), action],
        redoStack: [],
        selectedIds: [],
      })
      scheduleSave()
    },

    undo: () => {
      const { undoStack, redoStack, elements } = get()
      if (undoStack.length === 0) return
      const action = undoStack[undoStack.length - 1]
      let next: CanvasElement[]
      let redoAction: UndoAction

      if (action.type === 'add') {
        const idSet = new Set((action.els ?? []).map((e) => e.id))
        next = elements.filter((e) => !idSet.has(e.id))
        redoAction = { type: 'add', ids: action.ids, els: (action.els ?? []).map(shallowClone) }
      } else if (action.type === 'remove') {
        next = [...elements]
        for (const { el, index } of [...action.items].sort((a, b) => a.index - b.index)) {
          next.splice(index, 0, el)
        }
        redoAction = {
          type: 'remove',
          items: action.items.map((i) => ({ el: shallowClone(i.el), index: i.index })),
        }
      } else if (action.type === 'move') {
        const deltaMap = new Map(action.deltas.map((d) => [d.id, d]))
        next = elements.map((e) => {
          const d = deltaMap.get(e.id)
          return d ? reverseMoveDelta(e, d.dx, d.dy) : e
        })
        redoAction = action
      } else if (action.type === 'erase') {
        next = action.before
        redoAction = action
      } else {
        next = action.snapshot
        redoAction = { type: 'clear', snapshot: snapshot(elements) }
      }

      set({
        elements: next,
        redoStack: [...redoStack, redoAction],
        undoStack: undoStack.slice(0, -1),
        selectedIds: [],
      })
      scheduleSave()
    },

    redo: () => {
      const { redoStack, elements, undoStack } = get()
      if (redoStack.length === 0) return
      const action = redoStack[redoStack.length - 1]
      let next: CanvasElement[]
      let undoAction: UndoAction

      if (action.type === 'add') {
        next = [...elements, ...(action.els ?? []).map(shallowClone)]
        undoAction = { type: 'add', ids: action.ids, els: (action.els ?? []).map(shallowClone) }
      } else if (action.type === 'remove') {
        const idSet = new Set(action.items.map((i) => i.el.id))
        next = elements.filter((e) => !idSet.has(e.id))
        undoAction = {
          type: 'remove',
          items: action.items.map((i) => ({ el: shallowClone(i.el), index: i.index })),
        }
      } else if (action.type === 'move') {
        const deltaMap = new Map(action.deltas.map((d) => [d.id, d]))
        next = elements.map((e) => {
          const d = deltaMap.get(e.id)
          return d ? applyMoveDelta(e, d.dx, d.dy) : e
        })
        undoAction = action
      } else if (action.type === 'erase') {
        next = action.after
        undoAction = action
      } else {
        next = action.snapshot
        undoAction = { type: 'clear', snapshot: snapshot(elements) }
      }

      set({
        elements: next,
        redoStack: redoStack.slice(0, -1),
        undoStack: [...undoStack, undoAction],
        selectedIds: [],
      })
      scheduleSave()
    },

    pushUndo: (action) => {
      const state = get()
      set({ undoStack: [...state.undoStack.slice(-MAX_HISTORY), action], redoStack: [] })
    },

    copySelected: () => {
      const { elements, selectedIds } = get()
      if (selectedIds.length === 0) return
      const selSet = new Set(selectedIds)
      const copied = elements.filter((e) => selSet.has(e.id)).map(shallowClone)
      set({ clipboard: copied })
    },

    paste: () => {
      const { clipboard, elements } = get()
      if (clipboard.length === 0) return
      const now = Date.now()
      const newIds: string[] = []
      const pasted = clipboard.map((el, i) => {
        const newId = `${el.type}-${now}-${i}`
        newIds.push(newId)
        return moveElement({ ...el, id: newId }, 20, 20)
      })
      const action: UndoAction = { type: 'add', ids: newIds, els: pasted.map(shallowClone) }
      set({
        elements: [...elements, ...pasted],
        selectedIds: newIds,
        clipboard: pasted.map(shallowClone),
        undoStack: [...get().undoStack.slice(-MAX_HISTORY), action],
        redoStack: [],
      })
      scheduleSave()
    },

    createDoc: async (title = '未命名画布', folderId = null) => {
      const id = `doc-${Date.now()}`
      const now = Date.now()
      const doc: CanvasDoc = {
        id,
        title,
        elements: [],
        bgColor: '#ffffff',
        folderId,
        createdAt: now,
        updatedAt: now,
      }
      await storage.put('docs', doc)
      const docs = (await storage.getAll<CanvasDoc>('docs')).sort((a, b) => b.updatedAt - a.updatedAt)
      set({
        docs,
        currentDocId: id,
        elements: [],
        bgColor: '#ffffff',
        undoStack: [],
        redoStack: [],
        selectedIds: [],
      })
      return id
    },

    openDoc: async (id) => {
      clearSaveTimer()
      const state = get()
      if (state.currentDocId) await saveDocNow()
      const doc = await storage.get<CanvasDoc>('docs', id)
      if (doc) {
        set({
          currentDocId: id,
          elements: doc.elements,
          bgColor: doc.bgColor,
          undoStack: doc.undoStack ?? [],
          redoStack: doc.redoStack ?? [],
          selectedIds: [],
        })
        useViewStore.getState().resetView()
      }
    },

    renameDoc: async (id, title) => {
      const doc = await storage.get<CanvasDoc>('docs', id)
      if (doc) {
        await storage.put('docs', { ...doc, title, updatedAt: Date.now() })
        set({ docs: (await storage.getAll<CanvasDoc>('docs')).sort((a, b) => b.updatedAt - a.updatedAt) })
      }
    },

    deleteDoc: async (id) => {
      await storage.del('docs', id)
      const { currentDocId } = get()
      const docs = (await storage.getAll<CanvasDoc>('docs')).sort((a, b) => b.updatedAt - a.updatedAt)
      if (currentDocId === id) {
        const first = docs[0]
        set({
          docs,
          currentDocId: first?.id ?? null,
          elements: first?.elements ?? [],
          bgColor: first?.bgColor ?? '#ffffff',
          undoStack: [],
          redoStack: [],
        })
      } else {
        set({ docs })
      }
    },

    duplicateDoc: async (id) => {
      const doc = await storage.get<CanvasDoc>('docs', id)
      if (!doc) return
      const now = Date.now()
      const dup: CanvasDoc = {
        ...doc,
        id: `doc-${now}`,
        title: `${doc.title} (副本)`,
        createdAt: now,
        updatedAt: now,
      }
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
      if (folder) {
        await storage.put('folders', { ...folder, name })
        set({ folders: await storage.getAll<CanvasFolder>('folders') })
      }
    },

    deleteFolder: async (id) => {
      await storage.del('folders', id)
      set({ folders: await storage.getAll<CanvasFolder>('folders') })
    },

    toggleFolder: (id) => {
      set((s) => ({
        folders: s.folders.map((f) => (f.id === id ? { ...f, expanded: !f.expanded } : f)),
      }))
    },

    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    batchErase: (beforeSnap, _added) => {
      const action: UndoAction = {
        type: 'erase',
        before: beforeSnap.map(shallowClone),
        after: get().elements.map(shallowClone),
      }
      set({
        elements: get().elements,
        undoStack: [...get().undoStack.slice(-MAX_HISTORY), action],
        redoStack: [],
        selectedIds: [],
      })
      scheduleSave()
    },

    setSaveStatus: (s: 'idle' | 'saving' | 'saved') => set({ saveStatus: s }),
    saveNow: async () => {
      await saveDocNow()
    },
  }
})
