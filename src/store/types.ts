export type ToolType =
  | 'pen'
  | 'eraser'
  | 'pan'
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'arrow'
  | 'line'

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

export interface CanvasState {
  viewBox: {
    x: number
    y: number
    zoom: number
  }
  isPanning: boolean
  lastPanPosition: { x: number; y: number } | null
}

export interface Layer {
  id: string
  name: string
  type: 'strokes' | 'shapes' | 'text' | 'image'
  visible: boolean
  locked: boolean
  opacity: number
  order: number
}
