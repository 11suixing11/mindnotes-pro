import { describe, expect, it, vi } from 'vitest'
import { migrateV4ToV5, parseV4Snapshot } from './v4Import'
import { CANVAS_SCHEMA_VERSION } from './schema'
import type {
  DocumentRepository,
  LegacyDocumentSource,
} from '../application/ports/documentRepository'
import type { CanvasDoc } from './types'

function makeRepository(overrides: Partial<DocumentRepository> = {}): DocumentRepository {
  const empty = async () => []
  return {
    listDocuments: empty,
    getDocument: async () => undefined,
    saveDocument: async () => undefined,
    updateDocument: async () => undefined,
    deleteDocument: async () => undefined,
    listFolders: async () => [],
    getFolder: async () => undefined,
    saveFolder: async () => undefined,
    deleteFolder: async () => undefined,
    saveMigrationBatch: async () => undefined,
    ...overrides,
  }
}

function makeSource(
  snapshot: { docs: unknown[]; folders: unknown[] } | null
): LegacyDocumentSource {
  return { read: vi.fn(async () => snapshot) }
}

describe('v4 -> v5 import boundary', () => {
  it('normalizes valid documents and skips corrupt or duplicate records', () => {
    const report = parseV4Snapshot(
      {
        folders: [
          { id: 'folder-1', name: 'Notes', parentId: null, order: 0, expanded: true },
          { id: 'folder-1', name: 'Duplicate', parentId: null, order: 1, expanded: true },
          { id: '', name: 'Invalid', parentId: null, order: 2, expanded: true },
        ],
        docs: [
          {
            schemaVersion: 4,
            id: 'doc-1',
            title: 'Imported',
            elements: [],
            bgColor: '#fff',
            folderId: 'missing-folder',
            createdAt: 10,
            updatedAt: 20,
          },
          {
            schemaVersion: 4,
            id: 'doc-1',
            title: 'Duplicate',
            elements: [],
            bgColor: '#fff',
            folderId: null,
            createdAt: 10,
            updatedAt: 20,
          },
          { id: 'broken', elements: 'not-an-array' },
        ],
      },
      100
    )

    expect(report.documents).toHaveLength(1)
    expect(report.documents[0]).toMatchObject({
      id: 'doc-1',
      schemaVersion: CANVAS_SCHEMA_VERSION,
      folderId: null,
      createdAt: 10,
      updatedAt: 20,
    })
    expect(report.folders).toHaveLength(1)
    expect(report.skippedDocuments).toBe(2)
    expect(report.skippedFolders).toBe(2)
  })

  it('does not write when the legacy source is empty', async () => {
    const saveMigrationBatch = vi.fn(async () => undefined)
    const result = await migrateV4ToV5(makeRepository({ saveMigrationBatch }), makeSource(null))

    expect(result.status).toBe('empty')
    expect(saveMigrationBatch).not.toHaveBeenCalled()
  })

  it('returns failed and leaves the source untouched when the v5 write fails', async () => {
    const saveMigrationBatch = vi.fn(async () => {
      throw new Error('quota')
    })
    const source = makeSource({
      docs: [
        {
          schemaVersion: 4,
          id: 'doc-1',
          title: 'Imported',
          elements: [],
          bgColor: '#fff',
          folderId: null,
          createdAt: 1,
          updatedAt: 2,
        },
      ],
      folders: [],
    })

    const result = await migrateV4ToV5(makeRepository({ saveMigrationBatch }), source)

    expect(result.status).toBe('failed')
    expect(saveMigrationBatch).toHaveBeenCalledTimes(1)
    expect(source.read).toHaveBeenCalledTimes(1)
  })

  it('skips import when v5 already contains documents', async () => {
    const source = makeSource({ docs: [], folders: [] })
    const result = await migrateV4ToV5(
      makeRepository({
        listDocuments: async () => [
          {
            schemaVersion: CANVAS_SCHEMA_VERSION,
            id: 'current',
            title: 'Current',
            elements: [],
            bgColor: '#fff',
            folderId: null,
            createdAt: 1,
            updatedAt: 2,
          } as CanvasDoc,
        ],
      }),
      source
    )

    expect(result.status).toBe('skipped')
    expect(source.read).not.toHaveBeenCalled()
  })
})
