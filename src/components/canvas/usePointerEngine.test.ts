import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { usePointerEngine } from './usePointerEngine'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import { createDefaultLayer, DEFAULT_LAYER_ID } from '../../store/layers'
import type { CanvasElement, ShapeElement } from '../../store/types'

function mockBounds(el: CanvasElement): { x: number; y: number; w: number; h: number } {
  if (el.type === 'stroke') {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (const p of el.points) {
      minX = Math.min(minX, p[0])
      minY = Math.min(minY, p[1])
      maxX = Math.max(maxX, p[0])
      maxY = Math.max(maxY, p[1])
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }
  if (el.type === 'shape' || el.type === 'text')
    return { x: el.x, y: el.y, w: (el as any).w || 100, h: (el as any).h || 30 }
  if (el.type === 'image') return { x: el.x, y: el.y, w: el.width, h: el.height }
  return { x: 0, y: 0, w: 0, h: 0 }
}

function createMockCanvasRef(): React.RefObject<HTMLCanvasElement | null> {
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    toJSON: () => ({}),
  })
  return { current: canvas }
}

function createMockTextRef(): React.RefObject<HTMLTextAreaElement | null> {
  return { current: null }
}

function renderPointerEngineHarness() {
  const canvasRef = createMockCanvasRef()
  const scheduleRedraw = vi.fn()
  renderHook(() =>
    usePointerEngine({
      canvasRef,
      cachedBounds: mockBounds,
      scheduleRedraw,
      startEditText: vi.fn(),
      textRef: createMockTextRef(),
      findSnaps: vi.fn().mockReturnValue({ dx: 0, dy: 0, linesX: [], linesY: [] }),
      snapLinesRef: { current: { x: [], y: [] } },
    })
  )

  const canvas = canvasRef.current
  if (!canvas) throw new Error('Expected mock canvas ref to be initialized')
  return { canvas, scheduleRedraw }
}

function createMockTouch(
  overrides: Partial<Touch> & { identifier: number; touchType?: string }
): Touch {
  return {
    identifier: overrides.identifier,
    target: document.body,
    clientX: overrides.clientX ?? 0,
    clientY: overrides.clientY ?? 0,
    pageX: overrides.pageX ?? overrides.clientX ?? 0,
    pageY: overrides.pageY ?? overrides.clientY ?? 0,
    screenX: overrides.screenX ?? overrides.clientX ?? 0,
    screenY: overrides.screenY ?? overrides.clientY ?? 0,
    radiusX: overrides.radiusX ?? 10,
    radiusY: overrides.radiusY ?? 10,
    rotationAngle: overrides.rotationAngle ?? 0,
    force: overrides.force ?? 0.5,
    ...(overrides as Record<string, unknown>),
  } as Touch
}

function createMockTouchEvent(
  type: string,
  touches: Touch[],
  changedTouches: Touch[] = touches
): TouchEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent
  Object.defineProperty(event, 'touches', { value: touches })
  Object.defineProperty(event, 'changedTouches', { value: changedTouches })
  Object.defineProperty(event, 'targetTouches', { value: touches })
  return event
}

function dispatchTouch(canvas: HTMLCanvasElement, event: TouchEvent) {
  act(() => {
    canvas.dispatchEvent(event)
  })
}

function createMockPointerEvent(
  type: string,
  overrides: Partial<PointerEvent> & { pointerId: number; pointerType: string }
): PointerEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent
  Object.defineProperties(event, {
    pointerId: { value: overrides.pointerId },
    pointerType: { value: overrides.pointerType },
    clientX: { value: overrides.clientX ?? 0 },
    clientY: { value: overrides.clientY ?? 0 },
    pressure: { value: overrides.pressure ?? 0.5 },
    tiltX: { value: overrides.tiltX ?? 0 },
    tiltY: { value: overrides.tiltY ?? 0 },
    button: { value: overrides.button ?? 0 },
    buttons: { value: overrides.buttons ?? 1 },
  })
  return event
}

function dispatchPointer(canvas: HTMLCanvasElement, event: PointerEvent) {
  act(() => {
    canvas.dispatchEvent(event)
  })
}

function seedCanvasElements(elements: CanvasElement[]) {
  for (const element of elements) {
    useAppStore.getState().addElement(element)
  }
  useAppStore.setState({ undoStack: [], redoStack: [] })
}

