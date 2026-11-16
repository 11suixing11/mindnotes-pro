import type { ScreenBrushSize, ScreenStroke, ScreenTool } from './screenInk.js'
import { MAX_SCREEN_STROKES, MAX_SCREEN_TOTAL_POINTS, validScreenStroke } from './screenInk.js'
import { ANNOTATION_COLORS } from './model.js'
import type { AnnotationColor } from './model.js'

export const SCREEN_NOTE_FORMAT = 'mindnotes-pro.screen-notes'
export const SCREEN_NOTE_VERSION = 1
export const MAX_SCREEN_NOTE_BYTES = 32 * 1024 * 1024
export const MAX_SCREEN_BACKUP_BYTES = 256 * 1024 * 1024
export const MAX_SCREEN_NOTE_PIXELS = 40_000_000

export interface ScreenSource {
  app: string
  title: string
  display: string
}

export interface ScreenDraft {
  displayId: string
  width: number
  height: number
  strokes: ScreenStroke[]
  backgroundId: string | null
  source: ScreenSource
  updatedAt: number
}

export interface ScreenNote {
  id: string
  title: string
  comment: string
  source: ScreenSource
  width: number
  height: number
  strokes: ScreenStroke[]
  createdAt: number
  updatedAt: number
  revision: number
  trashedAt: number | null
}

export interface ScreenNoteSummary {
  id: string
  title: string
  preview: string
  source: ScreenSource
  createdAt: number
  updatedAt: number
  strokeCount: number
  trashedAt: number | null
  thumbnail: string
}

export interface ScreenNotePage {
  notes: ScreenNoteSummary[]
  total: number
  offset: number
}

export interface ScreenPreferences {
  color: AnnotationColor
  size: ScreenBrushSize
  tool: ScreenTool
  collapsed: boolean
  toolbar: { x: number; y: number } | null
}

export interface ScreenNotePatch {
  title?: string
  comment?: string
  strokes?: ScreenStroke[]
  expectedRevision?: number
  trashedAt?: number | null
}

/** Save receipts keep large, unchanged geometry inside the storage worker. */
export type ScreenNoteReceipt = Pick<
  ScreenNote,
  'id' | 'title' | 'comment' | 'updatedAt' | 'revision' | 'trashedAt'
>

export function validScreenStrokes(input: unknown): input is ScreenStroke[] {
  return (
    Array.isArray(input) &&
    input.length <= MAX_SCREEN_STROKES &&
    input.every(validScreenStroke) &&
    input.reduce((sum, stroke: ScreenStroke) => sum + stroke.points.length, 0) <=
      MAX_SCREEN_TOTAL_POINTS &&
    new Set(input.map((stroke: ScreenStroke) => stroke.id)).size === input.length
  )
}

export function screenSource(input: unknown): ScreenSource {
  if (!input || typeof input !== 'object') throw new Error('批注来源无效。')
  const source = input as ScreenSource
  if (
    ![source.app, source.title, source.display].every(
      (value) => typeof value === 'string' && value.length <= 500
    )
  )
    throw new Error('批注来源无效。')
  return { app: source.app, title: source.title, display: source.display }
}

export function validScreenId(input: unknown): input is string {
  return typeof input === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(input)
}

function dimension(input: unknown): input is number {
  return typeof input === 'number' && Number.isFinite(input) && input >= 1 && input <= 30_000
}

export function validateScreenDraft(input: unknown): ScreenDraft {
  if (!input || typeof input !== 'object') throw new Error('屏幕草稿无效。')
  const draft = input as ScreenDraft
  if (
    !validScreenId(draft.displayId) ||
    !dimension(draft.width) ||
    !dimension(draft.height) ||
    !validScreenStrokes(draft.strokes) ||
    !(draft.backgroundId === null || validScreenId(draft.backgroundId)) ||
    !Number.isSafeInteger(draft.updatedAt) ||
    draft.updatedAt < 0
  )
    throw new Error('屏幕草稿无效。')
  return {
    displayId: draft.displayId,
    width: draft.width,
    height: draft.height,
    strokes: draft.strokes,
    backgroundId: draft.backgroundId,
    source: screenSource(draft.source),
    updatedAt: draft.updatedAt,
  }
}

