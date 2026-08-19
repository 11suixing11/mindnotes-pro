import { describe, expect, it, vi } from 'vitest'
import type { CanvasElement, CanvasLayer, ImageElement, ShapeElement } from '../store/types'
import {
  findSelectionHandleAtPoint,
  findTopmostElementAtPoint,
  isElementHitAtPoint,
  mergeElementBounds,
} from './hitTesting'

const layers: CanvasLayer[] = [
  {
    id: 'background',
    name: 'Background',
    visible: true,
    locked: false,
    order: 0,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: 'foreground',
    name: 'Foreground',
    visible: true,
    locked: false,
    order: 1,
    createdAt: 2,
    updatedAt: 2,
  },
]

function bounds(element: CanvasElement) {
  if (element.type === 'stroke') {
    const xs = element.points.map(([x]) => x)
    const ys = element.points.map(([, y]) => y)
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    }
  }
  if (element.type === 'shape') return { x: element.x, y: element.y, w: element.w, h: element.h }
  return { x: element.x, y: element.y, w: element.width, h: element.height }
}

function shape(id: string, x: number, y: number, layerId = 'background'): ShapeElement {
  return {
    type: 'shape',
    id,
    layerId,
    kind: 'rectangle',
    x,
    y,
    w: 40,
    h: 30,
    color: '#000',
    size: 1,
  }
}

function hitOptions(elements: CanvasElement[], point: { x: number; y: number }) {
  const idToIndex = new Map(elements.map((element, index) => [element.id, index]))
  return {
    point,
    tolerance: 2,
    elements,
    layers,
    idToIndex,
    getBounds: bounds,
    isElementEditable: (element: CanvasElement, currentLayers: CanvasLayer[]) => {
      const layer = currentLayers.find(
        (candidate) => candidate.id === (element.layerId ?? 'background')
      )
      return !element.locked && !!layer && layer.visible && !layer.locked
    },
    getLayerId: (element: CanvasElement) => element.layerId ?? 'background',
    getLayerOrder: (currentLayers: CanvasLayer[]) =>
      new Map(currentLayers.map((layer) => [layer.id, layer.order])),
    getRenderableElements: (items: CanvasElement[]) => items,
  }
}

describe('canvas hit testing', () => {
  it('hits shapes and rejects points outside their tolerance', () => {
    const element = shape('shape-1', 10, 20)
    expect(isElementHitAtPoint(element, { x: 10, y: 20 }, 0, bounds)).toBe(true)
    expect(isElementHitAtPoint(element, { x: 60, y: 20 }, 0, bounds)).toBe(false)
  })

  it('hits strokes by segment distance after bounds rejection', () => {
    const stroke: CanvasElement = {
      type: 'stroke',
      id: 'stroke-1',
      points: [
        [0, 0],
        [100, 0],
      ],
      color: '#000',
      size: 4,
      brush: 'pen',
    }
    expect(isElementHitAtPoint(stroke, { x: 50, y: 1 }, 1, bounds)).toBe(true)
    expect(isElementHitAtPoint(stroke, { x: 50, y: 10 }, 1, bounds)).toBe(false)
  })

  it('uses image alpha callback to allow transparent pixels through', () => {
    const image: ImageElement = {
      type: 'image',
      id: 'image-1',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      dataUrl: 'data:image/png;base64,test',
    }
    const transparent = vi.fn(() => true)
    expect(isElementHitAtPoint(image, { x: 50, y: 50 }, 0, bounds, transparent)).toBe(false)
    expect(transparent).toHaveBeenCalledWith(image, 50, 50)
  })

  it('does not extend image hits into the pointer tolerance padding', () => {
    const image: ImageElement = {
      type: 'image',
      id: 'image-1',
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      dataUrl: 'data:image/png;base64,test',
    }
    expect(isElementHitAtPoint(image, { x: 5, y: 20 }, 12, bounds)).toBe(false)
  })

  it('returns the topmost editable candidate by layer and element order', () => {
    const elements = [shape('back', 0, 0), shape('front', 0, 0, 'foreground')]
    const result = findTopmostElementAtPoint({
      ...hitOptions(elements, { x: 20, y: 20 }),
      candidateIds: ['back', 'front'],
    })
    expect(result?.id).toBe('front')
  })

  it('skips locked candidates and continues through transparent image pixels', () => {
    const back = shape('back', 0, 0)
    const locked = { ...shape('locked', 0, 0, 'foreground'), locked: true }
    const image: ImageElement = {
      type: 'image',
      id: 'image',
      layerId: 'foreground',
      x: 0,
      y: 0,
      width: 40,
      height: 30,
      dataUrl: 'data:image/png;base64,test',
    }
    const elements = [back, locked, image]
    const result = findTopmostElementAtPoint({
      ...hitOptions(elements, { x: 20, y: 20 }),
      candidateIds: ['back', 'locked', 'image'],
      isImagePixelTransparent: () => true,
    })
    expect(result?.id).toBe('back')
  })

  it('falls back to render order when no spatial candidates are available', () => {
    const elements = [shape('back', 0, 0), shape('front', 0, 0)]
    const result = findTopmostElementAtPoint({
      ...hitOptions(elements, { x: 20, y: 20 }),
      getRenderableElements: (items) => items,
    })
    expect(result?.id).toBe('front')
  })

  it('merges selection bounds and detects corner, edge, and rotate handles', () => {
    const first = shape('first', 10, 20)
    const second = shape('second', 100, 40)
    expect(mergeElementBounds([first, second], bounds)).toEqual({ x: 10, y: 20, w: 130, h: 50 })

    expect(
      findSelectionHandleAtPoint({
        point: { x: 10, y: 20 },
        zoom: 1,
        selectedElements: [first],
        getBounds: bounds,
      })
    ).toMatchObject({ handle: 0, id: 'first' })
    expect(
      findSelectionHandleAtPoint({
        point: { x: 30, y: 20 },
        zoom: 1,
        selectedElements: [first],
        getBounds: bounds,
      })
    ).toMatchObject({ handle: 4, isEdge: true })
    expect(
      findSelectionHandleAtPoint({
        point: { x: 30, y: 0 },
        zoom: 1,
        selectedElements: [first],
        getBounds: bounds,
      })
    ).toMatchObject({ handle: 99, isRotate: true })
    expect(
      findSelectionHandleAtPoint({
        point: { x: 75, y: 0 },
        zoom: 1,
        selectedElements: [first, second],
        getBounds: bounds,
      })
    ).toMatchObject({ handle: 99, id: 'first', isRotate: true })
  })
})
