import { create } from 'zustand'
import type { Stroke, Shape, ToolType } from './types'

interface DrawingState {
  // 笔迹数据
  strokes: Stroke[]
  currentStroke: Stroke | null

  // 形状数据
  shapes: Shape[]
  currentShape: Shape | null

  // 工具状态
  tool: ToolType
  color: string
  size: number

  // 操作状态
  isDrawing: boolean
}

interface DrawingActions {
  // 笔迹方法
  addStroke: (stroke: Stroke) => void
  updateCurrentStroke: (points: number[][]) => void
  startStroke: () => void
  clearStrokes: () => void

  // 形状方法
  addShape: (shape: Shape) => void
  updateCurrentShape: (shape: Partial<Shape>) => void
  clearShapes: () => void

  // 工具方法
  setTool: (tool: ToolType) => void
  setColor: (color: string) => void
  setSize: (size: number) => void
}

export const useDrawingStore = create<DrawingState & DrawingActions>((set) => ({
  // 初始状态
  strokes: [],
  currentStroke: null,
  shapes: [],
  currentShape: null,
  tool: 'pen',
  color: '#000000',
  size: 4,
  isDrawing: false,

  // 笔迹操作
  addStroke: (stroke) =>
    set((state) => ({
      strokes: [...state.strokes, stroke],
      currentStroke: null,
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

  // 形状操作
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

  clearShapes: () => set({ shapes: [], currentShape: null }),

  // 工具操作
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setSize: (size) => set({ size }),
}))
