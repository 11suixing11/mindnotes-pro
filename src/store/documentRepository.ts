import type {
  DocumentRepository,
  LegacyDocumentSource,
} from '../application/ports/documentRepository'
import {
  createIndexedDbDocumentRepository,
  createIndexedDbLegacyDocumentSource,
} from './indexedDbDocumentRepository'

let repository: DocumentRepository = createIndexedDbDocumentRepository()
let legacySource: LegacyDocumentSource = createIndexedDbLegacyDocumentSource()

export type {
  DocumentRepository,
  LegacyDatabaseSnapshot,
  LegacyDocumentSource,
} from '../application/ports/documentRepository'

export function getDocumentRepository(): DocumentRepository {
  return repository
}

export function getLegacyDocumentSource(): LegacyDocumentSource {
  return legacySource
}

/**
 * Bind application persistence explicitly. The returned function restores the
 * previous ports, which keeps tests and embedded runtimes isolated.
 */
export function bindDocumentRepository(
  nextRepository: DocumentRepository,
  nextLegacySource = legacySource
): () => void {
  const previousRepository = repository
  const previousLegacySource = legacySource
  repository = nextRepository
  legacySource = nextLegacySource
  return () => {
    repository = previousRepository
    legacySource = previousLegacySource
  }
}

export function resetDocumentRepository(): void {
  repository = createIndexedDbDocumentRepository()
  legacySource = createIndexedDbLegacyDocumentSource()
}
