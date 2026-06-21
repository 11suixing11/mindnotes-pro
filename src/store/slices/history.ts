import type { CanvasElement, UndoAction } from '../types'
import { shallowClone, snapshot, applyMoveDelta, reverseMoveDelta } from '../helpers'
import { scheduleSave } from '../saveManager'

export const MAX_HISTORY = 50

export interface HistoryState {
  undoStack: UndoAction[]
  redoStack: UndoAction[]
}

export interface HistoryActions {
  undo: () => void
  redo: () => void
  pushUndo: (action: UndoAction) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createHistorySlice(set: any, get: any): HistoryState & HistoryActions {
  return {
    // State
    undoStack: [],
    redoStack: [],

    // Actions
    pushUndo: (action) => {
      const state = get()
      set({ undoStack: [...state.undoStack.slice(-MAX_HISTORY), action], redoStack: [] })
    },

    undo: () => {
      const { undoStack, redoStack, elements } = get()
      if (undoStack.length === 0) return
      const action: UndoAction = undoStack[undoStack.length - 1]
      let next: CanvasElement[]
      let redoAction: UndoAction

      if (action.type === 'add') {
        const idSet = new Set((action.els ?? []).map((e: CanvasElement) => e.id))
        next = elements.filter((e: CanvasElement) => !idSet.has(e.id))
        redoAction = { type: 'add', ids: action.ids, els: (action.els ?? []).map(shallowClone) }
      } else if (action.type === 'remove') {
        next = [...elements]
        for (const { el, index } of [...action.items].sort((a, b) => a.index - b.index)) {
          next.splice(index, 0, el)
        }
        redoAction = {
          type: 'remove',
          items: action.items.map((i: { el: CanvasElement; index: number }) => ({
            el: shallowClone(i.el),
            index: i.index,
          })),
        }
      } else if (action.type === 'move') {
        const deltaMap = new Map(
          action.deltas.map((d: { id: string; dx: number; dy: number }) => [d.id, d])
        )
        next = elements.map((e: CanvasElement) => {
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
      // P0 修复: undo 后同步空间索引和 idToElement 映射
      const state = get()
      state.spatialIndex?.bulkLoad(next)
      // P1 修复: 同步 idToElement 映射，防止数据不一致
      state.idToElement?.clear()
      for (const el of next) {
        state.idToElement?.set(el.id, el)
      }
      scheduleSave()
    },

    redo: () => {
      const { redoStack, elements, undoStack } = get()
      if (redoStack.length === 0) return
      const action: UndoAction = redoStack[redoStack.length - 1]
      let next: CanvasElement[]
      let undoAction: UndoAction

      if (action.type === 'add') {
        next = [...elements, ...(action.els ?? []).map(shallowClone)]
        undoAction = { type: 'add', ids: action.ids, els: (action.els ?? []).map(shallowClone) }
      } else if (action.type === 'remove') {
        const idSet = new Set(
          action.items.map((i: { el: CanvasElement; index: number }) => i.el.id)
        )
        next = elements.filter((e: CanvasElement) => !idSet.has(e.id))
        undoAction = {
          type: 'remove',
          items: action.items.map((i: { el: CanvasElement; index: number }) => ({
            el: shallowClone(i.el),
            index: i.index,
          })),
        }
      } else if (action.type === 'move') {
        const deltaMap = new Map(
          action.deltas.map((d: { id: string; dx: number; dy: number }) => [d.id, d])
        )
        next = elements.map((e: CanvasElement) => {
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
      // P0 修复: redo 后同步空间索引和 idToElement 映射
      const state = get()
      state.spatialIndex?.bulkLoad(next)
      // P1 修复: 同步 idToElement 映射，防止数据不一致
      state.idToElement?.clear()
      for (const el of next) {
        state.idToElement?.set(el.id, el)
      }
      scheduleSave()
    },
  }
}
