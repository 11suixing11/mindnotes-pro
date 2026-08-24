import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearRecoveryDraftForDocument,
  loadRecoveryDraft,
  loadRecoveryDrafts,
  LEGACY_RECOVERY_DRAFT_STORAGE_KEY,
  RECOVERY_DRAFT_STORAGE_KEY,
  saveRecoveryDraft,
} from './recovery'
import type { CanvasDoc } from './types'
import { CANVAS_SCHEMA_VERSION } from './schema'

function makeDocument(id: string, updatedAt: number): CanvasDoc {
  return {
    schemaVersion: CANVAS_SCHEMA_VERSION,
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

  it('upgrades a v4 recovery draft after copying it to the v5 key', () => {
    const document = { ...makeDocument('legacy-v4', 40), schemaVersion: 4 as const }
    localStorage.setItem(
      LEGACY_RECOVERY_DRAFT_STORAGE_KEY,
      JSON.stringify({
        format: 'mindnotes-pro-recovery',
        version: 1,
        savedAt: 40,
        document,
      })
    )

    expect(loadRecoveryDraft('legacy-v4')).toMatchObject({
      id: 'legacy-v4',
      schemaVersion: 5,
    })
    expect(localStorage.getItem(LEGACY_RECOVERY_DRAFT_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(RECOVERY_DRAFT_STORAGE_KEY)).not.toBeNull()
  })
})
