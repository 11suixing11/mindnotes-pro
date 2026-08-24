import type { CanvasElement } from '../types'

export interface DocumentRuntimeIndexesState {
  idToElement?: Map<string, CanvasElement>
  idToIndex?: Map<string, number>
  spatialIndex?: { bulkLoad: (elements: CanvasElement[]) => void }
}

export function rebuildDocumentRuntimeIndexes(
  state: DocumentRuntimeIndexesState,
  elements: CanvasElement[]
): void {
  state.idToElement?.clear()
  state.idToIndex?.clear()
  elements.forEach((element, index) => {
    state.idToElement?.set(element.id, element)
    state.idToIndex?.set(element.id, index)
  })
  state.spatialIndex?.bulkLoad(elements)
}
