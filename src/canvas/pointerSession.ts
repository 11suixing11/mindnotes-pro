import type { Bounds } from '../core/geometry'
import type { CanvasElement } from '../core/model'
import { getChangedElementIds } from './gestureGeometry'

export interface DragSession {
  x: number
  y: number
  id: string
  startPositions?: Map<string, { x: number; y: number }>
  startElementsSnapshot?: CanvasElement[]
  dragStarted: boolean
  startScreenX: number
  startScreenY: number
  startSelectedIds: string[]
}

export interface ResizeSession {
  handle: number
  id: string
  startX: number
  startY: number
  origBounds: Bounds
  origElement: CanvasElement | null
  startElementsSnapshot: CanvasElement[]
  startSelectedIds: string[]
}

export interface RotateSession {
  ids: string[]
  startX: number
  startY: number
  origRotations: Map<string, number>
  commonCenterX: number
  commonCenterY: number
  startElementsSnapshot: CanvasElement[]
  startSelectedIds: string[]
}

export interface RestoreSessionState {
  snapshot?: CanvasElement[]
  selectedIds?: string[]
}

export interface SelectionPressOptions {
  hitId: string
  hitElement?: CanvasElement
  elements: readonly CanvasElement[]
  selectedIds: readonly string[]
  multiSelect: boolean
  isEditable: (element: CanvasElement) => boolean
}

export interface SelectionPressResult {
  dragIds: string[]
  nextSelectedIds: string[] | null
}

/** Resolve grouped selection and modifier-key behavior for an element press. */
export function resolveSelectionPress(options: SelectionPressOptions): SelectionPressResult {
  const { hitId, hitElement, elements, selectedIds, multiSelect, isEditable } = options
  const groupMemberIds = hitElement?.groupId
    ? elements
        .filter((element) => element.groupId === hitElement.groupId && isEditable(element))
        .map((element) => element.id)
    : []
  const allGroupSelected =
    groupMemberIds.length > 0 && groupMemberIds.every((id) => selectedIds.includes(id))
  const effectiveHit = groupMemberIds.length > 0 && !allGroupSelected ? groupMemberIds[0] : hitId
  const dragIds = selectedIds.includes(effectiveHit)
    ? [...selectedIds]
    : groupMemberIds.length > 0
      ? groupMemberIds
      : [effectiveHit]

  if (multiSelect) {
    if (groupMemberIds.length > 0) {
      return {
        dragIds,
        nextSelectedIds: allGroupSelected
          ? selectedIds.filter((id) => !groupMemberIds.includes(id))
          : [...new Set([...selectedIds, ...groupMemberIds])],
      }
    }
    return {
      dragIds,
      nextSelectedIds: selectedIds.includes(hitId)
        ? selectedIds.filter((id) => id !== hitId)
        : [...selectedIds, hitId],
    }
  }

  if (groupMemberIds.length > 0) {
    return {
      dragIds,
      nextSelectedIds: allGroupSelected ? null : groupMemberIds,
    }
  }

  return {
    dragIds,
    nextSelectedIds: selectedIds.includes(hitId) ? null : [hitId],
  }
}

/** Calculate the union bounds for an explicit set of selected elements. */
export function calculateSelectionBounds(
  elements: readonly CanvasElement[],
  getBounds: (element: CanvasElement) => Bounds
): Bounds | null {
  if (elements.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const element of elements) {
    const bounds = getBounds(element)
    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.w)
    maxY = Math.max(maxY, bounds.y + bounds.h)
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export interface RotationSessionGeometry {
  origRotations: Map<string, number>
  commonCenterX: number
  commonCenterY: number
}

/** Collect rotation baselines and the shared center for a selection. */
export function getRotationSessionGeometry(
  ids: readonly string[],
  getElement: (id: string) => CanvasElement | undefined,
  getBounds: (element: CanvasElement) => Bounds
): RotationSessionGeometry | null {
  const elements: CanvasElement[] = []
  const origRotations = new Map<string, number>()
  for (const id of ids) {
    const element = getElement(id)
    if (!element) continue
    elements.push(element)
    origRotations.set(id, element.rotation ?? 0)
  }

  const bounds = calculateSelectionBounds(elements, getBounds)
  if (!bounds) return null
  return {
    origRotations,
    commonCenterX: bounds.x + bounds.w / 2,
    commonCenterY: bounds.y + bounds.h / 2,
  }
}

/** Resolve the snapshot and selection to restore when an input session is cancelled. */
export function getRestoreSessionState(
  drag: DragSession | null,
  resize: ResizeSession | null,
  rotate: RotateSession | null
): RestoreSessionState {
  return {
    snapshot:
      drag?.startElementsSnapshot ?? resize?.startElementsSnapshot ?? rotate?.startElementsSnapshot,
    selectedIds: drag?.startSelectedIds ?? resize?.startSelectedIds ?? rotate?.startSelectedIds,
  }
}

/** Keep only selection ids that still exist after a cancelled session. */
export function filterExistingSelectionIds(
  ids: readonly string[],
  elements: readonly CanvasElement[]
): string[] {
  const elementIds = new Set(elements.map((element) => element.id))
  return ids.filter((id) => elementIds.has(id))
}

export function hasSessionGeometryChanges(
  snapshot: CanvasElement[],
  elements: CanvasElement[]
): boolean {
  return getChangedElementIds(snapshot, elements).length > 0
}

export interface DragHistoryDetails {
  affectedIds: string[]
  label: string
}

/** Resolve whether a drag changed geometry and the label used for its undo entry. */
export function getDragHistoryDetails(
  before: CanvasElement[] | undefined,
  after: CanvasElement[],
  startPositions: ReadonlyMap<string, { x: number; y: number }>
): DragHistoryDetails | null {
  if (!before) return null
  const affectedIds = getChangedElementIds(before, after)
  if (affectedIds.length === 0) return null

  const affectedIdSet = new Set(affectedIds)
  const draggedCount =
    [...startPositions.keys()].filter((id) => affectedIdSet.has(id)).length || affectedIds.length

  return {
    affectedIds,
    label: draggedCount === 1 ? 'Move element' : `Move ${draggedCount} elements`,
  }
}

/** Build the pre-resize element snapshot used by the existing clear undo action. */
export function createResizeHistorySnapshot(
  elements: readonly CanvasElement[],
  id: string,
  originalElement: CanvasElement
): CanvasElement[] {
  return elements.map((element) => (element.id === id ? originalElement : element))
}

/** Build the pre-rotation element snapshot used by the existing clear undo action. */
export function createRotationHistorySnapshot(
  elements: readonly CanvasElement[],
  ids: readonly string[],
  originalRotations: ReadonlyMap<string, number>
): CanvasElement[] {
  const idSet = new Set(ids)
  return elements.map((element) => {
    if (!idSet.has(element.id)) return element
    return { ...element, rotation: originalRotations.get(element.id) || 0 }
  })
}
