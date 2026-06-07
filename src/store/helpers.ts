import type { CanvasElement } from './types'
import { moveElement } from './types'

/**
 * Create a shallow clone of a canvas element.
 * For strokes, deep-clones the points array.
 */
export function shallowClone(el: CanvasElement): CanvasElement {
  if (el.type === 'stroke') return { ...el, points: el.points.map((p) => [...p]) }
  return { ...el } as CanvasElement
}

/**
 * Create a snapshot (shallow clone) of an array of elements.
 */
export function snapshot(els: CanvasElement[]): CanvasElement[] {
  return els.map(shallowClone)
}

/**
 * Apply a move delta to an element.
 */
export function applyMoveDelta(el: CanvasElement, dx: number, dy: number): CanvasElement {
  return moveElement(el, dx, dy)
}

/**
 * Apply a reverse move delta to an element (for undo).
 */
export function reverseMoveDelta(el: CanvasElement, dx: number, dy: number): CanvasElement {
  return moveElement(el, -dx, -dy)
}
