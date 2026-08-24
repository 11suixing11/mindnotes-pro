import type { Bounds } from '../core/geometry'
import { distanceToSegmentSquared } from '../core/geometry'
import type { CanvasElement, CanvasLayer, ImageElement } from '../core/model'

export interface HitTestPoint {
  x: number
  y: number
}

export interface HitTestResult {
  id: string
  element: CanvasElement
}

export interface HitTestOptions {
  point: HitTestPoint
  tolerance: number
  elements: CanvasElement[]
  layers: CanvasLayer[]
  candidateIds?: readonly string[] | null
  idToElement?: ReadonlyMap<string, CanvasElement>
  idToIndex?: ReadonlyMap<string, number>
  getBounds: (element: CanvasElement) => Bounds
  isElementEditable: (element: CanvasElement, layers: CanvasLayer[]) => boolean
  getLayerId: (element: CanvasElement) => string
  getLayerOrder: (layers: CanvasLayer[]) => ReadonlyMap<string, number>
  getRenderableElements?: (elements: CanvasElement[], layers: CanvasLayer[]) => CanvasElement[]
  isImagePixelTransparent?: (element: ImageElement, x: number, y: number) => boolean
}

export interface SelectionHandleHit {
  handle: number
  id: string
  bounds: Bounds
  isRotate?: boolean
  isEdge?: boolean
}

export interface SelectionHandleOptions {
  point: HitTestPoint
  zoom: number
  selectedElements: readonly CanvasElement[]
  getBounds: (element: CanvasElement) => Bounds
}

export function isElementHitAtPoint(
  element: CanvasElement,
  point: HitTestPoint,
  tolerance: number,
  getBounds: (element: CanvasElement) => Bounds,
  isImagePixelTransparent: (element: ImageElement, x: number, y: number) => boolean = () => false
): boolean {
  if (element.type === 'image') {
    if (
      point.x < element.x - tolerance ||
      point.x > element.x + element.width + tolerance ||
      point.y < element.y - tolerance ||
      point.y > element.y + element.height + tolerance
    ) {
      return false
    }
    if (
      point.x < element.x ||
      point.x > element.x + element.width ||
      point.y < element.y ||
      point.y > element.y + element.height
    ) {
      return false
    }
    return !isImagePixelTransparent(element, point.x, point.y)
  }

  if (element.type === 'text') {
    return (
      point.x >= element.x - tolerance &&
      point.x <= element.x + (element.width || 100) + tolerance &&
      point.y >= element.y - tolerance &&
      point.y <= element.y + (element.height || 30) + tolerance
    )
  }

  if (element.type === 'shape') {
    const bounds = getBounds(element)
    return (
      point.x >= bounds.x - tolerance &&
      point.x <= bounds.x + bounds.w + tolerance &&
      point.y >= bounds.y - tolerance &&
      point.y <= bounds.y + bounds.h + tolerance
    )
  }

  if (element.points.length < 2) return false

  const bounds = getBounds(element)
  if (
    point.x < bounds.x - tolerance ||
    point.x > bounds.x + bounds.w + tolerance ||
    point.y < bounds.y - tolerance ||
    point.y > bounds.y + bounds.h + tolerance
  ) {
    return false
  }

  const threshold = tolerance + element.size / 2
  const thresholdSq = threshold * threshold
  for (let index = 1; index < element.points.length; index++) {
    const previous = element.points[index - 1]
    const current = element.points[index]
    if (
      distanceToSegmentSquared(point.x, point.y, previous[0], previous[1], current[0], current[1]) <
      thresholdSq
    ) {
      return true
    }
  }

  return false
}

function compareHitOrder(
  a: string,
  b: string,
  getElementById: (id: string) => CanvasElement | undefined,
  idToIndex: ReadonlyMap<string, number>,
  layerOrder: ReadonlyMap<string, number>,
  getLayerId: (element: CanvasElement) => string
): number {
  const aElement = getElementById(a)
  const bElement = getElementById(b)
  const layerDiff =
    (bElement ? (layerOrder.get(getLayerId(bElement)) ?? 0) : 0) -
    (aElement ? (layerOrder.get(getLayerId(aElement)) ?? 0) : 0)
  return layerDiff || (idToIndex.get(b) ?? 0) - (idToIndex.get(a) ?? 0)
}

