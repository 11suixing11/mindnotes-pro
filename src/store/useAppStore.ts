import { create } from 'zustand'

export interface Stroke {
  id: string
  points: number[][]
  color: string
  size: number
  tool: 'pen' | 'eraser'
  // 图层属性
  name?: string
  locked?: boolean
  hidden?: boolean
  opacity?: number
}

export interface Shape {
  id: string
  type: 'rectangle' | 'circle' | 'triangle' | 'arrow' | 'line'
  x: number
  y: number
  width: number
  height: number
  color: string
  size: number
  rotation?: number
  // 箭头专用
  startX?: number
  startY?: number
  endX?: number
  endY?: number
  // 图层属性
  name?: string
  locked?: boolean
  hidden?: boolean
  opacity?: number
}

interface AppState {
  // 笔迹数据
  strokes: Stroke[]
  currentStroke: Stroke | null
  
  // 形状数据
  shapes: Shape[]
  currentShape: Shape | null
  
  // 工具状态
  tool: 'pen' | 'eraser' | 'pan' | 'rectangle' | 'circle' | 'triangle' | 'arrow' | 'line'
  color: string
  size: number
  
  // 画布变换
  viewBox: {
    x: number
    y: number
    zoom: number
  }
  
  // 智能吸附
  showGuides: boolean
  snapToGrid: boolean
  gridSize: number
  guideLines: Array<{ type: 'horizontal' | 'vertical'; position: number }> | null
  
  // 图层管理
  selectedLayerId: string | null
  showLayersPanel: boolean
  
  // 操作状态
  isDrawing: boolean
  canUndo: boolean
  canRedo: boolean
  
  // 方法
  addStroke: (stroke: Stroke) => void
  updateCurrentStroke: (points: number[][]) => void
  startStroke: () => void
  clearStrokes: () => void
  
  // 形状方法
  addShape: (shape: Shape) => void
  updateCurrentShape: (shape: Partial<Shape>) => void
  startShape: (type: Shape['type']) => void
  
  setTool: (tool: 'pen' | 'eraser' | 'pan' | 'rectangle' | 'circle' | 'triangle') => void
  setColor: (color: string) => void
  setSize: (size: number) => void
  
  // 画布变换方法
  setViewBox: (viewBox: { x: number; y: number; zoom: number }) => void
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  
  // 智能吸附方法
  setGuideLines: (guides: Array<{ type: 'horizontal' | 'vertical'; position: number }>) => void
  clearGuideLines: () => void
  toggleShowGuides: () => void
  toggleSnapToGrid: () => void
  
  // 图层管理方法
  setSelectedLayer: (id: string | null) => void
  toggleLayersPanel: () => void
  toggleLayerLock: (id: string) => void
  toggleLayerHidden: (id: string) => void
  deleteLayer: (id: string) => void
  moveLayerUp: (id: string) => void
  moveLayerDown: (id: string) => void
  
  undo: () => void
  redo: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // 初始状态
  strokes: [],
  currentStroke: null,
  
  shapes: [],
  currentShape: null,
  
  tool: 'pen',
  color: '#000000',
  size: 4,
  
  viewBox: {
    x: 0,
    y: 0,
    zoom: 1,
  },
  
  showGuides: true,
  snapToGrid: false,
  gridSize: 20,
  guideLines: null,
  
  selectedLayerId: null,
  showLayersPanel: false,
  
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
    const strokeTool: 'pen' | 'eraser' = (tool === 'pan' || tool === 'rectangle' || tool === 'circle' || tool === 'triangle' || tool === 'arrow' || tool === 'line') ? 'pen' : tool
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
  
  // 智能吸附方法
  setGuideLines: (guides: Array<{ type: 'horizontal' | 'vertical'; position: number }>) => set({ guideLines: guides }),
  clearGuideLines: () => set({ guideLines: null }),
  toggleShowGuides: () => set((state) => ({ showGuides: !state.showGuides })),
  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),
  
  // 图层管理方法
  setSelectedLayer: (id) => set({ selectedLayerId: id }),
  toggleLayersPanel: () => set((state) => ({ showLayersPanel: !state.showLayersPanel })),
  
  toggleLayerLock: (id) => {
    set((state) => ({
      strokes: state.strokes.map(s => s.id === id ? { ...s, locked: !s.locked } : s),
      shapes: state.shapes.map(s => s.id === id ? { ...s, locked: !s.locked } : s),
    }))
  },
  
  toggleLayerHidden: (id) => {
    set((state) => ({
      strokes: state.strokes.map(s => s.id === id ? { ...s, hidden: !s.hidden } : s),
      shapes: state.shapes.map(s => s.id === id ? { ...s, hidden: !s.hidden } : s),
    }))
  },
  
  deleteLayer: (id) => {
    set((state) => ({
      strokes: state.strokes.filter(s => s.id !== id),
      shapes: state.shapes.filter(s => s.id !== id),
      selectedLayerId: null,
    }))
  },
  
  moveLayerUp: (id) => {
    // TODO: 实现图层上移
    console.log('Move layer up:', id)
  },
  
  moveLayerDown: (id) => {
    // TODO: 实现图层下移
    console.log('Move layer down:', id)
  },
  
  // 形状方法
  addShape: (shape) => {
    set((state) => ({
      shapes: [...state.shapes, shape],
      currentShape: null,
      canUndo: true,
    }))
  },
  
  updateCurrentShape: (shape) => {
    set((state) => ({
      currentShape: state.currentShape
        ? { ...state.currentShape, ...shape }
        : null,
    }))
  },
  
  startShape: (type) => {
    const { color, size } = get()
    set({
      currentShape: {
        id: Date.now().toString(),
        type,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color,
        size,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
      },
      isDrawing: true,
    })
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
