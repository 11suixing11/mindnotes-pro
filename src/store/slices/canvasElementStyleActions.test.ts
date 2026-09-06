import { describe, expect, it, vi } from 'vitest'
import { createDefaultLayer } from '../layers'
import type { CanvasElement, ShapeElement } from '../types'
import type { CommitElementsOptions } from './canvasElementCommit'
import { createCanvasElementStyleActions } from './canvasElementStyleActions'

function shape(id: string, overrides: Partial<ShapeElement> = {}): ShapeElement {
  return {
    type: 'shape',
    id,
    layerId: 'layer-default',
    kind: 'rectangle',
    x: 0,
    y: 0,
    w: 20,
    h: 20,
    color: '#111111',
    size: 2,
    ...overrides,
  }
}

function createHarness(elements: CanvasElement[], selectedIds: string[]) {
  const layer = createDefaultLayer(1)
  const state = {
    elements,
    layers: [layer],
    selectedIds,
    idToElement: new Map(elements.map((element) => [element.id, element])),
  }
  const commitElements = vi.fn(
    (nextElements: CanvasElement[], _options?: CommitElementsOptions) => {
      state.elements = nextElements
      state.idToElement = new Map(nextElements.map((element) => [element.id, element]))
    }
  )
  const actions = createCanvasElementStyleActions({ get: () => state, commitElements })
  return { state, commitElements, actions }
}

describe('canvas element style actions', () => {
  it('commits a batch style change exactly once with one snapshot action', () => {
    const first = shape('first')
    const second = shape('second')
    const { state, commitElements, actions } = createHarness([first, second], [first.id, second.id])

    const result = actions.applyStyleToSelected({ color: '#ff0000', size: 4 })

    expect(result.status).toBe('applied')
    expect(commitElements).toHaveBeenCalledOnce()
    expect(commitElements).toHaveBeenCalledWith(
      state.elements,
      expect.objectContaining({
        action: expect.objectContaining({ type: 'snapshot' }),
        selectedIds: [first.id, second.id],
      })
    )
    expect(state.elements.map((element) => (element as ShapeElement).color)).toEqual([
      '#ff0000',
      '#ff0000',
    ])
  })

  it('does not commit a semantic no-op', () => {
    const element = shape('shape')
    const { commitElements, actions } = createHarness([element], [element.id])

    expect(actions.applyStyleToSelected({ color: element.color }).status).toBe('unchanged')
    expect(commitElements).not.toHaveBeenCalled()
  })

  it('does not commit any subset when one selected element is locked', () => {
    const editable = shape('editable')
    const locked = shape('locked', { locked: true })
    const { state, commitElements, actions } = createHarness(
      [editable, locked],
      [editable.id, locked.id]
    )

    const result = actions.applyStyleToSelected({ color: '#ff0000' })

    expect(result).toEqual(
      expect.objectContaining({ status: 'blocked', reason: 'locked-selection' })
    )
    expect(commitElements).not.toHaveBeenCalled()
    expect(state.elements.map((element) => (element as ShapeElement).color)).toEqual([
      '#111111',
      '#111111',
    ])
  })
})
