import type { CanvasElement, CanvasWorkspaceMetadata, UndoAction } from '../types'
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
  MAX_HISTORY,
} from './historyTransitions'

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
  if (!element) return '更新元素'

  if (element.type === 'stroke') return '绘制笔画'
  if (element.type === 'text') return '添加文字'
  if (element.type === 'image') return '插入图片'
  if (element.kind === 'rectangle') return '绘制矩形'
  if (element.kind === 'circle') return '绘制圆形'
  if (element.kind === 'line') return '绘制直线'
  if (element.kind === 'arrow') return '绘制箭头'
  return '添加形状'
}

export function getHistoryActionLabel(action: UndoAction): string {
  switch (action.type) {
    case 'add':
      return action.els?.length === 1
        ? getElementActionLabel(action.els[0])
        : `添加 ${action.ids.length} 个元素`
    case 'remove':
      return action.items.length === 1 ? '删除元素' : `删除 ${action.items.length} 个元素`
    case 'clear':
      return '清空画布'
    case 'snapshot':
      return action.label
    case 'move':
      return action.deltas.length === 1 ? '移动元素' : `移动 ${action.deltas.length} 个元素`
    case 'erase':
      return '擦除笔画'
    case 'group':
      return `组合 ${action.elementIds.length} 个元素`
    case 'ungroup':
      return action.groupIds.length === 1 ? '取消组合' : `取消组合 ${action.groupIds.length} 组`
    case 'lock':
      return action.elementIds.length === 1 ? '锁定元素' : `锁定 ${action.elementIds.length} 个元素`
    case 'unlock':
      return action.elementIds.length === 1 ? '解锁元素' : `解锁 ${action.elementIds.length} 个元素`
  }
}

export function getHistoryFeedbackMessage(
  direction: 'Undo' | 'Redo',
  action: UndoAction,
  stepsRemaining: number
): string {
  const historyName = direction === 'Undo' ? '撤销' : '重做'
  return `${historyName}：${getHistoryActionLabel(action)} · 还可${historyName} ${stepsRemaining} 步`
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

function createWorkspaceHistoryPatch(
  state: Record<string, unknown>,
  workspace: CanvasWorkspaceMetadata,
  elements: CanvasElement[],
  undoStack: UndoAction[],
  redoStack: UndoAction[]
) {
  const currentDocId = typeof state.currentDocId === 'string' ? state.currentDocId : null
  const docs = Array.isArray(state.docs)
    ? state.docs.map((doc: { id?: string }) =>
        doc.id === currentDocId
          ? {
              ...doc,
              title: workspace.title,
              elements,
              layers: workspace.layers,
              activeLayerId: workspace.activeLayerId,
              bgColor: workspace.bgColor,
              backgroundStyle: workspace.backgroundStyle,
              backgroundImage: workspace.backgroundImage,
              updatedAt: Date.now(),
              undoStack,
              redoStack,
            }
          : doc
      )
    : state.docs

  return {
    docs,
    elements,
    layers: workspace.layers,
    activeLayerId: workspace.activeLayerId,
    bgColor: workspace.bgColor,
    backgroundStyle: workspace.backgroundStyle,
    backgroundImage: workspace.backgroundImage,
    selectedIds: [],
  }
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
      const nextUndoStack = undoStack.slice(0, -1)
      const nextRedoStack = [...redoStack, transition.inverseAction]

      set({
        ...(action.type === 'snapshot' && action.workspace
          ? createWorkspaceHistoryPatch(
              get(),
              action.workspace.before,
              transition.elements,
              nextUndoStack,
              nextRedoStack
            )
          : {}),
        elements: transition.elements,
        redoStack: nextRedoStack,
        undoStack: nextUndoStack,
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
      const nextRedoStack = redoStack.slice(0, -1)
      const nextUndoStack = [...undoStack, transition.inverseAction]

      set({
        ...(action.type === 'snapshot' && action.workspace
          ? createWorkspaceHistoryPatch(
              get(),
              action.workspace.after,
              transition.elements,
              nextUndoStack,
              nextRedoStack
            )
          : {}),
        elements: transition.elements,
        redoStack: nextRedoStack,
        undoStack: nextUndoStack,
      })

      focusAffectedElements(getAffectedElementIds(action), transition.elements, set)
      synchronizeHistoryRuntime(get(), transition.elements)
      showHistoryFeedback('Redo', action, redoStack.length - 1)
      incrementSaveGeneration()
      scheduleSave()
    },
  }
}
