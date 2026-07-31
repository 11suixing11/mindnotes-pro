import { CANVAS_SCHEMA_VERSION } from './schema'
import { CANVAS_ELEMENT_TYPES, type CanvasDoc } from './types'

export const RECOVERY_DRAFT_STORAGE_KEY = 'mindnotes-pro-v4.recovery-draft'
const RECOVERY_FORMAT = 'mindnotes-pro-recovery'
const RECOVERY_VERSION = 1
const MAX_RECOVERY_DRAFTS = 5

interface RecoveryRecord {
  format: typeof RECOVERY_FORMAT
  version: typeof RECOVERY_VERSION
  savedAt: number
  document: CanvasDoc
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCanvasDoc(value: unknown): value is CanvasDoc {
  if (!isRecord(value)) return false
  return (
    value.schemaVersion === CANVAS_SCHEMA_VERSION &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    Array.isArray(value.elements) &&
    value.elements.every(
      (element) =>
        isRecord(element) &&
        typeof element.id === 'string' &&
        typeof element.type === 'string' &&
        (CANVAS_ELEMENT_TYPES as readonly string[]).includes(element.type)
    ) &&
    Array.isArray(value.layers) &&
    typeof value.activeLayerId === 'string' &&
    typeof value.bgColor === 'string' &&
    (value.backgroundStyle === undefined || typeof value.backgroundStyle === 'string') &&
    (value.folderId === null || typeof value.folderId === 'string') &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  )
}

function isRecoveryRecord(value: unknown): value is RecoveryRecord {
  return (
    isRecord(value) &&
    value.format === RECOVERY_FORMAT &&
    value.version === RECOVERY_VERSION &&
    typeof value.savedAt === 'number' &&
    Number.isFinite(value.savedAt) &&
    isCanvasDoc(value.document)
  )
}

function readRecoveryRecords(): RecoveryRecord[] {
  if (typeof localStorage === 'undefined') return []

  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECOVERY_DRAFT_STORAGE_KEY) ?? 'null')
    if (Array.isArray(parsed)) return parsed.filter(isRecoveryRecord)
    return isRecoveryRecord(parsed) ? [parsed] : []
  } catch {
    return []
  }
}

export function saveRecoveryDraft(document: CanvasDoc, savedAt = Date.now()): boolean {
  if (typeof localStorage === 'undefined') return false

  const record: RecoveryRecord = {
    format: RECOVERY_FORMAT,
    version: RECOVERY_VERSION,
    savedAt,
    document,
  }

  try {
    const records = readRecoveryRecords().filter((item) => item.document.id !== document.id)
    records.push(record)
    records.sort((a, b) => b.savedAt - a.savedAt)
    localStorage.setItem(
      RECOVERY_DRAFT_STORAGE_KEY,
      JSON.stringify(records.slice(0, MAX_RECOVERY_DRAFTS))
    )
    return true
  } catch {
    return false
  }
}

export function loadRecoveryDrafts(): CanvasDoc[] {
  return readRecoveryRecords()
    .sort((a, b) => b.savedAt - a.savedAt)
    .map((record) => record.document)
}

export function loadRecoveryDraft(documentId?: string): CanvasDoc | null {
  const records = readRecoveryRecords().sort((a, b) => b.savedAt - a.savedAt)
  const record = documentId ? records.find((item) => item.document.id === documentId) : records[0]
  return record?.document ?? null
}

export function clearRecoveryDraft(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(RECOVERY_DRAFT_STORAGE_KEY)
  } catch {
    // Recovery is best effort and must never block normal persistence.
  }
}

export function clearRecoveryDraftForDocument(documentId: string, savedAt: number): void {
  if (typeof localStorage === 'undefined') return

  try {
    const records = readRecoveryRecords()
    const remaining = records.filter(
      (record) => record.document.id !== documentId || record.savedAt > savedAt
    )
    if (remaining.length !== records.length) {
      localStorage.setItem(RECOVERY_DRAFT_STORAGE_KEY, JSON.stringify(remaining))
    }
  } catch {
    // Recovery is best effort and must never block normal persistence.
  }
}
