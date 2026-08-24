import type { CanvasElement, CanvasLayer } from '../types'
import { getElementLayerId, getSortedLayers, getWritableLayerId, isLayerWritable } from '../layers'
import { getEditableIds, type CanvasElementRuleContext } from './canvasElementRules'

export interface CanvasLayerPlanContext extends CanvasElementRuleContext {
  selectedIds: string[]
}

export interface CanvasLayerStatePlan {
  layers: CanvasLayer[]
  activeLayerId: string
  selectedIds: string[]
}

export interface CanvasLayerDeletionPlan extends CanvasLayerStatePlan {
  elements: CanvasElement[]
  updatedElements: CanvasElement[]
}

export interface CanvasElementLayerPlan {
  elements: CanvasElement[]
  updatedElements: CanvasElement[]
  selectedIds: string[]
}

export function createLayerDeletionPlan(
  context: CanvasLayerPlanContext,
  layerId: string
): CanvasLayerDeletionPlan | null {
  if (context.layers.length <= 1) return null
  if (!context.layers.some((layer) => layer.id === layerId)) return null

  const layers = getSortedLayers(context.layers.filter((layer) => layer.id !== layerId)).map(
    (layer, order) => ({ ...layer, order })
  )
  const fallbackLayerId = getWritableLayerId(layers, context.activeLayerId) ?? layers[0].id
  const updatedElements: CanvasElement[] = []
  const elements = context.elements.map((element) => {
    if (getElementLayerId(element) !== layerId) return element
    const updated = { ...element, layerId: fallbackLayerId }
    updatedElements.push(updated)
    return updated
  })
  const selectedIds = context.selectedIds.filter((selectedId) => {
    const element = context.idToElement.get(selectedId)
    return element ? getElementLayerId(element) !== layerId : false
  })

  return {
    layers,
    activeLayerId:
      context.activeLayerId === layerId
        ? fallbackLayerId
        : (getWritableLayerId(layers, context.activeLayerId) ?? fallbackLayerId),
    elements,
    updatedElements,
    selectedIds,
  }
}

export function createLayerVisibilityPlan(
  context: CanvasLayerPlanContext,
  layerId: string,
  visible: boolean,
  timestamp: number
): CanvasLayerStatePlan | null {
  const layer = context.layers.find((candidate) => candidate.id === layerId)
  if (!layer || layer.visible === visible) return null
  const visibleCount = context.layers.filter((candidate) => candidate.visible).length
  if (!visible && visibleCount <= 1) return null

  const layers = context.layers.map((candidate) =>
    candidate.id === layerId ? { ...candidate, visible, updatedAt: timestamp } : candidate
  )
  const hiddenIds = new Set(
    context.elements
      .filter((element) => getElementLayerId(element) === layerId)
      .map((element) => element.id)
  )

  return {
    layers,
    activeLayerId:
      !visible && context.activeLayerId === layerId
        ? (getWritableLayerId(layers) ?? layers[0].id)
        : (getWritableLayerId(layers, context.activeLayerId) ?? layers[0].id),
    selectedIds: visible
      ? context.selectedIds
      : context.selectedIds.filter((selectedId) => !hiddenIds.has(selectedId)),
  }
}

export function createLayerLockPlan(
  context: CanvasLayerPlanContext,
  layerId: string,
  locked: boolean,
  timestamp: number
): CanvasLayerStatePlan | null {
  const layer = context.layers.find((candidate) => candidate.id === layerId)
  if (!layer || layer.locked === locked) return null

  const layers = context.layers.map((candidate) =>
    candidate.id === layerId ? { ...candidate, locked, updatedAt: timestamp } : candidate
  )
  const lockedIds = new Set(
    context.elements
      .filter((element) => getElementLayerId(element) === layerId)
      .map((element) => element.id)
  )

  return {
    layers,
    activeLayerId:
      locked && context.activeLayerId === layerId
        ? (getWritableLayerId(layers) ?? layers[0].id)
        : (getWritableLayerId(layers, context.activeLayerId) ?? layers[0].id),
    selectedIds: locked
      ? context.selectedIds.filter((selectedId) => !lockedIds.has(selectedId))
      : context.selectedIds,
  }
}

export function createLayerReorderPlan(
  layers: CanvasLayer[],
  layerId: string,
  direction: 'up' | 'down',
  timestamp: number
): CanvasLayer[] | null {
  const sorted = getSortedLayers(layers)
  const index = sorted.findIndex((layer) => layer.id === layerId)
  if (index < 0) return null
  const targetIndex = direction === 'up' ? index + 1 : index - 1
  if (targetIndex < 0 || targetIndex >= sorted.length) return null

  const reordered = [...sorted]
  ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
  return reordered.map((layer, order) => ({ ...layer, order, updatedAt: timestamp }))
}

export function createMoveElementsToLayerPlan(
  context: CanvasLayerPlanContext,
  elementIds: string[],
  layerId: string
): CanvasElementLayerPlan | null {
  if (!isLayerWritable(context.layers, layerId)) return null
  const editableIds = getEditableIds(elementIds, context)
  if (editableIds.length === 0) return null

  const selected = new Set(editableIds)
  const updatedElements: CanvasElement[] = []
  const elements = context.elements.map((element) => {
    if (!selected.has(element.id) || getElementLayerId(element) === layerId) return element
    const updated = { ...element, layerId }
    updatedElements.push(updated)
    return updated
  })
  if (updatedElements.length === 0) return null

  return { elements, updatedElements, selectedIds: editableIds }
}
