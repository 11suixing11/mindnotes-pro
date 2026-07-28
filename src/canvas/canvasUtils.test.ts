import { describe, it, expect } from 'vitest'
import {
  simplifyPts,
  distToSeg,
  isVisibleInView,
  snapValueToGrid,
  snapPointToGrid,
  getGridSnapDelta,
} from './canvasUtils'
import type { StrokeElement, TextElement } from '../store/types'

describe('simplifyPts', () => {
  it('should return original points if length <= 2', () => {
    expect(
      simplifyPts(
        [
          [0, 0],
          [10, 10],
        ],
        5
      )
    ).toEqual([
      [0, 0],
      [10, 10],
    ])
    expect(simplifyPts([[0, 0]], 5)).toEqual([[0, 0]])
  })

  it('should remove points closer than threshold', () => {
    const pts = [
      [0, 0],
      [1, 1],
      [2, 2],
      [100, 100],
      [101, 101],
    ]
    const simplified = simplifyPts(pts, 10)
    expect(simplified.length).toBeLessThan(pts.length)
    expect(simplified[0]).toEqual([0, 0])
    expect(simplified[simplified.length - 1]).toEqual([101, 101])
  })

  it('should always keep first and last points', () => {
    const pts = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ]
    const simplified = simplifyPts(pts, 10)
    expect(simplified[0]).toEqual([0, 0])
    expect(simplified[simplified.length - 1]).toEqual([4, 0])
  })

  it('should keep points that are far enough apart', () => {
    const pts = [
      [0, 0],
      [100, 0],
      [200, 0],
      [300, 0],
    ]
    const simplified = simplifyPts(pts, 10)
    expect(simplified).toEqual(pts)
  })
})

describe('distToSeg', () => {
  it('should return 0 for point on the segment', () => {
    expect(distToSeg(5, 0, 0, 0, 10, 0)).toBeCloseTo(0)
  })

  it('should compute perpendicular distance', () => {
    expect(distToSeg(5, 5, 0, 0, 10, 0)).toBeCloseTo(5)
  })

  it('should clamp to start of segment', () => {
    const d = distToSeg(-5, 0, 0, 0, 10, 0)
    expect(d).toBeCloseTo(5)
  })

  it('should clamp to end of segment', () => {
    const d = distToSeg(15, 0, 0, 0, 10, 0)
    expect(d).toBeCloseTo(5)
  })

  it('should handle zero-length segment', () => {
    const d = distToSeg(3, 4, 5, 5, 5, 5)
    expect(d).toBeCloseTo(Math.sqrt((3 - 5) ** 2 + (4 - 5) ** 2))
  })
})

describe('isVisibleInView', () => {
  it('should return true when element overlaps view', () => {
    const el: TextElement = {
      type: 'text',
      id: 't1',
      x: 50,
      y: 50,
      width: 100,
      height: 30,
      content: 'Hello',
      fontSize: 16,
      color: '#000',
    }
    expect(isVisibleInView(el, 0, 0, 200, 200)).toBe(true)
  })

  it('should return false when element is outside view', () => {
    const el: TextElement = {
      type: 'text',
      id: 't1',
      x: 500,
      y: 500,
      width: 100,
      height: 30,
      content: 'Hello',
      fontSize: 16,
      color: '#000',
    }
    expect(isVisibleInView(el, 0, 0, 200, 200)).toBe(false)
  })

  it('should return true when element partially overlaps', () => {
    const el: TextElement = {
      type: 'text',
      id: 't1',
      x: 150,
      y: 150,
      width: 100,
      height: 30,
      content: 'Hello',
      fontSize: 16,
      color: '#000',
    }
    expect(isVisibleInView(el, 0, 0, 200, 200)).toBe(true)
  })

  it('should handle stroke elements', () => {
    const el: StrokeElement = {
      type: 'stroke',
      id: 's1',
      points: [
        [0, 0],
        [50, 50],
      ],
      color: '#000',
      size: 2,
      brush: 'pen',
    }
    expect(isVisibleInView(el, 0, 0, 200, 200)).toBe(true)
  })
})

describe('grid snapping helpers', () => {
  it('snaps values to the nearest grid line', () => {
    expect(snapValueToGrid(6, 10)).toBe(10)
    expect(snapValueToGrid(4, 10)).toBe(0)
    expect(snapValueToGrid(-6, 10)).toBe(-10)
  })

  it('leaves values unchanged when grid size is not positive', () => {
    expect(snapValueToGrid(13, 0)).toBe(13)
    expect(snapValueToGrid(13, -10)).toBe(13)
  })

  it('snaps points on both axes', () => {
    expect(snapPointToGrid({ x: 14, y: 31 }, 20)).toEqual({ x: 20, y: 40 })
  })

  it('returns movement delta needed to align bounds to the grid', () => {
    const snap = getGridSnapDelta({ x: 13, y: 27, w: 50, h: 30 }, 20)

    expect(snap.dx).toBe(7)
    expect(snap.dy).toBe(-7)
    expect(snap.linesX).toEqual([20])
    expect(snap.linesY).toEqual([20])
  })

  it('does not emit snap lines when bounds are already aligned', () => {
    const snap = getGridSnapDelta({ x: 20, y: 40, w: 50, h: 30 }, 20)

    expect(snap).toEqual({ dx: 0, dy: 0, linesX: [], linesY: [] })
  })
})
