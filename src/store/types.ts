export type ToolType =
  | 'select'
  | 'pen'
  | 'eraser'
  | 'pan'
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'arrow'
  | 'line'
  | 'text'

export type BrushType = 'pen' | 'highlighter' | 'pencil' | 'calligraphy' | 'dashed' | 'glow'

export interface Stroke {
  id: string
  points: number[][]
  color: string
  size: number
  tool: 'pen' | 'eraser'
  brush?: BrushType
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
