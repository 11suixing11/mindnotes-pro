import { describe, it, expect } from 'vitest'
import { simplifyPts, distToSeg, isVisibleInView } from './canvasUtils'
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
