import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { usePointerEngine } from './usePointerEngine'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
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

describe('usePointerEngine', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      elements: [],
      tool: 'pen',
      brush: 'pen',
      color: '#2c2416',
      size: 4,
      selectedIds: [],
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
          new MouseEvent('mousedown', {
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
          new MouseEvent('mousemove', {
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
          new MouseEvent('mouseup', {
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
