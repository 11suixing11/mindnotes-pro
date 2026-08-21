import { describe, expect, it } from 'vitest'
import type { ShapeElement, StrokeElement } from '../types'
import {
  createElementAdditionPlan,
  createElementClearPlan,
  createElementRemovalPlan,
  createElementUpdatePlan,
} from './canvasElementMutations'

function makeShape(id: string, x = 0): ShapeElement {
  return {
    type: 'shape',
    id,
    kind: 'rectangle',
    x,
    y: 0,
    w: 20,
    h: 20,
    color: '#000000',
    size: 2,
  }
}

function makeStroke(id: string): StrokeElement {
  return {
    type: 'stroke',
    id,
    points: [
      [0, 0],
      [10, 10],
    ],
    color: '#000000',
    size: 2,
    brush: 'pen',
  }
}

describe('canvas element mutation plans', () => {
  it('appends elements and records independent undo payloads', () => {
    const stroke = makeStroke('stroke')
    const plan = createElementAdditionPlan([], [stroke])

    expect(plan?.elements).toEqual([stroke])
    expect(plan?.action).toEqual(expect.objectContaining({ type: 'add', ids: [stroke.id] }))
    if (plan?.action.type !== 'add') throw new Error('expected add action')
    const recorded = plan.action.els?.[0] as StrokeElement
    expect(recorded.points).not.toBe(stroke.points)
  })

  it('updates one element without mutating the source array', () => {
    const elements = [makeShape('a'), makeShape('b', 100)]

    const plan = createElementUpdatePlan(elements, 0, (element) => ({
      ...element,
      x: 50,
    }))

    expect((plan.updatedElement as ShapeElement).x).toBe(50)
    expect((elements[0] as ShapeElement).x).toBe(0)
    expect(plan.elements[1]).toBe(elements[1])
  })

  it('removes elements with original indexes and filters selection', () => {
    const first = makeShape('first')
    const second = makeShape('second')
    const third = makeShape('third')

    const plan = createElementRemovalPlan(
      [first, second, third],
      [first.id, third.id],
      [first.id, second.id, third.id]
    )

    expect(plan?.elements).toEqual([second])
    expect(plan?.removedIds).toEqual([first.id, third.id])
    expect(plan?.selectedIds).toEqual([second.id])
    if (plan?.action.type !== 'remove') throw new Error('expected remove action')
    expect(plan.action.items.map((item) => item.index)).toEqual([0, 2])
  })

  it('clears elements with an independent snapshot', () => {
    const stroke = makeStroke('stroke')

    const plan = createElementClearPlan([stroke])

    expect(plan.elements).toEqual([])
    expect(plan.selectedIds).toEqual([])
    if (plan.action.type !== 'clear') throw new Error('expected clear action')
    expect((plan.action.snapshot[0] as StrokeElement).points).not.toBe(stroke.points)
  })
})
