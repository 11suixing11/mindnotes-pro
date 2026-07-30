import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LayersPanel from './LayersPanel'
import { useAppStore } from '../../store/appStore'
import { createDefaultLayer } from '../../store/layers'

function resetStore() {
  const defaultLayer = createDefaultLayer(1)
  const state = useAppStore.getState()
  state.idToElement.clear()
  state.idToIndex.clear()
  state.spatialIndex.clear()
  useAppStore.setState({
    elements: [],
    layers: [defaultLayer],
    activeLayerId: defaultLayer.id,
    selectedIds: [],
    clipboard: [],
    undoStack: [],
    redoStack: [],
  })
}

function addShape(id: string) {
  useAppStore.getState().addElement({
    type: 'shape',
    id,
    kind: 'rectangle',
    x: 0,
    y: 0,
    w: 10,
    h: 10,
    color: '#000',
    size: 2,
  })
}

function expandLayers() {
  fireEvent.click(screen.getByRole('button', { name: '展开图层' }))
}

describe('LayersPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetStore()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders the default layer and creates a new layer', () => {
    render(<LayersPanel />)
    expandLayers()

    expect(screen.getByText('图层 1')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '新建图层' }))

    expect(screen.getByText('图层 2')).toBeTruthy()
    expect(useAppStore.getState().activeLayerId).toBe(useAppStore.getState().layers[1].id)
  })

  it('renames a layer inline', () => {
    render(<LayersPanel />)
    expandLayers()

    fireEvent.click(screen.getByRole('button', { name: '重命名 图层 1' }))
    const input = screen.getByRole('textbox', { name: '重命名 图层 1' })
    fireEvent.change(input, { target: { value: 'Research' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText('Research')).toBeTruthy()
    expect(useAppStore.getState().layers[0].name).toBe('Research')
  })

  it('hides a layer and clears selected elements on that layer', () => {
    const layerId = useAppStore.getState().createLayer('Notes')
    addShape('sh1')
    useAppStore.setState({ selectedIds: ['sh1'] })

    render(<LayersPanel />)
    expandLayers()
    fireEvent.click(screen.getByRole('button', { name: '隐藏 Notes' }))

    expect(useAppStore.getState().layers.find((layer) => layer.id === layerId)?.visible).toBe(false)
    expect(useAppStore.getState().selectedIds).toEqual([])
  })

  it('locks a layer and moves active layer to the next writable layer', () => {
    const defaultLayerId = useAppStore.getState().layers[0].id
    const layerId = useAppStore.getState().createLayer('Ink')

    render(<LayersPanel />)
    expandLayers()
    fireEvent.click(screen.getByRole('button', { name: '锁定 Ink' }))

    expect(useAppStore.getState().layers.find((layer) => layer.id === layerId)?.locked).toBe(true)
    expect(useAppStore.getState().activeLayerId).toBe(defaultLayerId)
  })

  it('moves selected elements to another layer', () => {
    useAppStore.getState().createLayer('Source')
    addShape('sh1')
    const targetLayerId = useAppStore.getState().createLayer('Target')
    useAppStore.setState({ selectedIds: ['sh1'] })

    render(<LayersPanel />)
    expandLayers()
    fireEvent.click(screen.getByRole('button', { name: '将所选元素移到 Target' }))

    expect(useAppStore.getState().elements[0].layerId).toBe(targetLayerId)
  })
})
