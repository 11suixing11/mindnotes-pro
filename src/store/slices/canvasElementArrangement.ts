import type { AlignmentType, CanvasElement, DistributionType, UndoAction } from '../types'
import { alignElements, distributeElements } from '../types'
import { snapshot } from '../helpers'
import { getElementLayerId } from '../layers'

export type ElementReorderMode = 'front' | 'forward' | 'backward' | 'back'

export interface CanvasElementArrangementPlan {
  elements: CanvasElement[]
  action: UndoAction
}

function createArrangementPlan(
  elements: CanvasElement[],
  elementIds: string[],
  nextElements: CanvasElement[],
  label: string
): CanvasElementArrangementPlan | null {
  const hasChanges = elements.some((element, index) => element !== nextElements[index])
  if (!hasChanges) return null

  return {
    elements: nextElements,
    action: {
      type: 'snapshot',
      before: snapshot(elements),
      after: snapshot(nextElements),
      label,
      affectedIds: elementIds,
    },
  }
}

export function createAlignmentPlan(
  elements: CanvasElement[],
  elementIds: string[],
  alignment: AlignmentType
): CanvasElementArrangementPlan | null {
  return createArrangementPlan(
    elements,
    elementIds,
    alignElements(elements, elementIds, alignment),
    'Align elements'
  )
}

export function createDistributionPlan(
  elements: CanvasElement[],
  elementIds: string[],
  distribution: DistributionType
): CanvasElementArrangementPlan | null {
  return createArrangementPlan(
    elements,
    elementIds,
    distributeElements(elements, elementIds, distribution),
    'Distribute elements'
  )
}

function reorderLayerElements(
  elements: CanvasElement[],
  selectedIds: ReadonlySet<string>,
  mode: ElementReorderMode
): CanvasElement[] {
  const reordered = [...elements]

  if (mode === 'front') {
    return [
      ...reordered.filter((element) => !selectedIds.has(element.id)),
      ...reordered.filter((element) => selectedIds.has(element.id)),
    ]
  }
  if (mode === 'back') {
    return [
      ...reordered.filter((element) => selectedIds.has(element.id)),
      ...reordered.filter((element) => !selectedIds.has(element.id)),
    ]
  }
  if (mode === 'forward') {
    for (let index = reordered.length - 2; index >= 0; index -= 1) {
      if (selectedIds.has(reordered[index].id) && !selectedIds.has(reordered[index + 1].id)) {
        ;[reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]]
      }
    }
    return reordered
  }

  for (let index = 1; index < reordered.length; index += 1) {
    if (selectedIds.has(reordered[index].id) && !selectedIds.has(reordered[index - 1].id)) {
      ;[reordered[index], reordered[index - 1]] = [reordered[index - 1], reordered[index]]
    }
  }
  return reordered
}

export function reorderElementsWithinLayers(
  elements: CanvasElement[],
  elementIds: string[],
  mode: ElementReorderMode
): CanvasElement[] {
  const selectedIds = new Set(elementIds)
  const indexesByLayer = new Map<string, number[]>()

  elements.forEach((element, index) => {
    const layerId = getElementLayerId(element)
    const indexes = indexesByLayer.get(layerId)
    if (indexes) indexes.push(index)
    else indexesByLayer.set(layerId, [index])
  })

  const nextElements = [...elements]
  for (const indexes of indexesByLayer.values()) {
    if (!indexes.some((index) => selectedIds.has(elements[index].id))) continue
    const layerElements = indexes.map((index) => elements[index])
    const reordered = reorderLayerElements(layerElements, selectedIds, mode)
    indexes.forEach((elementIndex, layerIndex) => {
      nextElements[elementIndex] = reordered[layerIndex]
    })
  }
  return nextElements
}

export function createReorderPlan(
  elements: CanvasElement[],
  elementIds: string[],
  mode: ElementReorderMode
): CanvasElementArrangementPlan | null {
  const labels: Record<ElementReorderMode, string> = {
    front: 'Bring elements to front',
    forward: 'Bring elements forward',
    backward: 'Send elements backward',
    back: 'Send elements to back',
  }
  return createArrangementPlan(
    elements,
    elementIds,
    reorderElementsWithinLayers(elements, elementIds, mode),
    labels[mode]
  )
}
