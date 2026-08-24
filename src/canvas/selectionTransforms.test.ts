import { describe, expect, it } from 'vitest'
import type { ShapeElement, StrokeElement } from '../core/model'
import {
  calculateResizeTransform,
  calculateRotationDelta,
  calculateDragTransform,
  collectElementAnchorPositions,
  getElementAnchorPosition,
  radiansToNormalizedDegrees,
} from './selectionTransforms'

const bounds = { x: 0, y: 0, w: 100, h: 50 }
const noSnap = (target: { x?: number; y?: number }) => ({
  ...target,
  linesX: [],
  linesY: [],
})

describe('selection transform helpers', () => {
  it.each([
    { handle: 0, delta: { x: -10, y: -5 }, expected: { ax: 100, ay: 50, sx: 1.1, sy: 1.1 } },
    { handle: 1, delta: { x: 10, y: -5 }, expected: { ax: 0, ay: 50, sx: 1.1, sy: 1.1 } },
    { handle: 2, delta: { x: -10, y: 5 }, expected: { ax: 100, ay: 0, sx: 1.1, sy: 1.1 } },
    { handle: 3, delta: { x: 10, y: 5 }, expected: { ax: 0, ay: 0, sx: 1.1, sy: 1.1 } },
    { handle: 4, delta: { x: 0, y: -5 }, expected: { ax: 50, ay: 50, sx: 1, sy: 1.1 } },
    { handle: 5, delta: { x: 0, y: 5 }, expected: { ax: 50, ay: 0, sx: 1, sy: 1.1 } },
    { handle: 6, delta: { x: -10, y: 0 }, expected: { ax: 100, ay: 25, sx: 1.1, sy: 1 } },
    { handle: 7, delta: { x: 10, y: 0 }, expected: { ax: 0, ay: 25, sx: 1.1, sy: 1 } },
  ])('calculates resize handle $handle from its opposite anchor', ({ handle, delta, expected }) => {
    expect(
      calculateResizeTransform({
        handle,
        bounds,
        totalDelta: delta,
        elementType: 'shape',
        shiftPressed: false,
        snapTarget: noSnap,
      })
    ).toMatchObject(expected)
  })

  it('preserves image aspect ratio by default and honors snapped guides', () => {
    const result = calculateResizeTransform({
      handle: 3,
      bounds,
      totalDelta: { x: 10, y: 10 },
      elementType: 'image',
      shiftPressed: false,
      snapTarget: (target) => ({ ...target, x: 20, y: 20, linesX: [20], linesY: [20] }),
    })
    expect(result).toMatchObject({ ax: 0, ay: 0, sx: 0.4, sy: 0.4, linesX: [20], linesY: [20] })
  })

  it('returns null for unusable bounds and clamps scale', () => {
    expect(
      calculateResizeTransform({
        handle: 0,
        bounds: { x: 0, y: 0, w: 0, h: 50 },
        totalDelta: { x: 0, y: 0 },
        elementType: 'shape',
        shiftPressed: false,
        snapTarget: noSnap,
      })
    ).toBeNull()

    const result = calculateResizeTransform({
      handle: 7,
      bounds,
      totalDelta: { x: 5000, y: 0 },
      elementType: 'shape',
      shiftPressed: false,
      snapTarget: noSnap,
    })
    expect(result?.sx).toBe(10)

    const flipped = calculateResizeTransform({
      handle: 7,
      bounds,
      totalDelta: { x: -200, y: 0 },
      elementType: 'shape',
      shiftPressed: false,
      snapTarget: noSnap,
    })
    expect(flipped?.sx).toBe(0.1)
  })

  it('calculates free and 15-degree snapped rotation deltas', () => {
    const center = { x: 0, y: 0 }
    expect(
      calculateRotationDelta({
        start: { x: 1, y: 0 },
        current: { x: 0, y: 1 },
        center,
      })
    ).toBeCloseTo(Math.PI / 2)
    expect(
      calculateRotationDelta({
        start: { x: 1, y: 0 },
        current: { x: Math.cos(0.2), y: Math.sin(0.2) },
        center,
        shiftPressed: true,
      })
    ).toBeCloseTo(Math.PI / 12)

    expect(
      calculateRotationDelta({
        start: { x: Math.cos((179 * Math.PI) / 180), y: Math.sin((179 * Math.PI) / 180) },
        current: { x: Math.cos((-179 * Math.PI) / 180), y: Math.sin((-179 * Math.PI) / 180) },
        center,
      })
    ).toBeCloseTo((-358 * Math.PI) / 180)
  })

  it('applies alignment snapping before grid snapping on each axis', () => {
    let receivedBounds: typeof bounds | undefined
    const result = calculateDragTransform({
      bounds: { x: 13, y: 27, w: 100, h: 50 },
      delta: { x: 2, y: 1 },
      findSnaps: (movingBounds) => {
        receivedBounds = movingBounds
        return { dx: 5, dy: 0, linesX: [20], linesY: [] }
      },
      snapToGrid: true,
      gridSize: 20,
    })
    expect(receivedBounds).toEqual({ x: 15, y: 28, w: 100, h: 50 })
    expect(result).toMatchObject({
      dx: 7,
      dy: -7,
      snapDx: 5,
      snapDy: -8,
      linesX: [20],
      linesY: [20],
    })

    expect(
      calculateDragTransform({
        bounds: { x: 13, y: 27, w: 100, h: 50 },
        delta: { x: 2, y: 1 },
        findSnaps: () => ({ dx: 5, dy: -3, linesX: [20], linesY: [25] }),
        snapToGrid: true,
        gridSize: 20,
      })
    ).toMatchObject({
      dx: 7,
      dy: -2,
      snapDx: 5,
      snapDy: -3,
      linesX: [20],
      linesY: [25],
    })
  })

  it('normalizes display degrees and exposes element anchor positions', () => {
    expect(radiansToNormalizedDegrees(-Math.PI / 2)).toBe(270)
    const stroke: StrokeElement = {
      type: 'stroke',
      id: 'stroke',
      points: [[12, 24]],
      color: '#000',
      size: 2,
      brush: 'pen',
    }
    const shape: ShapeElement = {
      type: 'shape',
      id: 'shape',
      kind: 'rectangle',
      x: 30,
      y: 40,
      w: 10,
      h: 20,
      color: '#000',
      size: 2,
    }
    expect(getElementAnchorPosition(stroke)).toEqual({ x: 12, y: 24 })
    expect(getElementAnchorPosition(shape)).toEqual({ x: 30, y: 40 })
    expect(
      collectElementAnchorPositions(['stroke', 'shape', 'missing'], (id) =>
        id === 'stroke' ? stroke : id === 'shape' ? shape : undefined
      )
    ).toEqual(
      new Map([
        ['stroke', { x: 12, y: 24 }],
        ['shape', { x: 30, y: 40 }],
      ])
    )
  })
})
