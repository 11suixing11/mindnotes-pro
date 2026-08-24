import type { CanvasElement, CanvasLayer, UndoAction } from '../types'
import { shallowClone } from '../helpers'
import { incrementSaveGeneration, scheduleSave } from '../saveManager'
import { getEditableIds } from './canvasElementRules'
import { copySelectedElements, createOffsetCopyPlan } from './canvasElementClipboard'
import { createElementAdditionPlan } from './canvasElementMutations'
import { appendUndoAction } from './canvasElementCommit'

export interface CanvasElementClipboardActions {
  copySelected: () => void
  paste: () => void
  duplicateSelected: () => void
}

interface CanvasElementClipboardActionState {
  elements: CanvasElement[]
  layers: CanvasLayer[]
  activeLayerId: string
  selectedIds: string[]
  clipboard: CanvasElement[]
  idToElement: Map<string, CanvasElement>
  idToIndex: Map<string, number>
  undoStack: UndoAction[]
}

interface CanvasElementClipboardActionContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any
  get: () => CanvasElementClipboardActionState
  appendElementCollection: (
    elements: CanvasElement[],
    startIndex: number,
    state: CanvasElementClipboardActionState
  ) => void
}

/** Store coordination for clipboard actions; copy and duplication plans remain pure. */
export function createCanvasElementClipboardActions(
  context: CanvasElementClipboardActionContext
): CanvasElementClipboardActions {
  const { set, get, appendElementCollection } = context

  const appendCopies = (
    sourceElements: CanvasElement[],
    state: CanvasElementClipboardActionState
  ) => {
    const startIndex = state.elements.length
    const { elements: copied, ids: newIds } = createOffsetCopyPlan(
      sourceElements,
      state,
      Date.now()
    )
    const plan = createElementAdditionPlan(state.elements, copied)
    if (!plan) return

    incrementSaveGeneration()
    set({
      elements: plan.elements,
      selectedIds: newIds,
      undoStack: appendUndoAction(state.undoStack, plan.action),
      redoStack: [],
    })
    appendElementCollection(plan.addedElements, startIndex, state)
    scheduleSave()
  }

  return {
    copySelected: () => {
      const { elements, selectedIds } = get()
      if (selectedIds.length === 0) return
      set({ clipboard: copySelectedElements(elements, selectedIds) })
    },

    paste: () => {
      const state = get()
      if (state.clipboard.length === 0) return
      const startIndex = state.elements.length

      const { elements: pasted, ids: newIds } = createOffsetCopyPlan(
        state.clipboard,
        state,
        Date.now()
      )
      const plan = createElementAdditionPlan(state.elements, pasted)
      if (!plan) return

      incrementSaveGeneration()
      set({
        elements: plan.elements,
        selectedIds: newIds,
        clipboard: pasted.map(shallowClone),
        undoStack: appendUndoAction(state.undoStack, plan.action),
        redoStack: [],
      })
      appendElementCollection(plan.addedElements, startIndex, state)
      scheduleSave()
    },

    duplicateSelected: () => {
      const state = get()
      if (state.selectedIds.length === 0) return

      const editableIds = getEditableIds(state.selectedIds, state)
      if (editableIds.length === 0) return
      const selected = new Set(editableIds)
      appendCopies(
        state.elements.filter((element) => selected.has(element.id)),
        state
      )
    },
  }
}
