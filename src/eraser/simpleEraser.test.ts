import { describe, expect, it } from 'vitest'
import type { CanvasElement, StrokeElement } from '../store/types'
import { eraseElementsAtPoint, getEraserWorldRadius } from './simpleEraser'

const bounds = (element: CanvasElement) => {
  if (element.type === 'shape') return { x: element.x, y: element.y, w: element.w, h: element.h }
  if (element.type === 'stroke') return { x: 0, y: 0, w: 0, h: 0 }
  return { x: element.x, y: element.y, w: element.width, h: element.height }
}

const stroke: StrokeElement = {
  type: 'stroke',
  id: 'stroke-1',
  points: [
    [0, 0],
    [200, 0],
  ],
  pressures: [0.2, 0.8],
  color: '#000000',
  size: 2,
  brush: 'pen',
}

describe('simple eraser', () => {
  it('keeps a constant screen-space radius across zoom levels', () => {
    expect(getEraserWorldRadius(8, 1)).toBe(20)
    expect(getEraserWorldRadius(8, 2)).toBe(10)
    expect(getEraserWorldRadius(8, 0.5)).toBe(40)
  })

  it('splits a sparse stroke at circle intersections', () => {
    const patch = eraseElementsAtPoint({
      elements: [stroke],
      point: { x: 100, y: 0 },
      radius: 20,
      getBounds: bounds,
      createId: (_sourceId, index) => `part-${index}`,
    })

    expect(patch.removeIds).toEqual(['stroke-1'])
    expect(patch.additions).toHaveLength(2)
    expect(patch.additions[0].points[0]).toEqual([0, 0])
    expect(patch.additions[0].points[patch.additions[0].points.length - 1][0]).toBeCloseTo(79)
    expect(patch.additions[1].points[0][0]).toBeCloseTo(121)
    expect(patch.additions[1].points[patch.additions[1].points.length - 1]).toEqual([200, 0])
    const firstPressures = patch.additions[0].pressures ?? []
    expect(firstPressures[firstPressures.length - 1]).toBeCloseTo(0.437)
  })

  it('does not modify a stroke outside the eraser radius', () => {
    const patch = eraseElementsAtPoint({
      elements: [stroke],
      point: { x: 100, y: 80 },
      radius: 20,
      getBounds: bounds,
      createId: (_sourceId, index) => `part-${index}`,
    })

    expect(patch).toEqual({ removeIds: [], additions: [] })
  })

  it('deletes only the topmost whole object in top-only mode', () => {
    const elements: CanvasElement[] = [
      {
        type: 'shape',
        id: 'top',
        kind: 'rectangle',
        x: 0,
        y: 0,
        w: 100,
        h: 100,
        color: '#000000',
        size: 2,
      },
      {
        type: 'text',
        id: 'bottom',
        x: 0,
        y: 0,
        width: 100,
        height: 40,
        content: 'text',
        fontSize: 16,
        color: '#000000',
      },
    ]

    const patch = eraseElementsAtPoint({
      elements,
      point: { x: 20, y: 20 },
      radius: 10,
      topOnly: true,
      getBounds: bounds,
      createId: (_sourceId, index) => `part-${index}`,
    })

    expect(patch).toEqual({ removeIds: ['top'], additions: [] })
  })

  it('removes an entire stroke instead of splitting it in top-only mode', () => {
    const patch = eraseElementsAtPoint({
      elements: [stroke],
      point: { x: 100, y: 0 },
      radius: 20,
      topOnly: true,
      getBounds: bounds,
      createId: (_sourceId, index) => `part-${index}`,
    })

    expect(patch).toEqual({ removeIds: ['stroke-1'], additions: [] })
  })

  it('removes all stroke fragments during a continuous sweep', () => {
    let elements: CanvasElement[] = [stroke]

    for (let step = 0; step <= 40; step += 1) {
      const patch = eraseElementsAtPoint({
        elements,
        point: { x: -20 + (240 * step) / 40, y: 0 },
        radius: 10,
        getBounds: bounds,
        createId: (sourceId, index) => `${sourceId}-part-${step}-${index}`,
      })
      if (patch.removeIds.length === 0) continue
      const removeIds = new Set(patch.removeIds)
      elements = elements.filter((element) => !removeIds.has(element.id)).concat(patch.additions)
    }

    expect(elements).toEqual([])
  })
})
