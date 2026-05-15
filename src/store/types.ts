export type BrushType = 'pen' | 'highlighter' | 'pencil' | 'calligraphy' | 'dashed' | 'glow'
export type ShapeKind = 'rectangle' | 'circle' | 'line' | 'arrow'
export type ToolType = 'select' | 'pen' | 'eraser' | 'pan' | 'text' | ShapeKind

export interface StrokeElement {
  type: 'stroke'
  id: string
  points: number[][]
  color: string
  size: number
  brush: BrushType
  opacity?: number
}

export interface ShapeElement {
  type: 'shape'
  id: string
  kind: ShapeKind
  x: number
  y: number
  w: number
  h: number
  color: string
  size: number
  fillColor?: string
}

export interface TextElement {
  type: 'text'
  id: string
  x: number
  y: number
  width: number
  height: number
  content: string
  fontSize: number
  color: string
}

export interface ImageElement {
  type: 'image'
  id: string
  x: number
  y: number
  width: number
  height: number
  dataUrl: string
  opacity?: number
}

export type CanvasElement = StrokeElement | ShapeElement | TextElement | ImageElement

export interface CanvasDoc {
  id: string
  title: string
  elements: CanvasElement[]
  bgColor: string
  folderId: string | null
  createdAt: number
  updatedAt: number
}

export interface CanvasFolder {
  id: string
  name: string
  parentId: string | null
  order: number
  expanded: boolean
}

export function elementBounds(el: CanvasElement): { x: number; y: number; w: number; h: number } {
  if (el.type === 'stroke') {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of el.points) { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]) }
    return { x: minX - 5, y: minY - 5, w: maxX - minX + 10, h: maxY - minY + 10 }
  }
  if (el.type === 'shape') {
    return { x: Math.min(el.x, el.x + el.w) - 5, y: Math.min(el.y, el.y + el.h) - 5, w: Math.abs(el.w) + 10, h: Math.abs(el.h) + 10 }
  }
  return { x: el.x - 5, y: el.y - 5, w: el.width + 10, h: el.height + 10 }
}

export function moveElement(el: CanvasElement, dx: number, dy: number): CanvasElement {
  if (el.type === 'stroke') return { ...el, points: el.points.map((p) => [p[0] + dx, p[1] + dy]) }
  if (el.type === 'shape') return { ...el, x: el.x + dx, y: el.y + dy }
  return { ...el, x: el.x + dx, y: el.y + dy }
}

export function resizeElement(el: CanvasElement, ax: number, ay: number, sx: number, sy: number): CanvasElement {
  if (el.type === 'stroke') return { ...el, points: el.points.map((p) => [ax + (p[0] - ax) * sx, ay + (p[1] - ay) * sy]) }
  if (el.type === 'shape') {
    const nx = ax + (el.x - ax) * sx, ny = ay + (el.y - ay) * sy
    return { ...el, x: nx, y: ny, w: el.w * sx, h: el.h * sy }
  }
  return { ...el, x: ax + (el.x - ax) * sx, y: ay + (el.y - ay) * sy, width: el.width * sx, height: el.height * sy }
}
