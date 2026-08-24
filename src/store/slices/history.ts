import type { CanvasElement, UndoAction } from '../types'
import { incrementSaveGeneration, scheduleSave } from '../saveManager'
import { getContentBounds } from '../../canvas/canvasUtils'
import { useViewStore } from '../useViewStore'
import { useToastStore } from '../toastStore'
import {
  synchronizeElementCollection,
  type CanvasElementCollectionRuntime,
} from './canvasElementCollection'
import {
  createRedoTransition,
  createUndoTransition,
  getAffectedElementIds,
} from './historyTransitions'

export const MAX_HISTORY = 50
const FOCUS_VISIBILITY_PADDING = 24

function focusAffectedElements(
  affectedIds: string[],
  currentElements: CanvasElement[],
  setFn: (state: { selectedIds: string[] }) => void
) {
  const existingIds = affectedIds.filter((id) => currentElements.some((el) => el.id === id))

  setFn({ selectedIds: existingIds })

  if (existingIds.length > 0) {
    const affectedElements = currentElements.filter((el) => existingIds.includes(el.id))
    const bounds = getContentBounds(affectedElements, 40)
    if (bounds && !isBoundsVisibleInCurrentView(bounds)) {
      useViewStore.getState().zoomToFit(bounds)
    }
  }
}

function isBoundsVisibleInCurrentView(bounds: { x: number; y: number; w: number; h: number }) {
  const { viewBox } = useViewStore.getState()
  const zoom = viewBox.zoom || 1
  const width = typeof window === 'undefined' ? 1024 : window.innerWidth
  const height = typeof window === 'undefined' ? 768 : window.innerHeight
  const pad = FOCUS_VISIBILITY_PADDING / zoom
  const left = viewBox.x + pad
  const top = viewBox.y + pad
  const right = viewBox.x + width / zoom - pad
  const bottom = viewBox.y + height / zoom - pad

  return (
    bounds.x >= left &&
    bounds.y >= top &&
    bounds.x + bounds.w <= right &&
    bounds.y + bounds.h <= bottom
  )
}

function getElementActionLabel(element?: CanvasElement): string {
  if (!element) return 'Update element'

  if (element.type === 'stroke') return 'Draw stroke'
  if (element.type === 'text') return 'Add text'
  if (element.type === 'image') return 'Insert image'
  if (element.kind === 'rectangle') return 'Draw rectangle'
  if (element.kind === 'circle') return 'Draw circle'
  if (element.kind === 'line') return 'Draw line'
  if (element.kind === 'arrow') return 'Draw arrow'
  return 'Add shape'
}

export function getHistoryActionLabel(action: UndoAction): string {
  switch (action.type) {
    case 'add':
      return action.els?.length === 1
        ? getElementActionLabel(action.els[0])
        : `Add ${action.ids.length} elements`
    case 'remove':
      return action.items.length === 1 ? 'Delete element' : `Delete ${action.items.length} elements`
    case 'clear':
      return 'Clear canvas'
    case 'snapshot':
      return action.label
    case 'move':
      return action.deltas.length === 1 ? 'Move element' : `Move ${action.deltas.length} elements`
    case 'erase':
      return 'Erase stroke'
    case 'group':
      return `Group ${action.elementIds.length} elements`
    case 'ungroup':
      return action.groupIds.length === 1
        ? 'Ungroup elements'
        : `Ungroup ${action.groupIds.length} groups`
    case 'lock':
      return action.elementIds.length === 1
        ? 'Lock element'
        : `Lock ${action.elementIds.length} elements`
    case 'unlock':
      return action.elementIds.length === 1
        ? 'Unlock element'
        : `Unlock ${action.elementIds.length} elements`
  }
}

export function getHistoryFeedbackMessage(
  direction: 'Undo' | 'Redo',
  action: UndoAction,
  stepsRemaining: number
): string {
  const historyName = direction === 'Undo' ? 'undo' : 'redo'
  const stepLabel = stepsRemaining === 1 ? 'step' : 'steps'
  return `${direction}: ${getHistoryActionLabel(action)} · ${stepsRemaining} ${historyName} ${stepLabel} left`
}

function showHistoryFeedback(
  direction: 'Undo' | 'Redo',
  action: UndoAction,
  stepsRemaining: number
) {
  useToastStore
    .getState()
    .show(getHistoryFeedbackMessage(direction, action, stepsRemaining), 'info', 1800)
}

export interface HistoryState {
  undoStack: UndoAction[]
  redoStack: UndoAction[]
}

export interface HistoryActions {
  undo: () => void
  redo: () => void
  pushUndo: (action: UndoAction) => void
}

function synchronizeHistoryRuntime(state: Record<string, unknown>, elements: CanvasElement[]) {
  const spatialIndex = state.spatialIndex
  const idToElement = state.idToElement
  const idToIndex = state.idToIndex
  if (!spatialIndex || !(idToElement instanceof Map) || !(idToIndex instanceof Map)) {
    return
  }

  const runtime: CanvasElementCollectionRuntime = {
    spatialIndex: spatialIndex as CanvasElementCollectionRuntime['spatialIndex'],
    idToElement: idToElement as Map<string, CanvasElement>,
    idToIndex: idToIndex as Map<string, number>,
  }
  synchronizeElementCollection(runtime, elements)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createHistorySlice(set: any, get: any): HistoryState & HistoryActions {
  return {
    undoStack: [],
    redoStack: [],

    pushUndo: (action) => {
      const state = get()
      set({ undoStack: [...state.undoStack.slice(-MAX_HISTORY), action], redoStack: [] })
    },

    undo: () => {
      const { undoStack, redoStack, elements } = get()
      if (undoStack.length === 0) return
      const action: UndoAction = undoStack[undoStack.length - 1]
      const transition = createUndoTransition(elements, action)

      set({
        elements: transition.elements,
        redoStack: [...redoStack, transition.inverseAction],
        undoStack: undoStack.slice(0, -1),
      })

      focusAffectedElements(getAffectedElementIds(action), transition.elements, set)
      synchronizeHistoryRuntime(get(), transition.elements)
      showHistoryFeedback('Undo', action, undoStack.length - 1)
      incrementSaveGeneration()
      scheduleSave()
    },

    redo: () => {
      const { redoStack, elements, undoStack } = get()
      if (redoStack.length === 0) return
      const action: UndoAction = redoStack[redoStack.length - 1]
      const transition = createRedoTransition(elements, action)

      set({
        elements: transition.elements,
        redoStack: redoStack.slice(0, -1),
        undoStack: [...undoStack, transition.inverseAction],
      })

      focusAffectedElements(getAffectedElementIds(action), transition.elements, set)
      synchronizeHistoryRuntime(get(), transition.elements)
      showHistoryFeedback('Redo', action, redoStack.length - 1)
      incrementSaveGeneration()
      scheduleSave()
    },
  }
}
