import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from './useAppStore'

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      strokes: [],
      currentStroke: null,
      shapes: [],
      currentShape: null,
      tool: 'pen',
      color: '#000000',
      size: 4,
      viewBox: { x: 0, y: 0, zoom: 1 },
      showGuides: true,
      snapToGrid: false,
      gridSize: 20,
      guideLines: null,
      selectedLayerId: null,
      showLayersPanel: false,
      isDrawing: false,
      canUndo: false,
      canRedo: false,
    })
  })

  it('should initialize with correct default state', () => {
    const state = useAppStore.getState()

    expect(state.strokes).toEqual([])
    expect(state.currentStroke).toBeNull()
    expect(state.shapes).toEqual([])
    expect(state.tool).toBe('pen')
    expect(state.color).toBe('#000000')
    expect(state.size).toBe(4)
    expect(state.viewBox.zoom).toBe(1)
  })

  it('should set tool correctly', () => {
    useAppStore.getState().setTool('eraser')
    expect(useAppStore.getState().tool).toBe('eraser')

    useAppStore.getState().setTool('rectangle')
    expect(useAppStore.getState().tool).toBe('rectangle')
  })

  it('should set color correctly', () => {
    useAppStore.getState().setColor('#FF0000')
    expect(useAppStore.getState().color).toBe('#FF0000')
  })

  it('should set size correctly', () => {
    useAppStore.getState().setSize(8)
    expect(useAppStore.getState().size).toBe(8)
  })

  it('should add stroke', () => {
    const stroke = {
      id: '1',
      points: [[0, 0], [1, 1]],
      color: '#000000',
      size: 4,
      tool: 'pen' as const,
    }

    useAppStore.getState().addStroke(stroke)
    const state = useAppStore.getState()

    expect(state.strokes).toHaveLength(1)
    expect(state.strokes[0]).toEqual(stroke)
    expect(state.canUndo).toBe(true)
  })

  it('should clear strokes', () => {
    const stroke = {
      id: '1',
      points: [[0, 0]],
      color: '#000000',
      size: 4,
      tool: 'pen' as const,
    }

    useAppStore.getState().addStroke(stroke)
    expect(useAppStore.getState().strokes).toHaveLength(1)

    useAppStore.getState().clearStrokes()
    expect(useAppStore.getState().strokes).toEqual([])
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
      size: 2,
    }

    useAppStore.getState().addShape(shape)
    const state = useAppStore.getState()

    expect(state.shapes).toHaveLength(1)
    expect(state.shapes[0]).toEqual(shape)
    expect(state.canUndo).toBe(true)
  })

  it('should zoom in', () => {
    useAppStore.getState().zoomIn()
    const zoom = useAppStore.getState().viewBox.zoom
    expect(zoom).toBeCloseTo(1.2, 1)
  })

  it('should zoom out', () => {
    useAppStore.getState().zoomIn()
    useAppStore.getState().zoomOut()
    const zoom = useAppStore.getState().viewBox.zoom
    expect(zoom).toBeCloseTo(1.0, 1)
  })

  it('should reset view', () => {
    useAppStore.getState().setViewBox({ x: 100, y: 100, zoom: 2 })
    useAppStore.getState().resetView()

    const viewBox = useAppStore.getState().viewBox
    expect(viewBox.x).toBe(0)
    expect(viewBox.y).toBe(0)
    expect(viewBox.zoom).toBe(1)
  })

  it('should toggle guides', () => {
    const initial = useAppStore.getState().showGuides
    useAppStore.getState().toggleShowGuides()
    expect(useAppStore.getState().showGuides).toBe(!initial)
  })

  it('should toggle snap to grid', () => {
    const initial = useAppStore.getState().snapToGrid
    useAppStore.getState().toggleSnapToGrid()
    expect(useAppStore.getState().snapToGrid).toBe(!initial)
  })

  it('should select layer', () => {
    useAppStore.getState().setSelectedLayer('layer-1')
    expect(useAppStore.getState().selectedLayerId).toBe('layer-1')

    useAppStore.getState().setSelectedLayer(null)
    expect(useAppStore.getState().selectedLayerId).toBeNull()
  })

  it('should toggle layers panel', () => {
    const initial = useAppStore.getState().showLayersPanel
    useAppStore.getState().toggleLayersPanel()
    expect(useAppStore.getState().showLayersPanel).toBe(!initial)
  })

  it('should delete layer', () => {
    const stroke = {
      id: 'stroke-1',
      points: [[0, 0]],
      color: '#000000',
      size: 4,
      tool: 'pen' as const,
    }

    useAppStore.getState().addStroke(stroke)
    expect(useAppStore.getState().strokes).toHaveLength(1)

    useAppStore.getState().deleteLayer('stroke-1')
    expect(useAppStore.getState().strokes).toHaveLength(0)
  })

  it('should clear all layers', () => {
    const stroke = {
      id: '1',
      points: [[0, 0]],
      color: '#000000',
      size: 4,
      tool: 'pen' as const,
    }

    const shape = {
      id: '1',
      type: 'rectangle' as const,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      color: '#000000',
      size: 2,
    }

    useAppStore.getState().addStroke(stroke)
    useAppStore.getState().addShape(shape)

    expect(useAppStore.getState().strokes).toHaveLength(1)
    expect(useAppStore.getState().shapes).toHaveLength(1)

    useAppStore.getState().clearAllLayers()

    expect(useAppStore.getState().strokes).toEqual([])
    expect(useAppStore.getState().shapes).toEqual([])
  })
})