describe('usePointerEngine', () => {
  beforeEach(() => {
    localStorage.clear()
    const defaultLayer = createDefaultLayer(1)
    const currentState = useAppStore.getState()
    currentState.idToElement.clear()
    currentState.idToIndex.clear()
    currentState.spatialIndex.clear()
    useAppStore.setState({
      elements: [],
      layers: [defaultLayer],
      activeLayerId: DEFAULT_LAYER_ID,
      tool: 'pen',
      brush: 'pen',
      color: '#2c2416',
      size: 4,
      selectedIds: [],
      undoStack: [],
      redoStack: [],
    })
    useViewStore.setState({
      viewBox: { x: 0, y: 0, zoom: 1 },
      isPanning: false,
      showGrid: false,
      snapToGrid: false,
      gridSize: 20,
    })
  })

  it('should return getCursor function', () => {
    const { result } = renderHook(() =>
      usePointerEngine({
        canvasRef: createMockCanvasRef(),
        cachedBounds: mockBounds,
        scheduleRedraw: vi.fn(),
        startEditText: vi.fn(),
        textRef: createMockTextRef(),
        findSnaps: vi.fn().mockReturnValue({ dx: 0, dy: 0, linesX: [], linesY: [] }),
        snapLinesRef: { current: { x: [], y: [] } },
      })
    )
    expect(result.current.getCursor).toBeTypeOf('function')
  })

  it('should return copySelectedToSystemClipboard function', () => {
    const { result } = renderHook(() =>
      usePointerEngine({
        canvasRef: createMockCanvasRef(),
        cachedBounds: mockBounds,
        scheduleRedraw: vi.fn(),
        startEditText: vi.fn(),
        textRef: createMockTextRef(),
        findSnaps: vi.fn().mockReturnValue({ dx: 0, dy: 0, linesX: [], linesY: [] }),
        snapLinesRef: { current: { x: [], y: [] } },
      })
    )
    expect(result.current.copySelectedToSystemClipboard).toBeTypeOf('function')
  })

  it('should return getDrawState function', () => {
    const { result } = renderHook(() =>
      usePointerEngine({
        canvasRef: createMockCanvasRef(),
        cachedBounds: mockBounds,
        scheduleRedraw: vi.fn(),
        startEditText: vi.fn(),
        textRef: createMockTextRef(),
        findSnaps: vi.fn().mockReturnValue({ dx: 0, dy: 0, linesX: [], linesY: [] }),
        snapLinesRef: { current: { x: [], y: [] } },
      })
    )
    expect(result.current.getDrawState).toBeTypeOf('function')
  })

  it('returns hovered element state without registering a window global', () => {
    const { result } = renderHook(() =>
      usePointerEngine({
        canvasRef: createMockCanvasRef(),
        cachedBounds: mockBounds,
        scheduleRedraw: vi.fn(),
        startEditText: vi.fn(),
        textRef: createMockTextRef(),
        findSnaps: vi.fn().mockReturnValue({ dx: 0, dy: 0, linesX: [], linesY: [] }),
        snapLinesRef: { current: { x: [], y: [] } },
      })
    )

    expect(result.current.hoveredElementIdRef.current).toBeNull()
    expect(
      '__mindnotes_hovered_element_id__' in
        (window as Window & { __mindnotes_hovered_element_id__?: unknown })
    ).toBe(false)
  })

  describe('getCursor', () => {
    it('should return crosshair for pen tool', () => {
      useAppStore.setState({ tool: 'pen' })
      const { result } = renderHook(() =>
        usePointerEngine({
          canvasRef: createMockCanvasRef(),
          cachedBounds: mockBounds,
          scheduleRedraw: vi.fn(),
          startEditText: vi.fn(),
          textRef: createMockTextRef(),
          findSnaps: vi.fn().mockReturnValue({ dx: 0, dy: 0, linesX: [], linesY: [] }),
          snapLinesRef: { current: { x: [], y: [] } },
        })
      )
      expect(result.current.getCursor()).toBe('crosshair')
    })

    it('should return default for select tool', () => {
      useAppStore.setState({ tool: 'select' })
      const { result } = renderHook(() =>
        usePointerEngine({
          canvasRef: createMockCanvasRef(),
          cachedBounds: mockBounds,
          scheduleRedraw: vi.fn(),
          startEditText: vi.fn(),
          textRef: createMockTextRef(),
          findSnaps: vi.fn().mockReturnValue({ dx: 0, dy: 0, linesX: [], linesY: [] }),
          snapLinesRef: { current: { x: [], y: [] } },
        })
      )
      expect(result.current.getCursor()).toBe('default')
    })

    it('should return none for eraser tool', () => {
      useAppStore.setState({ tool: 'eraser' })
      const { result } = renderHook(() =>
        usePointerEngine({
          canvasRef: createMockCanvasRef(),
          cachedBounds: mockBounds,
          scheduleRedraw: vi.fn(),
          startEditText: vi.fn(),
          textRef: createMockTextRef(),
          findSnaps: vi.fn().mockReturnValue({ dx: 0, dy: 0, linesX: [], linesY: [] }),
          snapLinesRef: { current: { x: [], y: [] } },
        })
      )
      expect(result.current.getCursor()).toBe('none')
    })

    it('should return grab for pan tool', () => {
      useAppStore.setState({ tool: 'pan' })
      const { result } = renderHook(() =>
        usePointerEngine({
          canvasRef: createMockCanvasRef(),
          cachedBounds: mockBounds,
          scheduleRedraw: vi.fn(),
          startEditText: vi.fn(),
          textRef: createMockTextRef(),
          findSnaps: vi.fn().mockReturnValue({ dx: 0, dy: 0, linesX: [], linesY: [] }),
          snapLinesRef: { current: { x: [], y: [] } },
        })
      )
      expect(result.current.getCursor()).toBe('grab')
    })

    it('should return text for text tool', () => {
      useAppStore.setState({ tool: 'text' })
      const { result } = renderHook(() =>
        usePointerEngine({
          canvasRef: createMockCanvasRef(),
          cachedBounds: mockBounds,
          scheduleRedraw: vi.fn(),
          startEditText: vi.fn(),
          textRef: createMockTextRef(),
          findSnaps: vi.fn().mockReturnValue({ dx: 0, dy: 0, linesX: [], linesY: [] }),
          snapLinesRef: { current: { x: [], y: [] } },
        })
      )
      expect(result.current.getCursor()).toBe('text')
    })

    it('should return crosshair for shape tools', () => {
      for (const tool of ['rectangle', 'circle', 'line', 'arrow'] as const) {
        useAppStore.setState({ tool })
        const { result } = renderHook(() =>
          usePointerEngine({
            canvasRef: createMockCanvasRef(),
            cachedBounds: mockBounds,
            scheduleRedraw: vi.fn(),
            startEditText: vi.fn(),
            textRef: createMockTextRef(),
            findSnaps: vi.fn().mockReturnValue({ dx: 0, dy: 0, linesX: [], linesY: [] }),
            snapLinesRef: { current: { x: [], y: [] } },
          })
        )
        expect(result.current.getCursor()).toBe('crosshair')
      }
    })

    it('should return grabbing when panning', () => {
      useAppStore.setState({ tool: 'pan' })
      useViewStore.setState({ isPanning: true })
      const { result } = renderHook(() =>
        usePointerEngine({
          canvasRef: createMockCanvasRef(),
          cachedBounds: mockBounds,
          scheduleRedraw: vi.fn(),
          startEditText: vi.fn(),
          textRef: createMockTextRef(),
          findSnaps: vi.fn().mockReturnValue({ dx: 0, dy: 0, linesX: [], linesY: [] }),
          snapLinesRef: { current: { x: [], y: [] } },
        })
      )
      expect(result.current.getCursor()).toBe('grabbing')
    })

    it('should return resize cursor when hovering over resize handle', () => {
      useAppStore.setState({
        tool: 'select',
        selectedIds: ['shape-1'],
        elements: [
          {
            type: 'shape',
            id: 'shape-1',
            kind: 'rectangle',
            x: 100,
            y: 100,
            w: 50,
            h: 50,
            color: '#000',
            size: 2,
          },
        ],
      })
      const { result } = renderHook(() =>
        usePointerEngine({
          canvasRef: createMockCanvasRef(),
          cachedBounds: mockBounds,
          scheduleRedraw: vi.fn(),
          startEditText: vi.fn(),
          textRef: createMockTextRef(),
          findSnaps: vi.fn().mockReturnValue({ dx: 0, dy: 0, linesX: [], linesY: [] }),
          snapLinesRef: { current: { x: [], y: [] } },
        })
      )
      // Without mouse position, should return default
      expect(result.current.getCursor()).toBe('default')
    })
  })

  describe('getDrawState', () => {
    it('should return initial draw state', () => {
      const { result } = renderHook(() =>
        usePointerEngine({
          canvasRef: createMockCanvasRef(),
          cachedBounds: mockBounds,
          scheduleRedraw: vi.fn(),
          startEditText: vi.fn(),
          textRef: createMockTextRef(),
          findSnaps: vi.fn().mockReturnValue({ dx: 0, dy: 0, linesX: [], linesY: [] }),
          snapLinesRef: { current: { x: [], y: [] } },
        })
      )
      const state = result.current.getDrawState()
      expect(state.drawing).toBe(false)
      expect(state.currentPts).toEqual([])
      expect(state.currentShape).toBeNull()
      expect(state.mousePos).toBeNull()
      expect(state.marquee).toBeNull()
      expect(state.snapLines).toEqual({ x: [], y: [] })
      expect(state.tool).toBe('pen')
      expect(state.color).toBe('#2c2416')
      expect(state.size).toBe(4)
      expect(state.brush).toBe('pen')
      expect(state.showGrid).toBe(false)
      expect(state.gridSize).toBe(20)
    })

    it('should expose grid display settings for the renderer', () => {
      useViewStore.setState({ showGrid: true, gridSize: 40 })
      const { result } = renderHook(() =>
        usePointerEngine({
          canvasRef: createMockCanvasRef(),
          cachedBounds: mockBounds,
          scheduleRedraw: vi.fn(),
          startEditText: vi.fn(),
          textRef: createMockTextRef(),
          findSnaps: vi.fn().mockReturnValue({ dx: 0, dy: 0, linesX: [], linesY: [] }),
          snapLinesRef: { current: { x: [], y: [] } },
        })
      )
      const state = result.current.getDrawState()

      expect(state.showGrid).toBe(true)
      expect(state.gridSize).toBe(40)
    })
  })

  describe('select interactions', () => {
    it('moves a multi-selection instead of rotating when dragging through an individual element rotate handle', () => {
      useAppStore.setState({ tool: 'select' })
      seedCanvasElements([
        {
          type: 'shape',
          id: 'process',
          kind: 'rectangle',
          x: 100,
          y: 100,
          w: 200,
          h: 80,
          color: '#000',
          size: 2,
        },
        {
          type: 'shape',
          id: 'decision',
          kind: 'rectangle',
          x: 150,
          y: 180,
          w: 100,
          h: 100,
          color: '#000',
          size: 2,
        },
      ])
      useAppStore.getState().setSelectedIds(['process', 'decision'])

      const { canvas } = renderPointerEngineHarness()

      act(() => {
        canvas.dispatchEvent(
          createMockPointerEvent('pointerdown', {
            pointerId: 31,
            pointerType: 'mouse',
            clientX: 200,
            clientY: 160,
            button: 0,
            buttons: 1,
            bubbles: true,
          })
        )
      })
      act(() => {
        canvas.dispatchEvent(
          createMockPointerEvent('pointermove', {
            pointerId: 31,
            pointerType: 'mouse',
            clientX: 230,
            clientY: 180,
            buttons: 1,
            bubbles: true,
          })
        )
      })
      act(() => {
        canvas.dispatchEvent(
          createMockPointerEvent('pointerup', {
            pointerId: 31,
            pointerType: 'mouse',
            clientX: 230,
            clientY: 180,
            button: 0,
            buttons: 0,
            bubbles: true,
          })
        )
      })

      const process = useAppStore.getState().idToElement.get('process') as ShapeElement
      const decision = useAppStore.getState().idToElement.get('decision') as ShapeElement
      expect(process.x).toBe(130)
      expect(process.y).toBe(120)
      expect(decision.x).toBe(180)
      expect(decision.y).toBe(200)
      expect(process.rotation ?? 0).toBe(0)
      expect(decision.rotation ?? 0).toBe(0)
      expect(useAppStore.getState().undoStack).toHaveLength(1)
      expect(useAppStore.getState().undoStack[0].type).toBe('snapshot')

      act(() => {
        useAppStore.getState().undo()
      })

      const restoredProcess = useAppStore.getState().idToElement.get('process') as ShapeElement
      const restoredDecision = useAppStore.getState().idToElement.get('decision') as ShapeElement
      expect(restoredProcess.x).toBe(100)
      expect(restoredProcess.y).toBe(100)
      expect(restoredDecision.x).toBe(150)
      expect(restoredDecision.y).toBe(180)
    })

    it('restores bound arrows with the dragged shape in one undo step', () => {
      useAppStore.setState({ tool: 'select' })
      seedCanvasElements([
        {
          type: 'shape',
          id: 'box',
          kind: 'rectangle',
          x: 100,
          y: 100,
          w: 50,
          h: 50,
          color: '#000',
          size: 2,
        },
        {
          type: 'shape',
          id: 'arrow',
          kind: 'arrow',
          x: 150,
          y: 125,
          w: 50,
          h: 0,
          color: '#000',
          size: 2,
          startBinding: { targetId: 'box', anchorX: 1, anchorY: 0.5 },
        },
      ])

      const { canvas } = renderPointerEngineHarness()

      act(() => {
        canvas.dispatchEvent(
          createMockPointerEvent('pointerdown', {
            pointerId: 32,
            pointerType: 'mouse',
            clientX: 125,
            clientY: 125,
            button: 0,
            buttons: 1,
            bubbles: true,
          })
        )
      })
      act(() => {
        canvas.dispatchEvent(
          createMockPointerEvent('pointermove', {
            pointerId: 32,
            pointerType: 'mouse',
            clientX: 155,
            clientY: 145,
            buttons: 1,
            bubbles: true,
          })
        )
      })
      act(() => {
        canvas.dispatchEvent(
          createMockPointerEvent('pointerup', {
            pointerId: 32,
            pointerType: 'mouse',
            clientX: 155,
            clientY: 145,
            button: 0,
            buttons: 0,
            bubbles: true,
          })
        )
      })

      const movedBox = useAppStore.getState().idToElement.get('box') as ShapeElement
      const movedArrow = useAppStore.getState().idToElement.get('arrow') as ShapeElement
      expect(movedBox.x).toBe(130)
      expect(movedBox.y).toBe(120)
      expect(movedArrow.x).toBe(180)
      expect(movedArrow.y).toBe(145)
      expect(movedArrow.w).toBe(20)
      expect(movedArrow.h).toBe(-20)
      expect(useAppStore.getState().undoStack).toHaveLength(1)
      expect(useAppStore.getState().undoStack[0]).toMatchObject({
        type: 'snapshot',
        affectedIds: expect.arrayContaining(['box', 'arrow']),
      })

      act(() => {
        useAppStore.getState().undo()
      })

      const restoredBox = useAppStore.getState().idToElement.get('box') as ShapeElement
      const restoredArrow = useAppStore.getState().idToElement.get('arrow') as ShapeElement
      expect(restoredBox.x).toBe(100)
      expect(restoredBox.y).toBe(100)
      expect(restoredArrow.x).toBe(150)
      expect(restoredArrow.y).toBe(125)
      expect(restoredArrow.w).toBe(50)
      expect(restoredArrow.h).toBe(0)
    })

    it('restores a cancelled drag without creating a history entry', () => {
      useAppStore.setState({ tool: 'select' })
      seedCanvasElements([
        {
          type: 'shape',
          id: 'cancelled-shape',
          kind: 'rectangle',
          x: 100,
          y: 100,
          w: 80,
          h: 50,
          color: '#000',
          size: 2,
        },
      ])
      const { canvas } = renderPointerEngineHarness()

      dispatchPointer(
        canvas,
        createMockPointerEvent('pointerdown', {
          pointerId: 34,
          pointerType: 'mouse',
          clientX: 140,
          clientY: 125,
        })
      )
      dispatchPointer(
        canvas,
        createMockPointerEvent('pointermove', {
          pointerId: 34,
          pointerType: 'mouse',
          clientX: 180,
          clientY: 155,
        })
      )
      dispatchPointer(
        canvas,
        createMockPointerEvent('pointercancel', {
          pointerId: 34,
          pointerType: 'mouse',
          clientX: 180,
          clientY: 155,
          buttons: 0,
        })
      )

      const restored = useAppStore.getState().idToElement.get('cancelled-shape') as ShapeElement
      expect(restored.x).toBe(100)
      expect(restored.y).toBe(100)
      expect(useAppStore.getState().undoStack).toHaveLength(0)
    })
  })

  describe('eraser interactions', () => {
    it('erases a sparse stroke when the eraser crosses a segment between sampled points', () => {
      useAppStore.setState({ tool: 'eraser', size: 16 })
      seedCanvasElements([
        {
          type: 'stroke',
          id: 'stroke-sparse',
          points: [
            [0, 0],
            [200, 0],
          ],
          color: '#000',
          size: 2,
          brush: 'pen',
        },
      ])
      const { canvas } = renderPointerEngineHarness()

      dispatchPointer(
        canvas,
        createMockPointerEvent('pointerdown', {
          pointerId: 21,
          pointerType: 'pen',
          clientX: 100,
          clientY: 25,
          pressure: 0.5,
        })
      )
      dispatchPointer(
        canvas,
        createMockPointerEvent('pointerup', {
          pointerId: 21,
          pointerType: 'pen',
          clientX: 100,
          clientY: 25,
          pressure: 0.5,
          buttons: 0,
        })
      )

      const state = useAppStore.getState()
      expect(state.elements.some((element) => element.id === 'stroke-sparse')).toBe(false)
      expect(state.undoStack).toHaveLength(1)
      expect(state.undoStack[0].type).toBe('erase')
    })

    it('commits one drag erase as one undo action and restores the original stroke', () => {
      useAppStore.setState({ tool: 'eraser', size: 16 })
      seedCanvasElements([
        {
          type: 'stroke',
          id: 'stroke-drag',
          points: [
            [0, 0],
            [100, 0],
            [200, 0],
            [300, 0],
          ],
          color: '#000',
          size: 2,
          brush: 'pen',
        },
      ])
      const { canvas } = renderPointerEngineHarness()

      dispatchPointer(
        canvas,
        createMockPointerEvent('pointerdown', {
          pointerId: 22,
          pointerType: 'pen',
          clientX: 100,
          clientY: 0,
          pressure: 0.5,
        })
      )
      dispatchPointer(
        canvas,
        createMockPointerEvent('pointermove', {
          pointerId: 22,
          pointerType: 'pen',
          clientX: 200,
          clientY: 0,
          pressure: 0.5,
        })
      )
      dispatchPointer(
        canvas,
        createMockPointerEvent('pointerup', {
          pointerId: 22,
          pointerType: 'pen',
          clientX: 200,
          clientY: 0,
          pressure: 0.5,
          buttons: 0,
        })
      )

      expect(useAppStore.getState().undoStack).toHaveLength(1)
      expect(useAppStore.getState().undoStack[0].type).toBe('erase')

      act(() => {
        useAppStore.getState().undo()
      })

      expect(useAppStore.getState().elements).toEqual([
        expect.objectContaining({
          id: 'stroke-drag',
          points: [
            [0, 0],
            [100, 0],
            [200, 0],
            [300, 0],
          ],
        }),
      ])
    })

    it('does not erase a locked element', () => {
      useAppStore.setState({ tool: 'eraser', size: 16 })
      seedCanvasElements([
        {
          type: 'stroke',
          id: 'stroke-locked',
          points: [
            [0, 0],
            [200, 0],
          ],
          color: '#000',
          size: 2,
          brush: 'pen',
          locked: true,
        },
      ])
      const { canvas } = renderPointerEngineHarness()

      dispatchPointer(
        canvas,
        createMockPointerEvent('pointerdown', {
          pointerId: 23,
          pointerType: 'pen',
          clientX: 100,
          clientY: 0,
          pressure: 0.5,
        })
      )
      dispatchPointer(
        canvas,
        createMockPointerEvent('pointerup', {
          pointerId: 23,
          pointerType: 'pen',
          clientX: 100,
          clientY: 0,
          pressure: 0.5,
          buttons: 0,
        })
      )

      expect(useAppStore.getState().elements.map((element) => element.id)).toContain(
        'stroke-locked'
      )
      expect(useAppStore.getState().undoStack).toHaveLength(0)
    })
  })

  describe('grid snap interactions', () => {
    it('snaps resize handles to the configured grid', () => {
      const shape: ShapeElement = {
        type: 'shape',
        id: 'shape-1',
        kind: 'rectangle',
        x: 100,
        y: 100,
        w: 50,
        h: 50,
        color: '#000',
        size: 2,
      }
      const canvasRef = createMockCanvasRef()
      const scheduleRedraw = vi.fn()
      const snapLinesRef = { current: { x: [], y: [] } }

      useAppStore.setState({ tool: 'select' })
      useAppStore.getState().addElement(shape)
      useAppStore.getState().setSelectedIds(['shape-1'])
      useViewStore.setState({ snapToGrid: true, showGrid: true, gridSize: 20 })

      renderHook(() =>
        usePointerEngine({
          canvasRef,
          cachedBounds: mockBounds,
          scheduleRedraw,
          startEditText: vi.fn(),
          textRef: createMockTextRef(),
          findSnaps: vi.fn().mockReturnValue({ dx: 0, dy: 0, linesX: [], linesY: [] }),
          snapLinesRef,
        })
      )

      act(() => {
        canvasRef.current?.dispatchEvent(
          createMockPointerEvent('pointerdown', {
            pointerId: 33,
            pointerType: 'mouse',
            clientX: 150,
            clientY: 150,
            button: 0,
            buttons: 1,
            bubbles: true,
          })
        )
      })
      act(() => {
        canvasRef.current?.dispatchEvent(
          createMockPointerEvent('pointermove', {
            pointerId: 33,
            pointerType: 'mouse',
            clientX: 169,
            clientY: 176,
            buttons: 1,
            bubbles: true,
          })
        )
      })

      const resized = useAppStore.getState().idToElement.get('shape-1') as ShapeElement
      expect(resized.x).toBe(100)
      expect(resized.y).toBe(100)
      expect(resized.w).toBe(60)
      expect(resized.h).toBe(80)
      expect(snapLinesRef.current).toEqual({ x: [160], y: [180] })

      act(() => {
        canvasRef.current?.dispatchEvent(
          createMockPointerEvent('pointerup', {
            pointerId: 33,
            pointerType: 'mouse',
            clientX: 169,
            clientY: 176,
            button: 0,
            buttons: 0,
            bubbles: true,
          })
        )
      })
      expect(snapLinesRef.current).toEqual({ x: [], y: [] })
      expect(scheduleRedraw).toHaveBeenCalled()
    })
  })

  describe('touch interactions', () => {
    it('draws a stroke from a single accepted touch', () => {
      const { canvas } = renderPointerEngineHarness()
      const start = createMockTouch({ identifier: 1, clientX: 10, clientY: 20 })
      const move = createMockTouch({ identifier: 1, clientX: 30, clientY: 40 })

      dispatchTouch(canvas, createMockTouchEvent('touchstart', [start], [start]))
      dispatchTouch(canvas, createMockTouchEvent('touchmove', [move], [move]))
      dispatchTouch(canvas, createMockTouchEvent('touchend', [], [move]))

      const stroke = useAppStore.getState().elements[0]
      expect(stroke).toMatchObject({
        type: 'stroke',
        points: [
          [10, 20],
          [30, 40],
        ],
      })
    })

    it('rejects palm touches before they start drawing', () => {
      const { canvas } = renderPointerEngineHarness()
      const palm = createMockTouch({
        identifier: 1,
        clientX: 100,
        clientY: 120,
        radiusX: 42,
        radiusY: 38,
      })

      dispatchTouch(canvas, createMockTouchEvent('touchstart', [palm], [palm]))
      dispatchTouch(canvas, createMockTouchEvent('touchmove', [palm], [palm]))
      dispatchTouch(canvas, createMockTouchEvent('touchend', [], [palm]))

      expect(useAppStore.getState().elements).toEqual([])
    })

    it('keeps drawing with the active finger when a palm lands', () => {
      const { canvas } = renderPointerEngineHarness()
      const start = createMockTouch({ identifier: 1, clientX: 10, clientY: 10 })
      const moved = createMockTouch({ identifier: 1, clientX: 25, clientY: 25 })
      const palm = createMockTouch({
        identifier: 2,
        clientX: 500,
        clientY: 500,
        radiusX: 44,
        radiusY: 40,
      })

      dispatchTouch(canvas, createMockTouchEvent('touchstart', [start], [start]))
      dispatchTouch(canvas, createMockTouchEvent('touchstart', [start, palm], [palm]))
      dispatchTouch(canvas, createMockTouchEvent('touchmove', [moved, palm], [moved]))
      dispatchTouch(canvas, createMockTouchEvent('touchend', [palm], [moved]))

      const stroke = useAppStore.getState().elements[0]
      expect(stroke).toMatchObject({
        type: 'stroke',
        points: [
          [10, 10],
          [25, 25],
        ],
      })
    })

    it('stores stylus force as pressure samples', () => {
      const { canvas } = renderPointerEngineHarness()
      const start = createMockTouch({
        identifier: 1,
        clientX: 10,
        clientY: 20,
        force: 0.2,
        touchType: 'stylus',
      })
      const move = createMockTouch({
        identifier: 1,
        clientX: 40,
        clientY: 60,
        force: 0.9,
        touchType: 'stylus',
      })

      dispatchTouch(canvas, createMockTouchEvent('touchstart', [start], [start]))
      dispatchTouch(canvas, createMockTouchEvent('touchmove', [move], [move]))
      dispatchTouch(canvas, createMockTouchEvent('touchend', [], [move]))

      expect(useAppStore.getState().elements[0]).toMatchObject({
        type: 'stroke',
        pressures: [0.2, 0.9],
      })
    })

    it('stores pen PointerEvent pressure samples', () => {
      const { canvas } = renderPointerEngineHarness()

      dispatchPointer(
        canvas,
        createMockPointerEvent('pointerdown', {
          pointerId: 11,
          pointerType: 'pen',
          clientX: 10,
          clientY: 20,
          pressure: 0.25,
        })
      )
      dispatchPointer(
        canvas,
        createMockPointerEvent('pointermove', {
          pointerId: 11,
          pointerType: 'pen',
          clientX: 35,
          clientY: 45,
          pressure: 0.85,
        })
      )
      dispatchPointer(
        canvas,
        createMockPointerEvent('pointerup', {
          pointerId: 11,
          pointerType: 'pen',
          clientX: 35,
          clientY: 45,
          pressure: 0.85,
          buttons: 0,
        })
      )

      expect(useAppStore.getState().elements[0]).toMatchObject({
        type: 'stroke',
        pressures: [0.25, 0.85],
      })
    })

    it('uses two accepted touches for pinch zoom without creating a stroke', () => {
      const { canvas } = renderPointerEngineHarness()
      const first = createMockTouch({ identifier: 1, clientX: 100, clientY: 100 })
      const second = createMockTouch({ identifier: 2, clientX: 200, clientY: 100 })
      const movedFirst = createMockTouch({ identifier: 1, clientX: 50, clientY: 100 })
      const movedSecond = createMockTouch({ identifier: 2, clientX: 250, clientY: 100 })

      dispatchTouch(canvas, createMockTouchEvent('touchstart', [first, second], [first, second]))
      dispatchTouch(
        canvas,
        createMockTouchEvent('touchmove', [movedFirst, movedSecond], [movedFirst, movedSecond])
      )

      expect(useViewStore.getState().viewBox.zoom).toBeGreaterThan(1)
      expect(useAppStore.getState().elements).toEqual([])
    })

    it('aborts the current stroke on touchcancel', () => {
      const { canvas } = renderPointerEngineHarness()
      const start = createMockTouch({ identifier: 1, clientX: 10, clientY: 20 })
      const move = createMockTouch({ identifier: 1, clientX: 30, clientY: 40 })

      dispatchTouch(canvas, createMockTouchEvent('touchstart', [start], [start]))
      dispatchTouch(canvas, createMockTouchEvent('touchmove', [move], [move]))
      dispatchTouch(canvas, createMockTouchEvent('touchcancel', [], [move]))

      expect(useAppStore.getState().elements).toEqual([])
    })
  })

  describe('copySelectedToSystemClipboard', () => {
    it('should do nothing when no elements selected', async () => {
      useAppStore.setState({ selectedIds: [] })
      const { result } = renderHook(() =>
        usePointerEngine({
          canvasRef: createMockCanvasRef(),
          cachedBounds: mockBounds,
          scheduleRedraw: vi.fn(),
          startEditText: vi.fn(),
          textRef: createMockTextRef(),
          findSnaps: vi.fn().mockReturnValue({ dx: 0, dy: 0, linesX: [], linesY: [] }),
          snapLinesRef: { current: { x: [], y: [] } },
        })
      )
      // Should not throw
      await result.current.copySelectedToSystemClipboard()
    })

    it('should do nothing when selected element not found', async () => {
      useAppStore.setState({
        selectedIds: ['nonexistent'],
        elements: [],
      })
      const { result } = renderHook(() =>
        usePointerEngine({
          canvasRef: createMockCanvasRef(),
          cachedBounds: mockBounds,
          scheduleRedraw: vi.fn(),
          startEditText: vi.fn(),
          textRef: createMockTextRef(),
          findSnaps: vi.fn().mockReturnValue({ dx: 0, dy: 0, linesX: [], linesY: [] }),
          snapLinesRef: { current: { x: [], y: [] } },
        })
      )
      await result.current.copySelectedToSystemClipboard()
    })
  })
})
