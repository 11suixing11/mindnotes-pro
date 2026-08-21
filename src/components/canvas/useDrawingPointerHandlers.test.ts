import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../../store/appStore'
import { createDefaultLayer, DEFAULT_LAYER_ID } from '../../store/layers'
import type { CanvasElement } from '../../store/types'
import { useViewStore } from '../../store/useViewStore'
import { useDrawingPointerHandlers } from './useDrawingPointerHandlers'

function bounds(element: CanvasElement) {
  if (element.type === 'stroke') {
    const xs = element.points.map(([x]) => x)
    const ys = element.points.map(([, y]) => y)
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    }
  }
  if (element.type === 'shape') {
    return {
      x: element.x,
      y: element.y,
      w: element.w,
      h: element.h,
    }
  }
  return { x: element.x, y: element.y, w: element.width, h: element.height }
}

function renderDrawingHandlers() {
  const scheduleRedraw = () => undefined
  const elementIndexCacheRef = { current: { els: [], map: new Map<string, number>() } }
  return renderHook(() =>
    useDrawingPointerHandlers({
      cachedBounds: bounds,
      scheduleRedraw,
      elementIndexCacheRef,
    })
  )
}

describe('useDrawingPointerHandlers', () => {
  beforeEach(() => {
    const defaultLayer = createDefaultLayer(1)
    const state = useAppStore.getState()
    state.idToElement.clear()
    state.idToIndex.clear()
    state.spatialIndex.clear()
    useAppStore.setState({
      elements: [],
      layers: [defaultLayer],
      activeLayerId: DEFAULT_LAYER_ID,
      tool: 'pen',
      brush: 'pen',
      color: '#2c2416',
      size: 4,
      fillColor: 'transparent',
      selectedIds: [],
      undoStack: [],
      redoStack: [],
    })
    useViewStore.setState({
      viewBox: { x: 0, y: 0, zoom: 1 },
      snapToGrid: false,
      gridSize: 20,
    })
  })

  it('owns pen sampling and commits one stroke on finish', () => {
    const { result } = renderDrawingHandlers()

    act(() => {
      result.current.startDrawing({
        position: { x: 10, y: 20 },
        pressure: 0.7,
        topOnly: false,
      })
      result.current.moveDrawing({
        position: { x: 30, y: 40 },
        pressure: 0.8,
        topOnly: false,
        preserveSquare: false,
      })
      result.current.finishDrawing()
    })

    expect(useAppStore.getState().elements).toHaveLength(1)
    expect(useAppStore.getState().elements[0]).toMatchObject({
      type: 'stroke',
      points: [
        [10, 20],
        [30, 40],
      ],
      pressures: [0.7, 0.8],
    })
    expect(result.current.getDrawingState()).toMatchObject({
      drawing: false,
      currentPts: [],
      currentPressures: [],
      penVelocity: 0,
    })
  })

  it('owns shape draft updates and commits a square with shift', () => {
    useAppStore.setState({ tool: 'rectangle' })
    const { result } = renderDrawingHandlers()

    act(() => {
      result.current.startDrawing({ position: { x: 10, y: 20 }, topOnly: false })
      result.current.moveDrawing({
        position: { x: 30, y: 60 },
        topOnly: false,
        preserveSquare: true,
      })
    })

    expect(result.current.getDrawingState().currentShape).toMatchObject({
      type: 'shape',
      x: 10,
      y: 20,
      w: 40,
      h: 40,
    })

    act(() => {
      result.current.finishDrawing()
    })

    expect(useAppStore.getState().elements).toHaveLength(1)
    expect(useAppStore.getState().elements[0]).toMatchObject({ type: 'shape', w: 40, h: 40 })
  })

  it('coalesces eraser mutations into one erase history action', () => {
    const stroke: CanvasElement = {
      type: 'stroke',
      id: 'stroke-1',
      points: [
        [0, 0],
        [100, 0],
      ],
      color: '#000',
      size: 2,
      brush: 'pen',
    }
    useAppStore.getState().addElement(stroke)
    useAppStore.setState({ undoStack: [], redoStack: [], tool: 'eraser', size: 16 })
    const { result } = renderDrawingHandlers()

    act(() => {
      result.current.startDrawing({ position: { x: 50, y: 0 }, topOnly: false })
      result.current.finishDrawing()
    })

    const state = useAppStore.getState()
    expect(state.elements.some((element) => element.id === 'stroke-1')).toBe(false)
    expect(state.undoStack).toHaveLength(1)
    expect(state.undoStack[0].type).toBe('erase')
  })
})
