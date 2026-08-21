import type {
  AlignmentType,
  CanvasElement,
  CanvasLayer,
  DistributionType,
  UndoAction,
} from '../types'
import { incrementSaveGeneration, scheduleSave } from '../saveManager'
import { getEditableIds } from './canvasElementRules'
import { createAlignmentPlan, createDistributionPlan } from './canvasElementArrangement'
import { appendUndoAction } from './canvasElementCommit'

export interface CanvasElementArrangementActions {
  alignSelected: (alignment: AlignmentType) => void
  distributeSelected: (distribution: DistributionType) => void
}

interface CanvasElementArrangementActionState {
  elements: CanvasElement[]
  layers: CanvasLayer[]
  activeLayerId: string
  selectedIds: string[]
  idToElement: Map<string, CanvasElement>
  idToIndex: Map<string, number>
  undoStack: UndoAction[]
}

interface CanvasElementArrangementActionContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any
  get: () => CanvasElementArrangementActionState
  synchronizeElementGeometry: (
    elements: CanvasElement[],
    elementIds: string[],
    state: CanvasElementArrangementActionState
  ) => void
}

/** Store coordination for alignment and distribution commands; plans remain pure. */
export function createCanvasElementArrangementActions(
  context: CanvasElementArrangementActionContext
): CanvasElementArrangementActions {
  const { set, get, synchronizeElementGeometry } = context

  const commitArrangement = (
    state: CanvasElementArrangementActionState,
    plan: { elements: CanvasElement[]; action: UndoAction },
    elementIds: string[]
  ) => {
    synchronizeElementGeometry(plan.elements, elementIds, state)
    incrementSaveGeneration()
    set({
      elements: plan.elements,
      selectedIds: elementIds,
      undoStack: appendUndoAction(state.undoStack, plan.action),
      redoStack: [],
    })
    scheduleSave()
  }

  return {
    alignSelected: (alignment) => {
      const state = get()
      if (state.selectedIds.length < 2) return
      const editableIds = getEditableIds(state.selectedIds, state)
      if (editableIds.length < 2) return

      const plan = createAlignmentPlan(state.elements, editableIds, alignment)
      if (!plan) return
      commitArrangement(state, plan, editableIds)
    },

    distributeSelected: (distribution) => {
      const state = get()
      if (state.selectedIds.length < 3) return
      const editableIds = getEditableIds(state.selectedIds, state)
      if (editableIds.length < 3) return

      const plan = createDistributionPlan(state.elements, editableIds, distribution)
      if (!plan) return
      commitArrangement(state, plan, editableIds)
    },
  }
}
