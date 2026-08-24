import { describe, expect, it } from 'vitest'
import type { ShapeElement, UndoAction } from '../types'
import { appendUndoAction, createCanvasElementCommitPlan } from './canvasElementCommit'

function makeShape(id: string): ShapeElement {
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
  }
}

describe('canvas element commit plans', () => {
  it('skips a commit with no element, selection, or history changes', () => {
    const element = makeShape('a')

    expect(
      createCanvasElementCommitPlan(
        { elements: [element], selectedIds: [element.id], undoStack: [] },
        [element]
      )
    ).toBeNull()
  })

  it('filters selection and appends an action to an explicit undo stack', () => {
    const first = makeShape('first')
    const second = makeShape('second')
    const existing: UndoAction = { type: 'add', ids: [first.id] }
    const action: UndoAction = { type: 'remove', items: [{ el: first, index: 0 }] }

    const plan = createCanvasElementCommitPlan(
      { elements: [first, second], selectedIds: [first.id, second.id], undoStack: [] },
      [second],
      { action, selectedIds: [first.id, second.id], undoStack: [existing] }
    )

    expect(plan?.selectedIds).toEqual([second.id])
    expect(plan?.undoStack).toEqual([existing, action])
    expect(plan?.clearRedo).toBe(true)
  })

  it('preserves an explicit request not to clear redo history', () => {
    const element = makeShape('a')
    const action: UndoAction = { type: 'add', ids: [element.id] }

    const plan = createCanvasElementCommitPlan(
      { elements: [], selectedIds: [], undoStack: [] },
      [element],
      { action, clearRedo: false }
    )

    expect(plan?.clearRedo).toBe(false)
  })

  it('keeps the configured history window before appending', () => {
    const history: UndoAction[] = Array.from({ length: 60 }, (_, index) => ({
      type: 'add',
      ids: [`element-${index}`],
    }))
    const action: UndoAction = { type: 'clear', snapshot: [] }

    const next = appendUndoAction(history, action)

    expect(next).toHaveLength(51)
    expect(next[0]).toBe(history[10])
    expect(next[next.length - 1]).toBe(action)
  })
})
