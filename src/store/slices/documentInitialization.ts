import type { CanvasDoc, CanvasFolder } from '../types'
import { getDocumentRepository, getLegacyDocumentSource } from '../documentRepository'
import { migrateOld, removeMigratedData } from '../migration'
import { migrateV4ToV5 } from '../v4Import'
import { normalizeCanvasDocLayers } from '../layers'
import { CANVAS_SCHEMA_VERSION } from '../schema'
import {
  createBlankDocument,
  createDefaultFolder,
  selectCanonicalDocument,
} from './documentRecords'
import { reconcileDocumentRecovery, type DocumentRecoveryReconciliation } from './documentRecovery'
import {
  clearRecoveryDraft,
  clearRecoveryDraftForDocument,
  loadRecoveryDraft,
  loadRecoveryDrafts,
} from '../recovery'

const LEGACY_DATABASE_MIGRATION_KEY = 'mindnotes-pro-v5.v4-imported'

export interface DocumentInitializationResult {
  docs: CanvasDoc[]
  folders: CanvasFolder[]
  recovery: DocumentRecoveryReconciliation
  migratedLocalStorage: boolean
}

export interface DocumentInitializationFallback {
  document: CanvasDoc
  recoveredFromDraft: boolean
}

/**
 * Load the persisted document set, complete one-time migrations, ensure the
 * default folder exists, and reconcile recovery drafts before hydration.
 */
export async function initializeDocuments(): Promise<DocumentInitializationResult> {
  const repository = getDocumentRepository()
  let docs = await repository.listDocuments()
  let folders = await repository.listFolders()
  let migratedLocalStorage = false

  const migrationAlreadyAttempted = localStorage.getItem(LEGACY_DATABASE_MIGRATION_KEY) === '1'
  if (docs.length === 0 && !migrationAlreadyAttempted) {
    const migration = await migrateV4ToV5(repository, getLegacyDocumentSource())
    if (migration.status === 'imported') {
      docs = await repository.listDocuments()
      folders = await repository.listFolders()
      try {
        localStorage.setItem(LEGACY_DATABASE_MIGRATION_KEY, '1')
      } catch {
        // The v5 database is the source of truth; a missing advisory
        // marker must not hide a successful import.
      }
    } else if (migration.status === 'failed') {
      throw migration.error instanceof Error
        ? migration.error
        : new Error('Legacy v4 database migration could not be completed')
    }
  }

  if (docs.length === 0) {
    const migrated = migrateOld()
    if (migrated) {
      await repository.saveDocument({ ...migrated, schemaVersion: CANVAS_SCHEMA_VERSION })
      docs = [migrated]
      migratedLocalStorage = true
    } else {
      const blank = createBlankDocument()
      await repository.saveDocument({ ...blank, schemaVersion: CANVAS_SCHEMA_VERSION })
      docs = [blank]
    }
  }

  if (folders.length === 0) {
    const defaultFolder = createDefaultFolder()
    await repository.saveFolder(defaultFolder)
    folders = [defaultFolder]
  }

  const recovery = reconcileDocumentRecovery(docs, loadRecoveryDrafts())
  for (const draft of recovery.draftsToClear) {
    clearRecoveryDraftForDocument(draft.documentId, draft.savedAt)
  }

  const canonical = selectCanonicalDocument(recovery.docs)

  return {
    docs: canonical ? [canonical] : [],
    folders,
    recovery,
    migratedLocalStorage,
  }
}

/** Build an editable in-memory fallback when persistent initialization fails. */
export function createDocumentInitializationFallback(): DocumentInitializationFallback {
  const recoveryDraft = loadRecoveryDraft()
  let document = createBlankDocument()
  let recoveredFromDraft = false

  if (recoveryDraft) {
    try {
      document = normalizeCanvasDocLayers(recoveryDraft)
      recoveredFromDraft = true
    } catch {
      clearRecoveryDraft()
    }
  }

  return { document, recoveredFromDraft }
}

export { removeMigratedData }
