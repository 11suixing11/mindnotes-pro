import { describe, expect, it } from 'vitest'
import type { CanvasElement, ShapeElement } from '../types'
import { createDefaultLayer } from '../layers'
import { createElementLockPlan, createGroupPlan, createUngroupPlan } from './canvasElementMetadata'

const layer = createDefaultLayer(1)

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
    layerId: layer.id,
    ...overrides,
  }
}

describe('canvas element metadata plans', () => {
  it('groups selected elements and records their previous groups', () => {
    const elements: CanvasElement[] = [
      makeShape('a', { groupId: 'old' }),
      makeShape('b'),
      makeShape('c'),
    ]

    const plan = createGroupPlan(elements, ['a', 'b'], 'new-group')

    expect(plan.updatedElements.map((element) => element.id)).toEqual(['a', 'b'])
    expect(plan.elements[0].groupId).toBe('new-group')
    expect(plan.action).toEqual(
      expect.objectContaining({
        type: 'group',
        beforeGroup: [
          { id: 'a', oldGroupId: 'old' },
          { id: 'b', oldGroupId: undefined },
        ],
      })
    )
  })

  it('ungroups every member of an affected group', () => {
    const elements = [
      makeShape('a', { groupId: 'group-1' }),
      makeShape('b', { groupId: 'group-1' }),
      makeShape('c', { groupId: 'group-2' }),
    ]

    const plan = createUngroupPlan(elements, ['a'])

    expect(plan?.updatedElements.map((element) => element.id)).toEqual(['a', 'b'])
    expect(plan?.elements[0].groupId).toBeUndefined()
    expect(plan?.elements[2].groupId).toBe('group-2')
  })

  it('creates inverse lock and unlock actions for eligible elements', () => {
    const unlocked = makeShape('a')
    const locked = makeShape('b', { locked: true })

    const lockPlan = createElementLockPlan([unlocked, locked], ['a', 'b'], [layer], true)
    const unlockPlan = createElementLockPlan([unlocked, locked], ['a', 'b'], [layer], false)

    expect(lockPlan?.action).toEqual(expect.objectContaining({ type: 'lock', elementIds: ['a'] }))
    expect(unlockPlan?.action).toEqual(
      expect.objectContaining({ type: 'unlock', elementIds: ['b'] })
    )
  })
})
