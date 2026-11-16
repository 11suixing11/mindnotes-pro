import { commitHistory, redoHistory, startHistory, undoHistory } from '../src/notes/history.js'
import type { AnnotationHistory } from '../src/notes/history.js'
import {
  ANNOTATION_COLORS,
  createNotebook,
  isAnnotation,
  mergeNotebooks,
  pageKey,
} from '../src/notes/model.js'
import type {
  AnnotationColor,
  AnnotationTool,
  PageAnnotation,
  PageNotebook,
} from '../src/notes/model.js'
import type { NotesWorkspaceState, PageEdit, PageOverlayState } from '../src/notes/desktop.js'
import type { NotebookRepository } from './notebookRepository.mjs'

export class NotesWorkspace {
  private pages: PageNotebook[] = []
  private readonly histories = new Map<string, AnnotationHistory>()
  private saveRevision = 0
  private pendingSave: Promise<void> = Promise.resolve()
  private saveError: string | null = null
  private lastCommentEdit: { url: string; id: string; at: number } | null = null
  private readonly meta: Omit<NotesWorkspaceState, 'pages' | 'canUndo' | 'canRedo'> = {
    currentUrl: null,
    title: '',
    loading: false,
    canGoBack: false,
    canGoForward: false,
    tool: 'browse',
    color: '#e0a11b',
    activeAnnotationId: null,
    unresolvedAnnotationIds: [],
    saveState: 'saved',
    recoveryNotice: null,
    error: null,
  }

  constructor(
    private readonly repository: NotebookRepository,
    private readonly changed: () => void
  ) {}

  async load(): Promise<void> {
    try {
      this.pages = await this.repository.load()
      this.meta.recoveryNotice = this.repository.recoveryNotice
    } catch (error) {
      this.meta.saveState = 'error'
      this.meta.error = error instanceof Error ? error.message : '本地笔记无法读取。'
      this.saveError = this.meta.error
    }
  }

  get snapshot(): NotesWorkspaceState {
    const history = this.meta.currentUrl ? this.histories.get(this.meta.currentUrl) : null
    return {
      ...this.meta,
      pages: [...this.pages].sort((a, b) => b.updatedAt - a.updatedAt),
      unresolvedAnnotationIds: [...this.meta.unresolvedAnnotationIds],
      canUndo: Boolean(history?.past.length),
      canRedo: Boolean(history?.future.length),
    }
  }

  get current(): PageNotebook | null {
    return this.pages.find((page) => page.url === this.meta.currentUrl) ?? null
  }

  get overlay(): PageOverlayState {
    return {
      annotations: this.current?.annotations ?? [],
      tool: this.meta.tool,
      color: this.meta.color,
      activeAnnotationId: this.meta.activeAnnotationId,
    }
  }

  open(url: string, title: string): void {
    const key = pageKey(url)
    if (key !== this.meta.currentUrl) {
      this.lastCommentEdit = null
      this.meta.activeAnnotationId = null
      this.meta.unresolvedAnnotationIds = []
      this.meta.tool = 'browse'
    }
    this.meta.currentUrl = key
    this.meta.title = title || new URL(url).hostname
    if (this.meta.saveState !== 'error') this.meta.error = null
    const page = this.current
    if (page && title && page.title !== title) {
      this.pages = this.pages.map((saved) =>
        saved.url === key ? { ...saved, title, updatedAt: Date.now() } : saved
      )
      this.persist()
    }
    this.changed()
  }

  home(): void {
    this.meta.currentUrl = null
    this.meta.title = ''
    this.meta.loading = false
    this.meta.tool = 'browse'
    this.meta.activeAnnotationId = null
    this.meta.unresolvedAnnotationIds = []
    this.changed()
  }

  browserState(loading: boolean, canGoBack: boolean, canGoForward: boolean): void {
    Object.assign(this.meta, { loading, canGoBack, canGoForward })
    this.changed()
  }

  error(message: string | null): void {
    this.meta.error = message
    this.changed()
  }

  configure(tool: AnnotationTool, color: AnnotationColor): void {
    if (
      !['browse', 'pen', 'highlight', 'note', 'erase'].includes(tool) ||
      !(ANNOTATION_COLORS as readonly unknown[]).includes(color)
    )
      throw new Error('批注工具无效。')
    this.meta.tool = tool
    this.meta.color = color
    this.changed()
  }

  edit(edit: PageEdit): void {
    if (!edit || typeof edit !== 'object') return
    if (edit.type === 'browse') {
      this.configure('browse', this.meta.color)
      return
    }
    if (edit.type === 'undo' || edit.type === 'redo') {
      this.history(edit.type)
      return
    }
    if (!this.meta.currentUrl) return
    if (edit.type === 'select') {
      this.select(edit.id)
      return
    }
    if (edit.type === 'delete') {
      this.remove(edit.id)
      return
    }
    if (edit.type !== 'add' || !isAnnotation(edit.annotation)) return
    if ((this.current?.annotations.length ?? 0) >= 2_000) {
      this.error('当前页面批注已达 2000 条，请导出备份后整理。')
      return
    }
    if (this.current?.annotations.some((annotation) => annotation.id === edit.annotation.id)) return
    this.meta.activeAnnotationId = edit.annotation.id
    if (['note', 'quote'].includes(edit.annotation.kind)) this.meta.tool = 'browse'
    this.commit([...(this.current?.annotations ?? []), edit.annotation])
  }

