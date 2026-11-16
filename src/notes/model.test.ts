import { describe, expect, it } from 'vitest'
import {
  createBackup,
  createNotebook,
  decodeBackup,
  mergeNotebooks,
  normalizePageUrl,
  notebookMarkdown,
  pageKey,
  quoteMatchIndex,
  resolvePoint,
} from './model'
import type { PageAnnotation } from './model'

const annotation: PageAnnotation = {
  id: 'mark-one',
  kind: 'quote',
  color: '#e0a11b',
  points: [{ x: 120, y: 860 }],
  anchor: { selector: '#paragraph', text: '网页与笔记一起保存', x: 100, y: 800 },
  quote: { exact: '网页与笔记一起保存', prefix: '开始阅读：', suffix: '。继续思考' },
  comment: '保留原文上下文，回到原页继续读。',
  createdAt: 10,
  updatedAt: 20,
}

describe('page notebooks', () => {
  it('accepts web URLs and rejects executable, local, and credential-bearing URLs', () => {
    expect(normalizePageUrl(' example.com/article ')).toBe('https://example.com/article')
    expect(normalizePageUrl('http://localhost:1234/')).toBe('http://localhost:1234/')
    for (const url of [
      'javascript:alert(1)',
      'file:///C:/private',
      'data:text/html,test',
      'https://user:secret@example.com',
      '',
    ])
      expect(() => normalizePageUrl(url)).toThrow()
  })

  it('ignores section links and tracking while keeping meaningful queries and app routes', () => {
    expect(pageKey('https://example.com/read?id=2&utm_source=share#section')).toBe(
      'https://example.com/read?id=2'
    )
    expect(pageKey('https://example.com/#/article/1')).not.toBe(
      pageKey('https://example.com/#/article/2')
    )
  })

  it('round trips editable anchors, quotes, comments, and strokes through backups', () => {
    const page = {
      ...createNotebook('https://example.com/read', '阅读笔记', 10),
      annotations: [annotation],
    }
    expect(decodeBackup(JSON.stringify(createBackup([page]))).pages).toEqual([page])
  })

  it('validates an entire import before it can replace or merge local data', () => {
    const page = {
      ...createNotebook('https://example.com/read', '阅读笔记'),
      annotations: [{ ...annotation, points: [{ x: 'invalid', y: 0 }] }],
    }
    expect(() => decodeBackup(JSON.stringify(createBackup([page as never])))).toThrow('批注数据')
    expect(() => decodeBackup('{invalid')).toThrow('JSON')
    expect(() =>
      decodeBackup(JSON.stringify({ format: 'mindnotes-pro.backup', version: 1, pages: [] }))
    ).toThrow('网页笔记备份')
  })

  it('merges by page and annotation ID while preserving the newer local edit', () => {
    const original = {
      ...createNotebook('https://example.com/read', '原文', 10),
      annotations: [annotation],
    }
    const incoming = {
      ...original,
      annotations: [
        { ...annotation, comment: '更早的笔记', updatedAt: 15 },
        { ...annotation, id: 'mark-two' },
      ],
    }
    const merged = mergeNotebooks([original], [incoming])
    expect(merged).toHaveLength(1)
    expect(merged[0].annotations).toHaveLength(2)
    expect(merged[0].annotations[0].comment).toBe(annotation.comment)
    expect(mergeNotebooks(merged, [incoming])).toEqual(merged)
  })

  it('exports readable Markdown with the source, original quote, and personal note', () => {
    const page = {
      ...createNotebook('https://example.com/read', '文章标题'),
      annotations: [annotation],
    }
    const markdown = notebookMarkdown([page])
    expect(markdown).toContain('[打开原网页](<https://example.com/read>)')
    expect(markdown).toContain('> 网页与笔记一起保存')
    expect(markdown).toContain(annotation.comment)
  })

  it('disambiguates repeated quotes using surrounding text', () => {
    const content = 'a repeated quote x and b repeated quote y'
    expect(quoteMatchIndex(content, { exact: 'repeated quote', prefix: 'b ', suffix: ' y' })).toBe(
      content.lastIndexOf('repeated quote')
    )
    expect(quoteMatchIndex(content, { exact: 'gone', prefix: '', suffix: '' })).toBe(-1)
  })

  it('does not assign a quote to an arbitrary repeated or empty match', () => {
    const repeated = 'before same quote after before same quote after'
    expect(quoteMatchIndex(repeated, { exact: 'same quote', prefix: '', suffix: '' })).toBe(-1)
    expect(
      quoteMatchIndex(repeated, { exact: 'same quote', prefix: 'before ', suffix: ' after' })
    ).toBe(-1)
    expect(
      quoteMatchIndex('one unique quote', { exact: 'unique quote', prefix: '', suffix: '' })
    ).toBe(4)
    expect(quoteMatchIndex('some text', { exact: '', prefix: '', suffix: '' })).toBe(-1)
  })

  it('keeps strokes attached to a paragraph during scrolling and layout changes', () => {
    const point = { x: 120, y: 860 }
    const anchor = annotation.anchor
    expect(resolvePoint(point, anchor, { x: 100, y: 500 }, { x: 0, y: 300 })).toEqual({
      x: 120,
      y: 560,
    })
    expect(resolvePoint(point, anchor, { x: 140, y: 620 }, { x: 0, y: 300 })).toEqual({
      x: 160,
      y: 680,
    })
    expect(resolvePoint(point, anchor, null, { x: 0, y: 300 })).toEqual({ x: 120, y: 560 })
  })
})
