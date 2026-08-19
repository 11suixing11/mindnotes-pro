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
