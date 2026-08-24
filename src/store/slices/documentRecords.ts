import type { CanvasBackupDocument } from '../backup'
import type { CanvasDoc, CanvasFolder } from '../types'
import { createDefaultLayer, normalizeCanvasDocLayers } from '../layers'
import { CANVAS_SCHEMA_VERSION } from '../schema'

export const DEFAULT_DOCUMENT_TITLE = '未命名画布'
const IMPORTED_DOCUMENT_TITLE = '导入的画布'
const DUPLICATE_DOCUMENT_SUFFIX = ' (副本)'
const IMPORTED_DOCUMENT_SUFFIX = '（导入）'

export function createDocumentId(now = Date.now()): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `doc-${crypto.randomUUID()}`
  }
  return `doc-${now}-${Math.random().toString(36).slice(2, 8)}`
}

export function createBlankDocument(now = Date.now()): CanvasDoc {
  const layers = [createDefaultLayer(now)]
  return {
    schemaVersion: CANVAS_SCHEMA_VERSION,
    id: createDocumentId(now),
    title: DEFAULT_DOCUMENT_TITLE,
    elements: [],
    layers,
    activeLayerId: layers[0].id,
    bgColor: '#ffffff',
    backgroundStyle: 'plain',
    folderId: null,
    createdAt: now,
    updatedAt: now,
  }
}

export function createDefaultFolder(): CanvasFolder {
  return {
    id: 'folder-default',
    name: '我的笔记',
    parentId: null,
    order: 0,
    expanded: true,
  }
}

export function sortDocuments(docs: CanvasDoc[]): CanvasDoc[] {
  return [...docs].sort((a, b) => b.updatedAt - a.updatedAt)
}

export function normalizeAndSortDocuments(docs: CanvasDoc[]): CanvasDoc[] {
  return sortDocuments(docs.map((doc) => normalizeCanvasDocLayers(doc)))
}

/**
 * The single-board workspace still reads legacy document collections during
 * migration. Pick the most recently updated record as the canonical board
 * without deleting older records from storage.
 */
export function selectCanonicalDocument(docs: CanvasDoc[]): CanvasDoc | undefined {
  return normalizeAndSortDocuments(docs)[0]
}

export function createDuplicatedDocument(doc: CanvasDoc, now = Date.now()): CanvasDoc {
  return {
    ...normalizeCanvasDocLayers(doc),
    schemaVersion: CANVAS_SCHEMA_VERSION,
    id: createDocumentId(now),
    title: `${doc.title}${DUPLICATE_DOCUMENT_SUFFIX}`,
    createdAt: now,
    updatedAt: now,
  }
}

export function createImportedDocument(
  document: CanvasBackupDocument,
  now = Date.now()
): CanvasDoc {
  return normalizeCanvasDocLayers({
    schemaVersion: CANVAS_SCHEMA_VERSION,
    id: createDocumentId(now),
    title: `${document.title.trim() || IMPORTED_DOCUMENT_TITLE}${IMPORTED_DOCUMENT_SUFFIX}`,
    elements: document.elements,
    layers: document.layers,
    activeLayerId: document.activeLayerId,
    bgColor: document.bgColor,
    backgroundStyle: document.backgroundStyle,
    folderId: null,
    createdAt: now,
    updatedAt: now,
  })
}

/** Replace the contents of the canonical board while preserving its identity. */
export function createReplacedDocument(
  document: CanvasBackupDocument,
  existing: CanvasDoc | undefined,
  now = Date.now()
): CanvasDoc {
  return normalizeCanvasDocLayers({
    schemaVersion: CANVAS_SCHEMA_VERSION,
    id: existing?.id ?? createDocumentId(now),
    title: document.title.trim() || existing?.title || DEFAULT_DOCUMENT_TITLE,
    elements: document.elements,
    layers: document.layers,
    activeLayerId: document.activeLayerId,
    bgColor: document.bgColor,
    backgroundStyle: document.backgroundStyle,
    folderId: existing?.folderId ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  })
}
