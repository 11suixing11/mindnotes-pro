import type {
  AlignmentType,
  CanvasElement,
  CanvasLayer,
  DistributionType,
  UndoAction,
} from '../types'
import { incrementSaveGeneration, scheduleSave } from '../saveManager'
import { getAtomicEditableIds } from './canvasElementRules'
import {
  createAlignmentPlan,
  createDistributionPlan,
  createReorderPlan,
  type ElementReorderMode,
} from './canvasElementArrangement'
import { appendUndoAction, type CommitElementsOptions } from './canvasElementCommit'
import { getSelectionStyleModel } from './canvasElementStyle'

export type SelectionReorderResult =
  | { status: 'applied' | 'unchanged'; affectedIds: string[] }
  | {
      status: 'blocked'
      reason: 'empty-selection' | 'locked-selection'
      affectedIds: string[]
      lockedIds: string[]
    }

export interface CanvasElementArrangementActions {
  alignSelected: (alignment: AlignmentType) => void
  distributeSelected: (distribution: DistributionType) => void
  reorderSelected: (mode: ElementReorderMode) => SelectionReorderResult
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
  commitElements: (elements: CanvasElement[], options?: CommitElementsOptions) => void
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
  const { set, get, commitElements, synchronizeElementGeometry } = context

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
      const editableIds = getAtomicEditableIds(state.selectedIds, state)
      if (editableIds.length < 2) return

      const plan = createAlignmentPlan(state.elements, editableIds, alignment)
      if (!plan) return
      commitArrangement(state, plan, editableIds)
    },

    distributeSelected: (distribution) => {
      const state = get()
      if (state.selectedIds.length < 3) return
      const editableIds = getAtomicEditableIds(state.selectedIds, state)
      if (editableIds.length < 3) return

      const plan = createDistributionPlan(state.elements, editableIds, distribution)
      if (!plan) return
      commitArrangement(state, plan, editableIds)
    },

    reorderSelected: (mode) => {
      const state = get()
      const selection = getSelectionStyleModel(state)
      if (selection.count === 0) {
        return {
          status: 'blocked',
          reason: 'empty-selection',
          affectedIds: [],
          lockedIds: [],
        }
      }
      if (selection.isLocked) {
        return {
          status: 'blocked',
          reason: 'locked-selection',
          affectedIds: selection.selectedIds,
          lockedIds: selection.lockedIds,
        }
      }

      const plan = createReorderPlan(state.elements, selection.selectedIds, mode)
      if (!plan) return { status: 'unchanged', affectedIds: selection.selectedIds }

      commitElements(plan.elements, {
        action: plan.action,
        selectedIds: selection.selectedIds,
      })
      return { status: 'applied', affectedIds: selection.selectedIds }
    },
  }
}
