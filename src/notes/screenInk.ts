import { ANNOTATION_COLORS } from './model.js'
import type { AnnotationColor, NotePoint } from './model.js'

export type ScreenTool = 'pointer' | 'pen' | 'highlight' | 'erase'
export type ScreenBrushSize = 'thin' | 'medium' | 'thick'

export interface ScreenStroke {
  id: string
  tool: 'pen' | 'highlight'
  color: AnnotationColor
  width: number
  points: NotePoint[]
}

export interface ScreenHistory {
  past: ScreenStroke[][]
  present: ScreenStroke[]
  future: ScreenStroke[][]
}

export const SCREEN_ERASER_RADIUS = 16
export const MAX_SCREEN_POINTS = 8_000
export const MAX_SCREEN_TOTAL_POINTS = 160_000
export const MAX_SCREEN_STROKES = 1_000

export function screenStrokeWidth(tool: ScreenTool, size: ScreenBrushSize): number {
  const index = ['thin', 'medium', 'thick'].indexOf(size)
  return (tool === 'highlight' ? [12, 22, 32] : [2, 4, 8])[index] ?? 4
}

export function validScreenPoints(input: unknown): input is NotePoint[] {
  return (
    Array.isArray(input) &&
    input.length > 0 &&
    input.length <= MAX_SCREEN_POINTS &&
    input.every(
      (point: unknown) =>
        point !== null &&
        typeof point === 'object' &&
        'x' in point &&
        'y' in point &&
        typeof point.x === 'number' &&
        typeof point.y === 'number' &&
        Number.isFinite(point.x) &&
        Number.isFinite(point.y) &&
        point.x >= 0 &&
        point.y >= 0 &&
        point.x <= 100_000 &&
        point.y <= 100_000
    )
  )
}

export function validScreenStroke(input: unknown): input is ScreenStroke {
  if (!input || typeof input !== 'object') return false
  const stroke = input as Partial<ScreenStroke>
  return (
    typeof stroke.id === 'string' &&
    stroke.id.length > 0 &&
    stroke.id.length <= 100 &&
    (stroke.tool === 'pen' || stroke.tool === 'highlight') &&
    ANNOTATION_COLORS.includes(stroke.color as AnnotationColor) &&
    typeof stroke.width === 'number' &&
    stroke.width > 0 &&
    stroke.width <= 40 &&
    validScreenPoints(stroke.points)
  )
}

export function emptyScreenHistory(): ScreenHistory {
  return { past: [], present: [], future: [] }
}

export function commitScreenHistory(
  history: ScreenHistory,
  strokes: ScreenStroke[]
): ScreenHistory {
  return { past: [...history.past, history.present].slice(-40), present: strokes, future: [] }
}

export function undoScreenHistory(history: ScreenHistory): ScreenHistory {
  if (!history.past.length) return history
  return {
    past: history.past.slice(0, -1),
    present: history.past[history.past.length - 1],
    future: [history.present, ...history.future].slice(0, 40),
  }
}

export function redoScreenHistory(history: ScreenHistory): ScreenHistory {
  if (!history.future.length) return history
  return {
    past: [...history.past, history.present].slice(-40),
    present: history.future[0],
    future: history.future.slice(1),
  }
}

function distanceToSegment(point: NotePoint, a: NotePoint, b: NotePoint): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const squaredLength = dx * dx + dy * dy
  const t = squaredLength
    ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / squaredLength))
    : 0
  return (point.x - a.x - t * dx) ** 2 + (point.y - a.y - t * dy) ** 2
}

function segmentsTouch(
  a: NotePoint,
  b: NotePoint,
  c: NotePoint,
  d: NotePoint,
  radius: number
): boolean {
  if (
    Math.max(a.x, b.x) + radius < Math.min(c.x, d.x) ||
    Math.min(a.x, b.x) - radius > Math.max(c.x, d.x) ||
    Math.max(a.y, b.y) + radius < Math.min(c.y, d.y) ||
    Math.min(a.y, b.y) - radius > Math.max(c.y, d.y)
  )
    return false
  const denominator = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x)
  if (denominator) {
    const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / denominator
    const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / denominator
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true
  }
  return (
    Math.min(
      distanceToSegment(a, c, d),
      distanceToSegment(b, c, d),
      distanceToSegment(c, a, b),
      distanceToSegment(d, a, b)
    ) <=
    radius * radius
  )
}

