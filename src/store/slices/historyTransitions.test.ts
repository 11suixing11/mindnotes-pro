import { describe, expect, it } from 'vitest'
import type { ShapeElement, UndoAction } from '../types'
import {
  createRedoTransition,
  createUndoTransition,
  getAffectedElementIds,
} from './historyTransitions'

function createShape(id: string, overrides: Partial<ShapeElement> = {}): ShapeElement {
  return {
    type: 'shape',
    id,
    kind: 'rectangle',
    x: 10,
    y: 20,
    w: 100,
    h: 50,
    color: '#000000',
    size: 2,
    ...overrides,
  }
}

describe('history transitions', () => {
  it('reverses and reapplies movement without changing unrelated elements', () => {
    const moved = createShape('moved', { x: 30, y: 35 })
    const stable = createShape('stable')
    const action: UndoAction = { type: 'move', deltas: [{ id: 'moved', dx: 20, dy: 15 }] }

    const undone = createUndoTransition([moved, stable], action)
    const redone = createRedoTransition(undone.elements, undone.inverseAction)

    expect(undone.elements).toEqual([createShape('moved'), stable])
    expect(undone.elements[1]).toBe(stable)
    expect(redone.elements).toEqual([moved, stable])
  })

  it('restores and reapplies group metadata', () => {
    const grouped = [
      createShape('a', { groupId: 'group-new' }),
      createShape('b', { groupId: 'group-new' }),
    ]
    const action: UndoAction = {
      type: 'group',
      groupId: 'group-new',
      elementIds: ['a', 'b'],
      beforeGroup: [{ id: 'a', oldGroupId: 'group-old' }, { id: 'b' }],
    }

    const undone = createUndoTransition(grouped, action)
    const redone = createRedoTransition(undone.elements, undone.inverseAction)

    expect(undone.elements.map((element) => element.groupId)).toEqual(['group-old', undefined])
    expect(redone.elements.map((element) => element.groupId)).toEqual(['group-new', 'group-new'])
  })

  it('restores and reapplies lock metadata', () => {
    const locked = createShape('locked', { locked: true })
    const action: UndoAction = {
      type: 'lock',
      elementIds: ['locked'],
      beforeLock: [{ id: 'locked', wasLocked: false }],
    }

    const undone = createUndoTransition([locked], action)
    const redone = createRedoTransition(undone.elements, undone.inverseAction)

    expect(undone.elements[0].locked).toBe(false)
    expect(redone.elements[0].locked).toBe(true)
  })

  it('clones snapshot data used by erase transitions', () => {
    const before = [createShape('before')]
    const after = [createShape('after')]
    const action: UndoAction = { type: 'erase', before, after }

    const undone = createUndoTransition(after, action)
    const redone = createRedoTransition(undone.elements, undone.inverseAction)

    expect(undone.elements).toEqual(before)
    expect(undone.elements).not.toBe(before)
    expect(redone.elements).toEqual(after)
    expect(redone.elements).not.toBe(after)
  })

  it('reports affected IDs for snapshot and erase actions', () => {
    expect(
      getAffectedElementIds({
        type: 'snapshot',
        before: [],
        after: [],
        label: 'Arrange',
        affectedIds: ['a', 'b'],
      })
    ).toEqual(['a', 'b'])

    expect(
      getAffectedElementIds({
        type: 'erase',
        before: [createShape('a'), createShape('shared')],
        after: [createShape('shared'), createShape('b')],
      })
    ).toEqual(['a', 'shared', 'b'])
  })
})
