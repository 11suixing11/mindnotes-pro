import { create } from 'zustand'

export interface Stroke {
  id: string
  points: number[][]
  color: string
  size: number
  tool: 'pen' | 'eraser'
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
  startX?: number
  startY?: number
  endX?: number
  endY?: number
  name?: string
  locked?: boolean
  hidden?: boolean
  opacity?: number
}

type AppStateSnapshot = Pick<AppState, 'strokes' | 'shapes'>

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
  viewBox: { x: number; y: number; zoom: number }

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

  // 撤销/重做历史栈
  _undoStack: AppStateSnapshot[]
  _redoStack: AppStateSnapshot[]

  // 笔迹方法
  startStroke: () => void
  updateCurrentStroke: (points: number[][]) => void
  finishStroke: () => void
  addStroke: (stroke: Stroke) => void
  clearStrokes: () => void

  // 形状方法
  startShape: (type: Shape['type'], x: number, y: number) => void
  updateCurrentShape: (shape: Partial<Shape>) => void
  finishShape: () => void
  addShape: (shape: Shape) => void

  // 工具方法
  setTool: (tool: AppState['tool']) => void
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
  clearAllLayers: () => void
  moveLayerUp: (id: string) => void
  moveLayerDown: (id: string) => void

  // 撤销/重做
  undo: () => void
  redo: () => void
  _pushHistory: () => void
}

const MAX_HISTORY = 50

