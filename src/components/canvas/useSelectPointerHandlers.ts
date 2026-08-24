import { useCallback, useRef, type MutableRefObject } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { DRAG_THRESHOLD, hasMovedBeyondThreshold } from '../../canvas/gestureGeometry'
import {
  collectMarqueeElementIds,
  hasMarqueeArea,
  hasMarqueeDragSize,
  isMarqueeShrinking,
  isPointInsideMarquee,
  mergeMarqueeSelectionIds,
  normalizeMarqueeRect,
} from '../../canvas/marquee'
import {
  calculateSelectionBounds,
  createAltDragDuplicatePlan,
  createResizeHistorySnapshot,
  createRotationHistorySnapshot,
  filterExistingSelectionIds,
  getDragHistoryDetails,
  getRestoreSessionState,
  getRotationSessionGeometry,
  hasSessionGeometryChanges,
  resolveSelectionPress,
  type DragSession,
  type ResizeSession,
  type RotateSession,
} from '../../canvas/pointerSession'
import { snapTargetIfEnabled } from '../../canvas/coordinates'
import {
  calculateDragTransform,
  calculateResizeTransform,
  calculateRotationDelta,
  collectElementAnchorPositions,
  getElementAnchorPosition,
  radiansToNormalizedDegrees,
} from '../../canvas/selectionTransforms'
import { useAppStore } from '../../store/appStore'
import { createRuntimeId } from '../../store/runtimeId'
import { shallowClone, snapshot } from '../../store/helpers'
import { isElementLayerEditable } from '../../store/layers'
import type { CanvasElement } from '../../store/types'
import { useViewStore } from '../../store/useViewStore'
import type { InputContact } from './touchInput'

interface Point {
  x: number
  y: number
}

interface Bounds extends Point {
  w: number
  h: number
}

interface SelectionHandleHit {
  handle: number
  id: string
  bounds: Bounds
  isRotate?: boolean
  isEdge?: boolean
}

interface AltDragDuplicateState {
  enabled: boolean
  isDuplicating: boolean
  originalSelectedIds: string[]
  hasDuplicated: boolean
}

export interface SelectionRotationAngle {
  angle: number
  centerX: number
  centerY: number
}

interface UseSelectPointerHandlersOptions {
  cachedBounds: (element: CanvasElement) => Bounds
  scheduleRedraw: () => void
  hitTest: (x: number, y: number) => string | null
  hitHandle: (x: number, y: number) => SelectionHandleHit | null
  findSnaps: (
    bounds: Bounds,
    excludeIds: Set<string>
  ) => { dx: number; dy: number; linesX: number[]; linesY: number[] }
  snapLinesRef: MutableRefObject<{ x: number[]; y: number[] }>
}

