import type { CanvasDoc, CanvasFolder, CurrentCanvasDoc } from '../../core/model'

export interface DocumentRepository {
  listDocuments(): Promise<CanvasDoc[]>
  getDocument(id: string): Promise<CanvasDoc | undefined>
  saveDocument(document: CurrentCanvasDoc): Promise<void>
  updateDocument(
    id: string,
    updater: (document: CanvasDoc | undefined) => CurrentCanvasDoc | undefined
  ): Promise<CurrentCanvasDoc | undefined>
  deleteDocument(id: string): Promise<void>

  listFolders(): Promise<CanvasFolder[]>
  getFolder(id: string): Promise<CanvasFolder | undefined>
  saveFolder(folder: CanvasFolder): Promise<void>
  deleteFolder(id: string): Promise<void>

  /** Persist a validated migration batch as one storage operation. */
  saveMigrationBatch(batch: {
    documents: CurrentCanvasDoc[]
    folders: CanvasFolder[]
  }): Promise<void>
}

export interface LegacyDatabaseSnapshot {
  docs: unknown[]
  folders: unknown[]
}

/** Read-only source used by the v5 bootstrap migrator. */
export interface LegacyDocumentSource {
  read(): Promise<LegacyDatabaseSnapshot | null>
}
