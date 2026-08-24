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
import { snapshot } from '../helpers'

export interface UpdateElementOptions {
  historyLabel?: string
}

export interface CanvasElementMutationActions {
  addElement: (element: CanvasElement) => boolean
  addElements: (elements: CanvasElement[]) => boolean
  updateElement: (
    id: string,
    update: (element: CanvasElement) => CanvasElement,
    options?: UpdateElementOptions
  ) => boolean
  removeElement: (id: string) => boolean
  removeElements: (ids: string[]) => boolean
  clearAll: () => boolean
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

  const addElements = (elements: CanvasElement[]): boolean => {
    const state = get()
    const startIndex = state.elements.length
    const layeredElements = elements
      .map((element) => assignToWritableLayer(element, state))
      .filter((element: CanvasElement | null): element is CanvasElement => !!element)
    const plan = createElementAdditionPlan(state.elements, layeredElements)
    if (!plan) return false

    incrementSaveGeneration()
    set({
      elements: plan.elements,
      undoStack: appendUndoAction(state.undoStack, plan.action),
      redoStack: [],
    })
    appendElementCollection(plan.addedElements, startIndex, state)
    scheduleSave()
    return true
  }

  return {
    addElement: (element) => addElements([element]),
    addElements,

    updateElement: (id, update, options) => {
      const state = get()
      rebuildIndexIfNeeded()
      let index = state.idToIndex.get(id)
      if (
        index === undefined ||
        index < 0 ||
        index >= state.elements.length ||
        state.elements[index]?.id !== id
      ) {
        index = state.elements.findIndex((element) => element.id === id)
      }
      if (index < 0) return false
      if (!isElementLayerEditable(state.elements[index], state.layers)) return false

      const plan = createElementUpdatePlan(state.elements, index, update)
      if (plan.updatedElement === state.elements[index]) return false
      const action: UndoAction | undefined = options?.historyLabel
        ? {
            type: 'snapshot',
            before: snapshot(state.elements),
            after: snapshot(plan.elements),
            label: options.historyLabel,
            affectedIds: [id],
          }
        : undefined
      incrementSaveGeneration()
      synchronizeElementReplacement(plan.elements, index, id, state)
      set({
        elements: plan.elements,
        ...(action
          ? {
              undoStack: appendUndoAction(state.undoStack, action),
              redoStack: [],
            }
          : {}),
      })
      scheduleSave()
      return true
    },

    removeElement: (id) => {
      const state = get()
      rebuildIndexIfNeeded()
      let index = state.idToIndex.get(id)
      if (
        index === undefined ||
        index < 0 ||
        index >= state.elements.length ||
        state.elements[index]?.id !== id
      ) {
        index = state.elements.findIndex((element) => element.id === id)
      }
      if (index < 0) return false
      if (!isElementLayerEditable(state.elements[index], state.layers)) return false

      const plan = createElementRemovalPlan(state.elements, [id], state.selectedIds)
      if (!plan) return false
      incrementSaveGeneration()
      set({
        elements: plan.elements,
        undoStack: appendUndoAction(state.undoStack, plan.action),
        redoStack: [],
        selectedIds: plan.selectedIds,
      })
      removeElementCollection(plan.removedIds, state)
      markIndexDirty()
      scheduleSave()
      return true
    },

    removeElements: (ids) => {
      const state = get()
      const editableIds = getEditableIds(ids, state)
      if (editableIds.length === 0) return false
      const plan = createElementRemovalPlan(state.elements, editableIds, state.selectedIds, true)
      if (!plan) return false

      incrementSaveGeneration()
      set({
        elements: plan.elements,
        undoStack: appendUndoAction(state.undoStack, plan.action),
        redoStack: [],
        selectedIds: plan.selectedIds,
      })
      removeElementCollection(plan.removedIds, state)
      markIndexDirty()
      scheduleSave()
      return true
    },

    clearAll: () => {
      const state = get()
      if (state.elements.length === 0) return false
      const plan = createElementClearPlan(state.elements)
      incrementSaveGeneration()
      set({
        elements: plan.elements,
        undoStack: appendUndoAction(state.undoStack, plan.action),
        redoStack: [],
        selectedIds: plan.selectedIds,
      })
      replaceElementCollection(plan.elements, get())
      scheduleSave()
      return true
    },
  }
}
