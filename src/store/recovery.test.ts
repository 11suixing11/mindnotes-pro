import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearRecoveryDraftForDocument,
  loadRecoveryDraft,
  loadRecoveryDrafts,
  RECOVERY_DRAFT_STORAGE_KEY,
  saveRecoveryDraft,
} from './recovery'
import type { CanvasDoc } from './types'

function makeDocument(id: string, updatedAt: number): CanvasDoc {
  return {
    schemaVersion: 4,
    id,
    title: id,
    elements: [],
    layers: [
      {
        id: 'layer-default',
        name: '图层 1',
        visible: true,
        locked: false,
        order: 0,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    activeLayerId: 'layer-default',
    bgColor: '#ffffff',
    backgroundStyle: 'plain',
    folderId: null,
    createdAt: 1,
    updatedAt,
  }
}

describe('recovery drafts', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('keeps recovery drafts for multiple documents and clears them independently', () => {
    saveRecoveryDraft(makeDocument('doc-a', 10), 10)
    saveRecoveryDraft(makeDocument('doc-b', 20), 20)

    expect(loadRecoveryDrafts().map((document) => document.id)).toEqual(['doc-b', 'doc-a'])
    expect(loadRecoveryDraft('doc-a')?.id).toBe('doc-a')

    clearRecoveryDraftForDocument('doc-a', Number.POSITIVE_INFINITY)

    expect(loadRecoveryDrafts().map((document) => document.id)).toEqual(['doc-b'])
  })

  it('rejects recovery records with an incompatible canvas schema', () => {
    const document = { ...makeDocument('legacy', 10), schemaVersion: 3 }
    localStorage.setItem(
      RECOVERY_DRAFT_STORAGE_KEY,
      JSON.stringify({
        format: 'mindnotes-pro-recovery',
        version: 1,
        savedAt: 10,
        document,
      })
    )

    expect(loadRecoveryDraft()).toBeNull()
  })

  it('accepts documents that omit optional layer metadata', () => {
    const document = makeDocument('without-layers', 30)
    delete document.layers
    delete document.activeLayerId

    expect(saveRecoveryDraft(document, 30)).toBe(true)
    expect(loadRecoveryDraft('without-layers')).toMatchObject({ id: 'without-layers' })
  })
})
