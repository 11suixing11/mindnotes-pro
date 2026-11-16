export const NOTEBOOK_FORMAT = 'mindnotes-pro.page-notes' as const
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024
export const ANNOTATION_COLORS = ['#e0a11b', '#e05d52', '#3979cf', '#24866c'] as const

export type AnnotationColor = (typeof ANNOTATION_COLORS)[number]
export type AnnotationTool = 'browse' | 'pen' | 'highlight' | 'note' | 'erase'

export interface NotePoint {
  x: number
  y: number
}

export interface PageAnchor {
  selector: string
  text: string
  x: number
  y: number
}

export interface TextQuote {
  exact: string
  prefix: string
  suffix: string
}

export interface PageAnnotation {
  id: string
  kind: 'ink' | 'highlight' | 'quote' | 'note'
  color: AnnotationColor
  points: NotePoint[]
  anchor: PageAnchor | null
  quote: TextQuote | null
  comment: string
  createdAt: number
  updatedAt: number
}

export interface PageNotebook {
  url: string
  title: string
  annotations: PageAnnotation[]
  createdAt: number
  updatedAt: number
}

export interface NotebookBackup {
  format: typeof NOTEBOOK_FORMAT
  version: 1
  pages: PageNotebook[]
}

export function normalizePageUrl(input: string): string {
  const value = input.trim()
  if (!value) throw new Error('请输入网页地址。')
  const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('请使用 http 或 https 网页地址。')
  }
  return url.toString()
}

export function pageKey(input: string): string {
  const url = new URL(normalizePageUrl(input))
  if (!url.hash.startsWith('#/') && !url.hash.startsWith('#!')) url.hash = ''
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_/i.test(key) || ['fbclid', 'gclid'].includes(key)) url.searchParams.delete(key)
  }
  return url.toString()
}