export function findTopmostElementAtPoint(options: HitTestOptions): HitTestResult | null {
  const {
    point,
    tolerance,
    elements,
    layers,
    candidateIds,
    idToElement,
    getBounds,
    isElementEditable,
    getLayerId,
    getLayerOrder,
    getRenderableElements = (items) => items,
    isImagePixelTransparent = () => false,
  } = options
  const elementsById = idToElement ?? new Map(elements.map((element) => [element.id, element]))
  const idToIndex =
    options.idToIndex ?? new Map(elements.map((element, index) => [element.id, index]))
  const getElementById = (id: string): CanvasElement | undefined => {
    const index = idToIndex.get(id)
    if (index !== undefined) return elements[index]
    return elementsById.get(id)
  }
  const layerOrder = getLayerOrder(layers)
  const isHit = (element: CanvasElement): boolean =>
    isElementEditable(element, layers) &&
    isElementHitAtPoint(element, point, tolerance, getBounds, isImagePixelTransparent)

  if (candidateIds && candidateIds.length > 0) {
    const orderedIds = [...candidateIds].sort((a, b) =>
      compareHitOrder(a, b, getElementById, idToIndex, layerOrder, getLayerId)
    )
    for (const id of orderedIds) {
      const element = getElementById(id)
      if (element && isHit(element)) return { id: element.id, element }
    }
    return null
  }

  const renderableElements = getRenderableElements(elements, layers)
  for (let index = renderableElements.length - 1; index >= 0; index--) {
    const element = renderableElements[index]
    if (isHit(element)) return { id: element.id, element }
  }
  return null
}

export function mergeElementBounds(
  elements: readonly CanvasElement[],
  getBounds: (element: CanvasElement) => Bounds
): Bounds | null {
  let merged: Bounds | null = null
  for (const element of elements) {
    const bounds = getBounds(element)
    if (!merged) {
      merged = { ...bounds }
      continue
    }
    const minX = Math.min(merged.x, bounds.x)
    const minY = Math.min(merged.y, bounds.y)
    const maxX = Math.max(merged.x + merged.w, bounds.x + bounds.w)
    const maxY = Math.max(merged.y + merged.h, bounds.y + bounds.h)
    merged = { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }
  return merged
}

export function findSelectionHandleAtPoint(
  options: SelectionHandleOptions
): SelectionHandleHit | null {
  const { point, zoom, selectedElements, getBounds } = options
  if (selectedElements.length === 0) return null

  const handleRadius = 12 / zoom
  const edgeHandleRadius = 10 / zoom
  const rotateHandleRadius = 15 / zoom
  const mergedBounds = mergeElementBounds(selectedElements, getBounds)

  const hitRotateHandle = (id: string, bounds: Bounds): SelectionHandleHit | null => {
    const rotateHandleX = bounds.x + bounds.w / 2
    const rotateHandleY = bounds.y - 20 / zoom
    if (
      Math.abs(point.x - rotateHandleX) < rotateHandleRadius &&
      Math.abs(point.y - rotateHandleY) < rotateHandleRadius
    ) {
      return { handle: 99, id, bounds, isRotate: true }
    }
    return null
  }

  if (selectedElements.length > 1) {
    return mergedBounds ? hitRotateHandle(selectedElements[0].id, mergedBounds) : null
  }

  for (const element of selectedElements) {
    const bounds = getBounds(element)
    const rotateHit = hitRotateHandle(element.id, bounds)
    if (rotateHit) return rotateHit

    const cornerRadius = 4 / zoom
    const edgeRadius = 3.5 / zoom
    const minSafeWidth = (cornerRadius + edgeRadius + 4 / zoom) * 2
    const minSafeHeight = (cornerRadius + edgeRadius + 4 / zoom) * 2

    let edgeTopY = bounds.y
    let edgeBottomY = bounds.y + bounds.h
    let edgeLeftX = bounds.x
    let edgeRightX = bounds.x + bounds.w

    if (bounds.w < minSafeWidth) {
      const offset = (minSafeWidth - bounds.w) / 2 + 2 / zoom
      edgeLeftX = bounds.x + offset
      edgeRightX = bounds.x + bounds.w - offset
    }
    if (bounds.h < minSafeHeight) {
      const offset = (minSafeHeight - bounds.h) / 2 + 2 / zoom
      edgeTopY = bounds.y + offset
      edgeBottomY = bounds.y + bounds.h - offset
    }

    const edges: [number, number, number][] = [
      [bounds.x + bounds.w / 2, edgeTopY, 4],
      [bounds.x + bounds.w / 2, edgeBottomY, 5],
      [edgeLeftX, bounds.y + bounds.h / 2, 6],
      [edgeRightX, bounds.y + bounds.h / 2, 7],
    ]
    const corners: [number, number, number][] = [
      [bounds.x, bounds.y, 0],
      [bounds.x + bounds.w, bounds.y, 1],
      [bounds.x, bounds.y + bounds.h, 2],
      [bounds.x + bounds.w, bounds.y + bounds.h, 3],
    ]

    for (const [x, y, handle] of corners) {
      if (Math.abs(point.x - x) < handleRadius && Math.abs(point.y - y) < handleRadius) {
        return { handle, id: element.id, bounds }
      }
    }

    for (const [x, y, handle] of edges) {
      if (Math.abs(point.x - x) < edgeHandleRadius && Math.abs(point.y - y) < edgeHandleRadius) {
        return { handle, id: element.id, bounds, isEdge: true }
      }
    }
  }

  return null
}
