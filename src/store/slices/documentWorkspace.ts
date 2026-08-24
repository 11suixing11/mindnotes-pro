import type {
  CanvasBackgroundStyle,
  CanvasDoc,
  CanvasElement,
  CanvasLayer,
  UndoAction,
} from '../types'
import { createDefaultLayer } from '../layers'

export interface DocumentWorkspaceState {
  currentDocId: string | null
  elements: CanvasElement[]
  layers: CanvasLayer[]
  activeLayerId: string
  bgColor: string
  backgroundStyle: CanvasBackgroundStyle
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
    bgColor: document?.bgColor ?? '#ffffff',
    backgroundStyle: document?.backgroundStyle ?? 'plain',
    undoStack: history === 'document' ? (document?.undoStack ?? []) : [],
    redoStack: history === 'document' ? (document?.redoStack ?? []) : [],
  }
}