export function createNotebook(url: string, title: string, now = Date.now()): PageNotebook {
  return {
    url: pageKey(url),
    title: title || new URL(url).hostname,
    annotations: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function createBackup(pages: PageNotebook[]): NotebookBackup {
  return { format: NOTEBOOK_FORMAT, version: 1, pages }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function boundedString(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.length <= limit
}

function isCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 10_000_000
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function isAnnotation(value: unknown): value is PageAnnotation {
  if (!isRecord(value)) return false
  if (!boundedString(value.id, 120) || !value.id) return false
  if (!['ink', 'highlight', 'quote', 'note'].includes(String(value.kind))) return false
  if (!(ANNOTATION_COLORS as readonly unknown[]).includes(value.color)) return false
  if (!Array.isArray(value.points) || !value.points.length || value.points.length > 8_000)
    return false
  if (
    !value.points.every(
      (point) => isRecord(point) && isCoordinate(point.x) && isCoordinate(point.y)
    )
  )
    return false
  if (
    !boundedString(value.comment, 20_000) ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.updatedAt)
  )
    return false
  if (value.anchor !== null) {
    if (
      !isRecord(value.anchor) ||
      !boundedString(value.anchor.selector, 2_000) ||
      !boundedString(value.anchor.text, 240) ||
      !isCoordinate(value.anchor.x) ||
      !isCoordinate(value.anchor.y)
    )
      return false
  }
  if (value.kind === 'quote') {
    if (
      !isRecord(value.quote) ||
      !boundedString(value.quote.exact, 30_000) ||
      !value.quote.exact ||
      !boundedString(value.quote.prefix, 100) ||
      !boundedString(value.quote.suffix, 100)
    )
      return false
  } else if (value.quote !== null) return false
  return true
}

export function decodeBackup(content: string): NotebookBackup {
  if (new TextEncoder().encode(content).byteLength > MAX_BACKUP_BYTES)
    throw new Error('笔记文件超过 20 MB。')
  let value: unknown
  try {
    value = JSON.parse(content)
  } catch {
    throw new Error('笔记文件不是有效的 JSON。')
  }
  if (
    !isRecord(value) ||
    value.format !== NOTEBOOK_FORMAT ||
    value.version !== 1 ||
    !Array.isArray(value.pages) ||
    value.pages.length > 2_000
  ) {
    throw new Error('请选择 MindNotes Pro 网页笔记备份。')
  }
  let total = 0
  const urls = new Set<string>()
  const pages: PageNotebook[] = value.pages.map((page: unknown) => {
    if (
      !isRecord(page) ||
      !boundedString(page.url, 8_000) ||
      !boundedString(page.title, 1_000) ||
      !isTimestamp(page.createdAt) ||
      !isTimestamp(page.updatedAt) ||
      !Array.isArray(page.annotations)
    )
      throw new Error('笔记文件中的页面数据无效。')
    let url: string
    try {
      url = pageKey(page.url)
    } catch {
      throw new Error('笔记文件包含不支持的网页地址。')
    }
    if (urls.has(url)) throw new Error('笔记文件包含重复页面。')
    urls.add(url)
    total += page.annotations.length
    if (total > 20_000 || !page.annotations.every(isAnnotation))
      throw new Error('笔记文件中的批注数据无效或过多。')
    const ids = new Set(page.annotations.map((annotation: PageAnnotation) => annotation.id))
    if (ids.size !== page.annotations.length) throw new Error('笔记文件包含重复批注。')
    return {
      url,
      title: page.title,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      annotations: page.annotations as PageAnnotation[],
    }
  })
  return createBackup(pages)
}

export function mergeNotebooks(existing: PageNotebook[], incoming: PageNotebook[]): PageNotebook[] {
  const pages = new Map(existing.map((page) => [page.url, page]))
  for (const page of incoming) {
    const previous = pages.get(page.url)
    if (!previous) {
      pages.set(page.url, page)
      continue
    }
    const annotations = new Map(
      previous.annotations.map((annotation) => [annotation.id, annotation])
    )
    for (const annotation of page.annotations) {
      const saved = annotations.get(annotation.id)
      if (!saved || annotation.updatedAt > saved.updatedAt)
        annotations.set(annotation.id, annotation)
    }
    pages.set(page.url, {
      ...previous,
      title: page.updatedAt > previous.updatedAt ? page.title : previous.title,
      annotations: [...annotations.values()].sort((a, b) => a.createdAt - b.createdAt),
      createdAt: Math.min(page.createdAt, previous.createdAt),
      updatedAt: Math.max(page.updatedAt, previous.updatedAt),
    })
  }
  return [...pages.values()]
}

export function quoteMatchIndex(text: string, quote: TextQuote): number {
  if (!quote.exact) return -1
  let position = text.indexOf(quote.exact)
  let best = -1
  let bestScore = -1
  let ambiguous = false
  while (position !== -1) {
    const prefix = text.slice(Math.max(0, position - quote.prefix.length), position)
    const suffix = text.slice(
      position + quote.exact.length,
      position + quote.exact.length + quote.suffix.length
    )
    const score =
      Number(Boolean(quote.prefix) && prefix === quote.prefix) +
      Number(Boolean(quote.suffix) && suffix === quote.suffix)
    if (score > bestScore) {
      best = position
      bestScore = score
      ambiguous = false
    } else if (score === bestScore) ambiguous = true
    position = text.indexOf(quote.exact, position + 1)
  }
  return ambiguous ? -1 : best
}

export function resolvePoint(
  point: NotePoint,
  anchor: PageAnchor | null,
  rect: NotePoint | null,
  scroll: NotePoint
): NotePoint {
  return {
    x: point.x - scroll.x + (anchor && rect ? rect.x + scroll.x - anchor.x : 0),
    y: point.y - scroll.y + (anchor && rect ? rect.y + scroll.y - anchor.y : 0),
  }
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]<>])/g, '\\$1').replace(/\r?\n/g, ' ')
}

export function notebookMarkdown(pages: PageNotebook[]): string {
  const sections = pages
    .filter((page) => page.annotations.length)
    .map((page) => {
      const source = `[打开原网页](<${page.url.replace(/>/g, '%3E')}>)`
      const notes = page.annotations
        .map((annotation, index) => {
          const heading = `### ${index + 1}. ${annotation.kind === 'quote' ? '原文摘录' : annotation.kind === 'note' ? '页面笔记' : '手写批注'}`
          const quote = annotation.quote
            ? `\n\n${annotation.quote.exact
                .split(/\r?\n/)
                .map((line) => `> ${line}`)
                .join('\n')}`
            : ''
          const comment = annotation.comment.trim() ? `\n\n${annotation.comment.trim()}` : ''
          const context =
            annotation.anchor?.text && !annotation.quote
              ? `\n\n所在段落：${escapeMarkdown(annotation.anchor.text)}`
              : ''
          return `${heading}${quote}${comment}${context}`
        })
        .join('\n\n')
      return `## ${escapeMarkdown(page.title)}\n\n${source}\n\n${notes}`
    })
  return `# MindNotes Pro 网页笔记\n\n${sections.join('\n\n---\n\n')}\n`
}

export function exportFilename(title: string, extension: 'md' | 'json'): string {
  const name =
    title
      .split('')
      .map((character) => (character.charCodeAt(0) < 32 ? '-' : character))
      .join('')
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/[. ]+$/g, '')
      .trim()
      .slice(0, 80) || '网页笔记'
  return `${name}.${extension}`
}
