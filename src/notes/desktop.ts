import type { AnnotationColor, AnnotationTool, PageAnnotation, PageNotebook } from './model.js'

export interface NotesWorkspaceState {
  pages: PageNotebook[]
  currentUrl: string | null
  title: string
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
  canUndo: boolean
  canRedo: boolean
  tool: AnnotationTool
  color: AnnotationColor
  activeAnnotationId: string | null
  unresolvedAnnotationIds: string[]
  saveState: 'saved' | 'saving' | 'error'
  recoveryNotice: string | null
  error: string | null
}

export interface PageOverlayState {
  annotations: PageAnnotation[]
  tool: AnnotationTool
  color: AnnotationColor
  activeAnnotationId: string | null
}

export type PageEdit =
  | { type: 'add'; annotation: PageAnnotation }
  | { type: 'delete'; id: string }
  | { type: 'select'; id: string }
  | { type: 'browse' }
  | { type: 'undo' }
  | { type: 'redo' }

export interface PageBridge {
  ready(): void
  edit(edit: PageEdit): void
  reportPositions(unresolvedIds: string[]): void
  subscribe(listener: (state: PageOverlayState) => void): () => void
}

export type BrowserCommand =
  'back' | 'forward' | 'reload' | 'capture' | 'undo' | 'redo' | 'home' | 'floating' | 'force-quit'

export interface NotesBridge {
  readonly isDesktop: boolean
  getState(): Promise<NotesWorkspaceState>
  subscribe(listener: (state: NotesWorkspaceState) => void): () => void
  navigate(url: string): Promise<void>
  setViewport(rect: { x: number; y: number; width: number; height: number } | null): void
  command(command: BrowserCommand): Promise<void>
  configure(tool: AnnotationTool, color: AnnotationColor): Promise<void>
  updateAnnotation(url: string, id: string, comment: string): Promise<void>
  deleteAnnotation(id: string): Promise<void>
  revealAnnotation(id: string): Promise<void>
  exportNotes(format: 'markdown' | 'json', scope: 'page' | 'all'): Promise<string | null>
  importNotes(content: string): Promise<void>
}

declare global {
  interface Window {
    mindnotes?: NotesBridge
    __mindnotesPage?: PageBridge
    __mindnotesOverlay?: {
      captureSelection(): boolean
      reveal(id: string): boolean
    }
  }
}
