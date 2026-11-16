import type { AnnotationColor, NotePoint } from './model.js'
import type { ScreenBrushSize, ScreenStroke, ScreenTool } from './screenInk.js'
import type { ScreenSource } from './screenNotebook.js'

export type FloatingCommand =
  | 'collapse'
  | 'expand'
  | 'pointer'
  | 'undo'
  | 'redo'
  | 'clear'
  | 'save'
  | 'workspace'
  | 'quit'
  | 'freeze'
  | 'live'
  | 'retry-save'
  | 'brush-panel'
  | 'more-panel'
  | 'close-panel'
  | 'export-draft'
  | 'import-draft'
  | 'force-quit'

export interface FloatingState {
  tool: ScreenTool
  color: AnnotationColor
  size: ScreenBrushSize
  collapsed: boolean
  capturing: boolean
  count: number
  canUndo: boolean
  canRedo: boolean
  message: string | null
  shortcutAvailable: boolean
  frozen: boolean
  recovered: boolean
  saveState: 'saved' | 'saving' | 'error'
  panel: 'brush' | 'more' | null
  mouseModeHidesInk?: boolean
}

export interface ScreenInkState {
  tool: ScreenTool
  color: AnnotationColor
  size: ScreenBrushSize
  strokes: ScreenStroke[]
  inputEnabled: boolean
  capturing: boolean
  width: number
  height: number
  background: string | null
  source: ScreenSource
}

export interface FloatingBridge {
  readonly surface: 'toolbar'
  getState(): Promise<FloatingState>
  subscribe(listener: (state: FloatingState) => void): () => void
  configure(tool: ScreenTool, color: AnnotationColor, size: ScreenBrushSize): Promise<void>
  command(command: FloatingCommand): Promise<void>
}

export interface ScreenInkBridge {
  readonly surface: 'screen'
  getState(): Promise<ScreenInkState>
  subscribe(listener: (state: Partial<ScreenInkState>) => void): () => void
  addStroke(stroke: ScreenStroke): Promise<void>
  erase(points: NotePoint[]): Promise<void>
  releasePointer(): void
}

declare global {
  interface Window {
    mindnotesFloating?: FloatingBridge
    mindnotesScreen?: ScreenInkBridge
  }
}
