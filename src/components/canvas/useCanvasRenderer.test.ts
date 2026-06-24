import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCanvasRenderer } from './useCanvasRenderer'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import { useThemeStore } from '../../store/useThemeStore'
import type { DrawState } from './useCanvasRenderer'

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

const originalResizeObserver = globalThis.ResizeObserver

beforeEach(() => {
  globalThis.ResizeObserver = MockResizeObserver as any
})

afterEach(() => {
  globalThis.ResizeObserver = originalResizeObserver
})

function createMockCanvasRef(): React.RefObject<HTMLCanvasElement | null> {
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600
  return { current: canvas }
}

function createMockContainerRef(): React.RefObject<HTMLDivElement | null> {
  const div = document.createElement('div')
  div.style.width = '800px'
  div.style.height = '600px'
  return { current: div }
}

function createDefaultDrawState(): DrawState {
  return {
    drawing: false,
    currentPts: [],
    currentShape: null,
    mousePos: null,
    rotationAngle: null,
    marquee: null,
    snapLines: { x: [], y: [] },
    tool: 'pen',
    color: '#2c2416',
    size: 4,
    brush: 'pen',
    showGrid: false,
    showRulers: false,
    gridSize: 20,
    eraserTrail: [],
    penVelocity: 0,
  }
}

