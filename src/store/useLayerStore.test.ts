import { describe, it, expect, beforeEach } from 'vitest'
import { useLayerStore } from './useLayerStore'

describe('useLayerStore', () => {
  beforeEach(() => {
    useLayerStore.setState({
      layers: [],
      selectedLayerId: null,
      showLayersPanel: false,
    })
  })

  it('should initialize with correct default state', () => {
    const state = useLayerStore.getState()

    expect(state.layers).toEqual([])
    expect(state.selectedLayerId).toBeNull()
    expect(state.showLayersPanel).toBe(false)
  })

  it('should add layer', () => {
    const layer = {
      id: '1',
      name: 'Layer 1',
      type: 'strokes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 0,
    }

    useLayerStore.getState().addLayer(layer)
    const state = useLayerStore.getState()

    expect(state.layers).toHaveLength(1)
    expect(state.layers[0]).toEqual(layer)
  })

  it('should remove layer', () => {
    const layer1 = {
      id: '1',
      name: 'Layer 1',
      type: 'strokes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 0,
    }

    const layer2 = {
      id: '2',
      name: 'Layer 2',
      type: 'shapes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 1,
    }

    useLayerStore.getState().addLayer(layer1)
    useLayerStore.getState().addLayer(layer2)
    useLayerStore.getState().removeLayer('1')

    const state = useLayerStore.getState()
    expect(state.layers).toHaveLength(1)
    expect(state.layers[0].id).toBe('2')
  })

  it('should clear selected layer when deleting selected id', () => {
    const layer = {
      id: '1',
      name: 'Layer 1',
      type: 'strokes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 0,
    }

    useLayerStore.getState().addLayer(layer)
    useLayerStore.getState().setSelectedLayer('1')
    useLayerStore.getState().removeLayer('1')

    const state = useLayerStore.getState()
    expect(state.selectedLayerId).toBeNull()
  })

  it('should update layer', () => {
    const layer = {
      id: '1',
      name: 'Layer 1',
      type: 'strokes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 0,
    }

    useLayerStore.getState().addLayer(layer)
    useLayerStore.getState().updateLayer('1', { name: 'Updated Layer' })

    const state = useLayerStore.getState()
    expect(state.layers[0].name).toBe('Updated Layer')
  })

  it('should set selected layer', () => {
    useLayerStore.getState().setSelectedLayer('1')
    expect(useLayerStore.getState().selectedLayerId).toBe('1')
  })

  it('should toggle layers panel', () => {
    useLayerStore.getState().toggleLayersPanel()
    expect(useLayerStore.getState().showLayersPanel).toBe(true)

    useLayerStore.getState().toggleLayersPanel()
    expect(useLayerStore.getState().showLayersPanel).toBe(false)
  })

  it('should toggle layer lock', () => {
    const layer = {
      id: '1',
      name: 'Layer 1',
      type: 'strokes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 0,
    }

    useLayerStore.getState().addLayer(layer)
    useLayerStore.getState().toggleLayerLock('1')

    expect(useLayerStore.getState().layers[0].locked).toBe(true)
  })

  it('should toggle layer hidden', () => {
    const layer = {
      id: '1',
      name: 'Layer 1',
      type: 'strokes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 0,
    }

    useLayerStore.getState().addLayer(layer)
    useLayerStore.getState().toggleLayerHidden('1')

    expect(useLayerStore.getState().layers[0].visible).toBe(false)
  })

  it('should move layer up', () => {
    const layer1 = {
      id: '1',
      name: 'Layer 1',
      type: 'strokes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 0,
    }

    const layer2 = {
      id: '2',
      name: 'Layer 2',
      type: 'shapes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 1,
    }

    useLayerStore.getState().addLayer(layer1)
    useLayerStore.getState().addLayer(layer2)
    useLayerStore.getState().moveLayerUp('1')

    const state = useLayerStore.getState()
    expect(state.layers[0].id).toBe('2')
    expect(state.layers[1].id).toBe('1')
  })

  it('should move layer down', () => {
    const layer1 = {
      id: '1',
      name: 'Layer 1',
      type: 'strokes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 0,
    }

    const layer2 = {
      id: '2',
      name: 'Layer 2',
      type: 'shapes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 1,
    }

    useLayerStore.getState().addLayer(layer1)
    useLayerStore.getState().addLayer(layer2)
    useLayerStore.getState().moveLayerDown('2')

    const state = useLayerStore.getState()
    expect(state.layers[0].id).toBe('2')
    expect(state.layers[1].id).toBe('1')
  })

  it('should not move layer up if it is the top layer', () => {
    const layer = {
      id: '1',
      name: 'Layer 1',
      type: 'strokes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 0,
    }

    useLayerStore.getState().addLayer(layer)
    useLayerStore.getState().moveLayerUp('1')

    const state = useLayerStore.getState()
    expect(state.layers).toHaveLength(1)
  })

  it('should not move layer down if it is the bottom layer', () => {
    const layer = {
      id: '1',
      name: 'Layer 1',
      type: 'strokes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 0,
    }

    useLayerStore.getState().addLayer(layer)
    useLayerStore.getState().moveLayerDown('1')

    const state = useLayerStore.getState()
    expect(state.layers).toHaveLength(1)
  })

  it('should reorder layers', () => {
    const layer1 = {
      id: '1',
      name: 'Layer 1',
      type: 'strokes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 0,
    }

    const layer2 = {
      id: '2',
      name: 'Layer 2',
      type: 'shapes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 1,
    }

    useLayerStore.getState().addLayer(layer1)
    useLayerStore.getState().addLayer(layer2)
    useLayerStore.getState().reorderLayers(['2', '1'])

    const state = useLayerStore.getState()
    expect(state.layers[0].id).toBe('2')
    expect(state.layers[1].id).toBe('1')
  })

  it('should delete layer', () => {
    const layer = {
      id: '1',
      name: 'Layer 1',
      type: 'strokes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 0,
    }

    useLayerStore.getState().addLayer(layer)
    useLayerStore.getState().removeLayer('1')

    expect(useLayerStore.getState().layers).toHaveLength(0)
  })

  it('should clear all layers', () => {
    const layer1 = {
      id: '1',
      name: 'Layer 1',
      type: 'strokes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 0,
    }

    const layer2 = {
      id: '2',
      name: 'Layer 2',
      type: 'shapes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 1,
    }

    useLayerStore.getState().addLayer(layer1)
    useLayerStore.getState().addLayer(layer2)

    // Clear all by removing one by one
    const state = useLayerStore.getState()
    state.layers.forEach(layer => {
      useLayerStore.getState().removeLayer(layer.id)
    })

    expect(useLayerStore.getState().layers).toHaveLength(0)
  })

  it('should lock and hide target layers for both strokes and shapes', () => {
    const strokeLayer = {
      id: '1',
      name: 'Strokes',
      type: 'strokes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 0,
    }

    const shapeLayer = {
      id: '2',
      name: 'Shapes',
      type: 'shapes' as const,
      visible: true,
      locked: false,
      opacity: 1,
      order: 1,
    }

    useLayerStore.getState().addLayer(strokeLayer)
    useLayerStore.getState().addLayer(shapeLayer)

    // Lock and hide stroke layer
    useLayerStore.getState().toggleLayerLock('1')
    useLayerStore.getState().toggleLayerHidden('1')

    const state = useLayerStore.getState()
    expect(state.layers.find(l => l.id === '1')?.locked).toBe(true)
    expect(state.layers.find(l => l.id === '1')?.visible).toBe(false)

    // Shape layer should be unchanged
    expect(state.layers.find(l => l.id === '2')?.locked).toBe(false)
    expect(state.layers.find(l => l.id === '2')?.visible).toBe(true)
  })
})
