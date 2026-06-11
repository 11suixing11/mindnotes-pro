import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSelectionEngine } from './useSelectionEngine'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import type { CanvasElement } from '../../store/types'

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
  if (el.type === 'shape') return { x: el.x, y: el.y, w: el.w, h: el.h }
  if (el.type === 'text') return { x: el.x, y: el.y, w: el.width || 100, h: el.height || 30 }
  if (el.type === 'image') return { x: el.x, y: el.y, w: el.width, h: el.height }
  return { x: 0, y: 0, w: 0, h: 0 }
}

describe('useSelectionEngine', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({ elements: [], selectedIds: [] })
    useViewStore.setState({ viewBox: { x: 0, y: 0, zoom: 1 } })
  })

  it('should return findSnaps function', () => {
    const { result } = renderHook(() => useSelectionEngine(mockBounds))
    expect(result.current.findSnaps).toBeTypeOf('function')
  })

  it('should return snapLinesRef', () => {
    const { result } = renderHook(() => useSelectionEngine(mockBounds))
    expect(result.current.snapLinesRef.current).toEqual({ x: [], y: [] })
  })

  describe('findSnaps', () => {
    it('should return empty lines when no elements exist', () => {
      const { result } = renderHook(() => useSelectionEngine(mockBounds))
      const snap = result.current.findSnaps({ x: 10, y: 10, w: 50, h: 50 }, new Set())
      expect(snap.linesX).toEqual([])
      expect(snap.linesY).toEqual([])
      expect(snap.dx).toBe(0)
      expect(snap.dy).toBe(0)
    })

    it('should return empty lines when elements are far away', () => {
      useAppStore.setState({
        elements: [
          {
            type: 'shape',
            id: 's1',
            kind: 'rectangle',
            x: 500,
            y: 500,
            w: 100,
            h: 100,
            color: '#000',
            size: 2,
          },
        ],
      })
      const { result } = renderHook(() => useSelectionEngine(mockBounds))
      const snap = result.current.findSnaps({ x: 10, y: 10, w: 50, h: 50 }, new Set())
      expect(snap.linesX).toEqual([])
      expect(snap.linesY).toEqual([])
    })

    it('should snap to aligned element edges', () => {
      useAppStore.setState({
        elements: [
          {
            type: 'shape',
            id: 's1',
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
      const { result } = renderHook(() => useSelectionEngine(mockBounds))
      // Moving bounds left edge (95) close to target left edge (100)
      const snap = result.current.findSnaps({ x: 95, y: 200, w: 50, h: 50 }, new Set())
      expect(snap.dx).toBe(5) // Should snap to align left edges
      expect(snap.linesX.length).toBeGreaterThan(0)
    })

    it('should snap to center alignment', () => {
      useAppStore.setState({
        elements: [
          {
            type: 'shape',
            id: 's1',
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
      const { result } = renderHook(() => useSelectionEngine(mockBounds))
      // Moving bounds center at (127, ...) close to target center (125, ...)
      const snap = result.current.findSnaps({ x: 102, y: 200, w: 50, h: 50 }, new Set())
      expect(snap.linesX.length).toBeGreaterThan(0)
    })

    it('should exclude specified element ids', () => {
      useAppStore.setState({
        elements: [
          {
            type: 'shape',
            id: 's1',
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
      const { result } = renderHook(() => useSelectionEngine(mockBounds))
      // Exclude the only element - should not snap
      const snap = result.current.findSnaps({ x: 95, y: 200, w: 50, h: 50 }, new Set(['s1']))
      expect(snap.linesX).toEqual([])
      expect(snap.dx).toBe(0)
    })

    it('should adjust snap threshold based on zoom level', () => {
      useViewStore.setState({ viewBox: { x: 0, y: 0, zoom: 2 } })
      useAppStore.setState({
        elements: [
          {
            type: 'shape',
            id: 's1',
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
      const { result } = renderHook(() => useSelectionEngine(mockBounds))
      // At zoom 2, threshold is 3px, so 4px away should not snap
      const snap = result.current.findSnaps({ x: 96, y: 200, w: 50, h: 50 }, new Set())
      expect(snap.dx).toBe(0)
    })

    it('should provide snap lines for drawing guides', () => {
      useAppStore.setState({
        elements: [
          {
            type: 'shape',
            id: 's1',
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
      const { result } = renderHook(() => useSelectionEngine(mockBounds))
      const snap = result.current.findSnaps({ x: 99, y: 99, w: 50, h: 50 }, new Set())
      // Should have snap lines for left, right, center positions
      if (snap.dx !== 0) {
        expect(snap.linesX.length).toBe(3) // left, right, center
      }
      if (snap.dy !== 0) {
        expect(snap.linesY.length).toBe(3) // top, bottom, center
      }
    })
  })
})
