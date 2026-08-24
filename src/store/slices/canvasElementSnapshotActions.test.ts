import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasElement, ShapeElement, StrokeElement, UndoAction } from '../types'
import { createCanvasElementSnapshotActions } from './canvasElementSnapshotActions'

vi.mock('../saveManager', () => ({
  incrementSaveGeneration: vi.fn(),
  scheduleSave: vi.fn(),
}))

const { incrementSaveGeneration, scheduleSave } = await import('../saveManager')

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

interface HarnessState {
  elements: CanvasElement[]
  selectedIds: string[]
}

function createHarness(initial: Partial<HarnessState> = {}) {
  const state: HarnessState = {
    elements: [],
    selectedIds: [],
    ...initial,
  }
  const set = vi.fn((patch: Partial<HarnessState>) => Object.assign(state, patch))
  const get = vi.fn(() => state)
  const commitElements = vi.fn(
    (_elements: CanvasElement[], options?: { action?: UndoAction; selectedIds?: string[] }) => {
      if (options?.selectedIds) state.selectedIds = options.selectedIds
    }
  )
  const replaceElementCollection = vi.fn()
  const actions = createCanvasElementSnapshotActions({
    set,
    get,
    commitElements,
    replaceElementCollection,
  })
  return { state, commitElements, replaceElementCollection, actions }
}

describe('canvas element snapshot actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('commits an erase action with independent before and after snapshots', () => {
    const before = makeStroke('before')
    const after = makeStroke('after')
    const baseUndoStack: UndoAction[] = [{ type: 'add', ids: [before.id] }]
    const { commitElements, actions } = createHarness({ elements: [after] })

    actions.batchErase([before], [], baseUndoStack)

    expect(commitElements).toHaveBeenCalledWith(
      [after],
      expect.objectContaining({
        action: expect.objectContaining({ type: 'erase' }),
        selectedIds: [],
        undoStack: baseUndoStack,
      })
    )
    const action = commitElements.mock.calls[0]?.[1]?.action
    expect(action).toEqual({ type: 'erase', before: [before], after: [after] })
    if (action?.type !== 'erase') throw new Error('Expected erase action')
    expect(action.before[0]).not.toBe(before)
    expect((action.before[0] as StrokeElement).points).not.toBe(before.points)
    expect(action.after[0]).not.toBe(after)
  })

  it('restores cloned elements, filters selection, and synchronizes the collection', () => {
    const first = makeShape('first')
    const second = makeStroke('second')
    const { state, replaceElementCollection, actions } = createHarness({
      selectedIds: [first.id, 'missing'],
    })

    actions.restoreElementsSnapshot([first, second])

    expect(state.elements).toEqual([first, second])
    expect(state.elements[0]).not.toBe(first)
    expect((state.elements[1] as StrokeElement).points).not.toBe(second.points)
    expect(state.selectedIds).toEqual([first.id])
    expect(replaceElementCollection).toHaveBeenCalledWith(state.elements, state)
    expect(incrementSaveGeneration).toHaveBeenCalledOnce()
    expect(scheduleSave).toHaveBeenCalledOnce()
  })
})