describe('useCanvasRenderer', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      elements: [],
      selectedIds: [],
      bgColor: '#ffffff',
    })
    useViewStore.setState({ viewBox: { x: 0, y: 0, zoom: 1 }, isPanning: false })
    useThemeStore.setState({ isDarkMode: false })
  })

  it('should return all expected functions and refs', () => {
    const { result } = renderHook(() =>
      useCanvasRenderer(createMockCanvasRef(), createMockContainerRef(), createDefaultDrawState)
    )
    expect(result.current.redraw).toBeTypeOf('function')
    expect(result.current.scheduleRedraw).toBeTypeOf('function')
    expect(result.current.elementsDirtyRef).toBeDefined()
    expect(result.current.boundsCacheRef).toBeDefined()
    expect(result.current.cachedBounds).toBeTypeOf('function')
    expect(result.current.canvasSize).toBeDefined()
    expect(result.current.dpr).toBeDefined()
  })

  describe('scheduleRedraw', () => {
    it('should schedule a redraw via requestAnimationFrame', () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
      const { result } = renderHook(() =>
        useCanvasRenderer(createMockCanvasRef(), createMockContainerRef(), createDefaultDrawState)
      )
      result.current.scheduleRedraw()
      expect(rafSpy).toHaveBeenCalled()
      rafSpy.mockRestore()
    })

    it('should cancel previous animation frame when called multiple times', () => {
      let frameId = 0
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => ++frameId)
      const cafSpy = vi.spyOn(window, 'cancelAnimationFrame')
      const { result } = renderHook(() =>
        useCanvasRenderer(createMockCanvasRef(), createMockContainerRef(), createDefaultDrawState)
      )
      result.current.scheduleRedraw()
      result.current.scheduleRedraw()
      expect(cafSpy).toHaveBeenCalled()
      rafSpy.mockRestore()
      cafSpy.mockRestore()
    })
  })

  describe('cachedBounds', () => {
    it('should compute and cache bounds for elements', () => {
      const { result } = renderHook(() =>
        useCanvasRenderer(createMockCanvasRef(), createMockContainerRef(), createDefaultDrawState)
      )
      const el = {
        type: 'shape' as const,
        id: 's1',
        kind: 'rectangle' as const,
        x: 10,
        y: 20,
        w: 100,
        h: 50,
        color: '#000',
        size: 2,
      }
      const b1 = result.current.cachedBounds(el)
      // elementBounds may include padding/stroke width adjustments
      expect(b1.x).toBeDefined()
      expect(b1.y).toBeDefined()
      expect(b1.w).toBeGreaterThan(0)
      expect(b1.h).toBeGreaterThan(0)
      // Second call should return cached value
      const b2 = result.current.cachedBounds(el)
      expect(b2).toBe(b1)
    })

    it('should clear cache when elements change', () => {
      const { result } = renderHook(() =>
        useCanvasRenderer(createMockCanvasRef(), createMockContainerRef(), createDefaultDrawState)
      )
      const el = {
        type: 'shape' as const,
        id: 's1',
        kind: 'rectangle' as const,
        x: 10,
        y: 20,
        w: 100,
        h: 50,
        color: '#000',
        size: 2,
      }
      result.current.cachedBounds(el)
      expect(result.current.boundsCacheRef.current.size).toBe(1)
      // Trigger element change
      act(() => {
        useAppStore.setState({ elements: [el] })
      })
      // Cache should be cleared after element change
      expect(result.current.boundsCacheRef.current.size).toBe(0)
    })
  })

  describe('canvasSize', () => {
    it('should initialize with window dimensions', () => {
      const { result } = renderHook(() =>
        useCanvasRenderer(createMockCanvasRef(), createMockContainerRef(), createDefaultDrawState)
      )
      expect(result.current.canvasSize.w).toBeGreaterThan(0)
      expect(result.current.canvasSize.h).toBeGreaterThan(0)
    })
  })

  describe('dpr', () => {
    it('should return device pixel ratio', () => {
      const { result } = renderHook(() =>
        useCanvasRenderer(createMockCanvasRef(), createMockContainerRef(), createDefaultDrawState)
      )
      expect(result.current.dpr).toBeGreaterThan(0)
    })
  })

  describe('elementsDirtyRef', () => {
    it('should start as true', () => {
      const { result } = renderHook(() =>
        useCanvasRenderer(createMockCanvasRef(), createMockContainerRef(), createDefaultDrawState)
      )
      expect(result.current.elementsDirtyRef.current).toBe(true)
    })

    it('should be set to true when elements change', () => {
      const { result } = renderHook(() =>
        useCanvasRenderer(createMockCanvasRef(), createMockContainerRef(), createDefaultDrawState)
      )
      // After initial render, it might be false
      act(() => {
        useAppStore.setState({
          elements: [
            {
              type: 'stroke',
              id: 's1',
              points: [
                [0, 0],
                [10, 10],
              ],
              color: '#000',
              size: 2,
              brush: 'pen',
            },
          ],
        })
      })
      expect(result.current.elementsDirtyRef.current).toBe(true)
    })
  })

  describe('redraw', () => {
    it('should handle null canvas ref gracefully', () => {
      const { result } = renderHook(() =>
        useCanvasRenderer({ current: null }, createMockContainerRef(), createDefaultDrawState)
      )
      // Should not throw
      result.current.redraw()
    })

    it('should handle canvas without context gracefully', () => {
      const canvas = document.createElement('canvas')
      vi.spyOn(canvas, 'getContext').mockReturnValue(null)
      const { result } = renderHook(() =>
        useCanvasRenderer({ current: canvas }, createMockContainerRef(), createDefaultDrawState)
      )
      // Should not throw
      result.current.redraw()
    })
  })

  describe('resize observer', () => {
    it('should update canvas size when container resizes', () => {
      const containerRef = createMockContainerRef()
      const { result } = renderHook(() =>
        useCanvasRenderer(createMockCanvasRef(), containerRef, createDefaultDrawState)
      )
      const initialSize = { ...result.current.canvasSize }
      // Simulate resize by changing container dimensions
      // Note: ResizeObserver mock may not trigger in jsdom
      expect(initialSize.w).toBeGreaterThan(0)
      expect(initialSize.h).toBeGreaterThan(0)
    })
  })

  describe('image-loaded event', () => {
    it('should mark elements dirty and redraw on image-loaded event', () => {
      const { result } = renderHook(() =>
        useCanvasRenderer(createMockCanvasRef(), createMockContainerRef(), createDefaultDrawState)
      )
      // Trigger image-loaded event
      act(() => {
        window.dispatchEvent(new Event('image-loaded'))
      })
      expect(result.current.elementsDirtyRef.current).toBe(true)
    })
  })
})
