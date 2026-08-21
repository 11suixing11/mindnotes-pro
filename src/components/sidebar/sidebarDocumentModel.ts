import type { CanvasDoc } from '../../store/types'

export type DocumentSortMode =
  'updated-desc' | 'updated-asc' | 'created-desc' | 'created-asc' | 'title-asc' | 'title-desc'

export const DOCUMENT_SORT_OPTIONS: ReadonlyArray<{
  value: DocumentSortMode
  label: string
}> = [
  { value: 'updated-desc', label: '最近修改' },
  { value: 'updated-asc', label: '最早修改' },
  { value: 'created-desc', label: '最近创建' },
  { value: 'created-asc', label: '最早创建' },
  { value: 'title-asc', label: '名称升序' },
  { value: 'title-desc', label: '名称降序' },
]

export type DocumentSearchMatch =
  | { type: 'none'; snippet: '' }
  | { type: 'title'; snippet: string }
  | { type: 'content'; snippet: string }

export interface VisibleDocument {
  doc: CanvasDoc
  match: DocumentSearchMatch | null
}

const titleCollator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })

export function normalizeDocumentSearch(query: string): string {
  return query.trim().toLowerCase()
}

export function formatDocumentTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function getDocumentText(doc: CanvasDoc): string {
  return doc.elements
    .filter((element) => element.type === 'text')
    .map((element) => element.content)
    .join('\n')
}

export function makeDocumentContentSnippet(content: string, query: string): string {
  const index = content.toLowerCase().indexOf(query)
  if (index === -1) return content.slice(0, 80)

  const start = Math.max(0, index - 24)
  const end = Math.min(content.length, index + query.length + 32)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < content.length ? '…' : ''
  return `${prefix}${content.slice(start, end)}${suffix}`
}

export function getDocumentSearchMatch(
  doc: CanvasDoc,
  normalizedQuery: string
): DocumentSearchMatch | null {
  if (!normalizedQuery) return { type: 'none', snippet: '' }

  if (doc.title.toLowerCase().includes(normalizedQuery)) {
    return { type: 'title', snippet: doc.title }
  }

  const content = getDocumentText(doc)
  if (content.toLowerCase().includes(normalizedQuery)) {
    return {
      type: 'content',
      snippet: makeDocumentContentSnippet(content, normalizedQuery),
    }
  }

  return null
}

function compareByTitle(a: CanvasDoc, b: CanvasDoc): number {
  const byTitle = titleCollator.compare(a.title, b.title)
  if (byTitle !== 0) return byTitle

  return b.updatedAt - a.updatedAt || b.createdAt - a.createdAt || titleCollator.compare(a.id, b.id)
}

export function compareDocuments(a: CanvasDoc, b: CanvasDoc, sortMode: DocumentSortMode): number {
  switch (sortMode) {
    case 'updated-asc':
      return a.updatedAt - b.updatedAt || compareByTitle(a, b)
    case 'created-desc':
      return b.createdAt - a.createdAt || compareByTitle(a, b)
    case 'created-asc':
      return a.createdAt - b.createdAt || compareByTitle(a, b)
    case 'title-asc':
      return compareByTitle(a, b)
    case 'title-desc':
      return -compareByTitle(a, b)
    case 'updated-desc':
    default:
      return b.updatedAt - a.updatedAt || compareByTitle(a, b)
  }
}

export function getVisibleDocuments(
  docs: CanvasDoc[],
  normalizedQuery: string,
  sortMode: DocumentSortMode
): VisibleDocument[] {
  return docs
    .map((doc) => ({ doc, match: getDocumentSearchMatch(doc, normalizedQuery) }))
    .filter((item) => !normalizedQuery || item.match)
    .sort((a, b) => compareDocuments(a.doc, b.doc, sortMode))
}
