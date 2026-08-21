import type { CanvasElement, CanvasLayer, UndoAction } from '../types'
import { incrementSaveGeneration, scheduleSave } from '../saveManager'
import { getEditableIds } from './canvasElementRules'
import { createElementLockPlan, createGroupPlan, createUngroupPlan } from './canvasElementMetadata'
import { appendUndoAction } from './canvasElementCommit'

export interface CanvasElementMetadataActions {
  groupSelected: () => void
  ungroupSelected: () => void
  lockSelected: () => void
  unlockSelected: () => void
}

interface CanvasElementMetadataActionState {
  elements: CanvasElement[]
  layers: CanvasLayer[]
  activeLayerId: string
  selectedIds: string[]
  idToElement: Map<string, CanvasElement>
  idToIndex: Map<string, number>
  undoStack: UndoAction[]
}

interface CanvasElementMetadataActionContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any
  get: () => CanvasElementMetadataActionState
  synchronizeElementReferences: (
    elements: CanvasElement[],
    state: CanvasElementMetadataActionState
  ) => void
}

/** Store coordination for group and lock commands; metadata transforms remain pure. */
export function createCanvasElementMetadataActions(
  context: CanvasElementMetadataActionContext
): CanvasElementMetadataActions {
  const { set, get, synchronizeElementReferences } = context

  const commitMetadataPlan = (
    state: CanvasElementMetadataActionState,
    plan: {
      elements: CanvasElement[]
      updatedElements: CanvasElement[]
      action: UndoAction
    },
    selectedIds: string[]
  ) => {
    synchronizeElementReferences(plan.updatedElements, state)
    incrementSaveGeneration()
    set({
      elements: plan.elements,
      selectedIds,
      undoStack: appendUndoAction(state.undoStack, plan.action),
      redoStack: [],
    })
    scheduleSave()
  }

  return {
    groupSelected: () => {
      const state = get()
      if (state.selectedIds.length < 2) return
      const editableIds = getEditableIds(state.selectedIds, state)
      if (editableIds.length < 2) return

      const plan = createGroupPlan(state.elements, editableIds, `group-${Date.now()}`)
      commitMetadataPlan(state, plan, editableIds)
    },

    ungroupSelected: () => {
      const state = get()
      if (state.selectedIds.length === 0) return
      const editableIds = getEditableIds(state.selectedIds, state)
      if (editableIds.length === 0) return

      const plan = createUngroupPlan(state.elements, editableIds)
      if (!plan) return
      commitMetadataPlan(state, plan, editableIds)
    },

    lockSelected: () => {
      const state = get()
      if (state.selectedIds.length === 0) return

      const plan = createElementLockPlan(state.elements, state.selectedIds, state.layers, true)
      if (!plan) return
      commitMetadataPlan(state, plan, state.selectedIds)
    },

    unlockSelected: () => {
      const state = get()
      if (state.selectedIds.length === 0) return

      const plan = createElementLockPlan(state.elements, state.selectedIds, state.layers, false)
      if (!plan) return
      commitMetadataPlan(state, plan, state.selectedIds)
    },
  }
}
