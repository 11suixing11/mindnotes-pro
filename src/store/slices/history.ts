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
      const action = undoStack[undoStack.length - 1]
      let next: CanvasElement[]
      let redoAction: UndoAction

      if (action.type === 'add') {
        const idSet = new Set((action.els ?? []).map((e: any) => e.id))
        next = elements.filter((e: CanvasElement) => !idSet.has(e.id))
        redoAction = { type: 'add', ids: action.ids, els: (action.els ?? []).map(shallowClone) }
      } else if (action.type === 'remove') {
        next = [...elements]
        for (const { el, index } of [...action.items].sort((a, b) => a.index - b.index)) {
          next.splice(index, 0, el)
        }
        redoAction = {
          type: 'remove',
          items: action.items.map((i: any) => ({ el: shallowClone(i.el), index: i.index })),
        }
      } else if (action.type === 'move') {
        const deltaMap = new Map(action.deltas.map((d: any) => [d.id, d]))
        next = elements.map((e: CanvasElement) => {
          const d = deltaMap.get(e.id)
          return d ? reverseMoveDelta(e, (d as any).dx, (d as any).dy) : e
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
        const idSet = new Set(action.items.map((i: any) => i.el.id))
        next = elements.filter((e: CanvasElement) => !idSet.has(e.id))
        undoAction = {
          type: 'remove',
          items: action.items.map((i: any) => ({ el: shallowClone(i.el), index: i.index })),
        }
      } else if (action.type === 'move') {
        const deltaMap = new Map(action.deltas.map((d: any) => [d.id, d]))
        next = elements.map((e: CanvasElement) => {
          const d = deltaMap.get(e.id)
          return d ? applyMoveDelta(e, (d as any).dx, (d as any).dy) : e
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
  }
}
