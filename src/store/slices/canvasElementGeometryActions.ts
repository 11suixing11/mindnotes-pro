import type { CanvasElement, CanvasLayer, UndoAction } from '../types'
import { isElementLayerEditable } from '../layers'
import { incrementSaveGeneration, scheduleSave } from '../saveManager'
import { getAtomicEditableIds } from './canvasElementRules'
import {
  createMoveElementPlan,
  createMoveElementsPlan,
  createResizeElementPlan,
  createRotateElementPlan,
  createRotateElementsPlan,
} from './canvasElementGeometry'
import { appendUndoAction } from './canvasElementCommit'

export interface MoveElementsOptions {
  recordHistory?: boolean
}

export interface CanvasElementGeometryActions {
  moveElementById: (id: string, dx: number, dy: number) => void
  moveElementsById: (ids: string[], dx: number, dy: number, options?: MoveElementsOptions) => void
  resizeElementById: (id: string, ax: number, ay: number, sx: number, sy: number) => void
  rotateElementById: (id: string, angle: number, cx?: number, cy?: number) => void
  rotateElementsById: (
    ids: string[],
    angleDelta: number,
    commonCenterX?: number,
    commonCenterY?: number
  ) => void
}

interface CanvasElementGeometryActionState {
  elements: CanvasElement[]
  layers: CanvasLayer[]
  activeLayerId: string
  selectedIds: string[]
  idToElement: Map<string, CanvasElement>
  idToIndex: Map<string, number>
  undoStack: UndoAction[]
}

interface CanvasElementGeometryActionContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any
  get: () => CanvasElementGeometryActionState
  rebuildIndexIfNeeded: () => void
  synchronizeElementGeometry: (
    elements: CanvasElement[],
    elementIds: string[],
    state: CanvasElementGeometryActionState
  ) => void
}

/** Store coordination for element geometry commands; deterministic plans remain pure. */
export function createCanvasElementGeometryActions(
  context: CanvasElementGeometryActionContext
): CanvasElementGeometryActions {
  const { set, get, rebuildIndexIfNeeded, synchronizeElementGeometry } = context

  const findElementIndex = (state: CanvasElementGeometryActionState, id: string) => {
    const indexed = state.idToIndex.get(id)
    return indexed ?? state.elements.findIndex((element) => element.id === id)
  }

  return {
    moveElementById: (id, dx, dy) => {
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return
      incrementSaveGeneration()

      const state = get()
      rebuildIndexIfNeeded()
      const index = findElementIndex(state, id)
      if (index < 0) return
      if (!isElementLayerEditable(state.elements[index], state.layers)) return

      const plan = createMoveElementPlan(
        state.elements,
        index,
        dx,
        dy,
        state.idToElement,
        state.idToIndex
      )
      synchronizeElementGeometry(
        plan.elements,
        plan.updatedElements.map((element) => element.id),
        state
      )
      set({ elements: plan.elements })
      scheduleSave()
    },

    moveElementsById: (ids, dx, dy, options = {}) => {
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return
      if (ids.length === 0) return
      incrementSaveGeneration()

      const state = get()
      const editableIds = getAtomicEditableIds(ids, state)
      if (editableIds.length === 0) return
      const plan = createMoveElementsPlan(
        state.elements,
        editableIds,
        dx,
        dy,
        state.idToElement,
        state.idToIndex,
        options.recordHistory !== false
      )
      if (!plan) {
        scheduleSave()
        return
      }

      synchronizeElementGeometry(
        plan.elements,
        plan.updatedElements.map((element) => element.id),
        state
      )
      set({
        elements: plan.elements,
        ...(plan.action
          ? {
              undoStack: appendUndoAction(state.undoStack, plan.action),
              redoStack: [],
            }
          : {}),
      })
      scheduleSave()
    },

    resizeElementById: (id, ax, ay, sx, sy) => {
      if (Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) return
      incrementSaveGeneration()

      const state = get()
      rebuildIndexIfNeeded()
      const index = findElementIndex(state, id)
      if (index < 0) return
      if (!isElementLayerEditable(state.elements[index], state.layers)) return

      const plan = createResizeElementPlan(state.elements, index, ax, ay, sx, sy)
      synchronizeElementGeometry(plan.elements, [id], state)
      set({ elements: plan.elements })
      scheduleSave()
    },

    rotateElementById: (id, angle, cx, cy) => {
      if (Math.abs(angle) < 0.0001) return
      incrementSaveGeneration()

      const state = get()
      rebuildIndexIfNeeded()
      const index = findElementIndex(state, id)
      if (index < 0) return
      if (!isElementLayerEditable(state.elements[index], state.layers)) return

      const plan = createRotateElementPlan(state.elements, index, angle, cx, cy)
      synchronizeElementGeometry(plan.elements, [id], state)
      set({ elements: plan.elements })
      scheduleSave()
    },

    rotateElementsById: (ids, angleDelta, commonCenterX, commonCenterY) => {
      if (Math.abs(angleDelta) < 0.0001) return
      if (ids.length === 0) return
      incrementSaveGeneration()

      const state = get()
      const editableIds = getAtomicEditableIds(ids, state)
      if (editableIds.length === 0) return
      const plan = createRotateElementsPlan(
        state.elements,
        editableIds,
        angleDelta,
        commonCenterX,
        commonCenterY
      )
      if (!plan) {
        scheduleSave()
        return
      }

      synchronizeElementGeometry(plan.elements, editableIds, state)
      set({ elements: plan.elements })
      scheduleSave()
    },
  }
}
