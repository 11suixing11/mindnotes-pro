import { create } from 'zustand'
import type { Stroke, Shape, ToolType } from './types'

const STORAGE_KEY = 'mindnotes-drawing-data'

function loadFromStorage(): { strokes: Stroke[]; shapes: Shape[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    return { strokes: data.strokes ?? [], shapes: data.shapes ?? [] }
  } catch {
    return null
  }
}

function saveToStorage(strokes: Stroke[], shapes: Shape[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ strokes, shapes }))
  } catch { /* quota exceeded, ignore */ }
}

const saved = loadFromStorage()

interface DrawingState {
  strokes: Stroke[]
  shapes: Shape[]
  tool: ToolType
  color: string
  size: number
}

interface DrawingActions {
  addStroke: (stroke: Stroke) => void
  addShape: (shape: Shape) => void
  removeStrokeById: (id: string) => void
  removeShapeById: (id: string) => void
  clearAll: () => void
  setTool: (tool: ToolType) => void
  setColor: (color: string) => void
  setSize: (size: number) => void
  loadData: (strokes: Stroke[], shapes: Shape[]) => void
}

export const useDrawingStore = create<DrawingState & DrawingActions>((set) => ({
  strokes: saved?.strokes ?? [],
  shapes: saved?.shapes ?? [],
  tool: 'pen',
  color: '#000000',
  size: 4,

  addStroke: (stroke) =>
    set((state) => {
      const next = [...state.strokes, stroke]
      saveToStorage(next, state.shapes)
      return { strokes: next }
    }),

  addShape: (shape) =>
    set((state) => {
      const next = [...state.shapes, shape]
      saveToStorage(state.strokes, next)
      return { shapes: next }
    }),

  removeStrokeById: (id) =>
    set((state) => {
      const next = state.strokes.filter((s) => s.id !== id)
      saveToStorage(next, state.shapes)
      return { strokes: next }
    }),

  removeShapeById: (id) =>
    set((state) => {
      const next = state.shapes.filter((s) => s.id !== id)
      saveToStorage(state.strokes, next)
      return { shapes: next }
    }),

  clearAll: () => {
    saveToStorage([], [])
    set({ strokes: [], shapes: [] })
  },

  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setSize: (size) => set({ size }),

  loadData: (strokes, shapes) => {
    saveToStorage(strokes, shapes)
    set({ strokes, shapes })
  },
}))

export default useDrawingStore
