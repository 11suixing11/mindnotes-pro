import { describe, expect, it } from 'vitest'
import { createDefaultLayer } from '../layers'
import type { CanvasElement, CanvasLayer, ShapeElement, StrokeElement, TextElement } from '../types'
import {
  applyTextFormatPatch,
  createSelectionStylePlan,
  getSelectionStyleModel,
} from './canvasElementStyle'

const layer = createDefaultLayer(1)

function stroke(id: string, overrides: Partial<StrokeElement> = {}): StrokeElement {
  return {
    type: 'stroke',
    id,
    layerId: layer.id,
    points: [
      [0, 0],
      [10, 10],
    ],
    color: '#111111',
    size: 2,
    brush: 'pen',
    ...overrides,
  }
}

function shape(id: string, overrides: Partial<ShapeElement> = {}): ShapeElement {
  return {
    type: 'shape',
    id,
    layerId: layer.id,
    kind: 'rectangle',
    x: 0,
    y: 0,
    w: 40,
    h: 20,
    color: '#111111',
    size: 2,
    ...overrides,
  }
}

function text(id: string, overrides: Partial<TextElement> = {}): TextElement {
  return {
    type: 'text',
    id,
    layerId: layer.id,
    x: 0,
    y: 0,
    width: 80,
    height: 26,
    content: 'abcd',
    originalContent: 'abcd',
    autoResize: true,
    fontSize: 16,
    color: '#111111',
    ...overrides,
  }
}

function modelFor(elements: CanvasElement[], layers: CanvasLayer[] = [layer]) {
  return getSelectionStyleModel({
    elements,
    layers,
    selectedIds: elements.map((element) => element.id),
    idToElement: new Map(elements.map((element) => [element.id, element])),
  })
}

describe('selection style model', () => {
  it('derives supported and mixed properties for strokes', () => {
    const model = modelFor([stroke('a'), stroke('b', { color: '#222222', brush: 'marker' })])

    expect(model.color).toEqual({ kind: 'mixed' })
    expect(model.size).toEqual({ kind: 'value', value: 2 })
    expect(model.brush).toEqual({ kind: 'mixed' })
    expect(model.fillColor).toEqual({ kind: 'unsupported' })
    expect(model.fontSize).toEqual({ kind: 'unsupported' })
  })

  it('supports fill only when every selected shape can be filled', () => {
    const fillable = modelFor([
      shape('rectangle', { fillColor: '#ffffff' }),
      shape('circle', { kind: 'circle' }),
    ])
    const includesLine = modelFor([shape('rectangle'), shape('line', { kind: 'line' })])

    expect(fillable.fillColor).toEqual({ kind: 'mixed' })
    expect(includesLine.fillColor).toEqual({ kind: 'unsupported' })
  })

  it('exposes only shared line properties for stroke and shape selections', () => {
    const model = modelFor([stroke('stroke'), shape('shape', { size: 4 })])

    expect(model.color).toEqual({ kind: 'value', value: '#111111' })
    expect(model.size).toEqual({ kind: 'mixed' })
    expect(model.brush).toEqual({ kind: 'unsupported' })
    expect(model.fillColor).toEqual({ kind: 'unsupported' })
  })

  it('exposes only color when text is mixed with another color-styled element', () => {
    const model = modelFor([text('text'), shape('shape')])

    expect(model.color).toEqual({ kind: 'value', value: '#111111' })
    expect(model.size).toEqual({ kind: 'unsupported' })
    expect(model.fontSize).toEqual({ kind: 'unsupported' })
  })

  it('marks every style property unsupported when an image is selected', () => {
    const image: CanvasElement = {
      type: 'image',
      id: 'image',
      layerId: layer.id,
      x: 0,
      y: 0,
      width: 20,
      height: 20,
      dataUrl: 'data:image/png;base64,abc',
    }
    const model = modelFor([shape('shape'), image])

    expect(model.color).toEqual({ kind: 'unsupported' })
    expect(model.size).toEqual({ kind: 'unsupported' })
    expect(model.fontSize).toEqual({ kind: 'unsupported' })
  })

  it('normalizes optional text fields before calculating common values', () => {
    const model = modelFor([
      text('plain'),
      text('formatted', {
        fontWeight: 'bold',
        textAlign: 'center',
        backgroundColor: '#ffeeaa',
      }),
    ])

    expect(model.fontWeight).toEqual({ kind: 'mixed' })
    expect(model.fontStyle).toEqual({ kind: 'value', value: 'normal' })
    expect(model.textAlign).toEqual({ kind: 'mixed' })
    expect(model.backgroundColor).toEqual({ kind: 'mixed' })
  })
})

