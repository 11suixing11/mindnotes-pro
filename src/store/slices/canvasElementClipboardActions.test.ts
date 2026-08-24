import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasElement, CanvasLayer, ShapeElement, StrokeElement, UndoAction } from '../types'
import { createCanvasElementClipboardActions } from './canvasElementClipboardActions'

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
    x: 10,
    y: 20,
    w: 30,
    h: 40,
    color: '#000000',
    size: 2,
    ...overrides,
  }
}

function makeStroke(id: string): StrokeElement {
  return {
    type: 'stroke',
    id,
    layerId: 'layer-1',
    points: [
      [0, 0],
      [10, 10],
    ],
    pressures: [0.2, 0.8],
    color: '#000000',
    size: 2,
    brush: 'pen',
  }
}

interface HarnessState {
  elements: CanvasElement[]
  layers: CanvasLayer[]
  activeLayerId: string
  selectedIds: string[]
  clipboard: CanvasElement[]
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
    clipboard: [],
    idToElement: new Map(),
    idToIndex: new Map(),
    undoStack: [],
    redoStack: [],
    ...initial,
  }
  state.idToElement = new Map(state.elements.map((element) => [element.id, element]))
  const set = vi.fn((patch: Partial<HarnessState>) => Object.assign(state, patch))
  const get = vi.fn(() => state)
  const appendElementCollection = vi.fn()
  const actions = createCanvasElementClipboardActions({ set, get, appendElementCollection })
  return { state, set, get, appendElementCollection, actions }
}

describe('canvas element clipboard actions', () => {
  beforeEach(() => {
    vi.mocked(incrementSaveGeneration).mockClear()
    vi.mocked(scheduleSave).mockClear()
    vi.spyOn(Date, 'now').mockReturnValue(1000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('copies selected elements as independent clipboard snapshots', () => {
    const source = makeStroke('stroke-1')
    const { state, actions } = createHarness({ elements: [source], selectedIds: [source.id] })

    actions.copySelected()

    expect(state.clipboard).toHaveLength(1)
    expect(state.clipboard[0]).not.toBe(source)
    expect((state.clipboard[0] as StrokeElement).points).not.toBe(source.points)
    expect((state.clipboard[0] as StrokeElement).pressures).not.toBe(source.pressures)
    expect(incrementSaveGeneration).not.toHaveBeenCalled()
  })

  it('pastes offset copies, selects them, and appends them to runtime indexes', () => {
    const source = makeShape('shape-1')
    const { state, appendElementCollection, actions } = createHarness({ clipboard: [source] })

    actions.paste()

    expect(state.elements).toHaveLength(1)
    expect(state.elements[0].id).not.toBe(source.id)
    expect((state.elements[0] as ShapeElement).x).toBe(30)
    expect((state.elements[0] as ShapeElement).y).toBe(40)
    expect(state.selectedIds).toEqual([state.elements[0].id])
    expect(state.clipboard[0]).not.toBe(state.elements[0])
    expect(appendElementCollection).toHaveBeenCalledWith([state.elements[0]], 0, expect.anything())
    expect(incrementSaveGeneration).toHaveBeenCalledOnce()
    expect(scheduleSave).toHaveBeenCalledOnce()
  })

  it('duplicates only editable selected elements', () => {
    const editable = makeShape('editable')
    const locked = makeShape('locked', { locked: true })
    const { state, actions } = createHarness({
      elements: [editable, locked],
      selectedIds: [editable.id, locked.id],
    })

    actions.duplicateSelected()

    expect(state.elements).toHaveLength(3)
    expect(state.elements.map((element) => element.id)).toEqual([
      editable.id,
      locked.id,
      expect.any(String),
    ])
    expect(state.selectedIds).toHaveLength(1)
    expect(state.selectedIds[0]).not.toBe(editable.id)
  })

  it('does nothing when no source is available', () => {
    const { state, actions } = createHarness()

    actions.copySelected()
    actions.paste()
    actions.duplicateSelected()

    expect(state.elements).toEqual([])
    expect(incrementSaveGeneration).not.toHaveBeenCalled()
    expect(scheduleSave).not.toHaveBeenCalled()
  })
})
