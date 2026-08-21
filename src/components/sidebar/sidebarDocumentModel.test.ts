import { describe, expect, it } from 'vitest'
import type { CanvasDoc, TextElement } from '../../store/types'
import { CANVAS_SCHEMA_VERSION } from '../../store/schema'
import {
  getDocumentSearchMatch,
  getVisibleDocuments,
  makeDocumentContentSnippet,
  normalizeDocumentSearch,
} from './sidebarDocumentModel'

function makeDoc(overrides: Partial<CanvasDoc>): CanvasDoc {
  return {
    schemaVersion: CANVAS_SCHEMA_VERSION,
    id: 'doc-1',
    title: 'Untitled',
    elements: [],
    bgColor: '#ffffff',
    folderId: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

function makeText(content: string): TextElement {
  return {
    type: 'text',
    id: `text-${content}`,
    x: 0,
    y: 0,
    width: 200,
    height: 40,
    content,
    fontSize: 16,
    color: '#111111',
  }
}

describe('sidebar document list model', () => {
  it('normalizes whitespace and case before searching', () => {
    expect(normalizeDocumentSearch('  Project PLAN  ')).toBe('project plan')
  })

  it('prefers title matches over text-content matches', () => {
    const doc = makeDoc({
      title: 'Launch Plan',
      elements: [makeText('A separate plan inside the document')],
    })

    expect(getDocumentSearchMatch(doc, 'plan')).toEqual({
      type: 'title',
      snippet: 'Launch Plan',
    })
  })

  it('creates a bounded snippet around a content match', () => {
    const content = `${'a'.repeat(40)}timeline${'b'.repeat(50)}`
    const snippet = makeDocumentContentSnippet(content, 'timeline')

    expect(snippet.startsWith('\u2026')).toBe(true)
    expect(snippet.endsWith('\u2026')).toBe(true)
    expect(snippet).toContain('timeline')
  })

  it('filters by text content and sorts without mutating source documents', () => {
    const older = makeDoc({
      id: 'older',
      title: 'Older',
      elements: [makeText('Budget timeline')],
      updatedAt: 10,
    })
    const newer = makeDoc({
      id: 'newer',
      title: 'Newer',
      elements: [makeText('Launch timeline')],
      updatedAt: 20,
    })
    const unrelated = makeDoc({ id: 'other', title: 'Other', updatedAt: 30 })
    const docs = [older, unrelated, newer]

    const visible = getVisibleDocuments(docs, 'timeline', 'updated-desc')

    expect(visible.map(({ doc }) => doc.id)).toEqual(['newer', 'older'])
    expect(visible.every(({ match }) => match?.type === 'content')).toBe(true)
    expect(docs.map((doc) => doc.id)).toEqual(['older', 'other', 'newer'])
  })

  it('uses deterministic title ordering for equal timestamps', () => {
    const beta = makeDoc({ id: 'beta', title: 'Beta', updatedAt: 10 })
    const alpha = makeDoc({ id: 'alpha', title: 'Alpha', updatedAt: 10 })

    expect(getVisibleDocuments([beta, alpha], '', 'updated-desc').map(({ doc }) => doc.id)).toEqual(
      ['alpha', 'beta']
    )
    expect(getVisibleDocuments([beta, alpha], '', 'title-desc').map(({ doc }) => doc.id)).toEqual([
      'beta',
      'alpha',
    ])
  })
})
