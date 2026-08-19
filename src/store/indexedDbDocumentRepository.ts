import type {
  DocumentRepository,
  LegacyDatabaseSnapshot,
  LegacyDocumentSource,
} from '../application/ports/documentRepository'
import type { CanvasDoc, CanvasFolder, CurrentCanvasDoc } from '../core/model'
import * as storage from './storage'

export interface StorageGateway {
  getAll<T>(storeName: string): Promise<T[]>
  get<T>(storeName: string, id: string): Promise<T | undefined>
  put<T>(storeName: string, record: T): Promise<void>
  putMany?<T>(storeName: string, records: T[]): Promise<void>
  putManyStores?(batches: Array<{ storeName: string; records: unknown[] }>): Promise<void>
  update<T>(
    storeName: string,
    id: string,
    updater: (record: T | undefined) => T | undefined
  ): Promise<T | undefined>
  del(storeName: string, id: string): Promise<void>
  readLegacyDatabase<TDoc, TFolder>(): Promise<{
    docs: TDoc[]
    folders: TFolder[]
  } | null>
}

const defaultStorageGateway: StorageGateway = storage

function saveBatchWithGateway<T>(
  gateway: StorageGateway,
  storeName: string,
  records: T[]
): Promise<void> {
  if (records.length === 0) return Promise.resolve()
  // Some embedders provide only the original storage primitives. Avoid a
  // direct optional-property read so proxy-based test doubles can omit it.
  let putMany: StorageGateway['putMany'] | undefined
  try {
    putMany = gateway.putMany
  } catch {
    putMany = undefined
  }
  if (putMany) return putMany(storeName, records)
  return records.reduce(
    (promise, record) => promise.then(() => gateway.put(storeName, record)),
    Promise.resolve()
  )
}

export function createIndexedDbDocumentRepository(
  gateway: StorageGateway = defaultStorageGateway
): DocumentRepository {
  return {
    listDocuments: () => gateway.getAll<CanvasDoc>('docs'),
    getDocument: (id) => gateway.get<CanvasDoc>('docs', id),
    saveDocument: (document) => gateway.put('docs', document),
    updateDocument: (id, updater) =>
      gateway.update<CanvasDoc>(
        'docs',
        id,
        (document) => updater(document) as CanvasDoc | undefined
      ) as Promise<CurrentCanvasDoc | undefined>,
    deleteDocument: (id) => gateway.del('docs', id),

    listFolders: () => gateway.getAll<CanvasFolder>('folders'),
    getFolder: (id) => gateway.get<CanvasFolder>('folders', id),
    saveFolder: (folder) => gateway.put('folders', folder),
    deleteFolder: (id) => gateway.del('folders', id),

    saveMigrationBatch: async ({ documents, folders }) => {
      let putManyStores: StorageGateway['putManyStores'] | undefined
      try {
        putManyStores = gateway.putManyStores
      } catch {
        putManyStores = undefined
      }
      if (putManyStores) {
        await putManyStores([
          { storeName: 'docs', records: documents },
          { storeName: 'folders', records: folders },
        ])
        return
      }
      await saveBatchWithGateway(gateway, 'docs', documents)
      await saveBatchWithGateway(gateway, 'folders', folders)
    },
  }
}

export function createIndexedDbLegacyDocumentSource(
  gateway: StorageGateway = defaultStorageGateway
): LegacyDocumentSource {
  return {
    async read(): Promise<LegacyDatabaseSnapshot | null> {
      const snapshot = await gateway.readLegacyDatabase<unknown, unknown>()
      return snapshot
        ? {
            docs: snapshot.docs,
            folders: snapshot.folders,
          }
        : null
    },
  }
}
