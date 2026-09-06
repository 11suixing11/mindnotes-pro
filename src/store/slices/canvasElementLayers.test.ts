import { describe, expect, it } from 'vitest'
import type { CanvasElement, CanvasLayer, ShapeElement } from '../types'
import {
  createLayerDeletionPlan,
  createLayerLockPlan,
  createLayerReorderPlan,
  createLayerVisibilityPlan,
  createMoveElementsToLayerPlan,
  type CanvasLayerPlanContext,
} from './canvasElementLayers'

function makeLayer(id: string, order: number, overrides: Partial<CanvasLayer> = {}): CanvasLayer {
  return {
    id,
    name: id,
    visible: true,
    locked: false,
    order,
    createdAt: order + 1,
    updatedAt: order + 1,
    ...overrides,
  }
}

function makeShape(id: string, layerId: string): ShapeElement {
  return {
    type: 'shape',
    id,
    layerId,
    kind: 'rectangle',
    x: 0,
    y: 0,
    w: 20,
    h: 20,
    color: '#000000',
    size: 2,
  }
}

function makeContext(
  layers: CanvasLayer[],
  elements: CanvasElement[],
  activeLayerId: string,
  selectedIds: string[] = []
): CanvasLayerPlanContext {
  return {
    layers,
    elements,
    activeLayerId,
    selectedIds,
    idToElement: new Map(elements.map((element) => [element.id, element])),
  }
}

describe('canvas element layer plans', () => {
  it('deletes a layer, reassigns its elements, and clears their selection', () => {
    const base = makeLayer('base', 0)
    const temporary = makeLayer('temporary', 1)
    const baseShape = makeShape('base-shape', base.id)
    const movedShape = makeShape('moved-shape', temporary.id)
    const context = makeContext([base, temporary], [baseShape, movedShape], temporary.id, [
      baseShape.id,
      movedShape.id,
    ])

    const plan = createLayerDeletionPlan(context, temporary.id)

    expect(plan?.layers.map((layer) => layer.id)).toEqual([base.id])
    expect(plan?.activeLayerId).toBe(base.id)
    expect(plan?.elements[1].layerId).toBe(base.id)
    expect(plan?.updatedElements.map((element) => element.id)).toEqual([movedShape.id])
    expect(plan?.selectedIds).toEqual([baseShape.id])
  })

  it('hides an active layer, moves activity, and removes hidden selections', () => {
    const base = makeLayer('base', 0)
    const notes = makeLayer('notes', 1)
    const note = makeShape('note', notes.id)
    const context = makeContext([base, notes], [note], notes.id, [note.id])

    const plan = createLayerVisibilityPlan(context, notes.id, false, 100)

    expect(plan?.layers[1]).toEqual(expect.objectContaining({ visible: false, updatedAt: 100 }))
    expect(plan?.activeLayerId).toBe(base.id)
    expect(plan?.selectedIds).toEqual([])
    expect(
      createLayerVisibilityPlan(makeContext([base], [], base.id), base.id, false, 100)
    ).toBeNull()
  })

  it('locks an active layer, moves activity, and removes locked selections', () => {
    const base = makeLayer('base', 0)
    const ink = makeLayer('ink', 1)
    const stroke = makeShape('stroke', ink.id)
    const context = makeContext([base, ink], [stroke], ink.id, [stroke.id])

    const plan = createLayerLockPlan(context, ink.id, true, 200)

    expect(plan?.layers[1]).toEqual(expect.objectContaining({ locked: true, updatedAt: 200 }))
    expect(plan?.activeLayerId).toBe(base.id)
    expect(plan?.selectedIds).toEqual([])
  })

  it('reorders layers with normalized orders', () => {
    const base = makeLayer('base', 0)
    const first = makeLayer('first', 1)
    const second = makeLayer('second', 2)

    const plan = createLayerReorderPlan([base, first, second], first.id, 'up', 300)

    expect(plan?.map((layer) => layer.id)).toEqual([base.id, second.id, first.id])
    expect(plan?.map((layer) => layer.order)).toEqual([0, 1, 2])
    expect(plan?.every((layer) => layer.updatedAt === 300)).toBe(true)
  })

  it('moves a fully editable selection to a writable layer', () => {
    const source = makeLayer('source', 0)
    const target = makeLayer('target', 1)
    const first = makeShape('first', source.id)
    const second = makeShape('second', source.id)
    const context = makeContext([source, target], [first, second], source.id, [
      first.id,
      second.id,
    ])

    const plan = createMoveElementsToLayerPlan(context, context.selectedIds, target.id)

    expect(plan?.elements[0].layerId).toBe(target.id)
    expect(plan?.elements[1].layerId).toBe(target.id)
    expect(plan?.updatedElements.map((element) => element.id)).toEqual([first.id, second.id])
    expect(plan?.selectedIds).toEqual([first.id, second.id])
  })

  it('does not move a selection that contains a locked element', () => {
    const source = makeLayer('source', 0)
    const target = makeLayer('target', 1)
    const editable = makeShape('editable', source.id)
    const locked = { ...makeShape('locked', source.id), locked: true }
    const context = makeContext([source, target], [editable, locked], source.id, [
      editable.id,
      locked.id,
    ])

    expect(createMoveElementsToLayerPlan(context, context.selectedIds, target.id)).toBeNull()
  })
})
