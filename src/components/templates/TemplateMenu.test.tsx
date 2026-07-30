import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TemplateMenu from './TemplateMenu'
import { useAppStore } from '../../store/appStore'
import { createDefaultLayer } from '../../store/layers'
import { useViewStore } from '../../store/useViewStore'
import { getTemplateBounds } from '../../templates/canvasTemplates'
import { CANVAS_INVALIDATED_EVENT } from '../canvas/renderEvents'

vi.mock('../confirm-modal', () => ({
  useConfirm: () => vi.fn(async () => false),
}))

function resetStore() {
  const defaultLayer = createDefaultLayer(1)
  const state = useAppStore.getState()
  state.idToElement.clear()
  state.idToIndex.clear()
  state.spatialIndex.clear()
  useAppStore.setState({
    tool: 'pen',
    elements: [],
    layers: [defaultLayer],
    activeLayerId: defaultLayer.id,
    selectedIds: [],
    clipboard: [],
    undoStack: [],
    redoStack: [],
  })
  useViewStore.setState({ viewBox: { x: 0, y: 0, zoom: 1 } })
}

function attachCanvas() {
  const canvas = document.createElement('canvas')
  canvas.id = 'main-canvas'
  canvas.width = 1040
  canvas.height = 7580
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    x: 240,
    y: 0,
    left: 240,
    top: 0,
    right: 1280,
    bottom: 7580,
    width: 1040,
    height: 7580,
    toJSON: () => ({}),
  })
  document.body.appendChild(canvas)
}

describe('TemplateMenu', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    resetStore()
    attachCanvas()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('opens the template picker from a dedicated toolbar entry', () => {
    render(<TemplateMenu />)

    fireEvent.click(screen.getByRole('button', { name: '模板库' }))

    expect(screen.getByRole('dialog', { name: '模板库' })).toBeTruthy()
  })

  it('inserts a built-in template as immediately editable selected elements', () => {
    useViewStore.setState({ viewBox: { x: 100, y: 200, zoom: 2 } })
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    render(<TemplateMenu />)

    fireEvent.click(screen.getByRole('button', { name: '模板库' }))
    fireEvent.click(screen.getByRole('button', { name: '插入 流程图 模板' }))

    const state = useAppStore.getState()
    expect(state.elements.length).toBeGreaterThan(0)
    expect(state.tool).toBe('select')
    expect(state.selectedIds).toEqual(state.elements.map((element) => element.id))
    expect(state.elements.every((element) => !element.locked)).toBe(true)
    expect(state.undoStack[state.undoStack.length - 1]?.type).toBe('add')
    expect(useViewStore.getState().viewBox.zoom).not.toBe(2)
    expect(dispatchSpy.mock.calls.some(([event]) => event.type === CANVAS_INVALIDATED_EVENT)).toBe(
      true
    )
  })

  it('uses the visible browser viewport instead of oversized canvas dimensions for insertion', () => {
    render(<TemplateMenu />)

    fireEvent.click(screen.getByRole('button', { name: '模板库' }))
    fireEvent.click(screen.getByRole('button', { name: '插入 流程图 模板' }))

    const bounds = getTemplateBounds(useAppStore.getState().elements)
    if (!bounds) throw new Error('Expected inserted template bounds')
    expect(bounds.x + bounds.w / 2).toBeCloseTo(632 - 240, 5)
    expect(bounds.y + bounds.h / 2).toBeCloseTo(768 / 2, 5)
  })
})
