import type { CanvasElement, CanvasLayer } from '../types'
import {
  assignElementLayer,
  getElementLayerId,
  getWritableLayerId,
  isElementLayerEditable,
  isLayerWritable,
} from '../layers'

export interface CanvasElementRuleContext {
  elements: CanvasElement[]
  layers: CanvasLayer[]
  activeLayerId: string
  idToElement: Map<string, CanvasElement>
}

export function getEditableIds(ids: string[], context: CanvasElementRuleContext): string[] {
  return ids.filter((id) => {
    const element =
      context.idToElement.get(id) ?? context.elements.find((candidate) => candidate.id === id)
    return element !== undefined && isElementLayerEditable(element, context.layers)
  })
}

export function getAtomicEditableIds(
  ids: string[],
  context: CanvasElementRuleContext
): string[] {
  const uniqueIds = [...new Set(ids)]
  const editableIds = getEditableIds(uniqueIds, context)
  return editableIds.length === uniqueIds.length ? editableIds : []
}

export function getSelectableIds(ids: string[], context: CanvasElementRuleContext): string[] {
  return ids.filter((id) => {
    const element =
      context.idToElement.get(id) ?? context.elements.find((candidate) => candidate.id === id)
    return element !== undefined && isLayerWritable(context.layers, getElementLayerId(element))
  })
}

export function assignToWritableLayer(
  element: CanvasElement,
  context: CanvasElementRuleContext
): CanvasElement | null {
  const preferredLayerId =
    element.layerId && isLayerWritable(context.layers, element.layerId)
      ? element.layerId
      : context.activeLayerId
  const layerId = getWritableLayerId(context.layers, preferredLayerId)
  if (!layerId) return null
  return assignElementLayer(element, layerId, context.layers)
}

export function hasBoundArrowForAny(ids: Set<string>, elements: CanvasElement[]): boolean {
  for (const element of elements) {
    if (element.type !== 'shape') continue
    if (element.kind !== 'line' && element.kind !== 'arrow') continue
    if (element.startBinding && ids.has(element.startBinding.targetId)) return true
    if (element.endBinding && ids.has(element.endBinding.targetId)) return true
  }
  return false
}
