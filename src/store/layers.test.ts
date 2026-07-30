import { describe, expect, it } from 'vitest'
import type { CanvasDoc, ShapeElement } from './types'
import { CANVAS_SCHEMA_VERSION } from './schema'
import {
  createDefaultLayer,
  getRenderableElements,
  normalizeCanvasDocLayers,
  orderElementsByLayers,
} from './layers'

function makeShape(id: string, layerId?: string): ShapeElement {
  return {
    type: 'shape',
    id,
    layerId,
    kind: 'rectangle',
    x: 0,
    y: 0,
    w: 10,
    h: 10,
    color: '#000',
    size: 2,
  }
}

describe('layer helpers', () => {
  it('orders elements by layer order while preserving element order inside each layer', () => {
    const bottom = createDefaultLayer(1)
    const top = { ...createDefaultLayer(2), id: 'layer-top', name: 'Top', order: 1 }
    const elements = [
      makeShape('top-1', top.id),
      makeShape('bottom-1', bottom.id),
      makeShape('top-2', top.id),
    ]

    expect(orderElementsByLayers(elements, [bottom, top]).map((element) => element.id)).toEqual([
      'bottom-1',
      'top-1',
      'top-2',
    ])
  })

  it('filters hidden layers from renderable elements', () => {
    const bottom = createDefaultLayer(1)
    const hidden = {
      ...createDefaultLayer(2),
      id: 'layer-hidden',
      name: 'Hidden',
      visible: false,
      order: 1,
    }

    expect(
      getRenderableElements(
        [makeShape('visible', bottom.id), makeShape('hidden', hidden.id)],
        [bottom, hidden]
      ).map((element) => element.id)
    ).toEqual(['visible'])
  })

  it('normalizes old documents onto a default layer', () => {
    const doc: CanvasDoc = {
      schemaVersion: CANVAS_SCHEMA_VERSION,
      id: 'doc-1',
      title: 'Old doc',
      elements: [makeShape('legacy')],
      bgColor: '#fff',
      folderId: null,
      createdAt: 1,
      updatedAt: 1,
    }

    const normalized = normalizeCanvasDocLayers(doc, 123)

    expect(normalized.layers).toHaveLength(1)
    expect(normalized.layers?.[0].name).toBe('图层 1')
    expect(normalized.activeLayerId).toBe(normalized.layers?.[0].id)
    expect(normalized.elements[0].layerId).toBe(normalized.activeLayerId)
  })

  it('localizes historical default layer names without changing custom names', () => {
    const normalized = normalizeCanvasDocLayers({
      schemaVersion: CANVAS_SCHEMA_VERSION,
      id: 'doc-2',
      title: 'Layer names',
      elements: [],
      layers: [
        { ...createDefaultLayer(1), name: 'Layer 1' },
        { ...createDefaultLayer(2), id: 'layer-custom', name: 'Sketches', order: 1 },
      ],
      activeLayerId: 'layer-default',
      bgColor: '#fff',
      folderId: null,
      createdAt: 1,
      updatedAt: 1,
    })

    expect(normalized.layers?.map((layer) => layer.name)).toEqual(['图层 1', 'Sketches'])
  })
})