export function validateScreenNote(input: unknown): ScreenNote {
  if (!input || typeof input !== 'object') throw new Error('屏幕笔记无效。')
  const note = input as ScreenNote
  if (
    !validScreenId(note.id) ||
    typeof note.title !== 'string' ||
    !note.title.trim() ||
    note.title.length > 200 ||
    typeof note.comment !== 'string' ||
    note.comment.length > 20_000 ||
    !dimension(note.width) ||
    !dimension(note.height) ||
    !validScreenStrokes(note.strokes) ||
    !Number.isSafeInteger(note.createdAt) ||
    note.createdAt < 0 ||
    !Number.isSafeInteger(note.updatedAt) ||
    note.updatedAt < note.createdAt ||
    !Number.isSafeInteger(note.revision) ||
    note.revision < 1 ||
    !(note.trashedAt === null || (Number.isSafeInteger(note.trashedAt) && note.trashedAt >= 0))
  )
    throw new Error('屏幕笔记无效。')
  return {
    id: note.id,
    title: note.title,
    comment: note.comment,
    source: screenSource(note.source),
    width: note.width,
    height: note.height,
    strokes: note.strokes,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    revision: note.revision,
    trashedAt: note.trashedAt,
  }
}

/** A live draft follows the display's logical size; frozen drafts keep their image coordinates. */
export function resizeScreenDraft(draft: ScreenDraft, width: number, height: number): ScreenDraft {
  if (draft.backgroundId || (draft.width === width && draft.height === height)) return draft
  const scaleX = width / draft.width
  const scaleY = height / draft.height
  return validateScreenDraft({
    ...draft,
    width,
    height,
    strokes: draft.strokes.map((stroke) => ({
      ...stroke,
      width: Math.min(40, stroke.width * Math.min(scaleX, scaleY)),
      points: stroke.points.map((point) => ({ x: point.x * scaleX, y: point.y * scaleY })),
    })),
  })
}

export function validateScreenPatch(input: unknown): ScreenNotePatch {
  if (!input || typeof input !== 'object') throw new Error('笔记修改无效。')
  const patch = input as ScreenNotePatch
  if (
    patch.title !== undefined &&
    (typeof patch.title !== 'string' || !patch.title.trim() || patch.title.length > 200)
  )
    throw new Error('标题需要 1 至 200 个字符。')
  if (
    patch.comment !== undefined &&
    (typeof patch.comment !== 'string' || patch.comment.length > 20_000)
  )
    throw new Error('笔记文字不能超过 20000 个字符。')
  if (patch.strokes !== undefined && !validScreenStrokes(patch.strokes))
    throw new Error('笔迹无效。')
  if (
    patch.expectedRevision !== undefined &&
    (!Number.isSafeInteger(patch.expectedRevision) || patch.expectedRevision < 1)
  )
    throw new Error('笔记版本无效。')
  if (
    patch.trashedAt !== undefined &&
    !(patch.trashedAt === null || (Number.isSafeInteger(patch.trashedAt) && patch.trashedAt >= 0))
  )
    throw new Error('回收站修改无效。')
  return {
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    ...(patch.comment !== undefined ? { comment: patch.comment } : {}),
    ...(patch.strokes !== undefined ? { strokes: patch.strokes } : {}),
    ...(patch.expectedRevision !== undefined ? { expectedRevision: patch.expectedRevision } : {}),
    ...(patch.trashedAt !== undefined ? { trashedAt: patch.trashedAt } : {}),
  }
}

export function screenPreferences(input: unknown): ScreenPreferences {
  const value = (input && typeof input === 'object' ? input : {}) as Partial<ScreenPreferences>
  const toolbar =
    value.toolbar &&
    typeof value.toolbar.x === 'number' &&
    Number.isFinite(value.toolbar.x) &&
    typeof value.toolbar.y === 'number' &&
    Number.isFinite(value.toolbar.y) &&
    Math.abs(value.toolbar.x) < 100_000 &&
    Math.abs(value.toolbar.y) < 100_000
      ? value.toolbar
      : null
  return {
    color: ANNOTATION_COLORS.includes(value.color as AnnotationColor)
      ? (value.color as AnnotationColor)
      : '#e05d52',
    size: ['thin', 'medium', 'thick'].includes(value.size ?? '')
      ? (value.size as ScreenBrushSize)
      : 'medium',
    tool: ['pointer', 'pen', 'highlight', 'erase'].includes(value.tool ?? '')
      ? (value.tool as ScreenTool)
      : 'pen',
    collapsed: value.collapsed !== false,
    toolbar,
  }
}

export interface ScreenNotebookBridge {
  readonly isDesktop: true
  list(query?: string, offset?: number, trash?: boolean): Promise<ScreenNotePage>
  subscribe(listener: () => void): () => void
  getNote(id: string): Promise<ScreenNote>
  getImage(id: string): Promise<string>
  updateNote(id: string, patch: ScreenNotePatch): Promise<ScreenNoteReceipt>
  exportNote(id: string, format: 'png' | 'json' | 'markdown'): Promise<string | null>
  exportRecovery(note: ScreenNote, image: string): Promise<string | null>
  exportAll(): Promise<string | null>
  importBackup(): Promise<number | null>
  flushEdits(): Promise<void>
}

declare global {
  interface Window {
    mindnotesNotebook?: ScreenNotebookBridge
  }
}
