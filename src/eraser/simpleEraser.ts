import type { CanvasElement, StrokeElement } from '../store/types'

const MIN_SCREEN_RADIUS = 8
const MAX_SCREEN_RADIUS = 40
const POINT_EPSILON = 0.001

export interface EraserPoint {
  x: number
  y: number
}

export interface ErasePatch {
  removeIds: string[]
  additions: StrokeElement[]
}

interface EraseOptions {
  elements: CanvasElement[]
  point: EraserPoint
  radius: number
  topOnly?: boolean
  getBounds: (element: CanvasElement) => { x: number; y: number; w: number; h: number }
  createId: (sourceId: string, partIndex: number) => string
}

function squaredDistance(a: number[], b: number[]) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return dx * dx + dy * dy
}

function interpolate(a: number[], b: number[], t: number): number[] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

function segmentCircleBreakpoints(
  start: number[],
  end: number[],
  center: EraserPoint,
  radius: number
): number[] {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const fx = start[0] - center.x
  const fy = start[1] - center.y
  const a = dx * dx + dy * dy
  if (a <= Number.EPSILON) return [0, 1]

  const b = 2 * (fx * dx + fy * dy)
  const c = fx * fx + fy * fy - radius * radius
  const discriminant = b * b - 4 * a * c
  if (discriminant <= 0) return [0, 1]

  const root = Math.sqrt(discriminant)
  const values = [0, (-b - root) / (2 * a), (-b + root) / (2 * a), 1]
    .filter((value) => value >= 0 && value <= 1)
    .sort((left, right) => left - right)

  return values.filter((value, index) => index === 0 || value - values[index - 1] > POINT_EPSILON)
}

function isInsideCircle(point: number[], center: EraserPoint, radius: number) {
  const dx = point[0] - center.x
  const dy = point[1] - center.y
  return dx * dx + dy * dy < radius * radius
}

function splitStroke(
  stroke: StrokeElement,
  point: EraserPoint,
  radius: number,
  createId: EraseOptions['createId']
): StrokeElement[] | null {
  if (stroke.points.length === 0) return null
  if (stroke.points.length === 1) {
    return isInsideCircle(stroke.points[0], point, radius + stroke.size / 2) ? [] : null
  }

  const effectiveRadius = radius + stroke.size / 2
  const segments: Array<{ points: number[][]; pressures?: number[] }> = []
  let currentPoints: number[][] = []
  let currentPressures: number[] = []
  let erased = false

  const finishSegment = () => {
    if (
      currentPoints.length >= 2 &&
      currentPoints.some((value, index) =>
        index === 0 ? false : squaredDistance(value, currentPoints[index - 1]) > POINT_EPSILON
      )
    ) {
      segments.push({
        points: currentPoints,
        pressures: stroke.pressures ? currentPressures : undefined,
      })
    }
    currentPoints = []
    currentPressures = []
  }

  const appendPoint = (value: number[], pressure: number) => {
    const previous = currentPoints[currentPoints.length - 1]
    if (previous && squaredDistance(previous, value) <= POINT_EPSILON) return
    currentPoints.push(value)
    if (stroke.pressures) currentPressures.push(pressure)
  }

  for (let index = 1; index < stroke.points.length; index++) {
    const start = stroke.points[index - 1]
    const end = stroke.points[index]
    const startPressure = stroke.pressures?.[index - 1] ?? 0.5
    const endPressure = stroke.pressures?.[index] ?? startPressure
    const breakpoints = segmentCircleBreakpoints(start, end, point, effectiveRadius)

    for (let part = 1; part < breakpoints.length; part++) {
      const from = breakpoints[part - 1]
      const to = breakpoints[part]
      const midpoint = interpolate(start, end, (from + to) / 2)

      if (isInsideCircle(midpoint, point, effectiveRadius)) {
        erased = true
        finishSegment()
        continue
      }

      const fromPressure = startPressure + (endPressure - startPressure) * from
      const toPressure = startPressure + (endPressure - startPressure) * to
      appendPoint(interpolate(start, end, from), fromPressure)
      appendPoint(interpolate(start, end, to), toPressure)
    }
  }

  finishSegment()
  if (!erased) return null

  return segments.map((segment, index) => ({
    ...stroke,
    id: createId(stroke.id, index),
    points: segment.points,
    pressures: segment.pressures,
  }))
}

function circleIntersectsBounds(
  point: EraserPoint,
  radius: number,
  bounds: { x: number; y: number; w: number; h: number }
) {
  const left = Math.min(bounds.x, bounds.x + bounds.w)
  const right = Math.max(bounds.x, bounds.x + bounds.w)
  const top = Math.min(bounds.y, bounds.y + bounds.h)
  const bottom = Math.max(bounds.y, bounds.y + bounds.h)
  const nearestX = Math.max(left, Math.min(point.x, right))
  const nearestY = Math.max(top, Math.min(point.y, bottom))
  const dx = point.x - nearestX
  const dy = point.y - nearestY
  return dx * dx + dy * dy <= radius * radius
}

export function getEraserWorldRadius(toolSize: number, zoom: number): number {
  const screenRadius = Math.min(MAX_SCREEN_RADIUS, Math.max(MIN_SCREEN_RADIUS, toolSize * 2.5))
  return screenRadius / Math.max(0.05, zoom)
}

export function eraseElementsAtPoint(options: EraseOptions): ErasePatch {
  const removeIds: string[] = []
  const additions: StrokeElement[] = []

  for (const element of options.elements) {
    if (element.type === 'stroke') {
      const split = splitStroke(element, options.point, options.radius, options.createId)
      if (split === null) continue
      removeIds.push(element.id)
      additions.push(...split)
    } else if (circleIntersectsBounds(options.point, options.radius, options.getBounds(element))) {
      removeIds.push(element.id)
    } else {
      continue
    }

    if (options.topOnly) break
  }

  return { removeIds, additions }
}
