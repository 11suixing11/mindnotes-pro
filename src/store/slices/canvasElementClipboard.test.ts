import { describe, expect, it } from 'vitest'
import type { CanvasElement, StrokeElement } from '../types'
import { createDefaultLayer } from '../layers'
import { copySelectedElements, createOffsetCopyPlan } from './canvasElementClipboard'

const layer = createDefaultLayer(1)

function makeStroke(id: string): StrokeElement {
  return {
    type: 'stroke',
    id,
    points: [
      [0, 0],
      [10, 10],
    ],
    pressures: [0.25, 0.75],
    color: '#000000',
    size: 2,
    brush: 'pen',
    layerId: layer.id,
  }
}

describe('canvas element clipboard plans', () => {
  it('copies selected elements without sharing stroke samples', () => {
    const source = makeStroke('stroke-1')

    const copied = copySelectedElements([source, makeStroke('stroke-2')], [source.id])

    expect(copied).toHaveLength(1)
    expect((copied[0] as StrokeElement).points).not.toBe(source.points)
    expect((copied[0] as StrokeElement).pressures).not.toBe(source.pressures)
  })

  it('creates unique typed ids, offsets, and writable layer assignments', () => {
    const source = makeStroke('stroke-1')
    const context = {
      elements: [source],
      layers: [layer],
      activeLayerId: layer.id,
      idToElement: new Map<string, CanvasElement>([[source.id, source]]),
    }

    const plan = createOffsetCopyPlan([source], context, 1234)

    expect(plan.ids).toHaveLength(1)
    expect(plan.ids[0]).toMatch(/^stroke-/)
    expect(plan.ids[0]).not.toBe(source.id)
    expect(plan.elements[0]).toEqual(
      expect.objectContaining({
        id: plan.ids[0],
        points: [
          [20, 20],
          [30, 30],
        ],
        layerId: layer.id,
      })
    )
  })
})
