import { describe, expect, it } from 'vitest'
import {
  commitScreenHistory,
  emptyScreenHistory,
  MAX_SCREEN_POINTS,
  redoScreenHistory,
  screenStrokeHit,
  screenStrokeWidth,
  undoScreenHistory,
  validScreenPoints,
  validScreenStroke,
} from './screenInk'
import type { ScreenStroke } from './screenInk'

const line: ScreenStroke = {
  id: 'line',
  tool: 'pen',
  color: '#e05d52',
  width: 4,
  points: [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
  ],
}

describe('screen erasing', () => {
  it('erases when a fast gesture crosses a line without sampling a point on it', () => {
    expect(
      screenStrokeHit(line, [
        { x: 200, y: 20 },
        { x: 200, y: 180 },
      ])
    ).toBe(true)
    expect(
      screenStrokeHit(line, [
        { x: 40, y: 20 },
        { x: 40, y: 180 },
      ])
    ).toBe(false)
  })

  it('handles dots, line ends, collinear gestures and highlighter width', () => {
    expect(screenStrokeHit({ ...line, points: [{ x: 200, y: 100 }] }, [{ x: 180, y: 100 }])).toBe(
      false
    )
    expect(screenStrokeHit(line, [{ x: 315, y: 100 }])).toBe(true)
    expect(
      screenStrokeHit(line, [
        { x: 180, y: 100 },
        { x: 240, y: 100 },
      ])
    ).toBe(true)
    expect(screenStrokeHit({ ...line, tool: 'highlight', width: 32 }, [{ x: 200, y: 131 }])).toBe(
      true
    )
    expect(screenStrokeHit(line, [])).toBe(false)
  })

  it('keeps exact erasing around spatial cell boundaries and very long segments', () => {
    const edge = {
      ...line,
      points: [
        { x: 63, y: 128 },
        { x: 190, y: 128 },
      ],
    }
    expect(screenStrokeHit(edge, [{ x: 64, y: 111 }])).toBe(true)
    expect(screenStrokeHit(edge, [{ x: 64, y: 109 }])).toBe(false)
    const diagonal = {
      ...line,
      points: [
        { x: 0, y: 0 },
        { x: 100000, y: 100000 },
      ],
    }
    expect(screenStrokeHit(diagonal, [{ x: 50000, y: 50000 }])).toBe(true)
    expect(screenStrokeHit(diagonal, [{ x: 50000, y: 51000 }])).toBe(false)
    expect(
      screenStrokeHit(edge, [
        { x: 0, y: 0 },
        { x: 100000, y: 100000 },
      ])
    ).toBe(true)
  })

  it('matches an independent segment-distance reference over sampled curves', () => {
    const distance = (
      p: { x: number; y: number },
      a: { x: number; y: number },
      b: { x: number; y: number }
    ) => {
      const dx = b.x - a.x,
        dy = b.y - a.y
      const t =
        dx * dx + dy * dy
          ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
          : 0
      return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t)
    }
    const curve = {
      ...line,
      width: 8,
      points: Array.from({ length: 300 }, (_, index) => ({
        x: index * 3,
        y: 200 + Math.sin(index / 10) * 80,
      })),
    }
    for (let index = 0; index < 120; index++) {
      const point = { x: (index * 37) % 950, y: (index * 71) % 400 }
      const expected = curve.points
        .slice(1)
        .some((end, segment) => distance(point, curve.points[segment], end) <= 20)
      expect(screenStrokeHit(curve, [point])).toBe(expected)
    }
  })
})

describe('screen history and input limits', () => {
  it('makes erase and clear reversible, and discards redo after a new stroke', () => {
    const drawn = commitScreenHistory(emptyScreenHistory(), [line])
    const erased = commitScreenHistory(drawn, [])
    expect(undoScreenHistory(erased).present).toEqual([line])
    expect(redoScreenHistory(undoScreenHistory(erased)).present).toEqual([])
    const edited = commitScreenHistory(undoScreenHistory(erased), [line, { ...line, id: 'second' }])
    expect(edited.future).toEqual([])
    expect(drawn.present).toEqual([line])
  })

  it('bounds undo memory and leaves empty undo/redo unchanged', () => {
    const empty = emptyScreenHistory()
    expect(undoScreenHistory(empty)).toBe(empty)
    expect(redoScreenHistory(empty)).toBe(empty)
    let history = empty
    for (let i = 0; i < 50; i += 1)
      history = commitScreenHistory(history, [{ ...line, id: String(i) }])
    expect(history.past).toHaveLength(40)
    expect(history.present[0].id).toBe('49')
  })

  it('rejects oversized or invalid renderer data, and chooses distinct brush widths', () => {
    expect(validScreenStroke(line)).toBe(true)
    expect(validScreenStroke({ ...line, color: 'url(file:///secret)' })).toBe(false)
    expect(validScreenStroke({ ...line, width: Infinity })).toBe(false)
    expect(validScreenPoints([{ x: NaN, y: 10 }])).toBe(false)
    expect(validScreenPoints([{ x: -1, y: 10 }])).toBe(false)
    expect(
      validScreenPoints(Array.from({ length: MAX_SCREEN_POINTS + 1 }, () => ({ x: 1, y: 1 })))
    ).toBe(false)
    expect(screenStrokeWidth('highlight', 'medium')).toBe(22)
    expect(screenStrokeWidth('pen', 'thin')).toBe(2)
  })
})
