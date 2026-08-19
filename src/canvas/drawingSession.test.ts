import { describe, expect, it, vi } from 'vitest'
import type { ShapeElement, UndoAction } from '../core/model'
import {
  getPenSampleUpdate,
  getShapeEndpoints,
  resolveShapeBindings,
  shouldCommitEraseSession,
} from './drawingSession'

const makeShape = (kind: ShapeElement['kind']): ShapeElement => ({
  type: 'shape',
  id: 'shape-1',
  kind,
  x: 10,
  y: 20,
  w: 30,
  h: -15,
  color: '#000',
  size: 2,
})

describe('drawing session helpers', () => {
  it('derives shape endpoints from signed dimensions', () => {
    expect(getShapeEndpoints(makeShape('arrow'))).toEqual({
      start: [10, 20],
      end: [40, 5],
    })
  })

  it('binds line and arrow endpoints while leaving other shapes unchanged', () => {
    const bindEndpoint = vi
      .fn()
      .mockReturnValueOnce({ targetId: 'box', anchorX: 0, anchorY: 0.5 })
      .mockReturnValueOnce(null)
    const line = makeShape('line')
    const visibleElements = [makeShape('rectangle')]

    expect(resolveShapeBindings(line, visibleElements, bindEndpoint)).toMatchObject({
      startBinding: { targetId: 'box', anchorX: 0, anchorY: 0.5 },
    })
    expect(bindEndpoint).toHaveBeenNthCalledWith(1, [10, 20], visibleElements, 'shape-1')
    expect(bindEndpoint).toHaveBeenNthCalledWith(2, [40, 5], visibleElements, 'shape-1')

    const rectangle = makeShape('rectangle')
    expect(resolveShapeBindings(rectangle, visibleElements, bindEndpoint)).toBe(rectangle)
  })

  it('commits eraser history only when elements or the undo stack changed', () => {
    const before = [makeShape('rectangle')]
    const same = [makeShape('rectangle')]
    const base: UndoAction[] = []
    expect(shouldCommitEraseSession(null, same, base, base)).toBe(false)
    expect(shouldCommitEraseSession(before, same, base, base)).toBe(false)
    expect(shouldCommitEraseSession(before, [], base, base)).toBe(true)
    expect(shouldCommitEraseSession(before, same, base, [])).toBe(true)
  })

  it('resolves pen velocity and pressure initialization without mutation', () => {
    expect(
      getPenSampleUpdate(
        [
          [0, 0],
          [3, 4],
        ],
        [],
        { x: 6, y: 8 },
        0.8,
        0.5
      )
    ).toEqual({ velocity: 5, hasPressure: true, pressure: 0.8, pressurePrefixLength: 2 })

    expect(getPenSampleUpdate([[0, 0]], [0.6], { x: 0, y: 2 }, undefined, 0.5)).toEqual({
      velocity: 2,
      hasPressure: true,
      pressure: 0.5,
      pressurePrefixLength: 0,
    })
    expect(getPenSampleUpdate([], [], { x: 0, y: 0 }, undefined, 0.5)).toEqual({
      velocity: 0,
      hasPressure: false,
      pressure: 0.5,
      pressurePrefixLength: 0,
    })
  })
})
