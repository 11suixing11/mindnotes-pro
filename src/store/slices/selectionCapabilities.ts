import type { CanvasElement, CanvasLayer } from '../types'
import {
  reorderElementsWithinLayers,
  type ElementReorderMode,
} from './canvasElementArrangement'
import { getSelectionStyleModel } from './canvasElementStyle'

export interface SelectionCapabilities {
  selectedIds: string[]
  count: number
  isLocked: boolean
  canCopy: boolean
  canDuplicate: boolean
  canDelete: boolean
  canLock: boolean
  canUnlock: boolean
  canGroup: boolean
  canUngroup: boolean
  canAlign: boolean
  canDistribute: boolean
  canReorder: Record<ElementReorderMode, boolean>
}

export interface SelectionCapabilitiesContext {
  elements: CanvasElement[]
  layers: CanvasLayer[]
  selectedIds: string[]
  idToElement?: ReadonlyMap<string, CanvasElement>
}

function canReorder(
  elements: CanvasElement[],
  selectedIds: string[],
  mode: ElementReorderMode
): boolean {
  const reordered = reorderElementsWithinLayers(elements, selectedIds, mode)
  return elements.some((element, index) => element !== reordered[index])
}

export function getSelectionCapabilities(
  context: SelectionCapabilitiesContext
): SelectionCapabilities {
  const styleModel = getSelectionStyleModel(context)
  const selected = styleModel.selectedIds
    .map(
      (id) =>
        context.idToElement?.get(id) ??
        context.elements.find((element) => element.id === id)
    )
    .filter((element): element is CanvasElement => element !== undefined)
  const hasSelection = selected.length > 0
  const editable = hasSelection && !styleModel.isLocked

  return {
    selectedIds: styleModel.selectedIds,
    count: selected.length,
    isLocked: styleModel.isLocked,
    canCopy: hasSelection,
    canDuplicate: editable,
    canDelete: editable,
    canLock: editable,
    canUnlock: hasSelection && styleModel.isLocked,
    canGroup: editable && selected.length >= 2 && selected.every((element) => !element.groupId),
    canUngroup: editable && selected.some((element) => element.groupId !== undefined),
    canAlign: editable && selected.length >= 2,
    canDistribute: editable && selected.length >= 3,
    canReorder: {
      front: editable && canReorder(context.elements, styleModel.selectedIds, 'front'),
      forward: editable && canReorder(context.elements, styleModel.selectedIds, 'forward'),
      backward: editable && canReorder(context.elements, styleModel.selectedIds, 'backward'),
      back: editable && canReorder(context.elements, styleModel.selectedIds, 'back'),
    },
  }
}
