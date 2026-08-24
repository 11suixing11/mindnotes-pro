import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSelectPointerHandlers } from './useSelectPointerHandlers'
import { createDefaultLayer, DEFAULT_LAYER_ID } from '../../store/layers'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import type { CanvasElement, ShapeElement } from '../../store/types'
import type { InputContact } from './touchInput'

function bounds(element: CanvasElement) {
  if (element.type === 'shape') {
    return { x: element.x, y: element.y, w: element.w, h: element.h }
  }
  if (element.type === 'text') {
    return { x: element.x, y: element.y, w: element.width, h: element.height }
  }
  if (element.type === 'image') {
    return { x: element.x, y: element.y, w: element.width, h: element.height }
  }
  return { x: 0, y: 0, w: 0, h: 0 }
}

function mouse(clientX: number, clientY: number, init: MouseEventInit = {}) {
  return new MouseEvent('pointer', { clientX, clientY, ...init })
}

function contact(clientX: number, clientY: number): InputContact {
  return { identifier: null, clientX, clientY, source: 'mouse' }
}

function shape(id: string, x: number, y: number, extra: Partial<ShapeElement> = {}): ShapeElement {
  return {
    type: 'shape',
    id,
    kind: 'rectangle',
    x,
    y,
    w: 40,
    h: 40,
    color: '#000',
    size: 2,
    ...extra,
  }
}

function resetStore() {
  const state = useAppStore.getState()
  state.idToElement.clear()
  state.idToIndex.clear()
  state.spatialIndex.clear()
  useAppStore.setState({
    elements: [],
    layers: [createDefaultLayer(1)],
    activeLayerId: DEFAULT_LAYER_ID,
    selectedIds: [],
    undoStack: [],
    redoStack: [],
  })
  useViewStore.setState({
    viewBox: { x: 0, y: 0, zoom: 1 },
    snapToGrid: false,
    gridSize: 20,
  })
}

function seed(elements: CanvasElement[]) {
  for (const element of elements) useAppStore.getState().addElement(element)
  useAppStore.setState({ undoStack: [], redoStack: [] })
}

function renderSelectHandlers(
  overrides: {
    hitTest?: (x: number, y: number) => string | null
    hitHandle?: (x: number, y: number) => null
  } = {}
) {
  const scheduleRedraw = vi.fn()
  const snapLinesRef = { current: { x: [], y: [] } }
  const result = renderHook(() =>
    useSelectPointerHandlers({
      cachedBounds: bounds,
      scheduleRedraw,
      hitTest: overrides.hitTest ?? (() => null),
      hitHandle: overrides.hitHandle ?? (() => null),
      findSnaps: () => ({ dx: 0, dy: 0, linesX: [], linesY: [] }),
      snapLinesRef,
    })
  )
  return { ...result, scheduleRedraw, snapLinesRef }
}

describe('useSelectPointerHandlers', () => {
  beforeEach(() => {
    resetStore()
  })

  it('starts a drag only after the threshold and commits one snapshot history entry', () => {
    seed([shape('drag-shape', 100, 100)])
    const { result } = renderSelectHandlers({ hitTest: () => 'drag-shape' })

    act(() => {
      result.current.handleSelectStart(mouse(120, 120), contact(120, 120), { x: 120, y: 120 })
      result.current.handleSelectMove(mouse(122, 122), { x: 122, y: 122 })
    })
    expect(useAppStore.getState().idToElement.get('drag-shape')).toMatchObject({ x: 100, y: 100 })
    expect(useAppStore.getState().undoStack).toHaveLength(0)

    act(() => {
      result.current.handleSelectMove(mouse(140, 135), { x: 140, y: 135 })
      result.current.handleSelectEnd(mouse(140, 135))
    })

    expect(useAppStore.getState().idToElement.get('drag-shape')).toMatchObject({ x: 120, y: 115 })
    expect(useAppStore.getState().undoStack).toHaveLength(1)
    expect(useAppStore.getState().undoStack[0]).toMatchObject({
      type: 'snapshot',
      label: 'Move element',
      affectedIds: ['drag-shape'],
    })
  })

  it('marquee-selects editable elements while skipping locked elements', () => {
    seed([shape('editable', 40, 40), shape('locked', 100, 100, { locked: true })])
    const { result } = renderSelectHandlers()

    act(() => {
      result.current.handleSelectStart(mouse(0, 0), contact(0, 0), { x: 0, y: 0 })
      result.current.handleSelectMove(mouse(180, 180), { x: 180, y: 180 })
      result.current.handleSelectEnd(mouse(180, 180))
    })

    expect(useAppStore.getState().selectedIds).toEqual(['editable'])
  })

  it('cancels a changed drag without adding history or clearing redo', () => {
    seed([shape('previously-selected', 20, 20), shape('cancel-shape', 100, 100)])
    useAppStore.setState({
      selectedIds: ['previously-selected'],
      redoStack: [{ type: 'clear', snapshot: [] }],
    })
    const { result } = renderSelectHandlers({ hitTest: () => 'cancel-shape' })

    act(() => {
      result.current.handleSelectStart(mouse(120, 120), contact(120, 120), { x: 120, y: 120 })
      result.current.handleSelectMove(mouse(150, 145), { x: 150, y: 145 })
      result.current.cancelSelectionInput()
    })

    expect(useAppStore.getState().idToElement.get('cancel-shape')).toMatchObject({ x: 100, y: 100 })
    expect(useAppStore.getState().selectedIds).toEqual(['previously-selected'])
    expect(useAppStore.getState().undoStack).toHaveLength(0)
    expect(useAppStore.getState().redoStack).toHaveLength(1)
  })
})
