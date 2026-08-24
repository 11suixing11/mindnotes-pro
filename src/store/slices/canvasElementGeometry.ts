import type { CanvasElement, UndoAction } from '../types'
import { moveElement, resizeElement, rotateElement } from '../types'
import { snapshot } from '../helpers'
import { updateBoundArrows } from '../bindingUtils'
import { hasBoundArrowForAny } from './canvasElementRules'

export interface CanvasElementGeometryPlan {
  elements: CanvasElement[]
  updatedElements: CanvasElement[]
  action?: UndoAction
}

function updatedValues(updated: Map<string, CanvasElement>): CanvasElement[] {
  return Array.from(updated.values())
}

export function createMoveElementPlan(
  elements: CanvasElement[],
  elementIndex: number,
  dx: number,
  dy: number,
  idToElement: ReadonlyMap<string, CanvasElement>,
  idToIndex: ReadonlyMap<string, number>
): CanvasElementGeometryPlan {
  const next = [...elements]
  const moved = moveElement(next[elementIndex], dx, dy)
  next[elementIndex] = moved

  const lookup = new Map(idToElement)
  const updated = new Map<string, CanvasElement>([[moved.id, moved]])
  lookup.set(moved.id, moved)

  const arrowUpdates = updateBoundArrows(moved.id, next, lookup)
  for (const update of arrowUpdates) {
    const arrowIndex = idToIndex.get(update.id)
    if (arrowIndex === undefined || arrowIndex < 0) continue
    next[arrowIndex] = update.newEl
    lookup.set(update.id, update.newEl)
    updated.set(update.id, update.newEl)
  }

  return { elements: next, updatedElements: updatedValues(updated) }
}

export function createMoveElementsPlan(
  elements: CanvasElement[],
  elementIds: string[],
  dx: number,
  dy: number,
  idToElement: ReadonlyMap<string, CanvasElement>,
  idToIndex: ReadonlyMap<string, number>,
  recordHistory: boolean
): CanvasElementGeometryPlan | null {
  const selected = new Set(elementIds)
  const beforeSnapshot =
    recordHistory && hasBoundArrowForAny(selected, elements) ? snapshot(elements) : null
  const next = [...elements]
  const lookup = new Map(idToElement)
  const updated = new Map<string, CanvasElement>()
  const movedIds: string[] = []
  const affectedIds = new Set<string>()

  for (let index = 0; index < next.length; index++) {
    const element = next[index]
    if (!selected.has(element.id)) continue
    const moved = moveElement(element, dx, dy)
    next[index] = moved
    lookup.set(moved.id, moved)
    updated.set(moved.id, moved)
    movedIds.push(moved.id)
    affectedIds.add(moved.id)
  }
  if (movedIds.length === 0) return null

  for (const movedId of movedIds) {
    const arrowUpdates = updateBoundArrows(movedId, next, lookup)
    for (const update of arrowUpdates) {
      const arrowIndex = idToIndex.get(update.id)
      if (arrowIndex === undefined || arrowIndex < 0) continue
      next[arrowIndex] = update.newEl
      lookup.set(update.id, update.newEl)
      updated.set(update.id, update.newEl)
      affectedIds.add(update.id)
    }
  }

  const action: UndoAction | undefined = recordHistory
    ? beforeSnapshot
      ? {
          type: 'snapshot',
          before: beforeSnapshot,
          after: snapshot(next),
          label: elementIds.length === 1 ? 'Move element' : `Move ${elementIds.length} elements`,
          affectedIds: [...affectedIds],
        }
      : {
          type: 'move',
          deltas: movedIds.map((id) => ({ id, dx, dy })),
        }
    : undefined

  return { elements: next, updatedElements: updatedValues(updated), action }
}

export function createResizeElementPlan(
  elements: CanvasElement[],
  elementIndex: number,
  ax: number,
  ay: number,
  sx: number,
  sy: number
): CanvasElementGeometryPlan {
  const next = [...elements]
  const resized = resizeElement(next[elementIndex], ax, ay, sx, sy)
  next[elementIndex] = resized
  return { elements: next, updatedElements: [resized] }
}

export function createRotateElementPlan(
  elements: CanvasElement[],
  elementIndex: number,
  angle: number,
  cx?: number,
  cy?: number
): CanvasElementGeometryPlan {
  const next = [...elements]
  const rotated = rotateElement(next[elementIndex], angle, cx, cy)
  next[elementIndex] = rotated
  return { elements: next, updatedElements: [rotated] }
}

export function createRotateElementsPlan(
  elements: CanvasElement[],
  elementIds: string[],
  angle: number,
  cx?: number,
  cy?: number
): CanvasElementGeometryPlan | null {
  const selected = new Set(elementIds)
  const next = [...elements]
  const updatedElements: CanvasElement[] = []

  for (let index = 0; index < next.length; index++) {
    const element = next[index]
    if (!selected.has(element.id)) continue
    const rotated = rotateElement(element, angle, cx, cy)
    next[index] = rotated
    updatedElements.push(rotated)
  }

  return updatedElements.length > 0 ? { elements: next, updatedElements } : null
}
