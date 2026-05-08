import { create } from 'zustand'
import type { Stroke, Shape, ToolType, BrushType } from './types'

const STORAGE_KEY = 'mindnotes-drawing-data'
const MAX_HISTORY = 50

function loadFromStorage(): { strokes: Stroke[]; shapes: Shape[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    return { strokes: data.strokes ?? [], shapes: data.shapes ?? [] }
  } catch { return null }
}

function saveToStorage(strokes: Stroke[], shapes: Shape[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ strokes, shapes })) } catch { /* */ }
}

const saved = loadFromStorage()

type Snapshot = { strokes: Stroke[]; shapes: Shape[] }

interface DrawingState {
  strokes: Stroke[]
  shapes: Shape[]
  tool: ToolType
  brush: BrushType
  color: string
  size: number
  canvasBg: string
  undoStack: Snapshot[]
  redoStack: Snapshot[]
  selectedId: string | null
}

interface DrawingActions {
  addStroke: (stroke: Stroke) => void
  addShape: (shape: Shape) => void
  addText: (text: { id: string; x: number; y: number; content: string; color: string; size: number }) => void
  removeStrokeById: (id: string) => void
  removeShapeById: (id: string) => void
  moveStrokeById: (id: string, dx: number, dy: number) => void
  moveShapeById: (id: string, dx: number, dy: number) => void
  resizeStrokeById: (id: string, anchorX: number, anchorY: number, scaleX: number, scaleY: number) => void
  resizeShapeById: (id: string, anchorX: number, anchorY: number, scaleX: number, scaleY: number) => void
  clearAll: () => void
  undo: () => void
  redo: () => void
  setTool: (tool: ToolType) => void
  setBrush: (brush: BrushType) => void
  setColor: (color: string) => void
  setSize: (size: number) => void
  setCanvasBg: (bg: string) => void
  setSelectedId: (id: string | null) => void
  loadData: (strokes: Stroke[], shapes: Shape[]) => void
}

function pushSnapshot(state: DrawingState): Snapshot {
  return { strokes: [...state.strokes], shapes: [...state.shapes] }
}

function applySnapshot(snap: Snapshot, set: Function) {
  saveToStorage(snap.strokes, snap.shapes)
  set({ strokes: snap.strokes, shapes: snap.shapes })
}

