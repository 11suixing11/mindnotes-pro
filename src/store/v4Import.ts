import { parseCanvasImport } from './backup'
import { normalizeCanvasDocLayers } from './layers'
import type {
  DocumentRepository,
  LegacyDatabaseSnapshot,
  LegacyDocumentSource,
} from '../application/ports/documentRepository'
import type { CanvasFolder, CurrentCanvasDoc } from './types'
import { CANVAS_SCHEMA_VERSION, LEGACY_CANVAS_SCHEMA_VERSION } from './schema'

export interface V4MigrationReport {
  documents: CurrentCanvasDoc[]
  folders: CanvasFolder[]
  skippedDocuments: number
  skippedFolders: number
}

export type V4MigrationStatus = 'imported' | 'empty' | 'skipped' | 'failed'

export interface V4MigrationResult {
  status: V4MigrationStatus
  report?: V4MigrationReport
  error?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function parseV4Folder(value: unknown, index: number): CanvasFolder | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim()) return null
  if (typeof value.name !== 'string' || !value.name.trim()) return null
  return {
    id: value.id,
    name: value.name,
    parentId: typeof value.parentId === 'string' ? value.parentId : null,
    order: finiteNumber(value.order, index),
    expanded: value.expanded !== false,
  }
}

function parseV4Document(value: unknown, now: number): CurrentCanvasDoc | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim()) return null
  if (!Array.isArray(value.elements)) return null

  try {
    const imported = parseCanvasImport({
      ...value,
      schemaVersion: LEGACY_CANVAS_SCHEMA_VERSION,
    })
    const ids = new Set<string>()
    const elements = imported.elements.filter((element) => {
      if (ids.has(element.id)) return false
      ids.add(element.id)
      return true
    })
    const document = normalizeCanvasDocLayers({
      schemaVersion: CANVAS_SCHEMA_VERSION,
      id: value.id,
      title: imported.title,
      elements,
      layers: imported.layers,
      activeLayerId: imported.activeLayerId,
      bgColor: imported.bgColor,
      backgroundStyle: imported.backgroundStyle,
      folderId: typeof value.folderId === 'string' ? value.folderId : null,
      createdAt: finiteNumber(value.createdAt, now),
      updatedAt: finiteNumber(value.updatedAt, now),
    })
    return document as CurrentCanvasDoc
  } catch {
    return null
  }
}

/** Validate and normalize a v4 snapshot without mutating its source. */
export function parseV4Snapshot(
  snapshot: LegacyDatabaseSnapshot,
  now = Date.now()
): V4MigrationReport {
  const folders: CanvasFolder[] = []
  const folderIds = new Set<string>()
  let skippedFolders = 0
  for (const [index, value] of snapshot.folders.entries()) {
    const folder = parseV4Folder(value, index)
    if (!folder || folderIds.has(folder.id)) {
      skippedFolders += 1
      continue
    }
    folderIds.add(folder.id)
    folders.push(folder)
  }

  const documents: CurrentCanvasDoc[] = []
  const documentIds = new Set<string>()
  let skippedDocuments = 0
  for (const value of snapshot.docs) {
    const document = parseV4Document(value, now)
    if (!document || documentIds.has(document.id)) {
      skippedDocuments += 1
      continue
    }
    if (document.folderId && !folderIds.has(document.folderId)) document.folderId = null
    documentIds.add(document.id)
    documents.push(document)
  }

  return { documents, folders, skippedDocuments, skippedFolders }
}

/** Import v4 through one repository-owned write boundary. */
export async function migrateV4ToV5(
  repository: DocumentRepository,
  source: LegacyDocumentSource,
  options: { force?: boolean; now?: number } = {}
): Promise<V4MigrationResult> {
  try {
    if (!options.force && (await repository.listDocuments()).length > 0) {
      return { status: 'skipped' }
    }

    const snapshot = await source.read()
    if (!snapshot) return { status: 'empty' }
    const report = parseV4Snapshot(snapshot, options.now)
    if (report.documents.length === 0) return { status: 'failed', report }

    await repository.saveMigrationBatch(report)
    return { status: 'imported', report }
  } catch (error) {
    return { status: 'failed', error }
  }
}