function getEventScreenPoint(event: MouseEvent | TouchEvent): Point {
  if ('touches' in event) {
    return { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }
  return { x: event.clientX, y: event.clientY }
}

export function useSelectPointerHandlers(options: UseSelectPointerHandlersOptions) {
  const { cachedBounds, scheduleRedraw, hitTest, hitHandle, findSnaps, snapLinesRef } = options
  const {
    addElement,
    moveElementById,
    moveElementsById,
    resizeElementById,
    setSelectedIds,
    restoreElementsSnapshot,
  } = useAppStore(
    useShallow((state) => ({
      addElement: state.addElement,
      moveElementById: state.moveElementById,
      moveElementsById: state.moveElementsById,
      resizeElementById: state.resizeElementById,
      setSelectedIds: state.setSelectedIds,
      restoreElementsSnapshot: state.restoreElementsSnapshot,
    }))
  )

  const dragRef = useRef<DragSession | null>(null)
  const resizeRef = useRef<ResizeSession | null>(null)
  const rotateRef = useRef<RotateSession | null>(null)
  const marqueeRef = useRef<{
    startX: number
    startY: number
    endX: number
    endY: number
  } | null>(null)
  const marqueeToDragRef = useRef({ enabled: true, lastMoveTime: 0 })
  const altDragDuplicateRef = useRef<AltDragDuplicateState>({
    enabled: true,
    isDuplicating: false,
    originalSelectedIds: [],
    hasDuplicated: false,
  })

  const snapResizeTargetIfGridEnabled = useCallback((target: { x?: number; y?: number }) => {
    const { snapToGrid, gridSize } = useViewStore.getState()
    return snapTargetIfEnabled(target, snapToGrid, gridSize)
  }, [])

  const handleSelectStart = useCallback(
    (event: MouseEvent | TouchEvent, contact: InputContact, position: Point) => {
      const handleHit = hitHandle(position.x, position.y)
      if (handleHit) {
        const state = useAppStore.getState()
        const element = state.idToElement.get(handleHit.id)
        if (element) {
          if (handleHit.isRotate) {
            const selectedIds = state.selectedIds.length > 0 ? state.selectedIds : [handleHit.id]
            const geometry = getRotationSessionGeometry(
              selectedIds,
              (id) => state.idToElement.get(id),
              cachedBounds
            )
            if (geometry) {
              rotateRef.current = {
                ids: selectedIds,
                startX: position.x,
                startY: position.y,
                ...geometry,
                startElementsSnapshot: snapshot(state.elements),
                startSelectedIds: [...state.selectedIds],
              }
            }
          } else {
            resizeRef.current = {
              ...handleHit,
              startX: position.x,
              startY: position.y,
              origBounds: cachedBounds(element),
              origElement: { ...element } as CanvasElement,
              startElementsSnapshot: snapshot(state.elements),
              startSelectedIds: [...state.selectedIds],
            }
          }
        }
        scheduleRedraw()
        return
      }

      const hitId = hitTest(position.x, position.y)
      if (hitId) {
        const state = useAppStore.getState()
        const selectionPress = resolveSelectionPress({
          hitId,
          hitElement: state.idToElement.get(hitId),
          elements: state.elements,
          selectedIds: state.selectedIds,
          multiSelect: event.shiftKey || event.metaKey || event.ctrlKey,
          isEditable: (element) => isElementLayerEditable(element, state.layers),
        })
        if (selectionPress.nextSelectedIds !== null) {
          setSelectedIds(selectionPress.nextSelectedIds)
        }

        const ids = selectionPress.dragIds
        const altPressed = event.altKey && altDragDuplicateRef.current.enabled
        altDragDuplicateRef.current = altPressed
          ? {
              ...altDragDuplicateRef.current,
              isDuplicating: true,
              originalSelectedIds: [...ids],
              hasDuplicated: false,
            }
          : {
              ...altDragDuplicateRef.current,
              isDuplicating: false,
              originalSelectedIds: [],
              hasDuplicated: false,
            }

        dragRef.current = {
          x: position.x,
          y: position.y,
          id: hitId,
          startPositions: collectElementAnchorPositions(ids, (id) => state.idToElement.get(id)),
          startElementsSnapshot: snapshot(state.elements),
          dragStarted: false,
          startScreenX: contact.clientX,
          startScreenY: contact.clientY,
          startSelectedIds: [...state.selectedIds],
        }
        scheduleRedraw()
        return
      }

      const appendSelection = event.metaKey || event.ctrlKey
      marqueeRef.current = {
        startX: position.x,
        startY: position.y,
        endX: position.x,
        endY: position.y,
      }
      if (!appendSelection) setSelectedIds([])
      scheduleRedraw()
    },
    [cachedBounds, hitHandle, hitTest, scheduleRedraw, setSelectedIds]
  )

  const handleSelectMove = useCallback(
    (event: MouseEvent | TouchEvent, position: Point) => {
      if (resizeRef.current) {
        const { handle, id, startX, startY, origBounds } = resizeRef.current
        const transform = calculateResizeTransform({
          handle,
          bounds: origBounds,
          totalDelta: { x: position.x - startX, y: position.y - startY },
          elementType: resizeRef.current.origElement?.type,
          shiftPressed: event.shiftKey,
          snapTarget: snapResizeTargetIfGridEnabled,
        })
        if (!transform) {
          scheduleRedraw()
          return
        }

        snapLinesRef.current = { x: transform.linesX, y: transform.linesY }
        resizeElementById(id, transform.ax, transform.ay, transform.sx, transform.sy)
        scheduleRedraw()
        return
      }

      if (rotateRef.current) {
        const { ids, startX, startY, origRotations, commonCenterX, commonCenterY } =
          rotateRef.current
        const angleDelta = calculateRotationDelta({
          start: { x: startX, y: startY },
          current: position,
          center: { x: commonCenterX, y: commonCenterY },
          referenceRotation: origRotations.get(ids[0]) || 0,
          shiftPressed: event.shiftKey,
        })
        useAppStore.getState().rotateElementsById(ids, angleDelta, commonCenterX, commonCenterY)
        scheduleRedraw()
        return
      }

      if (marqueeRef.current) {
        const marquee = marqueeRef.current
        const marqueeRect = normalizeMarqueeRect(
          { x: marquee.startX, y: marquee.startY },
          { x: marquee.endX, y: marquee.endY }
        )
        const now = performance.now()

        if (marqueeToDragRef.current.enabled && hasMarqueeDragSize(marqueeRect)) {
          const movingInside = isPointInsideMarquee(position, marqueeRect)
          const shrinking = isMarqueeShrinking(
            { x: marquee.startX, y: marquee.startY },
            { x: marquee.endX, y: marquee.endY },
            position
          )

          if ((movingInside || shrinking) && now - marqueeToDragRef.current.lastMoveTime > 50) {
            const state = useAppStore.getState()
            const candidateIds = state.spatialIndex?.search(marqueeRect)
            const hitIds = collectMarqueeElementIds({
              candidateIds,
              getElement: (id) => state.idToElement.get(id),
              getBounds: cachedBounds,
              isSelectable: (element) => isElementLayerEditable(element, state.layers),
              rect: marqueeRect,
            })

            if (hitIds.length > 0) {
              setSelectedIds(hitIds)
              const screenPoint = getEventScreenPoint(event)
              dragRef.current = {
                x: position.x,
                y: position.y,
                id: hitIds[0],
                startPositions: collectElementAnchorPositions(hitIds, (id) =>
                  state.idToElement.get(id)
                ),
                startElementsSnapshot: snapshot(state.elements),
                dragStarted: true,
                startScreenX: screenPoint.x,
                startScreenY: screenPoint.y,
                startSelectedIds: [...state.selectedIds],
              }
              marqueeRef.current = null
              scheduleRedraw()
              return
            }
          }
        }

        marqueeToDragRef.current.lastMoveTime = now
        marqueeRef.current = { ...marquee, endX: position.x, endY: position.y }
        scheduleRedraw()
        return
      }

      if (!dragRef.current) return

      if (!dragRef.current.dragStarted) {
        const screenPoint = getEventScreenPoint(event)
        if (
          !hasMovedBeyondThreshold(
            { x: dragRef.current.startScreenX, y: dragRef.current.startScreenY },
            screenPoint,
            DRAG_THRESHOLD
          )
        ) {
          return
        }
        dragRef.current.dragStarted = true
      }

      if (
        altDragDuplicateRef.current.isDuplicating &&
        !altDragDuplicateRef.current.hasDuplicated &&
        altDragDuplicateRef.current.originalSelectedIds.length > 0
      ) {
        const state = useAppStore.getState()
        const plan = createAltDragDuplicatePlan({
          originalIds: altDragDuplicateRef.current.originalSelectedIds,
          startPositions: dragRef.current.startPositions,
          getElement: (id) => state.idToElement.get(id),
          cloneElement: shallowClone,
          getAnchorPosition: getElementAnchorPosition,
          createId: (element) => createRuntimeId(element.type),
        })

        for (const copy of plan.copies) addElement(copy)
        for (const move of plan.restoreMoves) moveElementById(move.id, move.dx, move.dy)
        setSelectedIds(plan.copies.map((copy) => copy.id))
        dragRef.current.startPositions = plan.copyStartPositions
        altDragDuplicateRef.current.hasDuplicated = true
        if (plan.shouldStopAfterDuplicate) return
      }

      const pointerDelta = {
        x: position.x - dragRef.current.x,
        y: position.y - dragRef.current.y,
      }
      const state = useAppStore.getState()
      const ids = state.selectedIds.length > 0 ? state.selectedIds : [dragRef.current.id]
      const idSet = new Set(ids)
      const selectionBounds = calculateSelectionBounds(
        state.elements.filter(
          (element) => idSet.has(element.id) && isElementLayerEditable(element, state.layers)
        ),
        cachedBounds
      )
      if (!selectionBounds) return

      const { snapToGrid, gridSize } = useViewStore.getState()
      const transform = calculateDragTransform({
        bounds: selectionBounds,
        delta: pointerDelta,
        findSnaps: (movingBounds) => findSnaps(movingBounds, idSet),
        snapToGrid,
        gridSize,
      })
      snapLinesRef.current = { x: transform.linesX, y: transform.linesY }
      if (ids.length > 1) {
        moveElementsById(ids, transform.dx, transform.dy, { recordHistory: false })
      } else {
        moveElementById(dragRef.current.id, transform.dx, transform.dy)
      }
      dragRef.current = {
        ...dragRef.current,
        x: position.x + transform.snapDx,
        y: position.y + transform.snapDy,
      }
      scheduleRedraw()
    },
    [
      addElement,
      cachedBounds,
      findSnaps,
      moveElementById,
      moveElementsById,
      resizeElementById,
      scheduleRedraw,
      setSelectedIds,
      snapLinesRef,
      snapResizeTargetIfGridEnabled,
    ]
  )

  const handleSelectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (marqueeRef.current) {
        const marquee = marqueeRef.current
        const marqueeRect = normalizeMarqueeRect(
          { x: marquee.startX, y: marquee.startY },
          { x: marquee.endX, y: marquee.endY }
        )
        if (hasMarqueeArea(marqueeRect)) {
          const state = useAppStore.getState()
          const hitIds = collectMarqueeElementIds({
            candidateIds: state.spatialIndex?.search(marqueeRect),
            getElement: (id) => state.idToElement.get(id),
            getBounds: cachedBounds,
            isSelectable: (element) => isElementLayerEditable(element, state.layers),
            rect: marqueeRect,
          })
          setSelectedIds(
            mergeMarqueeSelectionIds(state.selectedIds, hitIds, event.metaKey || event.ctrlKey)
          )
        }
        marqueeRef.current = null
      }

      if (dragRef.current?.startPositions) {
        const state = useAppStore.getState()
        const before = dragRef.current.startElementsSnapshot
        const history = getDragHistoryDetails(
          before,
          state.elements,
          dragRef.current.startPositions
        )
        if (before && history) {
          state.pushUndo({
            type: 'snapshot',
            before: snapshot(before),
            after: snapshot(state.elements),
            label: history.label,
            affectedIds: history.affectedIds,
          })
        }
      }

      const resizeSession = resizeRef.current
      if (resizeSession?.origElement) {
        const state = useAppStore.getState()
        if (state.idToElement.get(resizeSession.id)) {
          state.pushUndo({
            type: 'clear',
            snapshot: createResizeHistorySnapshot(
              state.elements,
              resizeSession.id,
              resizeSession.origElement
            ),
          })
        }
      }

      const rotateSession = rotateRef.current
      if (rotateSession) {
        const state = useAppStore.getState()
        state.pushUndo({
          type: 'clear',
          snapshot: createRotationHistorySnapshot(
            state.elements,
            rotateSession.ids,
            rotateSession.origRotations
          ),
        })
      }

      dragRef.current = null
      resizeRef.current = null
      rotateRef.current = null
      snapLinesRef.current = { x: [], y: [] }
      altDragDuplicateRef.current = {
        ...altDragDuplicateRef.current,
        isDuplicating: false,
        originalSelectedIds: [],
        hasDuplicated: false,
      }
      scheduleRedraw()
    },
    [cachedBounds, scheduleRedraw, setSelectedIds, snapLinesRef]
  )

  const cancelSelectionInput = useCallback(() => {
    const { snapshot: restoreSnapshot, selectedIds: restoreSelectedIds } = getRestoreSessionState(
      dragRef.current,
      resizeRef.current,
      rotateRef.current
    )

    if (restoreSnapshot) {
      const state = useAppStore.getState()
      if (hasSessionGeometryChanges(restoreSnapshot, state.elements)) {
        restoreElementsSnapshot(restoreSnapshot, restoreSelectedIds)
      } else if (restoreSelectedIds) {
        setSelectedIds(filterExistingSelectionIds(restoreSelectedIds, state.elements))
      }
    }

    dragRef.current = null
    resizeRef.current = null
    rotateRef.current = null
    marqueeRef.current = null
    snapLinesRef.current = { x: [], y: [] }
  }, [restoreElementsSnapshot, setSelectedIds, snapLinesRef])

  const getSelectionRotationAngle = useCallback(
    (mousePosition: Point | null): SelectionRotationAngle | null => {
      const rotateSession = rotateRef.current
      if (!rotateSession) return null

      const { startX, startY, commonCenterX, commonCenterY, origRotations, ids } = rotateSession
      const mouseX = mousePosition?.x ?? startX
      const mouseY = mousePosition?.y ?? startY
      const referenceRotation = origRotations.get(ids[0]) || 0
      const angleDelta = calculateRotationDelta({
        start: { x: startX, y: startY },
        current: { x: mouseX, y: mouseY },
        center: { x: commonCenterX, y: commonCenterY },
        referenceRotation,
      })

      return {
        angle: radiansToNormalizedDegrees(referenceRotation + angleDelta),
        centerX: commonCenterX,
        centerY: commonCenterY,
      }
    },
    []
  )

  return {
    handleSelectStart,
    handleSelectMove,
    handleSelectEnd,
    cancelSelectionInput,
    getSelectionRotationAngle,
    marqueeRef,
  }
}
