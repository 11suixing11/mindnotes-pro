import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../appStore'
import { createDefaultLayer } from '../layers'
import type { CanvasLayer, ShapeElement } from '../types'

function shape(id: string, layerId: string, color = '#111111'): ShapeElement {
  return {
    type: 'shape',
    id,
    layerId,
    kind: 'rectangle',
    x: 20,
    y: 20,
    w: 20,
    h: 20,
    color,
    size: 2,
  }
}

function resetStore(elements: ShapeElement[], layers: CanvasLayer[], selectedIds: string[]) {
  const state = useAppStore.getState()
  state.idToElement.clear()
  state.idToIndex.clear()
  state.spatialIndex.clear()
  useAppStore.setState({
    elements,
    layers,
    activeLayerId: layers[0].id,
    selectedIds,
    undoStack: [],
    redoStack: [],
  })
}

describe('selection editing history', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('undoes and redoes one atomic selection style snapshot', () => {
    const layer = createDefaultLayer(1)
    const first = shape('style-first', layer.id)
    const second = shape('style-second', layer.id)
    resetStore([first, second], [layer], [first.id, second.id])

    const result = useAppStore.getState().applyStyleToSelected({
      color: '#ff0000',
      size: 4,
    })

    expect(result.status).toBe('applied')
    expect(useAppStore.getState().undoStack).toHaveLength(1)
    expect(
      useAppStore.getState().elements.map((element) => (element as ShapeElement).color)
    ).toEqual(['#ff0000', '#ff0000'])

    useAppStore.getState().undo()
    expect(
      useAppStore.getState().elements.map((element) => (element as ShapeElement).color)
    ).toEqual(['#111111', '#111111'])
    expect(useAppStore.getState().redoStack).toHaveLength(1)

    useAppStore.getState().redo()
    expect(
      useAppStore.getState().elements.map((element) => (element as ShapeElement).color)
    ).toEqual(['#ff0000', '#ff0000'])
  })

  it('undoes and redoes per-layer reorder snapshots without crossing layers', () => {
    const layerA = createDefaultLayer(1)
    const layerB: CanvasLayer = {
      ...createDefaultLayer(2),
      id: 'layer-b',
      name: '图层 2',
      order: 1,
    }
    const elements = [
      shape('a', layerA.id),
      shape('x', layerB.id),
      shape('b', layerA.id),
      shape('y', layerB.id),
      shape('c', layerA.id),
    ]
    resetStore(elements, [layerA, layerB], ['a', 'x'])

    const result = useAppStore.getState().reorderSelected('front')

    expect(result.status).toBe('applied')
    expect(useAppStore.getState().elements.map((element) => element.id)).toEqual([
      'b',
      'y',
      'c',
      'x',
      'a',
    ])
    expect(useAppStore.getState().undoStack).toHaveLength(1)

    useAppStore.getState().undo()
    expect(useAppStore.getState().elements.map((element) => element.id)).toEqual([
      'a',
      'x',
      'b',
      'y',
      'c',
    ])

    useAppStore.getState().redo()
    expect(useAppStore.getState().elements.map((element) => element.id)).toEqual([
      'b',
      'y',
      'c',
      'x',
      'a',
    ])
  })
})
