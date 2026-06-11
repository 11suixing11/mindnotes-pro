import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useAppStore } from './appStore'

describe('useAppStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    useAppStore.setState({
      elements: [],
      tool: 'pen',
      brush: 'pen',
      color: '#2c2416',
      size: 4,
      bgColor: '#ffffff',
      selectedIds: [],
      undoStack: [],
      redoStack: [],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with correct default state', () => {
    const state = useAppStore.getState()
    expect(state.elements).toEqual([])
    expect(state.tool).toBe('pen')
    expect(state.color).toBe('#2c2416')
    expect(state.size).toBe(4)
  })

  it('should add a stroke element', () => {
    useAppStore.getState().addElement({
      type: 'stroke',
      id: 's1',
      points: [
        [0, 0],
        [10, 10],
      ],
      color: '#000',
      size: 2,
      brush: 'pen',
    })
    expect(useAppStore.getState().elements).toHaveLength(1)
    expect(useAppStore.getState().elements[0].type).toBe('stroke')
  })

  it('should add a shape element', () => {
    useAppStore.getState().addElement({
      type: 'shape',
      id: 'sh1',
      kind: 'rectangle',
      x: 0,
      y: 0,
      w: 100,
      h: 50,
      color: '#000',
      size: 2,
    })
    expect(useAppStore.getState().elements).toHaveLength(1)
    expect(useAppStore.getState().elements[0].type).toBe('shape')
  })

  it('should add a text element', () => {
    useAppStore.getState().addElement({
      type: 'text',
      id: 't1',
      x: 10,
      y: 10,
      width: 200,
      height: 30,
      content: 'Hello',
      fontSize: 16,
      color: '#000',
    })
    expect(useAppStore.getState().elements).toHaveLength(1)
    expect((useAppStore.getState().elements[0] as any).content).toBe('Hello')
  })

  it('should add an image element', () => {
    useAppStore.getState().addElement({
      type: 'image',
      id: 'i1',
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      dataUrl: 'data:image/png;base64,abc',
    })
    expect(useAppStore.getState().elements).toHaveLength(1)
    expect(useAppStore.getState().elements[0].type).toBe('image')
  })

  it('should remove an element', () => {
    useAppStore.getState().addElement({
      type: 'stroke',
      id: 's1',
      points: [[0, 0]],
      color: '#000',
      size: 2,
      brush: 'pen',
    })
    useAppStore.getState().addElement({
      type: 'stroke',
      id: 's2',
      points: [[10, 10]],
      color: '#000',
      size: 2,
      brush: 'pen',
    })
    useAppStore.getState().removeElement('s1')
    expect(useAppStore.getState().elements).toHaveLength(1)
    expect(useAppStore.getState().elements[0].id).toBe('s2')
  })

  it('should move an element', () => {
    useAppStore.getState().addElement({
      type: 'shape',
      id: 'sh1',
      kind: 'rectangle',
      x: 10,
      y: 20,
      w: 100,
      h: 50,
      color: '#000',
      size: 2,
    })
    useAppStore.getState().moveElementById('sh1', 5, 10)
    const el = useAppStore.getState().elements[0] as any
    expect(el.x).toBe(15)
    expect(el.y).toBe(30)
  })

  it('should clear all elements', () => {
    useAppStore.getState().addElement({
      type: 'stroke',
      id: 's1',
      points: [[0, 0]],
      color: '#000',
      size: 2,
      brush: 'pen',
    })
    useAppStore.getState().addElement({
      type: 'stroke',
      id: 's2',
      points: [[10, 10]],
      color: '#000',
      size: 2,
      brush: 'pen',
    })
    useAppStore.getState().clearAll()
    expect(useAppStore.getState().elements).toHaveLength(0)
  })

  it('should set tool', () => {
    useAppStore.getState().setTool('eraser')
    expect(useAppStore.getState().tool).toBe('eraser')
  })

  it('should set color', () => {
    useAppStore.getState().setColor('#ff0000')
    expect(useAppStore.getState().color).toBe('#ff0000')
  })

  it('should set size', () => {
    useAppStore.getState().setSize(8)
    expect(useAppStore.getState().size).toBe(8)
  })

  it('should undo', () => {
    useAppStore.getState().addElement({
      type: 'stroke',
      id: 's1',
      points: [[0, 0]],
      color: '#000',
      size: 2,
      brush: 'pen',
    })
    expect(useAppStore.getState().elements).toHaveLength(1)
    useAppStore.getState().undo()
    expect(useAppStore.getState().elements).toHaveLength(0)
  })

  it('should redo', () => {
    useAppStore.getState().addElement({
      type: 'stroke',
      id: 's1',
      points: [[0, 0]],
      color: '#000',
      size: 2,
      brush: 'pen',
    })
    useAppStore.getState().undo()
    useAppStore.getState().redo()
    expect(useAppStore.getState().elements).toHaveLength(1)
  })

  describe('save scheduling', () => {
    it('should set saveStatus to saving when element is added', () => {
      useAppStore.getState().addElement({
        type: 'stroke',
        id: 's1',
        points: [[0, 0]],
        color: '#000',
        size: 2,
        brush: 'pen',
      })
      expect(useAppStore.getState().saveStatus).toBe('saving')
    })

    it('should reset saveStatus to idle after save completes', async () => {
      // Initialize with a doc first
      await useAppStore.getState().createDoc('Test Doc')
      useAppStore.setState({ saveStatus: 'idle' })

      // Add element to trigger save
      useAppStore.getState().addElement({
        type: 'stroke',
        id: 's1',
        points: [[0, 0]],
        color: '#000',
        size: 2,
        brush: 'pen',
      })
      expect(useAppStore.getState().saveStatus).toBe('saving')

      // Fast-forward timer to trigger save
      await vi.advanceTimersByTimeAsync(1500)
      expect(useAppStore.getState().saveStatus).toBe('saved')

      // Wait for saved->idle transition
      await vi.advanceTimersByTimeAsync(2000)
      expect(useAppStore.getState().saveStatus).toBe('idle')
    })
  })
})
