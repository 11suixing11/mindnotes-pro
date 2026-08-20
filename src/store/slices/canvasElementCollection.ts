import type { CanvasElement } from '../types'
import { SpatialIndex } from '../../eraser/SpatialIndex'

export interface CanvasElementCollectionRuntime {
  spatialIndex: SpatialIndex
  idToElement: Map<string, CanvasElement>
  idToIndex: Map<string, number>
}

export interface CanvasElementCollectionMirror {
  idToElement: Map<string, CanvasElement>
  idToIndex: Map<string, number>
}

export function createCanvasElementCollectionRuntime(): CanvasElementCollectionRuntime {
  return {
    spatialIndex: new SpatialIndex(),
    idToElement: new Map<string, CanvasElement>(),
    idToIndex: new Map<string, number>(),
  }
}

function clearMaps(runtime: CanvasElementCollectionRuntime, mirror: CanvasElementCollectionMirror) {
  runtime.idToElement.clear()
  runtime.idToIndex.clear()
  if (mirror.idToElement !== runtime.idToElement) mirror.idToElement.clear()
  if (mirror.idToIndex !== runtime.idToIndex) mirror.idToIndex.clear()
}

function setElementMaps(
  runtime: CanvasElementCollectionRuntime,
  mirror: CanvasElementCollectionMirror,
  element: CanvasElement,
  index: number
) {
  runtime.idToElement.set(element.id, element)
  runtime.idToIndex.set(element.id, index)
  if (mirror.idToElement !== runtime.idToElement) mirror.idToElement.set(element.id, element)
  if (mirror.idToIndex !== runtime.idToIndex) mirror.idToIndex.set(element.id, index)
}

export function rebuildElementIndexes(
  runtime: CanvasElementCollectionRuntime,
  elements: CanvasElement[],
  mirror: CanvasElementCollectionMirror = runtime
) {
  runtime.idToIndex.clear()
  if (mirror.idToIndex !== runtime.idToIndex) mirror.idToIndex.clear()
  elements.forEach((element, index) => {
    runtime.idToIndex.set(element.id, index)
    if (mirror.idToIndex !== runtime.idToIndex) mirror.idToIndex.set(element.id, index)
  })
}

export function synchronizeElementReferences(
  runtime: CanvasElementCollectionRuntime,
  elements: CanvasElement[],
  mirror: CanvasElementCollectionMirror = runtime
) {
  elements.forEach((element) => {
    runtime.idToElement.set(element.id, element)
    if (mirror.idToElement !== runtime.idToElement) mirror.idToElement.set(element.id, element)
  })
}

export function synchronizeElementGeometry(
  runtime: CanvasElementCollectionRuntime,
  elements: CanvasElement[],
  elementIds: string[],
  mirror: CanvasElementCollectionMirror = runtime
) {
  const affected = new Set(elementIds)
  elements.forEach((element, index) => {
    if (!affected.has(element.id)) return
    setElementMaps(runtime, mirror, element, index)
    runtime.spatialIndex.update(element)
  })
}

export function replaceElementCollection(
  runtime: CanvasElementCollectionRuntime,
  elements: CanvasElement[],
  mirror: CanvasElementCollectionMirror = runtime
) {
  clearMaps(runtime, mirror)
  runtime.spatialIndex.clear()
  elements.forEach((element, index) => {
    setElementMaps(runtime, mirror, element, index)
    runtime.spatialIndex.insert(element)
  })
}

export function synchronizeElementCollection(
  runtime: CanvasElementCollectionRuntime,
  nextElements: CanvasElement[],
  mirror: CanvasElementCollectionMirror = runtime
) {
  const nextIds = new Set(nextElements.map((element) => element.id))

  for (const id of mirror.idToElement.keys()) {
    if (nextIds.has(id)) continue
    runtime.idToElement.delete(id)
    runtime.idToIndex.delete(id)
    mirror.idToElement.delete(id)
    mirror.idToIndex.delete(id)
    runtime.spatialIndex.remove(id)
  }

  nextElements.forEach((element, index) => {
    const previous = mirror.idToElement.get(element.id)
    if (!previous) runtime.spatialIndex.insert(element)
    else if (previous !== element) runtime.spatialIndex.update(element)
    setElementMaps(runtime, mirror, element, index)
  })
}
