import type { CanvasElement, UndoAction } from '../types'
import { MAX_HISTORY } from './history'

export interface CommitElementsOptions {
  action?: UndoAction
  selectedIds?: string[]
  clearRedo?: boolean
  undoStack?: UndoAction[]
}

export interface CanvasElementCommitContext {
  elements: CanvasElement[]
  selectedIds: string[]
  undoStack: UndoAction[]
}

export interface CanvasElementCommitPlan {
  elements: CanvasElement[]
  selectedIds: string[]
  undoStack: UndoAction[]
  clearRedo: boolean
}

export function appendUndoAction(undoStack: UndoAction[], action: UndoAction): UndoAction[] {
  return [...undoStack.slice(-MAX_HISTORY), action]
}

export function createCanvasElementCommitPlan(
  context: CanvasElementCommitContext,
  nextElements: CanvasElement[],
  options: CommitElementsOptions = {}
): CanvasElementCommitPlan | null {
  const hasElementChanges =
    context.elements.length !== nextElements.length ||
    context.elements.some((element, index) => element !== nextElements[index])
  const nextIds = new Set(nextElements.map((element) => element.id))
  const selectedIds = (options.selectedIds ?? context.selectedIds).filter((id) => nextIds.has(id))
  const selectionChanged =
    selectedIds.length !== context.selectedIds.length ||
    selectedIds.some((id, index) => id !== context.selectedIds[index])
  const hasExplicitUndoStack = options.undoStack !== undefined

  if (!hasElementChanges && !selectionChanged && !options.action && !hasExplicitUndoStack) {
    return null
  }

  const baseUndoStack = options.undoStack ?? context.undoStack
  const undoStack = options.action ? appendUndoAction(baseUndoStack, options.action) : baseUndoStack

  return {
    elements: nextElements,
    selectedIds,
    undoStack,
    clearRedo: options.clearRedo ?? Boolean(options.action || hasExplicitUndoStack),
  }
}
