import { describe, expect, it } from 'vitest'
import {
  distanceSquared,
  getChangedElementIds,
  hasElementGeometryChanged,
  hasMovedBeyondThreshold,
  haveStrokePointsChanged,
} from './gestureGeometry'
import type { ShapeElement, StrokeElement } from '../core/model'

const stroke = (id: string, points: number[][]): StrokeElement => ({
  type: 'stroke',
  id,
  points,
  color: '#000',
  size: 2,
  brush: 'pen',
})

const shape = (id: string, x: number): ShapeElement => ({
  type: 'shape',
  id,
  kind: 'rectangle',
  x,
  y: 10,
  w: 20,
  h: 20,
  color: '#000',
  size: 2,
})

describe('gesture geometry helpers', () => {
  it('calculates squared distance and threshold crossings', () => {
    expect(distanceSquared({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25)
    expect(hasMovedBeyondThreshold({ x: 0, y: 0 }, { x: 3, y: 4 }, 5)).toBe(true)
    expect(hasMovedBeyondThreshold({ x: 0, y: 0 }, { x: 2, y: 4 }, 5)).toBe(false)
  })

  it('compares stroke point arrays without treating equal arrays as changed', () => {
    expect(haveStrokePointsChanged([[1, 2]], [[1, 2]])).toBe(false)
    expect(haveStrokePointsChanged([[1, 2]], [[1, 3]])).toBe(true)
    expect(haveStrokePointsChanged([[1, 2]], [])).toBe(true)
  })

  it('limits geometry comparison to position, size, and rotation', () => {
    expect(hasElementGeometryChanged(shape('a', 0), { ...shape('a', 0), color: '#fff' })).toBe(
      false
    )
    expect(hasElementGeometryChanged(shape('a', 0), shape('a', 1))).toBe(true)
  })

  it('finds added, removed, and moved element ids', () => {
    const before = [
      stroke('stroke-1', [
        [0, 0],
        [1, 1],
      ]),
      shape('shape-1', 0),
    ]
    const after = [
      stroke('stroke-1', [
        [0, 0],
        [2, 1],
      ]),
      shape('shape-2', 0),
    ]
    expect(getChangedElementIds(before, after)).toEqual(['stroke-1', 'shape-1', 'shape-2'])
  })
})
