import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasElement, CanvasLayer, ShapeElement, UndoAction } from '../types'
import { createCanvasElementMutationActions } from './canvasElementMutationActions'

vi.mock('../saveManager', () => ({
  incrementSaveGeneration: vi.fn(),
  scheduleSave: vi.fn(),
}))

const { incrementSaveGeneration, scheduleSave } = await import('../saveManager')

function makeShape(id: string, overrides: Partial<ShapeElement> = {}): ShapeElement {
  return {
    type: 'shape',
    id,
    layerId: 'layer-1',
    kind: 'rectangle',
    x: 0,
    y: 0,
    w: 20,
    h: 20,
    color: '#000000',
    size: 2,
    ...overrides,
  }
}

interface HarnessState {
  elements: CanvasElement[]
  layers: CanvasLayer[]
  activeLayerId: string
  selectedIds: string[]
  idToElement: Map<string, CanvasElement>
  idToIndex: Map<string, number>
  undoStack: UndoAction[]
  redoStack: UndoAction[]
}

function createHarness(initial: Partial<HarnessState> = {}) {
  const layer: CanvasLayer = {
    id: 'layer-1',
    name: 'Layer 1',
    visible: true,
    locked: false,
    order: 0,
    createdAt: 1,
    updatedAt: 1,
  }
  const state: HarnessState = {
    elements: [],
    layers: [layer],
    activeLayerId: layer.id,
    selectedIds: [],
    idToElement: new Map(),
    idToIndex: new Map(),
    undoStack: [],
    redoStack: [],
    ...initial,
  }
  state.idToElement = new Map(state.elements.map((element) => [element.id, element]))
  state.idToIndex = new Map(state.elements.map((element, index) => [element.id, index]))
  const set = vi.fn((patch: Partial<HarnessState>) => Object.assign(state, patch))
  const get = vi.fn(() => state)
  const context = {
    set,
    get,
    rebuildIndexIfNeeded: vi.fn(),
    appendElementCollection: vi.fn(),
    synchronizeElementReplacement: vi.fn(),
    removeElementCollection: vi.fn(),
    replaceElementCollection: vi.fn(),
    markIndexDirty: vi.fn(),
  }
  const actions = createCanvasElementMutationActions(context)
  return { state, context, actions }
}

describe('canvas element mutation actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds elements to the writable layer with one history action', () => {
    const { state, context, actions } = createHarness()

    actions.addElements([makeShape('first', { layerId: undefined }), makeShape('second')])

    expect(state.elements.map((element) => element.layerId)).toEqual(['layer-1', 'layer-1'])
    expect(state.undoStack[state.undoStack.length - 1]?.type).toBe('add')
    expect(context.appendElementCollection).toHaveBeenCalledWith(
      state.elements,
      0,
      expect.anything()
    )
    expect(scheduleSave).toHaveBeenCalledOnce()
  })

  it('updates an editable element and synchronizes its runtime replacement', () => {
    const shape = makeShape('shape-1')
    const { state, context, actions } = createHarness({ elements: [shape] })

    actions.updateElement(shape.id, (element) => ({ ...element, locked: true }))

    expect(state.elements[0].locked).toBe(true)
    expect(context.rebuildIndexIfNeeded).toHaveBeenCalledOnce()
    expect(context.synchronizeElementReplacement).toHaveBeenCalledWith(
      state.elements,
      0,
      shape.id,
      expect.anything()
    )
  })

  it('removes only editable elements and marks indexes dirty', () => {
    const editable = makeShape('editable')
    const locked = makeShape('locked', { locked: true })
    const { state, context, actions } = createHarness({
      elements: [editable, locked],
      selectedIds: [editable.id, locked.id],
    })

    actions.removeElements([editable.id, locked.id])

    expect(state.elements).toEqual([locked])
    expect(state.selectedIds).toEqual([])
    expect(context.removeElementCollection).toHaveBeenCalledWith([editable.id], expect.anything())
    expect(context.markIndexDirty).toHaveBeenCalledOnce()
  })

  it('clears the collection and records an exact snapshot', () => {
    const shape = makeShape('shape-1')
    const { state, context, actions } = createHarness({
      elements: [shape],
      selectedIds: [shape.id],
    })

    actions.clearAll()

    expect(state.elements).toEqual([])
    expect(state.selectedIds).toEqual([])
    expect(state.undoStack[state.undoStack.length - 1]).toEqual(
      expect.objectContaining({ type: 'clear' })
    )
    expect(context.replaceElementCollection).toHaveBeenCalledWith([], expect.anything())
    expect(incrementSaveGeneration).toHaveBeenCalledOnce()
  })
})
