import type { Bounds } from '../core/geometry'

export interface MarqueePoint {
  x: number
  y: number
}

export interface MarqueeRect {
  x: number
  y: number
  w: number
  h: number
}

/** Normalize a drag direction into a positive-width/height selection rectangle. */
export function normalizeMarqueeRect(start: MarqueePoint, end: MarqueePoint): MarqueeRect {
  const x = Math.min(start.x, end.x)
  const y = Math.min(start.y, end.y)
  return {
    x,
    y,
    w: Math.max(start.x, end.x) - x,
    h: Math.max(start.y, end.y) - y,
  }
}

export function hasMarqueeArea(rect: MarqueeRect, minWidth = 3, minHeight = 3): boolean {
  return rect.w > minWidth || rect.h > minHeight
}

export function hasMarqueeDragSize(rect: MarqueeRect, minSize = 20): boolean {
  return Math.max(rect.w, rect.h) > minSize
}

export function isPointInsideMarquee(point: MarqueePoint, rect: MarqueeRect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  )
}

/** Detect whether the current pointer is contracting the previous marquee. */
export function isMarqueeShrinking(
  start: MarqueePoint,
  previousEnd: MarqueePoint,
  nextEnd: MarqueePoint,
  ratio = 0.95
): boolean {
  const previous = normalizeMarqueeRect(start, previousEnd)
  const next = normalizeMarqueeRect(start, nextEnd)
  return next.w < previous.w * ratio || next.h < previous.h * ratio
}

export function boundsIntersectMarquee(bounds: Bounds, rect: MarqueeRect): boolean {
  return (
    bounds.x + bounds.w >= rect.x &&
    bounds.x <= rect.x + rect.w &&
    bounds.y + bounds.h >= rect.y &&
    bounds.y <= rect.y + rect.h
  )
}

/**
 * Resolve spatial-index candidates into selectable element ids. The caller owns
 * candidate selection; passing an empty/undefined list intentionally returns no ids.
 */
export function collectMarqueeElementIds<T>(options: {
  candidateIds?: readonly string[] | null
  getElement: (id: string) => T | undefined
  getBounds: (element: T) => Bounds
  isSelectable: (element: T) => boolean
  rect: MarqueeRect
}): string[] {
  const { candidateIds, getElement, getBounds, isSelectable, rect } = options
  const hits: string[] = []
  for (const id of candidateIds ?? []) {
    const element = getElement(id)
    if (!element || !isSelectable(element)) continue
    if (boundsIntersectMarquee(getBounds(element), rect)) hits.push(id)
  }
  return hits
}

export function mergeMarqueeSelectionIds(
  currentIds: readonly string[],
  hitIds: readonly string[],
  append: boolean
): string[] {
  return append ? [...new Set([...currentIds, ...hitIds])] : [...hitIds]
}