interface Bounds {
  left: number
  top: number
  right: number
  bottom: number
}
interface InkGeometry {
  bounds: Bounds
  cells: Map<string, number[]>
  longSegments: number[]
}
const CELL_SIZE = 64
const geometryCache = new WeakMap<ScreenStroke, InkGeometry>()

function pointsBounds(points: NotePoint[]): Bounds {
  const bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
  for (const point of points) {
    bounds.left = Math.min(bounds.left, point.x)
    bounds.top = Math.min(bounds.top, point.y)
    bounds.right = Math.max(bounds.right, point.x)
    bounds.bottom = Math.max(bounds.bottom, point.y)
  }
  return bounds
}

function cellRange(bounds: Bounds) {
  return {
    left: Math.floor(bounds.left / CELL_SIZE),
    top: Math.floor(bounds.top / CELL_SIZE),
    right: Math.floor(bounds.right / CELL_SIZE),
    bottom: Math.floor(bounds.bottom / CELL_SIZE),
  }
}

function inkGeometry(stroke: ScreenStroke): InkGeometry {
  const cached = geometryCache.get(stroke)
  if (cached) return cached
  const geometry: InkGeometry = {
    bounds: pointsBounds(stroke.points),
    cells: new Map(),
    longSegments: [],
  }
  for (let index = 0; index < Math.max(1, stroke.points.length - 1); index++) {
    const a = stroke.points[index],
      b = stroke.points[Math.min(index + 1, stroke.points.length - 1)]
    const range = cellRange({
      left: Math.min(a.x, b.x),
      top: Math.min(a.y, b.y),
      right: Math.max(a.x, b.x),
      bottom: Math.max(a.y, b.y),
    })
    if ((range.right - range.left + 1) * (range.bottom - range.top + 1) > 256) {
      geometry.longSegments.push(index)
      continue
    }
    for (let x = range.left; x <= range.right; x++)
      for (let y = range.top; y <= range.bottom; y++) {
        const key = `${x},${y}`
        const cell = geometry.cells.get(key) ?? []
        cell.push(index)
        geometry.cells.set(key, cell)
      }
  }
  geometryCache.set(stroke, geometry)
  return geometry
}

/** Precompute the eraser bounds once for all immutable strokes in the gesture. */
export function screenEraserHitTest(
  eraser: NotePoint[],
  radius = SCREEN_ERASER_RADIUS
): (stroke: ScreenStroke) => boolean {
  const eraserBounds = pointsBounds(eraser)
  return (stroke) => {
    if (!eraser.length || !stroke.points.length) return false
    const geometry = inkGeometry(stroke)
    const effectiveRadius = radius + stroke.width / 2
    if (
      geometry.bounds.right + effectiveRadius < eraserBounds.left ||
      geometry.bounds.left - effectiveRadius > eraserBounds.right ||
      geometry.bounds.bottom + effectiveRadius < eraserBounds.top ||
      geometry.bounds.top - effectiveRadius > eraserBounds.bottom
    )
      return false
    for (let i = 0; i < Math.max(1, eraser.length - 1); i++) {
      const a = eraser[i],
        b = eraser[Math.min(i + 1, eraser.length - 1)]
      const range = cellRange({
        left: Math.min(a.x, b.x) - effectiveRadius,
        top: Math.min(a.y, b.y) - effectiveRadius,
        right: Math.max(a.x, b.x) + effectiveRadius,
        bottom: Math.max(a.y, b.y) + effectiveRadius,
      })
      const hits = (index: number) =>
        segmentsTouch(
          a,
          b,
          stroke.points[index],
          stroke.points[Math.min(index + 1, stroke.points.length - 1)],
          effectiveRadius
        )
      if ((range.right - range.left + 1) * (range.bottom - range.top + 1) > 256) {
        for (let index = 0; index < Math.max(1, stroke.points.length - 1); index++)
          if (hits(index)) return true
      } else {
        const checked = new Set<number>()
        for (const index of geometry.longSegments) if (hits(index)) return true
        for (let x = range.left; x <= range.right; x++)
          for (let y = range.top; y <= range.bottom; y++) {
            for (const index of geometry.cells.get(`${x},${y}`) ?? []) {
              if (checked.has(index)) continue
              checked.add(index)
              if (hits(index)) return true
            }
          }
      }
    }
    return false
  }
}

export function screenStrokeHit(
  stroke: ScreenStroke,
  eraser: NotePoint[],
  radius = SCREEN_ERASER_RADIUS
): boolean {
  return screenEraserHitTest(eraser, radius)(stroke)
}
