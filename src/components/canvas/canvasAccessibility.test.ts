import { describe, expect, it } from 'vitest'
import type { CanvasElement, CanvasLayer } from '../../store/types'
import { formatCanvasAccessibilityItem, getCanvasAccessibilityItems } from './canvasAccessibility'

const layer: CanvasLayer = {
  id: 'layer-1',
  name: '草稿',
  visible: true,
  locked: false,
  order: 0,
  createdAt: 1,
  updatedAt: 1,
}

describe('canvas accessibility summaries', () => {
  it('describes element type, text, layer, and state', () => {
    const elements: CanvasElement[] = [
      {
        type: 'text',
        id: 'text-1',
        layerId: layer.id,
        x: 0,
        y: 0,
        width: 100,
        height: 24,
        content: '会议结论',
        fontSize: 16,
        color: '#000000',
        locked: true,
      },
      {
        type: 'shape',
        id: 'shape-1',
        layerId: layer.id,
        kind: 'rectangle',
        x: 0,
        y: 0,
        w: 10,
        h: 10,
        color: '#000000',
        size: 2,
      },
    ]

    const items = getCanvasAccessibilityItems(elements, [layer], ['text-1'])

    expect(items).toEqual([
      expect.objectContaining({
        id: 'text-1',
        elementType: 'text',
        elementTypeLabel: '文字',
        label: '会议结论',
        layerName: '草稿',
        selected: true,
        locked: true,
        hidden: false,
      }),
      expect.objectContaining({
        id: 'shape-1',
        elementType: 'shape',
        elementTypeLabel: '矩形',
        label: '矩形',
        selected: false,
      }),
    ])
    expect(formatCanvasAccessibilityItem(items[0])).toBe('会议结论，图层：草稿，已选中，已锁定')
  })

  it('inherits hidden and locked state from its layer', () => {
    const hiddenLockedLayer = { ...layer, visible: false, locked: true }
    const element: CanvasElement = {
      type: 'stroke',
      id: 'stroke-1',
      layerId: hiddenLockedLayer.id,
      points: [[0, 0]],
      color: '#000000',
      size: 2,
      brush: 'pen',
    }

    const [item] = getCanvasAccessibilityItems([element], [hiddenLockedLayer], [])
    expect(item).toMatchObject({ hidden: true, locked: true })
    expect(formatCanvasAccessibilityItem(item)).toContain('已隐藏')
  })
})
