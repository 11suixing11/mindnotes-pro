import type { CanvasElement, CanvasLayer } from '../types'
import type { CommitElementsOptions } from './canvasElementCommit'
import {
  createSelectionStylePlan,
  type SelectionStyleApplyResult,
  type SelectionStylePatch,
} from './canvasElementStyle'

export interface CanvasElementStyleActions {
  applyStyleToSelected: (patch: SelectionStylePatch) => SelectionStyleApplyResult
}

interface CanvasElementStyleActionState {
  elements: CanvasElement[]
  layers: CanvasLayer[]
  selectedIds: string[]
  idToElement: Map<string, CanvasElement>
}

interface CanvasElementStyleActionContext {
  get: () => CanvasElementStyleActionState
  commitElements: (elements: CanvasElement[], options?: CommitElementsOptions) => void
}

export function createCanvasElementStyleActions(
  context: CanvasElementStyleActionContext
): CanvasElementStyleActions {
  const { get, commitElements } = context

  return {
    applyStyleToSelected: (patch) => {
      const state = get()
      const result = createSelectionStylePlan(state, patch)
      if (result.status !== 'applied') return result

      commitElements(result.plan.elements, {
        action: result.plan.action,
        selectedIds: result.affectedIds,
      })
      return {
        status: 'applied',
        affectedIds: result.affectedIds,
        applicableKeys: result.applicableKeys,
        ignoredKeys: result.ignoredKeys,
      }
    },
  }
}
