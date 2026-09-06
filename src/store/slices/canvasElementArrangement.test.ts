import { describe, expect, it } from 'vitest'
import type { ShapeElement } from '../types'
import {
  createAlignmentPlan,
  createDistributionPlan,
  createReorderPlan,
  reorderElementsWithinLayers,
} from './canvasElementArrangement'

function makeShape(id: string, x: number): ShapeElement {
  return {
    type: 'shape',
    id,
    kind: 'rectangle',
    x,
    y: 0,
    w: 10,
    h: 10,
    color: '#000000',
    size: 2,
  }
}

describe('canvas element arrangement plans', () => {
  it('creates an alignment snapshot only when geometry changes', () => {
    const elements = [makeShape('left', 0), makeShape('right', 80)]

    const plan = createAlignmentPlan(elements, ['left', 'right'], 'alignLeft')

    expect((plan?.elements[1] as ShapeElement).x).toBe(0)
    expect(plan?.action).toEqual(
      expect.objectContaining({ type: 'snapshot', label: 'Align elements' })
    )
    expect(createAlignmentPlan(plan?.elements ?? [], ['left', 'right'], 'alignLeft')).toBeNull()
  })

  it('creates a distribution snapshot with independent document copies', () => {
    const elements = [makeShape('left', 0), makeShape('middle', 30), makeShape('right', 100)]

    const plan = createDistributionPlan(elements, ['left', 'middle', 'right'], 'distributeH')

    expect((plan?.elements[1] as ShapeElement).x).toBe(50)
    if (!plan || plan.action.type !== 'snapshot') throw new Error('Expected snapshot plan')
    expect(plan.action.before).not.toBe(elements)
    expect(plan.action.after).not.toBe(plan.elements)
  })

  it('reorders selected elements independently within each layer', () => {
    const elements = [
      { ...makeShape('a', 0), layerId: 'layer-a' },
      { ...makeShape('x', 0), layerId: 'layer-b' },
      { ...makeShape('b', 0), layerId: 'layer-a' },
      { ...makeShape('y', 0), layerId: 'layer-b' },
      { ...makeShape('c', 0), layerId: 'layer-a' },
    ]

    const reordered = reorderElementsWithinLayers(elements, ['a', 'x'], 'front')

    expect(reordered.map((element) => element.id)).toEqual(['b', 'y', 'c', 'x', 'a'])
    expect(
      reordered.filter((element) => element.layerId === 'layer-a').map((element) => element.id)
    ).toEqual(['b', 'c', 'a'])
    expect(
      reordered.filter((element) => element.layerId === 'layer-b').map((element) => element.id)
    ).toEqual(['y', 'x'])
  })

  it('moves non-contiguous selections one level while preserving relative order', () => {
    const elements = ['a', 'b', 'c', 'd'].map((id) => makeShape(id, 0))

    const forward = reorderElementsWithinLayers(elements, ['a', 'c'], 'forward')
    const backward = reorderElementsWithinLayers(elements, ['b', 'd'], 'backward')
    const back = reorderElementsWithinLayers(elements, ['b', 'd'], 'back')

    expect(forward.map((element) => element.id)).toEqual(['b', 'a', 'd', 'c'])
    expect(backward.map((element) => element.id)).toEqual(['b', 'a', 'd', 'c'])
    expect(back.map((element) => element.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('keeps selected group members in their existing relative order', () => {
    const elements = [
      { ...makeShape('group-a', 0), groupId: 'group-1' },
      makeShape('middle', 0),
      { ...makeShape('group-b', 0), groupId: 'group-1' },
      makeShape('front', 0),
    ]

    const reordered = reorderElementsWithinLayers(elements, ['group-a', 'group-b'], 'front')

    expect(reordered.map((element) => element.id)).toEqual([
      'middle',
      'front',
      'group-a',
      'group-b',
    ])
  })

  it('does not create history at a reorder boundary', () => {
    const elements = [makeShape('back', 0), makeShape('front-a', 0), makeShape('front-b', 0)]

    expect(createReorderPlan(elements, ['front-a', 'front-b'], 'front')).toBeNull()
    expect(createReorderPlan(elements, ['back'], 'back')).toBeNull()
  })
})
