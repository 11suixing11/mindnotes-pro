import type { CanvasElement } from '../types'
import { moveElement } from '../types'
import { shallowClone } from '../helpers'
import { assignToWritableLayer, type CanvasElementRuleContext } from './canvasElementRules'

export interface OffsetCopyPlan {
  elements: CanvasElement[]
  ids: string[]
}

export function copySelectedElements(
  elements: CanvasElement[],
  selectedIds: string[]
): CanvasElement[] {
  const selected = new Set(selectedIds)
  return elements.filter((element) => selected.has(element.id)).map(shallowClone)
}

export function createOffsetCopyPlan(
  sourceElements: CanvasElement[],
  context: CanvasElementRuleContext,
  timestamp: number,
  offset = 20
): OffsetCopyPlan {
  const elements: CanvasElement[] = []
  const ids: string[] = []

  sourceElements.forEach((element, index) => {
    const id = `${element.type}-${timestamp}-${index}`
    const copy = assignToWritableLayer(
      moveElement({ ...shallowClone(element), id }, offset, offset),
      context
    )
    if (!copy) return
    ids.push(id)
    elements.push(copy)
  })

  return { elements, ids }
}
