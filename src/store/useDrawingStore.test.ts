import { describe, it, expect, beforeEach } from 'vitest'
import { useDrawingStore } from './useDrawingStore'

describe('useDrawingStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useDrawingStore.setState({
      strokes: [],
      shapes: [],
      tool: 'pen',
      color: '#000000',
      size: 4,
    })
  })

  it('should initialize with correct default state', () => {
    const state = useDrawingStore.getState()
    expect(state.strokes).toEqual([])
    expect(state.shapes).toEqual([])
    expect(state.tool).toBe('pen')
    expect(state.color).toBe('#000000')
    expect(state.size).toBe(4)
  })

  it('should set tool correctly', () => {
    useDrawingStore.getState().setTool('eraser')
    expect(useDrawingStore.getState().tool).toBe('eraser')

    useDrawingStore.getState().setTool('rectangle')
    expect(useDrawingStore.getState().tool).toBe('rectangle')
  })

  it('should set color correctly', () => {
    useDrawingStore.getState().setColor('#FF0000')
    expect(useDrawingStore.getState().color).toBe('#FF0000')
  })

  it('should set size correctly', () => {
    useDrawingStore.getState().setSize(8)
    expect(useDrawingStore.getState().size).toBe(8)
  })

  it('should add stroke and persist to localStorage', () => {
    const stroke = {
      id: '1',
      points: [[0, 0], [1, 1]],
      color: '#000000',
      size: 4,
      tool: 'pen' as const,
    }

    useDrawingStore.getState().addStroke(stroke)
    const state = useDrawingStore.getState()

    expect(state.strokes).toHaveLength(1)
    expect(state.strokes[0]).toEqual(stroke)

    const saved = JSON.parse(localStorage.getItem('mindnotes-drawing-data') || '{}')
    expect(saved.strokes).toHaveLength(1)
  })

  it('should add shape', () => {
    const shape = {
      id: '1',
      type: 'rectangle' as const,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      color: '#000000',
      size: 4,
    }

    useDrawingStore.getState().addShape(shape)
    const state = useDrawingStore.getState()

    expect(state.shapes).toHaveLength(1)
    expect(state.shapes[0]).toEqual(shape)
  })

  it('should clear all and persist', () => {
    useDrawingStore.getState().addStroke({
      id: '1',
      points: [[0, 0]],
      color: '#000000',
      size: 4,
      tool: 'pen',
    })
    useDrawingStore.getState().clearAll()

    expect(useDrawingStore.getState().strokes).toHaveLength(0)
    expect(useDrawingStore.getState().shapes).toHaveLength(0)

    const saved = JSON.parse(localStorage.getItem('mindnotes-drawing-data') || '{}')
    expect(saved.strokes).toHaveLength(0)
  })

  it('should load data from external source', () => {
    const strokes = [
      { id: 'a', points: [[0, 0], [1, 1]], color: '#f00', size: 2, tool: 'pen' as const },
    ]
    const shapes = [
      { id: 'b', type: 'circle' as const, x: 0, y: 0, width: 50, height: 50, color: '#0f0', size: 4 },
    ]

    useDrawingStore.getState().loadData(strokes, shapes)
    const state = useDrawingStore.getState()

    expect(state.strokes).toHaveLength(1)
    expect(state.shapes).toHaveLength(1)
    expect(state.strokes[0].color).toBe('#f00')
  })
})
