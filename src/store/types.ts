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

export interface Layer {
  id: string
  name: string
  type: 'strokes' | 'shapes' | 'text' | 'image'
  visible: boolean
  locked: boolean
  opacity: number
  order: number
}
