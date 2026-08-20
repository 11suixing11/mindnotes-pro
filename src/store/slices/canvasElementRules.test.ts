import { describe, expect, it } from 'vitest'
import type { CanvasElement, CanvasLayer } from '../types'
import { createDefaultLayer } from '../layers'
import {
  assignToWritableLayer,
  getEditableIds,
  getSelectableIds,
  hasBoundArrowForAny,
} from './canvasElementRules'

const editableLayer = createDefaultLayer(1)
const lockedLayer: CanvasLayer = { ...editableLayer, id: 'locked', locked: true }
const shape: CanvasElement = {
  type: 'shape',
  id: 'shape-1',
  kind: 'rectangle',
  x: 0,
  y: 0,
  w: 100,
  h: 50,
  color: '#000000',
  size: 2,
  layerId: editableLayer.id,
}

describe('canvas element rules', () => {
  it('separates editable and selectable layer checks', () => {
    const context = {
      elements: [shape],
      layers: [editableLayer, lockedLayer],
      activeLayerId: editableLayer.id,
      idToElement: new Map([[shape.id, shape]]),
    }

    expect(getEditableIds([shape.id], context)).toEqual([shape.id])
    expect(getSelectableIds([shape.id], context)).toEqual([shape.id])
    expect(getEditableIds(['missing'], context)).toEqual([])
  })

  it('assigns an element to the active writable layer', () => {
    const context = {
      elements: [],
      layers: [lockedLayer, editableLayer],
      activeLayerId: lockedLayer.id,
      idToElement: new Map<string, CanvasElement>(),
    }

    expect(assignToWritableLayer({ ...shape, layerId: lockedLayer.id }, context)?.layerId).toBe(
      editableLayer.id
    )
  })

  it('detects arrows bound to any selected element', () => {
    const arrow: CanvasElement = {
      type: 'shape',
      id: 'arrow-1',
      kind: 'arrow',
      x: 0,
      y: 0,
      w: 20,
      h: 20,
      color: '#000000',
      size: 2,
      startBinding: { targetId: shape.id, anchorX: 0, anchorY: 0 },
    }

    expect(hasBoundArrowForAny(new Set([shape.id]), [shape, arrow])).toBe(true)
    expect(hasBoundArrowForAny(new Set(['other']), [shape, arrow])).toBe(false)
  })
})
