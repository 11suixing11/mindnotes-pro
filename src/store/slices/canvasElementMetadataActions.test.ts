import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasElement, CanvasLayer, ShapeElement, UndoAction } from '../types'
import { createCanvasElementMetadataActions } from './canvasElementMetadataActions'

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
  const set = vi.fn((patch: Partial<HarnessState>) => Object.assign(state, patch))
  const get = vi.fn(() => state)
  const synchronizeElementReferences = vi.fn()
  const actions = createCanvasElementMetadataActions({ set, get, synchronizeElementReferences })
  return { state, set, get, synchronizeElementReferences, actions }
}

describe('canvas element metadata actions', () => {
  beforeEach(() => {
    vi.mocked(incrementSaveGeneration).mockClear()
    vi.mocked(scheduleSave).mockClear()
    vi.spyOn(Date, 'now').mockReturnValue(1000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('groups editable selected elements and records one undo action', () => {
    const first = makeShape('first')
    const second = makeShape('second')
    const { state, synchronizeElementReferences, actions } = createHarness({
      elements: [first, second],
      selectedIds: [first.id, second.id],
    })

    actions.groupSelected()

    expect(state.elements.every((element) => element.groupId === 'group-1000')).toBe(true)
    expect(state.selectedIds).toEqual([first.id, second.id])
    expect(state.undoStack[state.undoStack.length - 1]?.type).toBe('group')
    expect(synchronizeElementReferences).toHaveBeenCalledOnce()
    expect(scheduleSave).toHaveBeenCalledOnce()
  })

  it('ungroups the selected group and preserves non-selected members', () => {
    const first = makeShape('first', { groupId: 'group-1' })
    const second = makeShape('second', { groupId: 'group-1' })
    const outsider = makeShape('outsider', { groupId: 'group-2' })
    const { state, actions } = createHarness({
      elements: [first, second, outsider],
      selectedIds: [first.id],
    })

    actions.ungroupSelected()

    expect(state.elements[0].groupId).toBeUndefined()
    expect(state.elements[1].groupId).toBeUndefined()
    expect(state.elements[2].groupId).toBe('group-2')
    expect(state.undoStack[state.undoStack.length - 1]?.type).toBe('ungroup')
  })

  it('locks and unlocks selected elements through explicit history actions', () => {
    const first = makeShape('first')
    const { state, actions } = createHarness({ elements: [first], selectedIds: [first.id] })

    actions.lockSelected()
    expect(state.elements[0].locked).toBe(true)
    expect(state.undoStack[state.undoStack.length - 1]?.type).toBe('lock')

    actions.unlockSelected()
    expect(state.elements[0].locked).toBe(false)
    expect(state.undoStack[state.undoStack.length - 1]?.type).toBe('unlock')
    expect(incrementSaveGeneration).toHaveBeenCalledTimes(2)
  })

  it('does not mutate metadata when selection is empty or the layer is not writable', () => {
    const lockedLayer: CanvasLayer = {
      id: 'layer-1',
      name: 'Layer 1',
      visible: true,
      locked: true,
      order: 0,
      createdAt: 1,
      updatedAt: 1,
    }
    const locked = makeShape('locked')
    const { state, actions } = createHarness({
      layers: [lockedLayer],
      elements: [locked],
      selectedIds: [locked.id],
    })

    actions.groupSelected()
    actions.ungroupSelected()
    actions.lockSelected()
    actions.unlockSelected()

    expect(state.elements[0]).toEqual(locked)
    expect(state.undoStack).toEqual([])
    expect(scheduleSave).not.toHaveBeenCalled()
  })
})
