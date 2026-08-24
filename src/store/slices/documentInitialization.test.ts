import { afterEach, describe, expect, it } from 'vitest'
import {
  bindDocumentRepository,
  type DocumentRepository,
  type LegacyDocumentSource,
} from '../documentRepository'
import { createBlankDocument } from './documentRecords'
import { createDocumentInitializationFallback, initializeDocuments } from './documentInitialization'
import { clearRecoveryDraft, saveRecoveryDraft } from '../recovery'
import type { CanvasDoc, CanvasFolder } from '../types'

function createMemoryRepository(
  initialDocs: CanvasDoc[] = [],
  initialFolders: CanvasFolder[] = []
): { repository: DocumentRepository; docs: CanvasDoc[]; folders: CanvasFolder[] } {
  const docs = [...initialDocs]
  const folders = [...initialFolders]
  const repository: DocumentRepository = {
    listDocuments: async () => [...docs],
    getDocument: async (id) => docs.find((document) => document.id === id),
    saveDocument: async (document) => {
      const index = docs.findIndex((item) => item.id === document.id)
      if (index >= 0) docs[index] = document
      else docs.push(document)
    },
    updateDocument: async (id, updater) => {
      const index = docs.findIndex((document) => document.id === id)
      const next = updater(index >= 0 ? docs[index] : undefined)
      if (next === undefined) return undefined
      if (index >= 0) docs[index] = next
      else docs.push(next)
      return next
    },
    deleteDocument: async (id) => {
      const index = docs.findIndex((document) => document.id === id)
      if (index >= 0) docs.splice(index, 1)
    },
    listFolders: async () => [...folders],
    getFolder: async (id) => folders.find((folder) => folder.id === id),
    saveFolder: async (folder) => {
      const index = folders.findIndex((item) => item.id === folder.id)
      if (index >= 0) folders[index] = folder
      else folders.push(folder)
    },
    deleteFolder: async (id) => {
      const index = folders.findIndex((folder) => folder.id === id)
      if (index >= 0) folders.splice(index, 1)
    },
    saveMigrationBatch: async ({ documents, folders: migratedFolders }) => {
      docs.push(...documents)
      folders.push(...migratedFolders)
    },
  }
  return { repository, docs, folders }
}

function emptyLegacySource(): LegacyDocumentSource {
  return { read: async () => null }
}

describe('document initialization boundary', () => {
  let restoreRepository: (() => void) | undefined

  afterEach(() => {
    restoreRepository?.()
    restoreRepository = undefined
    clearRecoveryDraft()
    localStorage.clear()
  })

  it('creates the first editable document and default folder through persistence', async () => {
    const memory = createMemoryRepository()
    restoreRepository = bindDocumentRepository(memory.repository, emptyLegacySource())

    const result = await initializeDocuments()

    expect(result.docs).toHaveLength(1)
    expect(result.docs[0]).toMatchObject({
      schemaVersion: 5,
      title: '未命名画布',
      elements: [],
    })
    expect(result.folders).toHaveLength(1)
    expect(memory.docs).toHaveLength(1)
    expect(memory.folders).toHaveLength(1)
    expect(result.recovery.recoveredDocumentIds).toEqual([])
  })

  it('reconciles a newer recovery draft before returning the workspace documents', async () => {
    const persisted = createBlankDocument(10)
    persisted.id = 'recoverable'
    persisted.title = 'Persisted'
    persisted.updatedAt = 10
    const memory = createMemoryRepository([persisted], [])
    restoreRepository = bindDocumentRepository(memory.repository, emptyLegacySource())
    saveRecoveryDraft({ ...persisted, title: 'Recovered', updatedAt: 20 }, 20)

    const result = await initializeDocuments()

    expect(result.docs[0]).toMatchObject({ id: 'recoverable', title: 'Recovered', updatedAt: 20 })
    expect(result.recovery.recoveredDocumentIds).toEqual(['recoverable'])
    expect(result.folders).toHaveLength(1)
  })

  it('exposes only the most recently updated document as the canonical board', async () => {
    const older = createBlankDocument(10)
    older.id = 'older'
    older.title = 'Older board'
    older.updatedAt = 10
    const newer = createBlankDocument(20)
    newer.id = 'newer'
    newer.title = 'Newer board'
    newer.updatedAt = 20
    const memory = createMemoryRepository([older, newer], [])
    restoreRepository = bindDocumentRepository(memory.repository, emptyLegacySource())

    const result = await initializeDocuments()

    expect(result.docs).toHaveLength(1)
    expect(result.docs[0]).toMatchObject({ id: 'newer', title: 'Newer board' })
    expect(memory.docs).toHaveLength(2)
  })

  it('normalizes a recovery draft for the in-memory fallback', () => {
    const document = createBlankDocument(10)
    document.schemaVersion = 4
    saveRecoveryDraft(document)

    const fallback = createDocumentInitializationFallback()

    expect(fallback.recoveredFromDraft).toBe(true)
    expect(fallback.document.schemaVersion).toBe(5)
    expect(fallback.document.id).toBe(document.id)
  })
})
