import { describe, expect, it } from 'vitest'
import {
  boundsIntersectMarquee,
  collectMarqueeElementIds,
  hasMarqueeArea,
  hasMarqueeDragSize,
  isMarqueeShrinking,
  isPointInsideMarquee,
  mergeMarqueeSelectionIds,
  normalizeMarqueeRect,
} from './marquee'

describe('marquee helpers', () => {
  it('normalizes rectangles regardless of drag direction', () => {
    expect(normalizeMarqueeRect({ x: 20, y: 30 }, { x: 5, y: 10 })).toEqual({
      x: 5,
      y: 10,
      w: 15,
      h: 20,
    })
  })

  it('distinguishes a real marquee from a click and supports auto-drag sizing', () => {
    expect(hasMarqueeArea({ x: 0, y: 0, w: 3, h: 3 })).toBe(false)
    expect(hasMarqueeArea({ x: 0, y: 0, w: 4, h: 0 })).toBe(true)
    expect(hasMarqueeDragSize({ x: 0, y: 0, w: 20, h: 20 })).toBe(false)
    expect(hasMarqueeDragSize({ x: 0, y: 0, w: 21, h: 1 })).toBe(true)
  })

  it('detects inside points, shrinking gestures, and intersections', () => {
    const rect = normalizeMarqueeRect({ x: 0, y: 0 }, { x: 100, y: 80 })
    expect(isPointInsideMarquee({ x: 50, y: 40 }, rect)).toBe(true)
    expect(isPointInsideMarquee({ x: 101, y: 40 }, rect)).toBe(false)
    expect(isMarqueeShrinking({ x: 0, y: 0 }, { x: 100, y: 80 }, { x: 90, y: 70 })).toBe(true)
    expect(boundsIntersectMarquee({ x: 90, y: 70, w: 20, h: 20 }, rect)).toBe(true)
    expect(boundsIntersectMarquee({ x: 101, y: 81, w: 2, h: 2 }, rect)).toBe(false)
  })

  it('resolves candidates and merges modifier selections', () => {
    const elements = new Map([
      ['a', { bounds: { x: 0, y: 0, w: 10, h: 10 }, selectable: true }],
      ['b', { bounds: { x: 100, y: 100, w: 10, h: 10 }, selectable: true }],
      ['locked', { bounds: { x: 0, y: 0, w: 10, h: 10 }, selectable: false }],
    ])
    const hits = collectMarqueeElementIds({
      candidateIds: ['a', 'b', 'locked'],
      getElement: (id) => elements.get(id),
      getBounds: (element) => element.bounds,
      isSelectable: (element) => element.selectable,
      rect: { x: -1, y: -1, w: 20, h: 20 },
    })
    expect(hits).toEqual(['a'])
    expect(mergeMarqueeSelectionIds(['existing', 'a'], hits, true)).toEqual(['existing', 'a'])
    expect(mergeMarqueeSelectionIds(['existing'], hits, false)).toEqual(['a'])
  })
})
