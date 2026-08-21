import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasElement, CanvasLayer, ShapeElement, UndoAction } from '../types'
import { createCanvasElementGeometryActions } from './canvasElementGeometryActions'

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
    synchronizeElementGeometry: vi.fn(),
  }
  const actions = createCanvasElementGeometryActions(context)
  return { state, context, actions }
}

describe('canvas element geometry actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('moves an editable element and synchronizes all affected geometry', () => {
    const shape = makeShape('shape-1', { x: 10, y: 20 })
    const { state, context, actions } = createHarness({ elements: [shape] })

    actions.moveElementById(shape.id, 5, 10)

    expect(state.elements[0]).toEqual(expect.objectContaining({ x: 15, y: 30 }))
    expect(context.rebuildIndexIfNeeded).toHaveBeenCalledOnce()
    expect(context.synchronizeElementGeometry).toHaveBeenCalledWith(
      state.elements,
      [shape.id],
      expect.anything()
    )
    expect(scheduleSave).toHaveBeenCalledOnce()
  })

  it('records one history action for a multi-element move', () => {
    const first = makeShape('first')
    const second = makeShape('second', { x: 40 })
    const { state, actions } = createHarness({ elements: [first, second] })

    actions.moveElementsById([first.id, second.id], 10, 5)

    expect(state.elements.map((element) => (element as ShapeElement).x)).toEqual([10, 50])
    expect(state.undoStack[state.undoStack.length - 1]?.type).toBe('move')
  })

  it('resizes and rotates editable geometry without adding history', () => {
    const shape = makeShape('shape-1')
    const { state, actions } = createHarness({ elements: [shape] })

    actions.resizeElementById(shape.id, 0, 0, 2, 1)
    expect((state.elements[0] as ShapeElement).w).toBe(40)

    actions.rotateElementById(shape.id, Math.PI / 4)
    expect(state.elements[0].rotation).toBe(Math.PI / 4)
    expect(state.undoStack).toEqual([])
  })

  it('filters locked elements and skips negligible deltas', () => {
    const locked = makeShape('locked', { locked: true })
    const { state, actions } = createHarness({ elements: [locked] })

    actions.moveElementById(locked.id, 20, 20)
    actions.moveElementsById([locked.id], 20, 20)
    actions.resizeElementById(locked.id, 0, 0, 1, 1)
    actions.rotateElementsById([locked.id], Math.PI / 2)

    expect(state.elements[0]).toEqual(locked)
    expect(scheduleSave).not.toHaveBeenCalled()
    expect(incrementSaveGeneration).toHaveBeenCalledTimes(3)
  })
})
