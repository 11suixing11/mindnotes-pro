import { describe, it, expect, beforeEach } from 'vitest'
import { useHistoryStore } from './useHistoryStore'

describe('useHistoryStore', () => {
  beforeEach(() => {
    useHistoryStore.setState({
      canUndo: false,
      canRedo: false,
      undoStack: [],
      redoStack: [],
    })
  })

  it('should initialize with correct default state', () => {
    const state = useHistoryStore.getState()

    expect(state.canUndo).toBe(false)
    expect(state.canRedo).toBe(false)
    expect(state.undoStack).toEqual([])
    expect(state.redoStack).toEqual([])
  })

  it('should push action to undo stack', () => {
    const action = { type: 'add-stroke', data: { id: '1' } }

    useHistoryStore.getState().push(action)
    const state = useHistoryStore.getState()

    expect(state.undoStack).toHaveLength(1)
    expect(state.undoStack[0]).toEqual(action)
    expect(state.canUndo).toBe(true)
    expect(state.canRedo).toBe(false)
  })

  it('should clear redo stack when pushing new action', () => {
    const action1 = { type: 'add-stroke', data: { id: '1' } }
    const action2 = { type: 'add-shape', data: { id: '2' } }

    useHistoryStore.getState().push(action1)
    useHistoryStore.getState().undo()
    useHistoryStore.getState().push(action2)

    const state = useHistoryStore.getState()
    expect(state.redoStack).toEqual([])
    expect(state.undoStack).toHaveLength(1) // undo removed action1, then action2 was added
    expect(state.undoStack[0]).toEqual(action2)
  })

  it('should undo action', () => {
    const action1 = { type: 'add-stroke', data: { id: '1' } }
    const action2 = { type: 'add-shape', data: { id: '2' } }

    useHistoryStore.getState().push(action1)
    useHistoryStore.getState().push(action2)
    useHistoryStore.getState().undo()

    const state = useHistoryStore.getState()
    expect(state.undoStack).toHaveLength(1)
    expect(state.redoStack).toHaveLength(1)
    expect(state.canUndo).toBe(true)
    expect(state.canRedo).toBe(true)
  })

  it('should redo action', () => {
    const action1 = { type: 'add-stroke', data: { id: '1' } }

    useHistoryStore.getState().push(action1)
    useHistoryStore.getState().undo()
    useHistoryStore.getState().redo()

    const state = useHistoryStore.getState()
    expect(state.undoStack).toHaveLength(1)
    expect(state.redoStack).toHaveLength(0)
    expect(state.canUndo).toBe(true)
    expect(state.canRedo).toBe(false)
  })

  it('should update undo and redo flags correctly', () => {
    const action1 = { type: 'add-stroke', data: { id: '1' } }
    const action2 = { type: 'add-shape', data: { id: '2' } }
    const action3 = { type: 'delete-layer', data: { id: '3' } }

    // Initial state
    expect(useHistoryStore.getState().canUndo).toBe(false)
    expect(useHistoryStore.getState().canRedo).toBe(false)

    // Push first action
    useHistoryStore.getState().push(action1)
    expect(useHistoryStore.getState().canUndo).toBe(true)
    expect(useHistoryStore.getState().canRedo).toBe(false)

    // Push second action
    useHistoryStore.getState().push(action2)
    expect(useHistoryStore.getState().canUndo).toBe(true)
    expect(useHistoryStore.getState().canRedo).toBe(false)

    // Undo once
    useHistoryStore.getState().undo()
    expect(useHistoryStore.getState().canUndo).toBe(true)
    expect(useHistoryStore.getState().canRedo).toBe(true)

    // Undo again
    useHistoryStore.getState().undo()
    expect(useHistoryStore.getState().canUndo).toBe(false)
    expect(useHistoryStore.getState().canRedo).toBe(true)

    // Redo once
    useHistoryStore.getState().redo()
    expect(useHistoryStore.getState().canUndo).toBe(true)
    expect(useHistoryStore.getState().canRedo).toBe(true)

    // Redo again
    useHistoryStore.getState().redo()
    expect(useHistoryStore.getState().canUndo).toBe(true)
    expect(useHistoryStore.getState().canRedo).toBe(false)
  })

  it('should not undo when undo stack is empty', () => {
    useHistoryStore.getState().undo()

    const state = useHistoryStore.getState()
    expect(state.undoStack).toEqual([])
    expect(state.redoStack).toEqual([])
    expect(state.canUndo).toBe(false)
    expect(state.canRedo).toBe(false)
  })

  it('should not redo when redo stack is empty', () => {
    useHistoryStore.getState().redo()

    const state = useHistoryStore.getState()
    expect(state.undoStack).toEqual([])
    expect(state.redoStack).toEqual([])
    expect(state.canUndo).toBe(false)
    expect(state.canRedo).toBe(false)
  })

  it('should clear history', () => {
    const action1 = { type: 'add-stroke', data: { id: '1' } }
    const action2 = { type: 'add-shape', data: { id: '2' } }

    useHistoryStore.getState().push(action1)
    useHistoryStore.getState().push(action2)
    useHistoryStore.getState().undo()

    useHistoryStore.getState().clear()

    const state = useHistoryStore.getState()
    expect(state.undoStack).toEqual([])
    expect(state.redoStack).toEqual([])
    expect(state.canUndo).toBe(false)
    expect(state.canRedo).toBe(false)
  })

  it('should handle multiple undo and redo operations', () => {
    const actions = [
      { type: 'action-1', data: { id: '1' } },
      { type: 'action-2', data: { id: '2' } },
      { type: 'action-3', data: { id: '3' } },
      { type: 'action-4', data: { id: '4' } },
    ]

    // Push all actions
    actions.forEach(action => useHistoryStore.getState().push(action))

    // Undo all
    for (let i = 0; i < 4; i++) {
      useHistoryStore.getState().undo()
    }

    const state1 = useHistoryStore.getState()
    expect(state1.undoStack).toHaveLength(0)
    expect(state1.redoStack).toHaveLength(4)
    expect(state1.canUndo).toBe(false)
    expect(state1.canRedo).toBe(true)

    // Redo all
    for (let i = 0; i < 4; i++) {
      useHistoryStore.getState().redo()
    }

    const state2 = useHistoryStore.getState()
    expect(state2.undoStack).toHaveLength(4)
    expect(state2.redoStack).toHaveLength(0)
    expect(state2.canUndo).toBe(true)
    expect(state2.canRedo).toBe(false)
  })
})
