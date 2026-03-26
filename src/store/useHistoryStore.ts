import { create } from 'zustand'

interface HistoryState {
  canUndo: boolean
  canRedo: boolean
  undoStack: any[]
  redoStack: any[]
}

interface HistoryActions {
  push: (action: any) => void
  undo: () => void
  redo: () => void
  clear: () => void
}

export const useHistoryStore = create<HistoryState & HistoryActions>((set, get) => ({
  canUndo: false,
  canRedo: false,
  undoStack: [],
  redoStack: [],

  push: (action) =>
    set((state) => ({
      undoStack: [...state.undoStack, action],
      redoStack: [],
      canUndo: true,
      canRedo: false,
    })),

  undo: () =>
    set((state) => {
      if (state.undoStack.length === 0) return state
      const lastAction = state.undoStack[state.undoStack.length - 1]
      return {
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, lastAction],
        canUndo: state.undoStack.length > 1,
        canRedo: true,
      }
    }),

  redo: () =>
    set((state) => {
      if (state.redoStack.length === 0) return state
      const lastAction = state.redoStack[state.redoStack.length - 1]
      return {
        undoStack: [...state.undoStack, lastAction],
        redoStack: state.redoStack.slice(0, -1),
        canUndo: true,
        canRedo: state.redoStack.length > 1,
      }
    }),

  clear: () => set({ undoStack: [], redoStack: [], canUndo: false, canRedo: false }),
}))

export default useHistoryStore
