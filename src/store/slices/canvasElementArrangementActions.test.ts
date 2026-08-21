import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasElement, CanvasLayer, ShapeElement, UndoAction } from '../types'
import { createCanvasElementArrangementActions } from './canvasElementArrangementActions'

vi.mock('../saveManager', () => ({
  incrementSaveGeneration: vi.fn(),
  scheduleSave: vi.fn(),
}))

const { incrementSaveGeneration, scheduleSave } = await import('../saveManager')

function makeShape(id: string, x: number, overrides: Partial<ShapeElement> = {}): ShapeElement {
  return {
    type: 'shape',
    id,
    layerId: 'layer-1',
    kind: 'rectangle',
    x,
    y: 0,
    w: 10,
    h: 10,
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
  const synchronizeElementGeometry = vi.fn()
  const actions = createCanvasElementArrangementActions({ set, get, synchronizeElementGeometry })
  return { state, synchronizeElementGeometry, actions }
}

describe('canvas element arrangement actions', () => {
  beforeEach(() => {
    vi.mocked(incrementSaveGeneration).mockClear()
    vi.mocked(scheduleSave).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('aligns editable selected elements and records a snapshot', () => {
    const left = makeShape('left', 0)
    const right = makeShape('right', 80)
    const { state, synchronizeElementGeometry, actions } = createHarness({
      elements: [left, right],
      selectedIds: [left.id, right.id],
    })

    actions.alignSelected('alignLeft')

    expect((state.elements[1] as ShapeElement).x).toBe(0)
    expect(state.undoStack[state.undoStack.length - 1]?.type).toBe('snapshot')
    expect(synchronizeElementGeometry).toHaveBeenCalledWith(
      state.elements,
      [left.id, right.id],
      expect.anything()
    )
    expect(scheduleSave).toHaveBeenCalledOnce()
  })

  it('distributes three editable elements and filters locked selections', () => {
    const left = makeShape('left', 0)
    const middle = makeShape('middle', 30)
    const right = makeShape('right', 100, { locked: true })
    const { state, actions } = createHarness({
      elements: [left, middle, right],
      selectedIds: [left.id, middle.id, right.id],
    })

    actions.distributeSelected('distributeH')

    expect(state.elements.map((element) => (element as ShapeElement).x)).toEqual([0, 30, 100])
    expect(state.undoStack).toEqual([])
    expect(scheduleSave).not.toHaveBeenCalled()
  })

  it('skips commands with too few editable selections or no geometry change', () => {
    const first = makeShape('first', 0)
    const second = makeShape('second', 0)
    const { state, actions } = createHarness({
      elements: [first, second],
      selectedIds: [first.id, second.id],
    })

    actions.alignSelected('alignLeft')
    actions.distributeSelected('distributeH')

    expect(state.undoStack).toEqual([])
    expect(incrementSaveGeneration).not.toHaveBeenCalled()
    expect(scheduleSave).not.toHaveBeenCalled()
  })
})
