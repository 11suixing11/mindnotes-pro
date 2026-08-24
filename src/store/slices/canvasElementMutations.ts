import type { CanvasElement, UndoAction } from '../types'
import { shallowClone, snapshot } from '../helpers'

export interface CanvasElementAdditionPlan {
  elements: CanvasElement[]
  addedElements: CanvasElement[]
  action: UndoAction
}

export interface CanvasElementUpdatePlan {
  elements: CanvasElement[]
  updatedElement: CanvasElement
}

export interface CanvasElementRemovalPlan {
  elements: CanvasElement[]
  removedIds: string[]
  selectedIds: string[]
  action: UndoAction
}

export interface CanvasElementClearPlan {
  elements: []
  selectedIds: []
  action: UndoAction
}

export function createElementAdditionPlan(
  elements: CanvasElement[],
  addedElements: CanvasElement[]
): CanvasElementAdditionPlan | null {
  if (addedElements.length === 0) return null
  const existingIds = new Set(elements.map((element) => element.id))
  const batchIds = new Set<string>()
  for (const element of addedElements) {
    if (existingIds.has(element.id) || batchIds.has(element.id)) return null
    batchIds.add(element.id)
  }
  return {
    elements: [...elements, ...addedElements],
    addedElements,
    action: {
      type: 'add',
      ids: addedElements.map((element) => element.id),
      els: addedElements.map(shallowClone),
    },
  }
}

export function createElementUpdatePlan(
  elements: CanvasElement[],
  elementIndex: number,
  update: (element: CanvasElement) => CanvasElement
): CanvasElementUpdatePlan {
  const next = [...elements]
  const updatedElement = update(next[elementIndex])
  next[elementIndex] = updatedElement
  return { elements: next, updatedElement }
}

export function createElementRemovalPlan(
  elements: CanvasElement[],
  elementIds: string[],
  selectedIds: string[],
  clearSelection = false
): CanvasElementRemovalPlan | null {
  const selected = new Set(elementIds)
  const items = elements.flatMap((element, index) =>
    selected.has(element.id) ? [{ el: shallowClone(element), index }] : []
  )
  if (items.length === 0) return null

  const removedIds = items.map((item) => item.el.id)
  const removed = new Set(removedIds)
  return {
    elements: elements.filter((element) => !removed.has(element.id)),
    removedIds,
    selectedIds: clearSelection ? [] : selectedIds.filter((id) => !removed.has(id)),
    action: { type: 'remove', items },
  }
}

export function createElementClearPlan(elements: CanvasElement[]): CanvasElementClearPlan {
  return {
    elements: [],
    selectedIds: [],
    action: { type: 'clear', snapshot: snapshot(elements) },
  }
}
