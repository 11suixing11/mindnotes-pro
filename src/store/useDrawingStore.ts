import { create } from 'zustand'
import type { Stroke, Shape, ToolType } from './types'

interface DrawingState {
  strokes: Stroke[]
  currentStroke: Stroke | null
  shapes: Shape[]
  currentShape: Shape | null
  tool: ToolType
  color: string
  size: number
  isDrawing: boolean
}

interface DrawingActions {
  addStroke: (stroke: Stroke) => void
  updateCurrentStroke: (points: number[][]) => void
  startStroke: () => void
  clearStrokes: () => void
  addShape: (shape: Shape) => void
  updateCurrentShape: (shape: Partial<Shape>) => void
  startShape: (type: Shape['type']) => void
  setTool: (tool: ToolType) => void
  setColor: (color: string) => void
  setSize: (size: number) => void
}

export const useDrawingStore = create<DrawingState & DrawingActions>((set, _get) => ({
  strokes: [],
  currentStroke: null,
  shapes: [],
  currentShape: null,
  tool: 'pen',
  color: '#000000',
  size: 4,
  isDrawing: false,

  addStroke: (stroke) =>
    set((state) => ({
      strokes: [...state.strokes, stroke],
      currentStroke: null,
      isDrawing: false,
    })),

  updateCurrentStroke: (points) =>
    set((state) => ({
      currentStroke: state.currentStroke
        ? { ...state.currentStroke, points }
        : null,
    })),

  startStroke: () =>
    set((state) => ({
      currentStroke: {
        id: `stroke-${Date.now()}`,
        points: [],
        color: state.color,
        size: state.size,
        tool: state.tool as 'pen' | 'eraser',
      },
      isDrawing: true,
    })),

  clearStrokes: () => set({ strokes: [], currentStroke: null }),

  addShape: (shape) =>
    set((state) => ({
      shapes: [...state.shapes, shape],
      currentShape: null,
    })),

  updateCurrentShape: (shape) =>
    set((state) => ({
      currentShape: state.currentShape
        ? { ...state.currentShape, ...shape }
        : null,
    })),

  startShape: (type) =>
    set((state) => ({
      currentShape: {
        id: `shape-${Date.now()}`,
        type,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        color: state.color,
        size: state.size,
      },
    })),

  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setSize: (size) => set({ size }),
}))

export default useDrawingStore
