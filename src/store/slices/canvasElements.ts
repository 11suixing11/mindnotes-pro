import type { CanvasElement, UndoAction } from '../types'
import { moveElement, resizeElement } from '../types'
import { shallowClone, snapshot } from '../helpers'
import { scheduleSave } from '../saveManager'
import { MAX_HISTORY } from './history'

export interface CanvasElementsState {
  elements: CanvasElement[]
  selectedIds: string[]
  clipboard: CanvasElement[]
}

export interface CanvasElementsActions {
  addElement: (el: CanvasElement) => void
  addElements: (els: CanvasElement[]) => void
  updateElement: (id: string, update: (el: CanvasElement) => CanvasElement) => void
  removeElement: (id: string) => void
  removeElements: (ids: string[]) => void
  moveElementById: (id: string, dx: number, dy: number) => void
  moveElementsById: (ids: string[], dx: number, dy: number) => void
  resizeElementById: (id: string, ax: number, ay: number, sx: number, sy: number) => void
  clearAll: () => void
  setSelectedIds: (ids: string[]) => void
  copySelected: () => void
  paste: () => void
  batchErase: (beforeSnap: CanvasElement[], added: CanvasElement[]) => void
}

export function createCanvasElementsSlice(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: any
): CanvasElementsState & CanvasElementsActions {
  return {
    // State
    elements: [],
    selectedIds: [],
    clipboard: [],

    // Actions
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((s: any) => ({
        elements: s.elements.map((el: CanvasElement) => (el.id === id ? update(el) : el)),
      }))
      scheduleSave()
    },

    removeElement: (id) => {
      const st = get()
      const idx = st.elements.findIndex((e: CanvasElement) => e.id === id)
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
        selectedIds: st.selectedIds.filter((i: string) => i !== id),
      })
      scheduleSave()
    },

    removeElements: (ids) => {
      const st = get()
      const idSet = new Set(ids)
      const items: { el: CanvasElement; index: number }[] = []
      st.elements.forEach((el: CanvasElement, i: number) => {
        if (idSet.has(el.id)) items.push({ el: shallowClone(el), index: i })
      })
      const action: UndoAction = { type: 'remove', items }
      set({
        elements: st.elements.filter((e: CanvasElement) => !idSet.has(e.id)),
        undoStack: [...st.undoStack.slice(-MAX_HISTORY), action],
        redoStack: [],
        selectedIds: [],
      })
      scheduleSave()
    },

    moveElementById: (id, dx, dy) => {
      // P0 性能优化: 跳过无意义的移动
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((s: any) => {
        // P0 性能优化: 快速路径 - 先检查元素是否存在
        const targetEl = s.elements.find((el: CanvasElement) => el.id === id)
        if (!targetEl) return s
        
        return {
          elements: s.elements.map((el: CanvasElement) =>
            el.id === id ? moveElement(el, dx, dy) : el
          ),
        }
      })
      scheduleSave()
    },

    moveElementsById: (ids, dx, dy) => {
      // P0 性能优化: 跳过无意义的移动
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return
      if (ids.length === 0) return
      
      const idSet = new Set(ids)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((s: any) => {
        // P0 性能优化: 快速检查是否有元素需要移动
        const hasMatch = s.elements.some((el: CanvasElement) => idSet.has(el.id))
        if (!hasMatch) return s
        
        return {
          elements: s.elements.map((el: CanvasElement) =>
            idSet.has(el.id) ? moveElement(el, dx, dy) : el
          ),
        }
      })
      scheduleSave()
    },

    resizeElementById: (id, ax, ay, sx, sy) => {
      // P0 性能优化: 跳过无意义的缩放
      if (Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) return
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((s: any) => {
        // P0 性能优化: 快速路径 - 先检查元素是否存在
        const targetEl = s.elements.find((el: CanvasElement) => el.id === id)
        if (!targetEl) return s
        
        return {
          elements: s.elements.map((el: CanvasElement) =>
            el.id === id ? resizeElement(el, ax, ay, sx, sy) : el
          ),
        }
      })
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

    copySelected: () => {
      const { elements, selectedIds } = get()
      if (selectedIds.length === 0) return
      const selSet = new Set(selectedIds)
      const copied = elements.filter((e: CanvasElement) => selSet.has(e.id)).map(shallowClone)
      set({ clipboard: copied })
    },

    paste: () => {
      const { clipboard, elements } = get()
      if (clipboard.length === 0) return
      const now = Date.now()
      const newIds: string[] = []
      const pasted = clipboard.map((el: CanvasElement, i: number) => {
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
  }
}
