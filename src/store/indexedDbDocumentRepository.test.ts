import { describe, expect, it, vi } from 'vitest'
import {
  createIndexedDbDocumentRepository,
  createIndexedDbLegacyDocumentSource,
  type StorageGateway,
} from './indexedDbDocumentRepository'
import { CANVAS_SCHEMA_VERSION } from './schema'

function gateway() {
  return {
    getAll: vi.fn(async () => []),
    get: vi.fn(async () => undefined),
    put: vi.fn(async () => undefined),
    putMany: vi.fn(async () => undefined),
    putManyStores: vi.fn(async () => undefined),
    update: vi.fn(
      async <T>(_store: string, _id: string, updater: (value: T | undefined) => T | undefined) =>
        updater(undefined)
    ),
    del: vi.fn(async () => undefined),
    readLegacyDatabase: vi.fn(async () => ({ docs: [], folders: [] })),
  }
}

describe('IndexedDB document repository adapter', () => {
  it('maps document and folder operations to the storage gateway', async () => {
    const storage = gateway()
    const repository = createIndexedDbDocumentRepository(storage as unknown as StorageGateway)
    const document = {
      schemaVersion: CANVAS_SCHEMA_VERSION,
      id: 'doc-1',
      title: 'Test',
      elements: [],
      bgColor: '#fff',
      folderId: null,
      createdAt: 1,
      updatedAt: 1,
    }

    await repository.saveDocument(document)
    await repository.getDocument('doc-1')
    await repository.deleteDocument('doc-1')
    await repository.saveFolder({
      id: 'folder-1',
      name: 'Folder',
      parentId: null,
      order: 0,
      expanded: true,
    })

    expect(storage.put).toHaveBeenCalledWith('docs', document)
    expect(storage.get).toHaveBeenCalledWith('docs', 'doc-1')
    expect(storage.del).toHaveBeenCalledWith('docs', 'doc-1')
    expect(storage.put).toHaveBeenCalledWith('folders', expect.objectContaining({ id: 'folder-1' }))
  })

  it('uses one cross-store transaction for migration batches', async () => {
    const storage = gateway()
    const repository = createIndexedDbDocumentRepository(storage as unknown as StorageGateway)

    await repository.saveMigrationBatch({ documents: [], folders: [] })

    expect(storage.putManyStores).toHaveBeenCalledWith([
      { storeName: 'docs', records: [] },
      { storeName: 'folders', records: [] },
    ])
    expect(storage.putMany).not.toHaveBeenCalled()
  })

  it('exposes the legacy database as a read-only source', async () => {
    const storage = gateway()
    const source = createIndexedDbLegacyDocumentSource(storage as unknown as StorageGateway)

    await expect(source.read()).resolves.toEqual({ docs: [], folders: [] })
    expect(storage.readLegacyDatabase).toHaveBeenCalledTimes(1)
  })
})
