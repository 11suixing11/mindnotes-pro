import type { CanvasDoc, CanvasElement, CanvasLayer } from './types'

export const DEFAULT_LAYER_ID = 'layer-default'
export const DEFAULT_LAYER_NAME = 'Layer 1'

export interface NormalizedLayerState {
  layers: CanvasLayer[]
  activeLayerId: string
}

export function createDefaultLayer(now = Date.now()): CanvasLayer {
  return {
    id: DEFAULT_LAYER_ID,
    name: DEFAULT_LAYER_NAME,
    visible: true,
    locked: false,
    order: 0,
    createdAt: now,
    updatedAt: now,
  }
}

export function createCanvasLayer(name: string, order: number, now = Date.now()): CanvasLayer {
  return {
    id: `layer-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || `Layer ${order + 1}`,
    visible: true,
    locked: false,
    order,
    createdAt: now,
    updatedAt: now,
  }
}

export function getSortedLayers(layers: CanvasLayer[]): CanvasLayer[] {
  return [...layers].sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
}

export function getLayerOrderMap(layers: CanvasLayer[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const layer of layers) {
    map.set(layer.id, layer.order)
  }
  return map
}

export function getElementLayerId(element: CanvasElement): string {
  return element.layerId || DEFAULT_LAYER_ID
}

export function getLayerById(layers: CanvasLayer[], layerId: string): CanvasLayer | undefined {
  return layers.find((layer) => layer.id === layerId)
}

export function isLayerVisible(layers: CanvasLayer[], layerId: string): boolean {
  return getLayerById(layers, layerId)?.visible ?? layerId === DEFAULT_LAYER_ID
}

export function isLayerLocked(layers: CanvasLayer[], layerId: string): boolean {
  return getLayerById(layers, layerId)?.locked ?? false
}

export function isLayerWritable(layers: CanvasLayer[], layerId: string): boolean {
  const layer = getLayerById(layers, layerId)
  return !!layer && layer.visible && !layer.locked
}

export function isElementLayerVisible(element: CanvasElement, layers: CanvasLayer[]): boolean {
  return isLayerVisible(layers, getElementLayerId(element))
}

export function isElementLayerEditable(element: CanvasElement, layers: CanvasLayer[]): boolean {
  return !element.locked && isLayerWritable(layers, getElementLayerId(element))
}

export function getWritableLayerId(
  layers: CanvasLayer[],
  preferredLayerId?: string
): string | null {
  if (preferredLayerId && isLayerWritable(layers, preferredLayerId)) return preferredLayerId
  return getSortedLayers(layers).find((layer) => layer.visible && !layer.locked)?.id ?? null
}

export function normalizeLayers(
  rawLayers?: CanvasLayer[],
  rawActiveLayerId?: string,
  now = Date.now()
): NormalizedLayerState {
  const seen = new Set<string>()
  const normalized: CanvasLayer[] = []

  for (const [index, layer] of (rawLayers ?? []).entries()) {
    if (!layer || typeof layer.id !== 'string' || !layer.id.trim() || seen.has(layer.id)) continue
    seen.add(layer.id)
    normalized.push({
      id: layer.id,
      name:
        typeof layer.name === 'string' && layer.name.trim()
          ? layer.name.trim()
          : `Layer ${index + 1}`,
      visible: layer.visible !== false,
      locked: layer.locked === true,
      order: Number.isFinite(layer.order) ? layer.order : index,
      createdAt: Number.isFinite(layer.createdAt) ? layer.createdAt : now,
      updatedAt: Number.isFinite(layer.updatedAt) ? layer.updatedAt : now,
    })
  }

  if (normalized.length === 0) normalized.push(createDefaultLayer(now))

  const sorted = getSortedLayers(normalized).map((layer, order) => ({ ...layer, order }))
  const activeLayerId = getWritableLayerId(sorted, rawActiveLayerId) ?? sorted[0].id

  return { layers: sorted, activeLayerId }
}

export function normalizeElementLayers(
  elements: CanvasElement[],
  layers: CanvasLayer[]
): CanvasElement[] {
  const layerIds = new Set(layers.map((layer) => layer.id))
  const fallbackLayerId = layers[0]?.id ?? DEFAULT_LAYER_ID

  return elements.map((element) => {
    const layerId =
      element.layerId && layerIds.has(element.layerId) ? element.layerId : fallbackLayerId
    return element.layerId === layerId ? element : { ...element, layerId }
  })
}

export function normalizeCanvasDocLayers(doc: CanvasDoc, now = Date.now()): CanvasDoc {
  const normalized = normalizeLayers(doc.layers, doc.activeLayerId, now)
  return {
    ...doc,
    elements: normalizeElementLayers(doc.elements ?? [], normalized.layers),
    layers: normalized.layers,
    activeLayerId: normalized.activeLayerId,
  }
}

export function orderElementsByLayers(
  elements: CanvasElement[],
  layers: CanvasLayer[]
): CanvasElement[] {
  const layerOrder = getLayerOrderMap(layers)
  return elements
    .map((element, index) => ({ element, index }))
    .sort((a, b) => {
      const layerDiff =
        (layerOrder.get(getElementLayerId(a.element)) ?? 0) -
        (layerOrder.get(getElementLayerId(b.element)) ?? 0)
      return layerDiff || a.index - b.index
    })
    .map((entry) => entry.element)
}

export function getRenderableElements(
  elements: CanvasElement[],
  layers: CanvasLayer[]
): CanvasElement[] {
  return orderElementsByLayers(elements, layers).filter((element) =>
    isElementLayerVisible(element, layers)
  )
}

export function assignElementLayer(
  element: CanvasElement,
  layerId: string,
  layers: CanvasLayer[]
): CanvasElement {
  const validLayerId = getLayerById(layers, layerId)?.id ?? layers[0]?.id ?? DEFAULT_LAYER_ID
  return element.layerId === validLayerId ? element : { ...element, layerId: validLayerId }
}
