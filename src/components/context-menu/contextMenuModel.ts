import type { CanvasElement, AlignmentType, DistributionType } from '../../store/types'

export const MENU_WIDTH = 200
export const MENU_ITEM_HEIGHT = 32
export const MENU_PADDING = 4
export const SUBMENU_OFFSET = -4
export const VIEWPORT_MARGIN = 8

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
  menuWidth: number
  menuHeight: number
  viewportWidth: number
  viewportHeight: number
  margin?: number
}

export interface ContextMenuPosition {
  x: number
  y: number
  menuWidth: number
  maxHeight: number
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum))
}

export function getContextMenuPosition({
  x,
  y,
  menuWidth,
  menuHeight,
  viewportWidth,
  viewportHeight,
  margin = VIEWPORT_MARGIN,
}: ContextMenuPositionOptions): ContextMenuPosition {
  const availableWidth = Math.max(0, viewportWidth - margin * 2)
  const availableHeight = Math.max(0, viewportHeight - margin * 2)
  const measuredWidth = Math.min(Math.max(0, menuWidth), availableWidth)
  const measuredHeight = Math.min(Math.max(0, menuHeight), availableHeight)

  return {
    x: clamp(x, margin, viewportWidth - measuredWidth - margin),
    y: clamp(y, margin, viewportHeight - measuredHeight - margin),
    menuWidth: measuredWidth,
    maxHeight: availableHeight,
  }
}

interface ContextSubmenuPositionOptions {
  anchorLeft: number
  anchorRight: number
  anchorTop: number
  submenuWidth: number
  submenuHeight: number
  viewportWidth: number
  viewportHeight: number
  offset?: number
  margin?: number
}

export interface ContextSubmenuPosition {
  x: number
  y: number
  maxHeight: number
  placement: 'left' | 'right'
}

export function getContextSubmenuPosition({
  anchorLeft,
  anchorRight,
  anchorTop,
  submenuWidth,
  submenuHeight,
  viewportWidth,
  viewportHeight,
  offset = SUBMENU_OFFSET,
  margin = VIEWPORT_MARGIN,
}: ContextSubmenuPositionOptions): ContextSubmenuPosition {
  const availableWidth = Math.max(0, viewportWidth - margin * 2)
  const availableHeight = Math.max(0, viewportHeight - margin * 2)
  const measuredWidth = Math.min(Math.max(0, submenuWidth), availableWidth)
  const measuredHeight = Math.min(Math.max(0, submenuHeight), availableHeight)
  const rightX = anchorRight + offset
  const leftX = anchorLeft - measuredWidth - offset
  const rightFits = rightX + measuredWidth <= viewportWidth - margin
  const leftFits = leftX >= margin
  const placement = rightFits || !leftFits ? 'right' : 'left'
  const preferredX = placement === 'right' ? rightX : leftX

  return {
    x: clamp(preferredX, margin, viewportWidth - measuredWidth - margin),
    y: clamp(anchorTop, margin, viewportHeight - measuredHeight - margin),
    maxHeight: availableHeight,
    placement,
  }
}
