import type { CanvasElement, UndoAction } from '../types'
import { shallowClone } from '../helpers'
import { incrementSaveGeneration, scheduleSave } from '../saveManager'
import type { CommitElementsOptions } from './canvasElementCommit'

export interface CanvasElementSnapshotActions {
  batchErase: (
    beforeSnapshot: CanvasElement[],
    added: CanvasElement[],
    baseUndoStack?: UndoAction[]
  ) => void
  restoreElementsSnapshot: (elements: CanvasElement[], selectedIds?: string[]) => void
}

interface CanvasElementSnapshotActionState {
  elements: CanvasElement[]
  selectedIds: string[]
}

interface CanvasElementSnapshotActionContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any
  get: () => CanvasElementSnapshotActionState
  commitElements: (elements: CanvasElement[], options?: CommitElementsOptions) => void
  replaceElementCollection: (
    elements: CanvasElement[],
    state: CanvasElementSnapshotActionState
  ) => void
}

/** Store coordination for eraser commits and transient snapshot restoration. */
export function createCanvasElementSnapshotActions(
  context: CanvasElementSnapshotActionContext
): CanvasElementSnapshotActions {
  const { set, get, commitElements, replaceElementCollection } = context

  return {
    batchErase: (beforeSnapshot, _added, baseUndoStack) => {
      const state = get()
      const action: UndoAction = {
        type: 'erase',
        before: beforeSnapshot.map(shallowClone),
        after: state.elements.map(shallowClone),
      }
      commitElements(state.elements, {
        action,
        selectedIds: [],
        undoStack: baseUndoStack,
      })
    },

    restoreElementsSnapshot: (elements, selectedIds = get().selectedIds) => {
      const nextElements = elements.map(shallowClone)
      const nextIds = new Set(nextElements.map((element) => element.id))
      incrementSaveGeneration()
      set({
        elements: nextElements,
        selectedIds: selectedIds.filter((id) => nextIds.has(id)),
      })
      replaceElementCollection(nextElements, get())
      scheduleSave()
    },
  }
}
