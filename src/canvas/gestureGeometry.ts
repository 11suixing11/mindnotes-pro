import type { CanvasElement } from '../core/model'

export interface GesturePoint {
  x: number
  y: number
}

export const DRAG_THRESHOLD = 4
export const RIGHT_CLICK_PAN_THRESHOLD = 3

/** Return the squared distance between two screen/world points. */
export function distanceSquared(a: GesturePoint, b: GesturePoint): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return dx * dx + dy * dy
}

/** Apply a pointer-movement threshold without taking a square root. */
export function hasMovedBeyondThreshold(
  start: GesturePoint,
  current: GesturePoint,
  threshold: number
): boolean {
  return distanceSquared(start, current) >= threshold * threshold
}

export function haveStrokePointsChanged(before: number[][], after: number[][]): boolean {
  if (before.length !== after.length) return true
  for (let index = 0; index < before.length; index += 1) {
    if (before[index]?.[0] !== after[index]?.[0] || before[index]?.[1] !== after[index]?.[1]) {
      return true
    }
  }
  return false
}

/** Compare only persisted geometry so style/selection changes do not create move history. */
export function hasElementGeometryChanged(before: CanvasElement, after: CanvasElement): boolean {
  if (before.type !== after.type) return true

  if (before.type === 'stroke') {
    return haveStrokePointsChanged(before.points, (after as typeof before).points)
  }

  if (before.type === 'shape') {
    const next = after as typeof before
    return (
      before.x !== next.x ||
      before.y !== next.y ||
      before.w !== next.w ||
      before.h !== next.h ||
      (before.rotation ?? 0) !== (next.rotation ?? 0)
    )
  }

  const next = after as typeof before
  return (
    before.x !== next.x ||
    before.y !== next.y ||
    before.width !== next.width ||
    before.height !== next.height ||
    (before.rotation ?? 0) !== (next.rotation ?? 0)
  )
}

/** Find elements added, removed, or geometrically moved between two snapshots. */
export function getChangedElementIds(before: CanvasElement[], after: CanvasElement[]): string[] {
  const beforeById = new Map(before.map((element) => [element.id, element]))
  const afterById = new Map(after.map((element) => [element.id, element]))
  const changedIds = new Set<string>()

  for (const beforeElement of before) {
    const afterElement = afterById.get(beforeElement.id)
    if (!afterElement || hasElementGeometryChanged(beforeElement, afterElement)) {
      changedIds.add(beforeElement.id)
    }
  }

  for (const afterElement of after) {
    if (!beforeById.has(afterElement.id)) changedIds.add(afterElement.id)
  }

  return [...changedIds]
}