export const useDrawingStore = create<DrawingState & DrawingActions>((set, get) => ({
  strokes: saved?.strokes ?? [],
  shapes: saved?.shapes ?? [],
  tool: 'pen',
  brush: 'pen',
  color: '#000000',
  size: 4,
  canvasBg: '#ffffff',
  undoStack: [],
  redoStack: [],
  selectedId: null,

  addStroke: (stroke) => {
    const state = get()
    const snap = pushSnapshot(state)
    const next = [...state.strokes, stroke]
    saveToStorage(next, state.shapes)
    set({ strokes: next, undoStack: [...state.undoStack.slice(-MAX_HISTORY), snap], redoStack: [] })
  },

  addShape: (shape) => {
    const state = get()
    const snap = pushSnapshot(state)
    const next = [...state.shapes, shape]
    saveToStorage(state.strokes, next)
    set({ shapes: next, undoStack: [...state.undoStack.slice(-MAX_HISTORY), snap], redoStack: [] })
  },

  addText: (t) => {
    const state = get()
    const snap = pushSnapshot(state)
    const shape: Shape = {
      id: t.id,
      type: 'text' as any,
      x: t.x,
      y: t.y,
      width: 0,
      height: 0,
      color: t.color,
      size: t.size,
      startX: t.x,
      startY: t.y,
      endX: t.x,
      endY: t.y,
    }
    const nextShapes = [...state.shapes, shape]
    const nextStrokes = [...state.strokes, {
      id: `text-content-${t.id}`,
      points: [[t.x, t.y]],
      color: t.color,
      size: t.size,
      tool: 'pen' as const,
      name: t.content,
    }]
    saveToStorage(nextStrokes, nextShapes)
    set({
      strokes: nextStrokes,
      shapes: nextShapes,
      undoStack: [...state.undoStack.slice(-MAX_HISTORY), snap],
      redoStack: [],
    })
  },

  removeStrokeById: (id) => {
    const state = get()
    const snap = pushSnapshot(state)
    const next = state.strokes.filter((s) => s.id !== id)
    saveToStorage(next, state.shapes)
    set({ strokes: next, undoStack: [...state.undoStack.slice(-MAX_HISTORY), snap], redoStack: [] })
  },

  removeShapeById: (id) => {
    const state = get()
    const snap = pushSnapshot(state)
    const next = state.shapes.filter((s) => s.id !== id)
    saveToStorage(state.strokes, next)
    set({ shapes: next, undoStack: [...state.undoStack.slice(-MAX_HISTORY), snap], redoStack: [] })
  },

  moveStrokeById: (id, dx, dy) => {
    const state = get()
    const snap = pushSnapshot(state)
    const next = state.strokes.map((s) =>
      s.id === id ? { ...s, points: s.points.map((p) => [p[0] + dx, p[1] + dy]) } : s
    )
    saveToStorage(next, state.shapes)
    set({ strokes: next, undoStack: [...state.undoStack.slice(-MAX_HISTORY), snap], redoStack: [] })
  },

  moveShapeById: (id, dx, dy) => {
    const state = get()
    const snap = pushSnapshot(state)
    const next = state.shapes.map((s) =>
      s.id === id
        ? {
            ...s,
            x: s.x + dx, y: s.y + dy,
            startX: (s.startX ?? s.x) + dx, startY: (s.startY ?? s.y) + dy,
            endX: (s.endX ?? s.x + s.width) + dx, endY: (s.endY ?? s.y + s.height) + dy,
          }
        : s
    )
    saveToStorage(state.strokes, next)
    set({ shapes: next, undoStack: [...state.undoStack.slice(-MAX_HISTORY), snap], redoStack: [] })
  },

  resizeStrokeById: (id, anchorX, anchorY, scaleX, scaleY) => {
    const state = get()
    const snap = pushSnapshot(state)
    const next = state.strokes.map((s) => {
      if (s.id !== id) return s
      const newPoints = s.points.map((p) => [
        anchorX + (p[0] - anchorX) * scaleX,
        anchorY + (p[1] - anchorY) * scaleY,
      ])
      const newStroke: any = { ...s, points: newPoints }
      if ((s as any).imageData) {
        newStroke.imageWidth = ((s as any).imageWidth ?? 200) * scaleX
        newStroke.imageHeight = ((s as any).imageHeight ?? 200) * scaleY
      }
      return newStroke
    })
    saveToStorage(next, state.shapes)
    set({ strokes: next, undoStack: [...state.undoStack.slice(-MAX_HISTORY), snap], redoStack: [] })
  },

  resizeShapeById: (id, anchorX, anchorY, scaleX, scaleY) => {
    const state = get()
    const snap = pushSnapshot(state)
    const next = state.shapes.map((s) => {
      if (s.id !== id) return s
      const sx = s.startX ?? s.x, sy = s.startY ?? s.y
      const ex = s.endX ?? s.x + s.width, ey = s.endY ?? s.y + s.height
      const nsx = anchorX + (sx - anchorX) * scaleX
      const nsy = anchorY + (sy - anchorY) * scaleY
      const nex = anchorX + (ex - anchorX) * scaleX
      const ney = anchorY + (ey - anchorY) * scaleY
      return {
        ...s,
        x: Math.min(nsx, nex), y: Math.min(nsy, ney),
        width: Math.abs(nex - nsx), height: Math.abs(ney - nsy),
        startX: nsx, startY: nsy, endX: nex, endY: ney,
      }
    })
    saveToStorage(state.strokes, next)
    set({ shapes: next, undoStack: [...state.undoStack.slice(-MAX_HISTORY), snap], redoStack: [] })
  },

  clearAll: () => {
    const state = get()
    const snap = pushSnapshot(state)
    saveToStorage([], [])
    set({ strokes: [], shapes: [], undoStack: [...state.undoStack.slice(-MAX_HISTORY), snap], redoStack: [] })
  },

  undo: () => {
    const state = get()
    if (state.undoStack.length === 0) return
    const prev = state.undoStack[state.undoStack.length - 1]
    const currentSnap = pushSnapshot(state)
    applySnapshot(prev, set)
    set({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, currentSnap],
    })
  },

  redo: () => {
    const state = get()
    if (state.redoStack.length === 0) return
    const next = state.redoStack[state.redoStack.length - 1]
    const currentSnap = pushSnapshot(state)
    applySnapshot(next, set)
    set({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, currentSnap],
    })
  },

  setTool: (tool) => set({ tool, selectedId: null }),
  setBrush: (brush) => set({ brush }),
  setColor: (color) => set({ color }),
  setSize: (size) => set({ size }),
  setCanvasBg: (bg) => set({ canvasBg: bg }),
  setSelectedId: (id) => set({ selectedId: id }),

  loadData: (strokes, shapes) => {
    const state = get()
    const snap = pushSnapshot(state)
    saveToStorage(strokes, shapes)
    set({
      strokes, shapes,
      undoStack: [...state.undoStack.slice(-MAX_HISTORY), snap],
      redoStack: [],
    })
  },
}))

export default useDrawingStore
