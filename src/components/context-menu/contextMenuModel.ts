import type { CanvasElement, AlignmentType, DistributionType } from '../../store/types'

export const MENU_WIDTH = 200
export const MENU_ITEM_HEIGHT = 32
export const MENU_PADDING = 4
export const SUBMENU_OFFSET = -4

export const ALIGN_ACTIONS: ReadonlyArray<{
  label: string
  alignment: AlignmentType
}> = [
  { label: '左对齐', alignment: 'alignLeft' },
  { label: '水平居中', alignment: 'alignCenterH' },
  { label: '右对齐', alignment: 'alignRight' },
  { label: '顶对齐', alignment: 'alignTop' },
  { label: '垂直居中', alignment: 'alignCenterV' },
  { label: '底对齐', alignment: 'alignBottom' },
]

export const DISTRIBUTE_ACTIONS: ReadonlyArray<{
  label: string
  distribution: DistributionType
}> = [
  { label: '水平分布', distribution: 'distributeH' },
  { label: '垂直分布', distribution: 'distributeV' },
]

export interface ContextMenuSelectionState {
  hasSelection: boolean
  hasMultipleSelection: boolean
  hasGroupableSelection: boolean
  hasDistributableSelection: boolean
  hasGroupedElements: boolean
  hasLockedElements: boolean
  hasUnlockedElements: boolean
}

export function getContextMenuSelectionState(
  elements: CanvasElement[],
  selectedIds: string[]
): ContextMenuSelectionState {
  const selectedIdSet = new Set(selectedIds)
  const selectedElements = elements.filter((element) => selectedIdSet.has(element.id))

  return {
    hasSelection: selectedIds.length > 0,
    hasMultipleSelection: selectedIds.length > 1,
    hasGroupableSelection: selectedIds.length >= 2,
    hasDistributableSelection: selectedIds.length >= 3,
    hasGroupedElements: selectedElements.some((element) => element.groupId),
    hasLockedElements: selectedElements.some((element) => element.locked),
    hasUnlockedElements: selectedElements.some((element) => !element.locked),
  }
}

interface ContextMenuPositionOptions {
  x: number
  y: number
  viewportWidth: number
  viewportHeight: number
  hasSelection: boolean
  hasMultipleSelection: boolean
}

export interface ContextMenuPosition {
  x: number
  y: number
  menuWidth: number
}

export function getContextMenuPosition({
  x,
  y,
  viewportWidth,
  viewportHeight,
  hasSelection,
  hasMultipleSelection,
}: ContextMenuPositionOptions): ContextMenuPosition {
  const menuHeight =
    MENU_PADDING * 2 +
    (hasSelection ? 5 : 2) * MENU_ITEM_HEIGHT +
    (hasMultipleSelection ? 2 : 0) * MENU_ITEM_HEIGHT +
    (hasMultipleSelection ? 1 : 0) * MENU_ITEM_HEIGHT +
    2 * 8

  return {
    x: x + MENU_WIDTH > viewportWidth ? Math.max(0, x - MENU_WIDTH) : x,
    y: y + menuHeight > viewportHeight ? Math.max(0, y - menuHeight) : y,
    menuWidth: MENU_WIDTH,
  }
}
