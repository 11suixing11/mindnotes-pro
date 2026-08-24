import { useCallback, useRef, type MutableRefObject } from 'react'
import {
  getPenSampleUpdate,
  resolveShapeBindings,
  shouldCommitEraseSession,
} from '../../canvas/drawingSession'
import { createShapeElement, shouldCommitShape, updateShapeDraft } from '../../canvas/shapeElements'
import { createStrokeElement } from '../../canvas/strokeElements'
import { snapPointIfEnabled } from '../../canvas/coordinates'
import { eraseElementsAtPoint, getEraserWorldRadius } from '../../eraser/simpleEraser'
import { useAppStore } from '../../store/appStore'
import { createRuntimeId } from '../../store/runtimeId'
import { tryBindToShape } from '../../store/bindingUtils'
import { snapshot } from '../../store/helpers'
import {
  getElementLayerId,
  getLayerOrderMap,
  isElementLayerEditable,
  isElementLayerVisible,
} from '../../store/layers'
import type { CanvasElement, ShapeElement, ShapeKind, UndoAction } from '../../store/types'
import { useViewStore } from '../../store/useViewStore'
import { DEFAULT_INPUT_PRESSURE } from './touchInput'

interface Point {
  x: number
  y: number
}

export interface ElementIndexCache {
  els: CanvasElement[]
  map: Map<string, number>
}

export interface DrawingPointerState {
  drawing: boolean
  currentPts: number[][]
  currentPressures: number[]
  currentShape: ShapeElement | null
  penVelocity: number
}

interface UseDrawingPointerHandlersOptions {
  cachedBounds: (element: CanvasElement) => { x: number; y: number; w: number; h: number }
  scheduleRedraw: () => void
  elementIndexCacheRef: MutableRefObject<ElementIndexCache>
}

interface StartDrawingInput {
  position: Point
  pressure?: number
  topOnly: boolean
}

interface MoveDrawingInput extends StartDrawingInput {
  preserveSquare: boolean
}

const SHAPE_TOOLS = new Set<ShapeKind>(['rectangle', 'circle', 'arrow', 'line'])

function isShapeTool(tool: string): tool is ShapeKind {
  return SHAPE_TOOLS.has(tool as ShapeKind)
}

