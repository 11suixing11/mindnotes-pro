import type {
  CanvasBackgroundStyle,
  CanvasBackgroundImage,
  CanvasDoc,
  CanvasElement,
  CanvasLayer,
  UndoAction,
} from '../types'
import { createDefaultLayer } from '../layers'

// 清空画布会把背景一并重置到这两个默认值（见 canvasElementMutationActions.clearAll）。
export const DEFAULT_BG_COLOR = '#ffffff'
export const DEFAULT_BG_STYLE: CanvasBackgroundStyle = 'plain'

/** 背景是否还带着用户自定义设置（贴图 / 颜色 / 样式）。字段缺失视为默认。 */
export function backgroundNeedsReset(state: {
  backgroundImage?: CanvasBackgroundImage | null
  bgColor?: string
  backgroundStyle?: CanvasBackgroundStyle
}): boolean {
  if (state.backgroundImage != null) return true
  return (
    (state.bgColor !== undefined && state.bgColor !== DEFAULT_BG_COLOR) ||
    (state.backgroundStyle !== undefined && state.backgroundStyle !== DEFAULT_BG_STYLE)
  )
}

export interface DocumentWorkspaceState {
  currentDocId: string | null
  elements: CanvasElement[]
  layers: CanvasLayer[]
  activeLayerId: string
  bgColor: string
  backgroundStyle: CanvasBackgroundStyle
  backgroundImage?: CanvasBackgroundImage
  undoStack: UndoAction[]
  redoStack: UndoAction[]
}

export interface DocumentWorkspaceOptions {
  history?: 'document' | 'empty'
}

export function createDocumentWorkspaceState(
  document: CanvasDoc | undefined,
  options: DocumentWorkspaceOptions = {}
): DocumentWorkspaceState {
  const layers = document?.layers ?? [createDefaultLayer()]
  const history = options.history ?? 'document'

  return {
    currentDocId: document?.id ?? null,
    elements: document?.elements ?? [],
    layers,
    activeLayerId: document?.activeLayerId ?? layers[0]?.id ?? createDefaultLayer().id,
    bgColor: document?.bgColor ?? DEFAULT_BG_COLOR,
    backgroundStyle: document?.backgroundStyle ?? DEFAULT_BG_STYLE,
    backgroundImage: document?.backgroundImage,
    undoStack: history === 'document' ? (document?.undoStack ?? []) : [],
    redoStack: history === 'document' ? (document?.redoStack ?? []) : [],
  }
}
