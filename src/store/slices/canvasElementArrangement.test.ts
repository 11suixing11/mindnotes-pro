import { describe, expect, it } from 'vitest'
import type { ShapeElement } from '../types'
import { createAlignmentPlan, createDistributionPlan } from './canvasElementArrangement'

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
})