export function useDrawingPointerHandlers(options: UseDrawingPointerHandlersOptions) {
  const { cachedBounds, scheduleRedraw, elementIndexCacheRef } = options
  const drawingRef = useRef(false)
  const currentPtsRef = useRef<number[][]>([])
  const currentPressuresRef = useRef<number[]>([])
  const shapeStartRef = useRef<Point | null>(null)
  const currentShapeRef = useRef<ShapeElement | null>(null)
  const eraseBeforeSnapshotRef = useRef<CanvasElement[] | null>(null)
  const eraseUndoBaseStackRef = useRef<UndoAction[] | null>(null)
  const eraserPartCounterRef = useRef(0)
  const penVelocityRef = useRef(0)

  const snapPointIfGridEnabled = useCallback((point: Point) => {
    const { snapToGrid, gridSize } = useViewStore.getState()
    return snapPointIfEnabled(point, snapToGrid, gridSize)
  }, [])

  const finishEraseHistory = useCallback(() => {
    const beforeSnapshot = eraseBeforeSnapshotRef.current
    const baseUndoStack = eraseUndoBaseStackRef.current
    eraseBeforeSnapshotRef.current = null
    eraseUndoBaseStackRef.current = null
    if (!beforeSnapshot || !baseUndoStack) return

    const state = useAppStore.getState()
    if (!shouldCommitEraseSession(beforeSnapshot, state.elements, baseUndoStack, state.undoStack)) {
      return
    }

    state.batchErase(beforeSnapshot, [], baseUndoStack)
  }, [])

  const beginEraseSession = useCallback(() => {
    const state = useAppStore.getState()
    eraseBeforeSnapshotRef.current = snapshot(state.elements)
    eraseUndoBaseStackRef.current = state.undoStack
  }, [])

  const eraseAt = useCallback(
    (position: Point, topOnly: boolean) => {
      const state = useAppStore.getState()
      const radius = getEraserWorldRadius(state.size, useViewStore.getState().viewBox.zoom)
      const candidateIds = state.spatialIndex?.search({
        x: position.x - radius,
        y: position.y - radius,
        w: radius * 2,
        h: radius * 2,
      })

      const ids = [...(candidateIds ?? state.elements.map((element) => element.id))]
      if (topOnly) {
        const cache = elementIndexCacheRef.current
        if (cache.els !== state.elements) {
          const map = new Map<string, number>()
          for (let index = 0; index < state.elements.length; index += 1) {
            map.set(state.elements[index].id, index)
          }
          elementIndexCacheRef.current = { els: state.elements, map }
        }

        const idToIndex = elementIndexCacheRef.current.map
        const layerOrder = getLayerOrderMap(state.layers)
        ids.sort((leftId, rightId) => {
          const leftIndex = idToIndex.get(leftId)
          const rightIndex = idToIndex.get(rightId)
          const leftElement =
            state.idToElement.get(leftId) ??
            (leftIndex === undefined ? undefined : state.elements[leftIndex])
          const rightElement =
            state.idToElement.get(rightId) ??
            (rightIndex === undefined ? undefined : state.elements[rightIndex])
          const layerDifference =
            (rightElement ? (layerOrder.get(getElementLayerId(rightElement)) ?? 0) : 0) -
            (leftElement ? (layerOrder.get(getElementLayerId(leftElement)) ?? 0) : 0)
          return layerDifference || (idToIndex.get(rightId) ?? 0) - (idToIndex.get(leftId) ?? 0)
        })
      }

      const candidates = ids
        .map((id) => state.idToElement.get(id))
        .filter((element): element is CanvasElement =>
          Boolean(element && isElementLayerEditable(element, state.layers))
        )
      const patch = eraseElementsAtPoint({
        elements: candidates,
        point: position,
        radius,
        topOnly,
        getBounds: cachedBounds,
        createId: (sourceId, partIndex) =>
          `${sourceId}-part-${++eraserPartCounterRef.current}-${partIndex}`,
      })

      if (patch.removeIds.length === 0 && patch.additions.length === 0) return
      const removeIds = new Set(patch.removeIds)
      const nextElements = state.elements
        .filter((element) => !removeIds.has(element.id))
        .concat(patch.additions)
      state.commitElements(nextElements, { clearRedo: true })
    },
    [cachedBounds, elementIndexCacheRef]
  )

  const startDrawing = useCallback(
    ({ position, pressure, topOnly }: StartDrawingInput): boolean => {
      const state = useAppStore.getState()
      const tool = state.tool
      if (tool !== 'pen' && tool !== 'eraser' && !isShapeTool(tool)) return false

      drawingRef.current = true
      if (tool === 'pen') {
        currentPtsRef.current = [[position.x, position.y]]
        currentPressuresRef.current =
          pressure === undefined ? [] : [pressure ?? DEFAULT_INPUT_PRESSURE]
      } else if (tool === 'eraser') {
        currentPressuresRef.current = []
        beginEraseSession()
        eraseAt(position, topOnly)
      } else {
        currentPressuresRef.current = []
        const start = snapPointIfGridEnabled(position)
        shapeStartRef.current = start
        currentShapeRef.current = createShapeElement({
          id: createRuntimeId('shape'),
          kind: tool,
          start,
          color: state.color,
          size: state.size,
          fillColor: state.fillColor,
        })
      }
      return true
    },
    [beginEraseSession, eraseAt, snapPointIfGridEnabled]
  )

  const moveDrawing = useCallback(
    ({ position, pressure, topOnly, preserveSquare }: MoveDrawingInput): boolean => {
      const tool = useAppStore.getState().tool
      if (tool === 'eraser') {
        if (drawingRef.current) eraseAt(position, topOnly)
        scheduleRedraw()
        return true
      }
      if (!drawingRef.current) return false

      if (tool === 'pen') {
        const update = getPenSampleUpdate(
          currentPtsRef.current,
          currentPressuresRef.current,
          position,
          pressure,
          DEFAULT_INPUT_PRESSURE
        )
        penVelocityRef.current = update.velocity
        currentPtsRef.current.push([position.x, position.y])
        if (update.hasPressure) {
          if (update.pressurePrefixLength > 0) {
            currentPressuresRef.current = new Array(update.pressurePrefixLength).fill(
              DEFAULT_INPUT_PRESSURE
            )
          }
          currentPressuresRef.current.push(update.pressure)
        }
      } else if (shapeStartRef.current && currentShapeRef.current) {
        currentShapeRef.current = updateShapeDraft(
          currentShapeRef.current,
          shapeStartRef.current,
          snapPointIfGridEnabled(position),
          preserveSquare
        )
      }
      scheduleRedraw()
      return true
    },
    [eraseAt, scheduleRedraw, snapPointIfGridEnabled]
  )

  const finishDrawing = useCallback((): boolean => {
    if (!drawingRef.current) return false

    drawingRef.current = false
    const state = useAppStore.getState()
    const tool = state.tool
    if (tool === 'pen') {
      const element = createStrokeElement({
        id: createRuntimeId('stroke'),
        points: currentPtsRef.current,
        color: state.color,
        size: state.size,
        brush: state.brush,
        pressures: currentPressuresRef.current,
      })
      if (element) state.addElement(element)
      currentPtsRef.current = []
      currentPressuresRef.current = []
      penVelocityRef.current = 0
    } else if (tool === 'eraser') {
      finishEraseHistory()
      currentPtsRef.current = []
      currentPressuresRef.current = []
    } else if (currentShapeRef.current) {
      if (shouldCommitShape(currentShapeRef.current)) {
        const shape = currentShapeRef.current
        if (shape.kind === 'arrow' || shape.kind === 'line') {
          const visibleElements = state.elements.filter((element) =>
            isElementLayerVisible(element, state.layers)
          )
          state.addElement(resolveShapeBindings(shape, visibleElements, tryBindToShape))
        } else {
          state.addElement(shape)
        }
      }
      currentShapeRef.current = null
      shapeStartRef.current = null
    }

    scheduleRedraw()
    return true
  }, [finishEraseHistory, scheduleRedraw])

  const cancelDrawing = useCallback(() => {
    drawingRef.current = false
    currentPtsRef.current = []
    currentPressuresRef.current = []
    currentShapeRef.current = null
    shapeStartRef.current = null
    finishEraseHistory()
    penVelocityRef.current = 0
  }, [finishEraseHistory])

  const abortDrawing = useCallback((): boolean => {
    if (!drawingRef.current) return false
    drawingRef.current = false
    currentPtsRef.current = []
    currentPressuresRef.current = []
    currentShapeRef.current = null
    shapeStartRef.current = null
    return true
  }, [])

  const getDrawingState = useCallback(
    (): DrawingPointerState => ({
      drawing: drawingRef.current,
      currentPts: currentPtsRef.current,
      currentPressures: currentPressuresRef.current,
      currentShape: currentShapeRef.current,
      penVelocity: penVelocityRef.current,
    }),
    []
  )

  return {
    startDrawing,
    moveDrawing,
    finishDrawing,
    cancelDrawing,
    abortDrawing,
    getDrawingState,
  }
}
