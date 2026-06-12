import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useAppStore } from '../appStore'
import type { StrokeElement, ShapeElement } from '../types'

const makeStroke = (id: string, overrides?: Partial<StrokeElement>): StrokeElement => ({
  type: 'stroke',
  id,
  points: [
    [0, 0],
    [10, 10],
  ],
  color: '#000',
  size: 2,
  brush: 'pen',
  ...overrides,
})

const makeShape = (id: string, overrides?: Partial<ShapeElement>): ShapeElement => ({
  type: 'shape',
  id,
  kind: 'rectangle',
  x: 10,
  y: 20,
  w: 100,
  h: 50,
  color: '#000',
  size: 2,
  ...overrides,
})

describe('history slice', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    useAppStore.setState({
      elements: [],
      selectedIds: [],
      undoStack: [],
      redoStack: [],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('undo', () => {
    it('does nothing when undo stack is empty', () => {
      useAppStore.setState({ elements: [makeStroke('s1')] })
      useAppStore.getState().undo()
      expect(useAppStore.getState().elements).toHaveLength(1)
    })

    it('reverses an add action', () => {
      useAppStore.getState().addElement(makeStroke('s1'))
      expect(useAppStore.getState().elements).toHaveLength(1)
      useAppStore.getState().undo()
      expect(useAppStore.getState().elements).toHaveLength(0)
    })

    it('restores a removed element at its original index', () => {
      useAppStore.setState({
        elements: [makeStroke('s1'), makeStroke('s2'), makeStroke('s3')],
      })
      useAppStore.getState().removeElement('s2')
      expect(useAppStore.getState().elements).toHaveLength(2)
      useAppStore.getState().undo()
      const els = useAppStore.getState().elements
      expect(els).toHaveLength(3)
      expect(els[1].id).toBe('s2')
    })

    it('reverses a clear action by restoring snapshot', () => {
      useAppStore.setState({ elements: [makeStroke('s1'), makeStroke('s2')] })
      useAppStore.getState().clearAll()
      expect(useAppStore.getState().elements).toHaveLength(0)
      useAppStore.getState().undo()
      expect(useAppStore.getState().elements).toHaveLength(2)
    })

    it('moves redo stack and removes from undo stack', () => {
      useAppStore.getState().addElement(makeStroke('s1'))
      const undoBefore = useAppStore.getState().undoStack.length
      useAppStore.getState().undo()
      expect(useAppStore.getState().undoStack.length).toBe(undoBefore - 1)
      expect(useAppStore.getState().redoStack.length).toBe(1)
    })

    it('clears selectedIds on undo', () => {
      useAppStore.setState({ selectedIds: ['s1'] })
      useAppStore.getState().addElement(makeStroke('s1'))
      useAppStore.getState().undo()
      expect(useAppStore.getState().selectedIds).toEqual([])
    })
  })

  describe('redo', () => {
    it('does nothing when redo stack is empty', () => {
      useAppStore.setState({ elements: [makeStroke('s1')] })
      useAppStore.getState().redo()
      expect(useAppStore.getState().elements).toHaveLength(1)
    })

    it('re-applies an add action', () => {
      useAppStore.getState().addElement(makeStroke('s1'))
      useAppStore.getState().undo()
      expect(useAppStore.getState().elements).toHaveLength(0)
      useAppStore.getState().redo()
      expect(useAppStore.getState().elements).toHaveLength(1)
      expect(useAppStore.getState().elements[0].id).toBe('s1')
    })

    it('re-removes an element', () => {
      useAppStore.setState({ elements: [makeStroke('s1'), makeStroke('s2')] })
      useAppStore.getState().removeElement('s1')
      useAppStore.getState().undo()
      expect(useAppStore.getState().elements).toHaveLength(2)
      useAppStore.getState().redo()
      expect(useAppStore.getState().elements).toHaveLength(1)
      expect(useAppStore.getState().elements[0].id).toBe('s2')
    })

    it('moves undo stack and removes from redo stack', () => {
      useAppStore.getState().addElement(makeStroke('s1'))
      useAppStore.getState().undo()
      const redoBefore = useAppStore.getState().redoStack.length
      useAppStore.getState().redo()
      expect(useAppStore.getState().redoStack.length).toBe(redoBefore - 1)
      expect(useAppStore.getState().undoStack.length).toBe(1)
    })

    it('clears selectedIds on redo', () => {
      useAppStore.getState().addElement(makeStroke('s1'))
      useAppStore.getState().undo()
      useAppStore.setState({ selectedIds: ['some'] })
      useAppStore.getState().redo()
      expect(useAppStore.getState().selectedIds).toEqual([])
    })
  })

  describe('undo/redo roundtrip', () => {
    it('restores exact state after add �� undo �� redo', () => {
      useAppStore.getState().addElement(makeShape('sh1', { x: 42, y: 99 }))
      useAppStore.getState().undo()
      expect(useAppStore.getState().elements).toHaveLength(0)
      useAppStore.getState().redo()
      const after = useAppStore.getState().elements
      expect(after).toHaveLength(1)
      expect((after[0] as ShapeElement).x).toBe(42)
      expect((after[0] as ShapeElement).y).toBe(99)
    })

    it('handles multiple undo/redo steps', () => {
      useAppStore.getState().addElement(makeStroke('s1'))
      useAppStore.getState().addElement(makeStroke('s2'))
      useAppStore.getState().addElement(makeStroke('s3'))
      expect(useAppStore.getState().elements).toHaveLength(3)

      useAppStore.getState().undo()
      expect(useAppStore.getState().elements).toHaveLength(2)
      useAppStore.getState().undo()
      expect(useAppStore.getState().elements).toHaveLength(1)

      useAppStore.getState().redo()
      expect(useAppStore.getState().elements).toHaveLength(2)
      useAppStore.getState().redo()
      expect(useAppStore.getState().elements).toHaveLength(3)
    })

    it('new action clears redo stack', () => {
      useAppStore.getState().addElement(makeStroke('s1'))
      useAppStore.getState().undo()
      expect(useAppStore.getState().redoStack).toHaveLength(1)

      useAppStore.getState().addElement(makeStroke('s2'))
      expect(useAppStore.getState().redoStack).toHaveLength(0)
    })
  })

  describe('pushUndo', () => {
    it('pushes a custom action onto undo stack', () => {
      useAppStore.getState().pushUndo({ type: 'add', ids: ['test'] })
      expect(useAppStore.getState().undoStack).toHaveLength(1)
      expect(useAppStore.getState().undoStack[0].type).toBe('add')
    })

    it('clears redo stack when pushing undo', () => {
      useAppStore.setState({ redoStack: [{ type: 'add', ids: ['x'] }] })
      useAppStore.getState().pushUndo({ type: 'add', ids: ['y'] })
      expect(useAppStore.getState().redoStack).toHaveLength(0)
    })
  })
})
