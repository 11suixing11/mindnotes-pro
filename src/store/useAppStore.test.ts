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

  it('should start stroke for eraser with expanded size and white color', () => {
    useAppStore.getState().setTool('eraser')
    useAppStore.getState().setColor('#123456')
    useAppStore.getState().setSize(5)

    useAppStore.getState().startStroke()
    const state = useAppStore.getState()

    expect(state.currentStroke).not.toBeNull()
    expect(state.currentStroke?.tool).toBe('eraser')
    expect(state.currentStroke?.color).toBe('#ffffff')
    expect(state.currentStroke?.size).toBe(10)
    expect(state.isDrawing).toBe(true)
  })

  it('should map non-drawing tool to pen when starting stroke', () => {
    useAppStore.getState().setTool('rectangle')
    useAppStore.getState().setColor('#abcdef')

    useAppStore.getState().startStroke()
    const state = useAppStore.getState()

    expect(state.currentStroke?.tool).toBe('pen')
    expect(state.currentStroke?.color).toBe('#abcdef')
  })

  it('should update current stroke points only when stroke exists', () => {
    useAppStore.getState().updateCurrentStroke([[1, 1]])
    expect(useAppStore.getState().currentStroke).toBeNull()

    useAppStore.getState().startStroke()
    useAppStore.getState().updateCurrentStroke([
      [0, 0],
      [2, 2],
    ])

    expect(useAppStore.getState().currentStroke?.points).toEqual([
      [0, 0],
      [2, 2],
    ])
  })

  it('should manage guidelines and grid toggles', () => {
    useAppStore.getState().setGuideLines([{ type: 'horizontal', position: 100 }])
    expect(useAppStore.getState().guideLines).toEqual([{ type: 'horizontal', position: 100 }])

    useAppStore.getState().clearGuideLines()
    expect(useAppStore.getState().guideLines).toBeNull()
  })

  it('should lock and hide target layers for both strokes and shapes', () => {
    const stroke = {
      id: 'stroke-lock',
      points: [[0, 0]],
      color: '#000000',
      size: 4,
      tool: 'pen' as const,
    }
    const shape = {
      id: 'shape-lock',
      type: 'rectangle' as const,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      color: '#000000',
      size: 2,
    }

    useAppStore.getState().addStroke(stroke)
    useAppStore.getState().addShape(shape)

    useAppStore.getState().toggleLayerLock('stroke-lock')
    useAppStore.getState().toggleLayerHidden('stroke-lock')
    useAppStore.getState().toggleLayerLock('shape-lock')
    useAppStore.getState().toggleLayerHidden('shape-lock')

    const state = useAppStore.getState()
    expect(state.strokes[0].locked).toBe(true)
    expect(state.strokes[0].hidden).toBe(true)
    expect(state.shapes[0].locked).toBe(true)
    expect(state.shapes[0].hidden).toBe(true)
  })

  it('should clear selected layer when deleting selected id', () => {
    const stroke = {
      id: 'selected-layer',
      points: [[0, 0]],
      color: '#000000',
      size: 4,
      tool: 'pen' as const,
    }

    useAppStore.getState().addStroke(stroke)
    useAppStore.getState().setSelectedLayer('selected-layer')
    useAppStore.getState().deleteLayer('selected-layer')

    expect(useAppStore.getState().selectedLayerId).toBeNull()
  })

  it('should start and update shape only when current shape exists', () => {
    useAppStore.getState().updateCurrentShape({ width: 20 })
    expect(useAppStore.getState().currentShape).toBeNull()

    useAppStore.getState().startShape('arrow')
    useAppStore.getState().updateCurrentShape({ width: 20, height: 30 })

    const shape = useAppStore.getState().currentShape
    expect(shape?.type).toBe('arrow')
    expect(shape?.width).toBe(20)
    expect(shape?.height).toBe(30)
    expect(shape?.startX).toBe(0)
    expect(shape?.endY).toBe(0)
  })

  it('should clamp zoom in and zoom out bounds', () => {
    for (let i = 0; i < 20; i += 1) {
      useAppStore.getState().zoomIn()
    }
    expect(useAppStore.getState().viewBox.zoom).toBe(5)

    for (let i = 0; i < 40; i += 1) {
      useAppStore.getState().zoomOut()
    }
    expect(useAppStore.getState().viewBox.zoom).toBe(0.1)
  })

  it('should update undo and redo flags across history operations', () => {
    const stroke1 = {
      id: 'undo-1',
      points: [[0, 0]],
      color: '#000000',
      size: 4,
      tool: 'pen' as const,
    }
    const stroke2 = {
      id: 'undo-2',
      points: [[1, 1]],
      color: '#000000',
      size: 4,
      tool: 'pen' as const,
    }

    useAppStore.getState().addStroke(stroke1)
    useAppStore.getState().addStroke(stroke2)
    useAppStore.getState().undo()

    expect(useAppStore.getState().strokes).toHaveLength(1)
    expect(useAppStore.getState().canUndo).toBe(true)
    expect(useAppStore.getState().canRedo).toBe(true)

    useAppStore.getState().undo()
    expect(useAppStore.getState().canUndo).toBe(false)

    useAppStore.getState().redo()
    expect(useAppStore.getState().canRedo).toBe(false)
  })

  it('should execute placeholder layer move handlers without side effects', () => {
    useAppStore.getState().moveLayerUp('x')
    useAppStore.getState().moveLayerDown('x')
    expect(useAppStore.getState().strokes).toEqual([])
  })
})
