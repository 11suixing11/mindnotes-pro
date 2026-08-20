import type { AlignmentType, CanvasElement, DistributionType, UndoAction } from '../types'
import { alignElements, distributeElements } from '../types'
import { snapshot } from '../helpers'

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
