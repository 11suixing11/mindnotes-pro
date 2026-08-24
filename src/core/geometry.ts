import type { CanvasElement, StrokeElement } from './model'

const strokeBoundsCache = new WeakMap<StrokeElement, Bounds>()

export interface Bounds {
  x: number
  y: number
  w: number
  h: number
}

export function distanceToSegmentSquared(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  let t = lengthSquared === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lengthSquared
  t = Math.max(0, Math.min(1, t))
  const closestX = ax + t * dx - px
  const closestY = ay + t * dy - py
  return closestX * closestX + closestY * closestY
}

export function invalidateStrokeBounds(el: StrokeElement): void {
  strokeBoundsCache.delete(el)
}

export function elementBounds(el: CanvasElement): Bounds {
  if (el.type === 'stroke') {
    const cached = strokeBoundsCache.get(el)
    if (cached) return cached

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (let index = 0; index < el.points.length; index++) {
      const point = el.points[index]
      if (point[0] < minX) minX = point[0]
      if (point[1] < minY) minY = point[1]
      if (point[0] > maxX) maxX = point[0]
      if (point[1] > maxY) maxY = point[1]
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

export function moveElement(el: CanvasElement, dx: number, dy: number): CanvasElement {
  if (el.type === 'stroke') {
    const points = el.points
    const nextPoints = new Array<number[]>(points.length)
    for (let index = 0; index < points.length; index++) {
      const point = points[index]
      nextPoints[index] = [point[0] + dx, point[1] + dy]
    }
    return { ...el, points: nextPoints }
  }
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
    const points = el.points
    const nextPoints = new Array<number[]>(points.length)
    for (let index = 0; index < points.length; index++) {
      nextPoints[index] = [ax + (points[index][0] - ax) * sx, ay + (points[index][1] - ay) * sy]
    }
    return { ...el, points: nextPoints }
  }

  if (el.type === 'shape') {
    const x = ax + (el.x - ax) * sx
    const y = ay + (el.y - ay) * sy
    return { ...el, x, y, w: el.w * sx, h: el.h * sy }
  }

  if (el.type === 'text') {
    return {
      ...el,
      x: ax + (el.x - ax) * sx,
      y: ay + (el.y - ay) * sy,
      width: el.width * sx,
      height: el.height * sy,
      autoResize: false,
    }
  }

  return {
    ...el,
    x: ax + (el.x - ax) * sx,
    y: ay + (el.y - ay) * sy,
    width: el.width * sx,
    height: el.height * sy,
  }
}

export function rotateElement(
  el: CanvasElement,
  angle: number,
  cx?: number,
  cy?: number
): CanvasElement {
  const bounds = elementBounds(el)
  const centerX = cx ?? bounds.x + bounds.w / 2
  const centerY = cy ?? bounds.y + bounds.h / 2
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const rotatePoint = (px: number, py: number): [number, number] => {
    const dx = px - centerX
    const dy = py - centerY
    return [centerX + dx * cos - dy * sin, centerY + dx * sin + dy * cos]
  }
  const rotation = ((el.rotation || 0) + angle) % (Math.PI * 2)

  if (el.type === 'stroke') {
    return { ...el, points: el.points.map((point) => rotatePoint(point[0], point[1])), rotation }
  }
  return { ...el, rotation } as CanvasElement
}
