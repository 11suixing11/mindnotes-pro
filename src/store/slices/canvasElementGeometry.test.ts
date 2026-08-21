import { describe, expect, it } from 'vitest'
import type { CanvasElement, ShapeElement } from '../types'
import {
  createMoveElementPlan,
  createMoveElementsPlan,
  createResizeElementPlan,
  createRotateElementPlan,
  createRotateElementsPlan,
} from './canvasElementGeometry'

function makeShape(id: string, overrides: Partial<ShapeElement> = {}): ShapeElement {
  return {
    type: 'shape',
    id,
    kind: 'rectangle',
    x: 0,
    y: 0,
    w: 20,
    h: 20,
    color: '#000000',
    size: 2,
    ...overrides,
  }
}

function maps(elements: CanvasElement[]) {
  return {
    idToElement: new Map(elements.map((element) => [element.id, element])),
    idToIndex: new Map(elements.map((element, index) => [element.id, index])),
  }
}

describe('canvas element geometry plans', () => {
  it('moves an element and updates its bound arrow', () => {
    const box = makeShape('box', { x: 100, y: 100, w: 50, h: 50 })
    const arrow = makeShape('arrow', {
      kind: 'arrow',
      x: 150,
      y: 125,
      w: 50,
      h: 0,
      startBinding: { targetId: box.id, anchorX: 1, anchorY: 0.5 },
    })
    const elements = [box, arrow]
    const indexes = maps(elements)

    const plan = createMoveElementPlan(elements, 0, 20, 10, indexes.idToElement, indexes.idToIndex)

    expect(plan.updatedElements.map((element) => element.id)).toEqual(['box', 'arrow'])
    expect(plan.elements[1]).toEqual(expect.objectContaining({ x: 170, y: 135, w: 30, h: -10 }))
  })

  it('uses delta history for ordinary moves and snapshots for binding changes', () => {
    const plain = [makeShape('a'), makeShape('b', { x: 100 })]
    const plainMaps = maps(plain)
    const deltaPlan = createMoveElementsPlan(
      plain,
      ['a', 'b'],
      10,
      5,
      plainMaps.idToElement,
      plainMaps.idToIndex,
      true
    )

    expect(deltaPlan?.action).toEqual(expect.objectContaining({ type: 'move' }))

    const box = makeShape('box', { w: 50, h: 50 })
    const arrow = makeShape('arrow', {
      kind: 'arrow',
      x: 50,
      y: 25,
      w: 50,
      h: 0,
      startBinding: { targetId: box.id, anchorX: 1, anchorY: 0.5 },
    })
    const bound = [box, arrow]
    const boundMaps = maps(bound)
    const snapshotPlan = createMoveElementsPlan(
      bound,
      ['box'],
      10,
      5,
      boundMaps.idToElement,
      boundMaps.idToIndex,
      true
    )

    expect(snapshotPlan?.action).toEqual(expect.objectContaining({ type: 'snapshot' }))
  })

  it('creates resize and rotation plans without mutating the source array', () => {
    const elements = [makeShape('a', { w: 20 }), makeShape('b', { x: 100 })]

    const resizePlan = createResizeElementPlan(elements, 0, 0, 0, 2, 1)
    const singleRotatePlan = createRotateElementPlan(elements, 0, Math.PI / 4)
    const multiRotatePlan = createRotateElementsPlan(elements, ['a', 'b'], Math.PI / 2)

    expect((resizePlan.elements[0] as ShapeElement).w).toBe(40)
    expect(singleRotatePlan.updatedElements[0].rotation).toBe(Math.PI / 4)
    expect(multiRotatePlan?.updatedElements).toHaveLength(2)
    expect(elements[0].rotation).toBeUndefined()
  })
})