describe('selection style plans', () => {
  it('blocks the whole change when an element is locked', () => {
    const elements = [shape('editable'), shape('locked', { locked: true })]
    const result = createSelectionStylePlan(
      { elements, layers: [layer], selectedIds: elements.map((element) => element.id) },
      { color: '#ff0000' }
    )

    expect(result).toEqual(
      expect.objectContaining({
        status: 'blocked',
        reason: 'locked-selection',
        lockedIds: ['locked'],
      })
    )
    expect(elements.map((element) => element.color)).toEqual(['#111111', '#111111'])
  })

  it('blocks the whole change when a selected element belongs to a locked layer', () => {
    const lockedLayer = { ...layer, locked: true }
    const element = shape('shape')
    const result = createSelectionStylePlan(
      { elements: [element], layers: [lockedLayer], selectedIds: [element.id] },
      { size: 4 }
    )

    expect(result).toEqual(
      expect.objectContaining({ status: 'blocked', reason: 'locked-selection' })
    )
  })

  it('returns unchanged without creating a history plan for a semantic no-op', () => {
    const element = shape('shape')
    const result = createSelectionStylePlan(
      { elements: [element], layers: [layer], selectedIds: [element.id] },
      { color: element.color, size: element.size }
    )

    expect(result.status).toBe('unchanged')
    expect('plan' in result).toBe(false)
  })

  it('applies compatible keys and reports ignored keys as one snapshot', () => {
    const element = shape('shape')
    const result = createSelectionStylePlan(
      { elements: [element], layers: [layer], selectedIds: [element.id] },
      { color: '#ff0000', brush: 'marker' }
    )

    expect(result.status).toBe('applied')
    if (result.status !== 'applied') throw new Error('Expected an applied style plan')
    expect((result.plan.elements[0] as ShapeElement).color).toBe('#ff0000')
    expect(result.applicableKeys).toEqual(['color'])
    expect(result.ignoredKeys).toEqual(['brush'])
    expect(result.plan.action.type).toBe('snapshot')
  })

  it('updates brush opacity when changing stroke brushes', () => {
    const element = stroke('stroke', { brush: 'highlighter', opacity: 0.24 })
    const result = createSelectionStylePlan(
      { elements: [element], layers: [layer], selectedIds: [element.id] },
      { brush: 'pen' }
    )

    expect(result.status).toBe('applied')
    if (result.status !== 'applied') throw new Error('Expected an applied style plan')
    expect(result.plan.elements[0]).toEqual(expect.objectContaining({ brush: 'pen' }))
    expect((result.plan.elements[0] as StrokeElement).opacity).toBeUndefined()
  })
})

describe('text style relayout', () => {
  it('recalculates auto-width text when font size changes', () => {
    const element = text('auto', { width: 40, height: 26 })
    const updated = applyTextFormatPatch(element, { fontSize: 32 }, () => 120)

    expect(updated).not.toBe(element)
    expect(updated.fontSize).toBe(32)
    expect(updated.width).toBe(122)
    expect(updated.height).toBeCloseTo(51.2)
    expect(updated.originalContent).toBe('abcd')
  })

  it('preserves fixed width and recalculates wrapped height for bold text', () => {
    const element = text('fixed', { autoResize: false, width: 60, height: 26 })
    const updated = applyTextFormatPatch(
      element,
      { fontWeight: 'bold' },
      (value) => value.length * 20
    )

    expect(updated.width).toBe(60)
    expect(updated.height).toBeCloseTo(51.2)
    expect(updated.content).toBe('abc\nd')
    expect(updated.fontWeight).toBe('bold')
  })

  it('recalculates auto-width text when italic styling changes its metrics', () => {
    const element = text('italic', { width: 80 })
    const updated = applyTextFormatPatch(element, { fontStyle: 'italic' }, () => 100)

    expect(updated.fontStyle).toBe('italic')
    expect(updated.width).toBe(102)
    expect(updated.originalContent).toBe('abcd')
  })

  it('returns the original text object when the normalized format is unchanged', () => {
    const element = text('text')
    expect(applyTextFormatPatch(element, { fontWeight: 'normal' })).toBe(element)
  })
})
