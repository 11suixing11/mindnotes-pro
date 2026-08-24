import { describe, expect, it } from 'vitest'
import type { ShapeElement } from '../types'
import type { CanvasBackupDocument } from '../backup'
import {
  createBlankDocument,
  createDefaultFolder,
  createDuplicatedDocument,
  createImportedDocument,
  normalizeAndSortDocuments,
  sortDocuments,
} from './documentRecords'

function createShape(id: string): ShapeElement {
  return {
    type: 'shape',
    id,
    kind: 'rectangle',
    x: 10,
    y: 20,
    w: 80,
    h: 40,
    color: '#111827',
    size: 2,
  }
}

describe('document record helpers', () => {
  it('creates a blank document with a writable default layer', () => {
    const document = createBlankDocument(100)

    expect(document.elements).toEqual([])
    expect(document.layers).toHaveLength(1)
    expect(document.activeLayerId).toBe(document.layers?.[0].id)
    expect(document.layers?.[0].visible).toBe(true)
    expect(document.layers?.[0].locked).toBe(false)
    expect(document.createdAt).toBe(100)
    expect(document.updatedAt).toBe(100)
  })

  it('creates the stable default folder record', () => {
    expect(createDefaultFolder()).toEqual({
      id: 'folder-default',
      name: '我的笔记',
      parentId: null,
      order: 0,
      expanded: true,
    })
  })

  it('sorts without mutating the source list', () => {
    const older = createBlankDocument(100)
    const newer = createBlankDocument(200)
    const documents = [older, newer]

    expect(sortDocuments(documents)).toEqual([newer, older])
    expect(documents).toEqual([older, newer])
  })

  it('normalizes layers while sorting documents', () => {
    const document = createBlankDocument(100)
    const legacy = { ...document, layers: undefined, activeLayerId: undefined }

    const [normalized] = normalizeAndSortDocuments([legacy])

    expect(normalized.layers).toHaveLength(1)
    expect(normalized.activeLayerId).toBe(normalized.layers?.[0].id)
    expect(normalized.schemaVersion).toBe(5)
  })

  it('creates a fresh duplicate without changing the source identity', () => {
    const source = createBlankDocument(100)
    source.title = 'Source'
    source.elements = [createShape('shape-1')]

    const duplicate = createDuplicatedDocument(source, 200)

    expect(duplicate.id).not.toBe(source.id)
    expect(duplicate.title).toBe('Source (副本)')
    expect(duplicate.createdAt).toBe(200)
    expect(duplicate.updatedAt).toBe(200)
    expect(duplicate.elements).toEqual([{ ...source.elements[0], layerId: source.layers?.[0].id }])
    expect(source.elements[0].layerId).toBeUndefined()
  })

  it('creates an imported document as a separate root document', () => {
    const backup: CanvasBackupDocument = {
      title: 'Imported',
      elements: [createShape('shape-1')],
      layers: createBlankDocument(100).layers ?? [],
      activeLayerId: 'layer-default',
      bgColor: '#fef3c7',
      backgroundStyle: 'dots',
    }

    const imported = createImportedDocument(backup, 300)

    expect(imported.id).not.toBe('')
    expect(imported.title).toBe('Imported（导入）')
    expect(imported.folderId).toBeNull()
    expect(imported.bgColor).toBe('#fef3c7')
    expect(imported.backgroundStyle).toBe('dots')
    expect(imported.createdAt).toBe(300)
  })
})