export const useAppStore = create<AppState>((set, get) => ({
  // 初始状态
  strokes: [],
  currentStroke: null,
  shapes: [],
  currentShape: null,

  tool: 'pen',
  color: '#000000',
  size: 4,

  viewBox: { x: 0, y: 0, zoom: 1 },

  showGuides: true,
  snapToGrid: false,
  gridSize: 20,
  guideLines: null,

  selectedLayerId: null,
  showLayersPanel: false,

  isDrawing: false,
  canUndo: false,
  canRedo: false,

  _undoStack: [],
  _redoStack: [],

  // 保存当前状态到历史栈
  _pushHistory: () => {
    const { strokes, shapes, _undoStack } = get()
    const snapshot: AppStateSnapshot = {
      strokes: [...strokes],
      shapes: [...shapes],
    }
    set({
      _undoStack: [..._undoStack.slice(-(MAX_HISTORY - 1)), snapshot],
      _redoStack: [],
      canUndo: true,
      canRedo: false,
    })
  },

  // 笔迹方法
  startStroke: () => {
    const { tool, color, size } = get()
    get()._pushHistory()
    const strokeTool: 'pen' | 'eraser' =
      tool === 'eraser' ? 'eraser' : 'pen'
    set({
      currentStroke: {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        points: [],
        color: tool === 'eraser' ? '#ffffff' : color,
        size: tool === 'eraser' ? size * 2 : size,
        tool: strokeTool,
      },
      isDrawing: true,
    })
  },

  updateCurrentStroke: (points) => {
    set((state) => ({
      currentStroke: state.currentStroke ? { ...state.currentStroke, points } : null,
    }))
  },

  finishStroke: () => {
    const { currentStroke } = get()
    if (!currentStroke || currentStroke.points.length < 2) {
      set({ currentStroke: null, isDrawing: false })
      return
    }
    set((state) => ({
      strokes: [...state.strokes, currentStroke],
      currentStroke: null,
      isDrawing: false,
    }))
  },

  addStroke: (stroke) => {
    get()._pushHistory()
    set((state) => ({
      strokes: [...state.strokes, stroke],
      currentStroke: null,
    }))
  },

  clearStrokes: () => {
    const { strokes, shapes } = get()
    if (strokes.length === 0 && shapes.length === 0) return
    get()._pushHistory()
    set({ strokes: [], shapes: [], selectedLayerId: null })
  },

  // 形状方法
  startShape: (type, x, y) => {
    const { color, size } = get()
    get()._pushHistory()
    set({
      currentShape: {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        type,
        x,
        y,
        width: 0,
        height: 0,
        color,
        size,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
      },
      isDrawing: true,
    })
  },

  updateCurrentShape: (partial) => {
    set((state) => ({
      currentShape: state.currentShape ? { ...state.currentShape, ...partial } : null,
    }))
  },

  finishShape: () => {
    const { currentShape } = get()
    if (!currentShape) {
      set({ isDrawing: false })
      return
    }
    // 最小尺寸检查
    const w = Math.abs(currentShape.width)
    const h = Math.abs(currentShape.height)
    if (w < 5 && h < 5) {
      set({ currentShape: null, isDrawing: false })
      return
    }
    set((state) => ({
      shapes: [...state.shapes, currentShape],
      currentShape: null,
      isDrawing: false,
    }))
  },

  addShape: (shape) => {
    get()._pushHistory()
    set((state) => ({
      shapes: [...state.shapes, shape],
      currentShape: null,
    }))
  },

  // 工具方法
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setSize: (size) => set({ size }),

  // 画布变换
  setViewBox: (viewBox) => set({ viewBox }),

  zoomIn: () => {
    set((state) => ({
      viewBox: { ...state.viewBox, zoom: Math.min(state.viewBox.zoom * 1.2, 5) },
    }))
  },

  zoomOut: () => {
    set((state) => ({
      viewBox: { ...state.viewBox, zoom: Math.max(state.viewBox.zoom / 1.2, 0.1) },
    }))
  },

  resetView: () => set({ viewBox: { x: 0, y: 0, zoom: 1 } }),

  // 智能吸附
  setGuideLines: (guides) => set({ guideLines: guides }),
  clearGuideLines: () => set({ guideLines: null }),
  toggleShowGuides: () => set((s) => ({ showGuides: !s.showGuides })),
  toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),

  // 图层管理
  setSelectedLayer: (id) => set({ selectedLayerId: id }),
  toggleLayersPanel: () => set((s) => ({ showLayersPanel: !s.showLayersPanel })),

  toggleLayerLock: (id) => {
    set((state) => ({
      strokes: state.strokes.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s)),
      shapes: state.shapes.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s)),
    }))
  },

  toggleLayerHidden: (id) => {
    set((state) => ({
      strokes: state.strokes.map((s) => (s.id === id ? { ...s, hidden: !s.hidden } : s)),
      shapes: state.shapes.map((s) => (s.id === id ? { ...s, hidden: !s.hidden } : s)),
    }))
  },

  deleteLayer: (id) => {
    get()._pushHistory()
    set((state) => ({
      strokes: state.strokes.filter((s) => s.id !== id),
      shapes: state.shapes.filter((s) => s.id !== id),
      selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId,
    }))
  },

  clearAllLayers: () => {
    const { strokes, shapes } = get()
    if (strokes.length === 0 && shapes.length === 0) return
    get()._pushHistory()
    set({ strokes: [], shapes: [], selectedLayerId: null })
  },

  moveLayerUp: (id) => {
    set((state) => {
      const idx = state.strokes.findIndex((s) => s.id === id)
      if (idx < 0 || idx >= state.strokes.length - 1) return state
      const newStrokes = [...state.strokes]
      ;[newStrokes[idx], newStrokes[idx + 1]] = [newStrokes[idx + 1], newStrokes[idx]]
      return { strokes: newStrokes }
    })
  },

  moveLayerDown: (id) => {
    set((state) => {
      const idx = state.strokes.findIndex((s) => s.id === id)
      if (idx <= 0) return state
      const newStrokes = [...state.strokes]
      ;[newStrokes[idx], newStrokes[idx - 1]] = [newStrokes[idx - 1], newStrokes[idx]]
      return { strokes: newStrokes }
    })
  },

  // 撤销/重做
  undo: () => {
    const { _undoStack, strokes, shapes } = get()
    if (_undoStack.length === 0) return
    const prev = _undoStack[_undoStack.length - 1]
    set((state) => ({
      strokes: prev.strokes,
      shapes: prev.shapes,
      _undoStack: state._undoStack.slice(0, -1),
      _redoStack: [...state._redoStack, { strokes, shapes }],
      canUndo: state._undoStack.length > 1,
      canRedo: true,
    }))
  },

  redo: () => {
    const { _redoStack, strokes, shapes } = get()
    if (_redoStack.length === 0) return
    const next = _redoStack[_redoStack.length - 1]
    set((state) => ({
      strokes: next.strokes,
      shapes: next.shapes,
      _redoStack: state._redoStack.slice(0, -1),
      _undoStack: [...state._undoStack, { strokes, shapes }],
      canRedo: state._redoStack.length > 1,
      canUndo: true,
    }))
  },
}))