  update(url: string, id: string, comment: string): void {
    if (typeof comment !== 'string' || comment.length > 20_000)
      throw new Error('单条笔记不能超过 20000 字。')
    const key = pageKey(url)
    const page = this.pages.find((saved) => saved.url === key)
    if (
      !page ||
      !page.annotations.some((annotation) => annotation.id === id && annotation.comment !== comment)
    )
      return
    const now = Date.now()
    const previous = this.lastCommentEdit
    const grouped = previous?.url === key && previous.id === id && now - previous.at < 1_000
    this.commit(
      page.annotations.map((annotation) =>
        annotation.id === id ? { ...annotation, comment, updatedAt: now } : annotation
      ),
      key,
      grouped
    )
    this.lastCommentEdit = { url: key, id, at: now }
  }

  remove(id: string): void {
    const page = this.current
    if (!page?.annotations.some((annotation) => annotation.id === id)) return
    if (this.meta.activeAnnotationId === id) this.meta.activeAnnotationId = null
    this.commit(page.annotations.filter((annotation) => annotation.id !== id))
  }

  select(id: string): void {
    if (!this.current?.annotations.some((annotation) => annotation.id === id)) return
    this.meta.activeAnnotationId = id
    this.changed()
  }

  reportPositions(input: unknown): void {
    if (
      !Array.isArray(input) ||
      input.length > 2_000 ||
      !input.every((id) => typeof id === 'string' && id.length <= 120)
    )
      return
    const savedIds = new Set(this.current?.annotations.map((annotation) => annotation.id) ?? [])
    const ids = [...new Set(input as string[])].filter((id) => savedIds.has(id)).sort()
    if (
      ids.length === this.meta.unresolvedAnnotationIds.length &&
      ids.every((id, index) => id === this.meta.unresolvedAnnotationIds[index])
    )
      return
    this.meta.unresolvedAnnotationIds = ids
    this.changed()
  }

  history(action: 'undo' | 'redo'): void {
    this.lastCommentEdit = null
    const key = this.meta.currentUrl
    if (!key) return
    const current = this.histories.get(key)
    if (!current) return
    const next = action === 'undo' ? undoHistory(current) : redoHistory(current)
    if (next === current) return
    this.histories.set(key, next)
    this.replaceAnnotations(next.present)
  }

  import(pages: PageNotebook[]): Promise<void> {
    this.lastCommentEdit = null
    this.pages = mergeNotebooks(this.pages, pages)
    this.histories.clear()
    this.meta.activeAnnotationId = null
    this.meta.unresolvedAnnotationIds = []
    this.persist()
    this.changed()
    return this.flush().catch((error: unknown) => {
      throw new Error(
        `导入内容尚未保存，已保留在当前窗口。请导出备份后重试。${error instanceof Error ? error.message : ''}`
      )
    })
  }

  private commit(annotations: PageAnnotation[], key = this.meta.currentUrl, grouped = false): void {
    if (!key) return
    this.lastCommentEdit = null
    const page = this.pages.find((saved) => saved.url === key)
    const history = this.histories.get(key) ?? startHistory(page?.annotations ?? [])
    this.histories.set(
      key,
      grouped
        ? { ...history, present: annotations, future: [] }
        : commitHistory(history, annotations)
    )
    this.replaceAnnotations(annotations, key)
  }

  private replaceAnnotations(annotations: PageAnnotation[], url = this.meta.currentUrl): void {
    if (!url) return
    const previous =
      this.pages.find((page) => page.url === url) ?? createNotebook(url, this.meta.title)
    const next = { ...previous, annotations, updatedAt: Date.now() }
    this.pages = [...this.pages.filter((page) => page.url !== url), next]
    if (url === this.meta.currentUrl)
      this.meta.unresolvedAnnotationIds = this.meta.unresolvedAnnotationIds.filter((id) =>
        annotations.some((annotation) => annotation.id === id)
      )
    if (
      url === this.meta.currentUrl &&
      !annotations.some((annotation) => annotation.id === this.meta.activeAnnotationId)
    )
      this.meta.activeAnnotationId = null
    this.persist()
    this.changed()
  }

  private persist(): Promise<void> {
    const revision = ++this.saveRevision
    this.meta.saveState = 'saving'
    const pending = this.repository.save(this.pages)
    this.pendingSave = pending
    void pending.then(
      () => {
        if (revision !== this.saveRevision) return
        this.meta.saveState = 'saved'
        if (this.meta.error === this.saveError) this.meta.error = null
        this.saveError = null
        this.changed()
      },
      (error: unknown) => {
        if (revision !== this.saveRevision) return
        this.meta.saveState = 'error'
        this.meta.error = error instanceof Error ? error.message : '笔记保存失败，请先导出备份。'
        this.saveError = this.meta.error
        this.changed()
      }
    )
    return pending
  }

  async flush(): Promise<void> {
    if (this.meta.saveState === 'error') this.persist()
    let pending: Promise<void>
    do {
      pending = this.pendingSave
      await pending
      await this.repository.flush()
    } while (pending !== this.pendingSave)
    if (this.meta.saveState === 'error') throw new Error(this.meta.error || '网页笔记尚未保存。')
  }
}
