import { describe, expect, it } from 'vitest'
import { createBlankDocument } from './documentRecords'
import { reconcileDocumentRecovery } from './documentRecovery'

describe('document recovery reconciliation', () => {
  it('replaces a persisted document with a newer normalized draft', () => {
    const persisted = { ...createBlankDocument(100), id: 'persisted', updatedAt: 10 }
    const draft = {
      ...persisted,
      title: 'Recovered',
      layers: undefined,
      activeLayerId: undefined,
      updatedAt: 20,
    }

    const result = reconcileDocumentRecovery([persisted], [draft])

    expect(result.docs[0]).toMatchObject({
      id: 'persisted',
      title: 'Recovered',
      updatedAt: 20,
      schemaVersion: 5,
    })
    expect(result.docs[0].layers).toHaveLength(1)
    expect(result.recoveredDocumentIds).toEqual(['persisted'])
    expect(result.draftsToClear).toEqual([])
  })

  it('clears a draft when the persisted document is at least as new', () => {
    const persisted = { ...createBlankDocument(100), id: 'persisted', updatedAt: 20 }
    const draft = { ...persisted, updatedAt: 20 }

    const result = reconcileDocumentRecovery([persisted], [draft])

    expect(result.docs).toEqual([persisted])
    expect(result.recoveredDocumentIds).toEqual([])
    expect(result.draftsToClear).toEqual([{ documentId: 'persisted', savedAt: 20 }])
  })

  it('clears orphan drafts with an unbounded timestamp', () => {
    const draft = { ...createBlankDocument(100), id: 'orphan', updatedAt: 20 }

    const result = reconcileDocumentRecovery([], [draft])

    expect(result.docs).toEqual([])
    expect(result.recoveredDocumentIds).toEqual([])
    expect(result.draftsToClear).toEqual([
      { documentId: 'orphan', savedAt: Number.POSITIVE_INFINITY },
    ])
  })

  it('keeps recovered documents sorted by update time', () => {
    const older = { ...createBlankDocument(100), id: 'older', updatedAt: 10 }
    const newer = { ...createBlankDocument(100), id: 'newer', updatedAt: 20 }
    const draft = { ...older, updatedAt: 30 }

    const result = reconcileDocumentRecovery([newer, older], [draft])

    expect(result.docs.map((doc) => doc.id)).toEqual(['older', 'newer'])
  })
})
