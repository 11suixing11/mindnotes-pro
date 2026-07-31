import type { CanvasDoc } from './types'

export const RECOVERY_DRAFT_STORAGE_KEY = 'mindnotes-pro-v4.recovery-draft'
const RECOVERY_FORMAT = 'mindnotes-pro-recovery'
const RECOVERY_VERSION = 1

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
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    Array.isArray(value.elements) &&
    value.elements.every(
      (element) =>
        isRecord(element) &&
        typeof element.id === 'string' &&
        ['stroke', 'shape', 'text', 'image'].includes(String(element.type))
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

export function saveRecoveryDraft(document: CanvasDoc, savedAt = Date.now()): boolean {
  if (typeof localStorage === 'undefined') return false

  const record: RecoveryRecord = {
    format: RECOVERY_FORMAT,
    version: RECOVERY_VERSION,
    savedAt,
    document,
  }

  try {
    localStorage.setItem(RECOVERY_DRAFT_STORAGE_KEY, JSON.stringify(record))
    return true
  } catch {
    return false
  }
}

export function loadRecoveryDraft(): CanvasDoc | null {
  if (typeof localStorage === 'undefined') return null

  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECOVERY_DRAFT_STORAGE_KEY) ?? 'null')
    if (!isRecord(parsed)) return null
    if (parsed.format !== RECOVERY_FORMAT || parsed.version !== RECOVERY_VERSION) return null
    if (!isCanvasDoc(parsed.document)) return null
    return parsed.document
  } catch {
    return null
  }
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
    const parsed: unknown = JSON.parse(localStorage.getItem(RECOVERY_DRAFT_STORAGE_KEY) ?? 'null')
    if (
      isRecord(parsed) &&
      parsed.format === RECOVERY_FORMAT &&
      parsed.version === RECOVERY_VERSION &&
      isRecord(parsed.document) &&
      parsed.document.id === documentId &&
      typeof parsed.savedAt === 'number' &&
      parsed.savedAt <= savedAt
    ) {
      localStorage.removeItem(RECOVERY_DRAFT_STORAGE_KEY)
    }
  } catch {
    // Recovery is best effort and must never block normal persistence.
  }
}
