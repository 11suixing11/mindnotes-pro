import type { CanvasDoc } from '../types'
import { normalizeCanvasDocLayers } from '../layers'
import { normalizeAndSortDocuments } from './documentRecords'

export interface RecoveryDraftClearInstruction {
  documentId: string
  savedAt: number
}

export interface DocumentRecoveryReconciliation {
  docs: CanvasDoc[]
  recoveredDocumentIds: string[]
  draftsToClear: RecoveryDraftClearInstruction[]
}

export function reconcileDocumentRecovery(
  documents: CanvasDoc[],
  recoveryDrafts: CanvasDoc[]
): DocumentRecoveryReconciliation {
  let docs = normalizeAndSortDocuments(documents)
  const recoveredDocumentIds: string[] = []
  const draftsToClear: RecoveryDraftClearInstruction[] = []

  for (const recoveryDraft of recoveryDrafts) {
    const persistedRecovery = docs.find((doc) => doc.id === recoveryDraft.id)
    if (!persistedRecovery) {
      draftsToClear.push({
        documentId: recoveryDraft.id,
        savedAt: Number.POSITIVE_INFINITY,
      })
      continue
    }

    if (persistedRecovery.updatedAt >= recoveryDraft.updatedAt) {
      draftsToClear.push({
        documentId: recoveryDraft.id,
        savedAt: persistedRecovery.updatedAt,
      })
      continue
    }

    const recovered = normalizeCanvasDocLayers(recoveryDraft)
    docs = docs.map((doc) => (doc.id === recovered.id ? recovered : doc))
    recoveredDocumentIds.push(recovered.id)
  }

  return {
    docs: normalizeAndSortDocuments(docs),
    recoveredDocumentIds,
    draftsToClear,
  }
}
