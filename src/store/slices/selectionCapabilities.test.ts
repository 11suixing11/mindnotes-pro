import { describe, expect, it } from 'vitest'
import type { CanvasElement, CanvasLayer } from '../types'
import { getSelectionCapabilities } from './selectionCapabilities'

const layer: CanvasLayer = {
  id: 'layer-1',
  name: 'Layer 1',
  visible: true,
  locked: false,
  order: 0,
  createdAt: 1,
  updatedAt: 1,
}

function shape(id: string, extra: Partial<CanvasElement> = {}): CanvasElement {
  return {
    type: 'shape',
    id,
    layerId: layer.id,
    kind: 'rectangle',
    x: 0,
    y: 0,
    w: 20,
    h: 20,
    color: '#111111',
    size: 2,
    ...extra,
  } as CanvasElement
}

describe('getSelectionCapabilities', () => {
  it('enables editing capabilities for an unlocked multi-selection', () => {
    const elements = [shape('a'), shape('b'), shape('c')]
    const result = getSelectionCapabilities({
      elements,
      layers: [layer],
      selectedIds: ['a', 'b'],
    })

    expect(result).toMatchObject({
      count: 2,
      isLocked: false,
      canCopy: true,
      canDuplicate: true,
      canDelete: true,
      canGroup: true,
      canAlign: true,
      canDistribute: false,
    })
    expect(result.canReorder.front).toBe(true)
    expect(result.canReorder.back).toBe(false)
  })

  it('keeps only copy and unlock when any selected source is locked', () => {
    const elements = [shape('a'), shape('b', { locked: true })]
    const result = getSelectionCapabilities({
      elements,
      layers: [layer],
      selectedIds: ['a', 'b'],
    })

    expect(result.canCopy).toBe(true)
    expect(result.canUnlock).toBe(true)
    expect(result.canDuplicate).toBe(false)
    expect(result.canDelete).toBe(false)
    expect(result.canGroup).toBe(false)
    expect(Object.values(result.canReorder).every((value) => !value)).toBe(true)
  })

  it('detects grouped selections and layer-local reorder boundaries', () => {
    const secondLayer = { ...layer, id: 'layer-2', order: 1 }
    const elements = [
      shape('a', { groupId: 'group-1' }),
      shape('b'),
      shape('c', { layerId: secondLayer.id }),
      shape('d', { layerId: secondLayer.id }),
    ]
    const result = getSelectionCapabilities({
      elements,
      layers: [layer, secondLayer],
      selectedIds: ['a', 'd'],
    })

    expect(result.canGroup).toBe(false)
    expect(result.canUngroup).toBe(true)
    expect(result.canReorder.front).toBe(true)
    expect(result.canReorder.back).toBe(true)
  })
})
