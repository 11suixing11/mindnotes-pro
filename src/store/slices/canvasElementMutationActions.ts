import type { CanvasElement, CanvasLayer, UndoAction } from '../types'
import { isElementLayerEditable } from '../layers'
import { incrementSaveGeneration, scheduleSave } from '../saveManager'
import { assignToWritableLayer, getEditableIds } from './canvasElementRules'
import {
  createElementAdditionPlan,
  createElementClearPlan,
  createElementRemovalPlan,
  createElementUpdatePlan,
} from './canvasElementMutations'
import { appendUndoAction } from './canvasElementCommit'

export interface CanvasElementMutationActions {
  addElement: (element: CanvasElement) => void
  addElements: (elements: CanvasElement[]) => void
  updateElement: (id: string, update: (element: CanvasElement) => CanvasElement) => void
  removeElement: (id: string) => void
  removeElements: (ids: string[]) => void
  clearAll: () => void
}

interface CanvasElementMutationActionState {
  elements: CanvasElement[]
  layers: CanvasLayer[]
  activeLayerId: string
  selectedIds: string[]
  idToElement: Map<string, CanvasElement>
  idToIndex: Map<string, number>
  undoStack: UndoAction[]
}

interface CanvasElementMutationActionContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any
  get: () => CanvasElementMutationActionState
  rebuildIndexIfNeeded: () => void
  appendElementCollection: (
    elements: CanvasElement[],
    startIndex: number,
    state: CanvasElementMutationActionState
  ) => void
  synchronizeElementReplacement: (
    elements: CanvasElement[],
    index: number,
    previousId: string,
    state: CanvasElementMutationActionState
  ) => void
  removeElementCollection: (elementIds: string[], state: CanvasElementMutationActionState) => void
  replaceElementCollection: (
    elements: CanvasElement[],
    state: CanvasElementMutationActionState
  ) => void
  markIndexDirty: () => void
}

/** Store coordination for element add, update, remove, and clear commands. */
export function createCanvasElementMutationActions(
  context: CanvasElementMutationActionContext
): CanvasElementMutationActions {
  const {
    set,
    get,
    rebuildIndexIfNeeded,
    appendElementCollection,
    synchronizeElementReplacement,
    removeElementCollection,
    replaceElementCollection,
    markIndexDirty,
  } = context

  const addElements = (elements: CanvasElement[]) => {
    const state = get()
    const startIndex = state.elements.length
    const layeredElements = elements
      .map((element) => assignToWritableLayer(element, state))
      .filter((element: CanvasElement | null): element is CanvasElement => !!element)
    const plan = createElementAdditionPlan(state.elements, layeredElements)
    if (!plan) return

    incrementSaveGeneration()
    set({
      elements: plan.elements,
      undoStack: appendUndoAction(state.undoStack, plan.action),
      redoStack: [],
    })
    appendElementCollection(plan.addedElements, startIndex, state)
    scheduleSave()
  }

  return {
    addElement: (element) => addElements([element]),
    addElements,

    updateElement: (id, update) => {
      incrementSaveGeneration()
      const state = get()
      rebuildIndexIfNeeded()
      let index = state.idToIndex.get(id)
      if (index === undefined) {
        index = state.elements.findIndex((element) => element.id === id)
      }
      if (index < 0) return
      if (!isElementLayerEditable(state.elements[index], state.layers)) return

      const plan = createElementUpdatePlan(state.elements, index, update)
      synchronizeElementReplacement(plan.elements, index, id, state)
      set({ elements: plan.elements })
      scheduleSave()
    },

    removeElement: (id) => {
      incrementSaveGeneration()
      const state = get()
      rebuildIndexIfNeeded()
      let index = state.idToIndex.get(id)
      if (index === undefined) {
        index = state.elements.findIndex((element) => element.id === id)
      }
      if (index < 0) return
      if (!isElementLayerEditable(state.elements[index], state.layers)) return

      const plan = createElementRemovalPlan(state.elements, [id], state.selectedIds)
      if (!plan) return
      set({
        elements: plan.elements,
        undoStack: appendUndoAction(state.undoStack, plan.action),
        redoStack: [],
        selectedIds: plan.selectedIds,
      })
      removeElementCollection(plan.removedIds, state)
      markIndexDirty()
      scheduleSave()
    },

    removeElements: (ids) => {
      incrementSaveGeneration()
      const state = get()
      const editableIds = getEditableIds(ids, state)
      if (editableIds.length === 0) return
      const plan = createElementRemovalPlan(state.elements, editableIds, state.selectedIds, true)
      if (!plan) return

      set({
        elements: plan.elements,
        undoStack: appendUndoAction(state.undoStack, plan.action),
        redoStack: [],
        selectedIds: plan.selectedIds,
      })
      removeElementCollection(plan.removedIds, state)
      markIndexDirty()
      scheduleSave()
    },

    clearAll: () => {
      incrementSaveGeneration()
      const state = get()
      const plan = createElementClearPlan(state.elements)
      set({
        elements: plan.elements,
        undoStack: appendUndoAction(state.undoStack, plan.action),
        redoStack: [],
        selectedIds: plan.selectedIds,
      })
      replaceElementCollection(plan.elements, get())
      scheduleSave()
    },
  }
}
