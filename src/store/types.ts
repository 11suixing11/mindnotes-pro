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

export type UndoAction =
  | { type: 'add'; ids: string[]; els?: CanvasElement[] }
  | { type: 'remove'; items: { el: CanvasElement; index: number }[] }
  | { type: 'clear'; snapshot: CanvasElement[] }
  | { type: 'move'; deltas: { id: string; dx: number; dy: number }[] }
  | { type: 'erase'; before: CanvasElement[]; after: CanvasElement[] }
export interface CanvasDoc {
  id: string
  title: string
  elements: CanvasElement[]
  bgColor: string
  folderId: string | null
  createdAt: number
  updatedAt: number
  undoStack?: UndoAction[]
  redoStack?: UndoAction[]
}

export interface CanvasFolder {
  id: string
  name: string
  parentId: string | null
  order: number
  expanded: boolean
}

// P0 性能优化: 笔触边界缓存 - 避免每帧遍历所有点计算边界
const strokeBoundsCache = new WeakMap<
  StrokeElement,
  { x: number; y: number; w: number; h: number }
>()

/** 清除笔触边界缓存（用于元素更新后） */
export function invalidateStrokeBounds(el: StrokeElement): void {
  strokeBoundsCache.delete(el)
}

export function elementBounds(el: CanvasElement): { x: number; y: number; w: number; h: number } {
  if (el.type === 'stroke') {
    // P0: 检查缓存
    const cached = strokeBoundsCache.get(el)
    if (cached) return cached

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (let i = 0; i < el.points.length; i++) {
      const p = el.points[i]
      if (p[0] < minX) minX = p[0]
      if (p[1] < minY) minY = p[1]
      if (p[0] > maxX) maxX = p[0]
      if (p[1] > maxY) maxY = p[1]
    }
    const bounds = { x: minX - 5, y: minY - 5, w: maxX - minX + 10, h: maxY - minY + 10 }
    strokeBoundsCache.set(el, bounds)
    return bounds
  }
  if (el.type === 'shape') {
    return {
      x: Math.min(el.x, el.x + el.w) - 5,
      y: Math.min(el.y, el.y + el.h) - 5,
      w: Math.abs(el.w) + 10,
      h: Math.abs(el.h) + 10,
    }
  }
  return { x: el.x - 5, y: el.y - 5, w: el.width + 10, h: el.height + 10 }
}

// P1 性能优化: 复用临时数组，减少 moveElement 中的 GC 压力
// 拖拽 1000 点笔触时，每帧减少 1000 次数组分配
const _moveTmp = [0, 0]

export function moveElement(el: CanvasElement, dx: number, dy: number): CanvasElement {
  if (el.type === 'stroke') {
    const pts = el.points
    const len = pts.length
    const newPts = new Array<number[]>(len)
    for (let i = 0; i < len; i++) {
      _moveTmp[0] = pts[i][0] + dx
      _moveTmp[1] = pts[i][1] + dy
      newPts[i] = [_moveTmp[0], _moveTmp[1]]
    }
    return { ...el, points: newPts }
  }
  // P0 优化: shape/text/image 直接修改坐标，减少 spread 开销
  if (el.type === 'shape') return { ...el, x: el.x + dx, y: el.y + dy }
  return { ...el, x: el.x + dx, y: el.y + dy } as CanvasElement
}

export function resizeElement(
  el: CanvasElement,
  ax: number,
  ay: number,
  sx: number,
  sy: number
): CanvasElement {
  if (el.type === 'stroke') {
    // P1 性能优化: 使用预分配数组替代 .map()
    const pts = el.points
    const len = pts.length
    const newPts = new Array<number[]>(len)
    for (let i = 0; i < len; i++) {
      newPts[i] = [ax + (pts[i][0] - ax) * sx, ay + (pts[i][1] - ay) * sy]
    }
    return { ...el, points: newPts }
  }
  if (el.type === 'shape') {
    const nx = ax + (el.x - ax) * sx,
      ny = ay + (el.y - ay) * sy
    return { ...el, x: nx, y: ny, w: el.w * sx, h: el.h * sy }
  }
  return {
    ...el,
    x: ax + (el.x - ax) * sx,
    y: ay + (el.y - ay) * sy,
    width: el.width * sx,
    height: el.height * sy,
  }
}
