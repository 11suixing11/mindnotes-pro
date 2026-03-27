import { describe, it, expect, beforeEach } from 'vitest'
import { useDrawingStore } from './useDrawingStore'

describe('useDrawingStore', () => {
  beforeEach(() => {
    useDrawingStore.setState({
      strokes: [],
      currentStroke: null,
      shapes: [],
      currentShape: null,
      tool: 'pen',
      color: '#000000',
      size: 4,
      isDrawing: false,
    })
  })

  it('should initialize with correct default state', () => {
    const state = useDrawingStore.getState()

    expect(state.strokes).toEqual([])
    expect(state.currentStroke).toBeNull()
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

  it('should add stroke', () => {
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
    expect(state.currentStroke).toBeNull()
  })

  it('should clear strokes', () => {
    const stroke = {
      id: '1',
      points: [[0, 0]],
      color: '#000000',
      size: 4,
      tool: 'pen' as const,
    }

    useDrawingStore.getState().addStroke(stroke)
    useDrawingStore.getState().clearStrokes()

    const state = useDrawingStore.getState()
    expect(state.strokes).toHaveLength(0)
    expect(state.currentStroke).toBeNull()
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

  it('should start stroke and set isDrawing to true', () => {
    useDrawingStore.getState().startStroke()
    const state = useDrawingStore.getState()

    expect(state.isDrawing).toBe(true)
    expect(state.currentStroke).not.toBeNull()
    expect(state.currentStroke?.points).toEqual([])
  })

  it('should start shape with correct type', () => {
    useDrawingStore.getState().startShape('circle')
    const state = useDrawingStore.getState()

    expect(state.currentShape).not.toBeNull()
    expect(state.currentShape?.type).toBe('circle')
  })

  it('should update current stroke points only when stroke exists', () => {
    const points = [[0, 0], [1, 1], [2, 2]]

    // Should not update when currentStroke is null
    useDrawingStore.getState().updateCurrentStroke(points)
    expect(useDrawingStore.getState().currentStroke).toBeNull()

    // Should update when currentStroke exists
    useDrawingStore.getState().startStroke()
    useDrawingStore.getState().updateCurrentStroke(points)
    expect(useDrawingStore.getState().currentStroke?.points).toEqual(points)
  })

  it('should update current shape only when shape exists', () => {
    const updates = { x: 50, y: 50, width: 150 }

    // Should not update when currentShape is null
    useDrawingStore.getState().updateCurrentShape(updates)
    expect(useDrawingStore.getState().currentShape).toBeNull()

    // Should update when currentShape exists
    useDrawingStore.getState().startShape('rectangle')
    useDrawingStore.getState().updateCurrentShape(updates)
    const shape = useDrawingStore.getState().currentShape
    expect(shape?.x).toBe(50)
    expect(shape?.y).toBe(50)
    expect(shape?.width).toBe(150)
  })
})
