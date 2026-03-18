import { create } from 'zustand'

export interface Stroke {
  id: string
  points: number[][]
  color: string
  size: number
  tool: 'pen' | 'eraser'
}

interface AppState {
  // 笔迹数据
  strokes: Stroke[]
  currentStroke: Stroke | null
  
  // 工具状态
  tool: 'pen' | 'eraser' | 'pan'
  color: string
  size: number
  
  // 画布变换
  viewBox: {
    x: number
    y: number
    zoom: number
  }
  
  // 操作状态
  isDrawing: boolean
  canUndo: boolean
  canRedo: boolean
  
  // 方法
  addStroke: (stroke: Stroke) => void
  updateCurrentStroke: (points: number[][]) => void
  startStroke: () => void
  clearStrokes: () => void
  
  setTool: (tool: 'pen' | 'eraser' | 'pan') => void
  setColor: (color: string) => void
  setSize: (size: number) => void
  
  // 画布变换方法
  setViewBox: (viewBox: { x: number; y: number; zoom: number }) => void
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  
  undo: () => void
  redo: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // 初始状态
  strokes: [],
  currentStroke: null,
  
  tool: 'pen',
  color: '#000000',
  size: 4,
  
  viewBox: {
    x: 0,
    y: 0,
    zoom: 1,
  },
  
  isDrawing: false,
  canUndo: false,
  canRedo: false,
  
  // 添加完成的笔迹
  addStroke: (stroke) => {
    set((state) => ({
      strokes: [...state.strokes, stroke],
      currentStroke: null,
      canUndo: true,
    }))
  },
  
  // 更新当前笔迹
  updateCurrentStroke: (points) => {
    set((state) => ({
      currentStroke: state.currentStroke
        ? { ...state.currentStroke, points }
        : null,
    }))
  },
  
  // 开始新笔迹
  startStroke: () => {
    const { tool, color, size } = get()
    const strokeTool: 'pen' | 'eraser' = tool === 'pan' ? 'pen' : tool
    set({
      currentStroke: {
        id: Date.now().toString(),
        points: [],
        color: tool === 'eraser' ? '#ffffff' : color,
        size: tool === 'eraser' ? size * 2 : size,
        tool: strokeTool,
      },
      isDrawing: true,
    })
  },
  
  // 清空所有笔迹
  clearStrokes: () => {
    set({ strokes: [], canUndo: true })
  },
  
  // 设置工具
  setTool: (tool) => set({ tool }),
  
  // 设置颜色
  setColor: (color) => set({ color }),
  
  // 设置大小
  setSize: (size) => set({ size }),
  
  // 画布变换方法
  setViewBox: (viewBox) => set({ viewBox }),
  
  zoomIn: () => {
    set((state) => ({
      viewBox: {
        ...state.viewBox,
        zoom: Math.min(state.viewBox.zoom * 1.2, 5),
      },
    }))
  },
  
  zoomOut: () => {
    set((state) => ({
      viewBox: {
        ...state.viewBox,
        zoom: Math.max(state.viewBox.zoom / 1.2, 0.1),
      },
    }))
  },
  
  resetView: () => {
    set({ viewBox: { x: 0, y: 0, zoom: 1 } })
  },
  
  // 撤销
  undo: () => {
    set((state) => ({
      strokes: state.strokes.slice(0, -1),
      canUndo: state.strokes.length > 1,
      canRedo: true,
    }))
  },
  
  // 重做（简化版，实际应该用两个栈）
  redo: () => {
    set({ canRedo: false })
  },
}))
