import type { CanvasDoc } from '../types'
import { getDocumentRepository, getLegacyDocumentSource } from '../documentRepository'
import { useViewStore } from '../useViewStore'
import { migrateOld, removeMigratedData } from '../migration'
import { migrateV4ToV5 } from '../v4Import'
import { saveDocNow, clearSaveTimer } from '../saveManager'
import { normalizeCanvasDocLayers } from '../layers'
import { CANVAS_SCHEMA_VERSION } from '../schema'
import { useToastStore } from '../toastStore'
import type { CanvasBackupDocument } from '../backup'
import {
  DEFAULT_DOCUMENT_TITLE,
  createBlankDocument,
  createDefaultFolder,
  createDuplicatedDocument,
  createImportedDocument,
  normalizeAndSortDocuments,
  sortDocuments,
} from './documentRecords'
import { reconcileDocumentRecovery } from './documentRecovery'
import { rebuildDocumentRuntimeIndexes } from './documentRuntimeIndexes'
import { createDocumentWorkspaceState } from './documentWorkspace'
import {
  loadRecentDocumentSearches,
  persistRecentDocumentSearches,
  prependRecentDocumentSearch,
} from './documentSearchHistory'
import {
  clearRecoveryDraft,
  clearRecoveryDraftForDocument,
  loadRecoveryDraft,
  loadRecoveryDrafts,
} from '../recovery'

const LEGACY_DATABASE_MIGRATION_KEY = 'mindnotes-pro-v5.v4-imported'

export interface DocManagementState {
  docs: CanvasDoc[]
  currentDocId: string | null
  loaded: boolean
  documentSearchQuery: string
  recentDocumentSearches: string[]
}

export interface DocManagementActions {
  init: () => Promise<void>
  createDoc: (title?: string, folderId?: string | null) => Promise<string>
  openDoc: (id: string) => Promise<void>
  renameDoc: (id: string, title: string) => Promise<void>
  deleteDoc: (id: string) => Promise<void>
  duplicateDoc: (id: string) => Promise<void>
  importDoc: (document: CanvasBackupDocument) => Promise<string>
  setDocumentSearchQuery: (query: string) => void
  addRecentDocumentSearch: (query: string) => void
  saveNow: () => Promise<void>
}

export function createDocManagementSlice(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: any
): DocManagementState & DocManagementActions {
  return {
    // State
    docs: [],
    currentDocId: null,
    loaded: false,
    documentSearchQuery: '',
    recentDocumentSearches: loadRecentDocumentSearches(),

    // Actions
    init: async () => {
      try {
        const repository = getDocumentRepository()
        let docs = await repository.listDocuments()
        let folders = await repository.listFolders()
        let migratedLocalStorage = false

        const migrationAlreadyAttempted =
          localStorage.getItem(LEGACY_DATABASE_MIGRATION_KEY) === '1'
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
        docs = recovery.docs
        for (const draft of recovery.draftsToClear) {
          clearRecoveryDraftForDocument(draft.documentId, draft.savedAt)
        }
        const current = docs[0]

        set({
          docs,
          folders,
          ...createDocumentWorkspaceState(current),
          loaded: true,
          saveStatus: 'idle',
        })

        rebuildDocumentRuntimeIndexes(get(), current?.elements ?? [])
        if (recovery.recoveredDocumentIds.length > 0) {
          useToastStore.getState().show('已恢复最近一次未保存草稿', 'warning', 5000)
        }
        if (migratedLocalStorage) removeMigratedData()
      } catch (error) {
        console.error('[documents] Failed to initialize persistent storage', error)
        const recoveryDraft = loadRecoveryDraft()
        let fallback = createBlankDocument()
        let recoveredFromDraft = false
        if (recoveryDraft) {
          try {
            fallback = normalizeCanvasDocLayers(recoveryDraft)
            recoveredFromDraft = true
          } catch {
            clearRecoveryDraft()
          }
        }
        set({
          docs: [fallback],
          folders: [],
          ...createDocumentWorkspaceState(fallback),
          loaded: true,
          saveStatus: 'error',
        })
        rebuildDocumentRuntimeIndexes(get(), fallback.elements)
        useToastStore
          .getState()
          .show(
            recoveredFromDraft
              ? '浏览器存储不可用，已恢复最近一次未保存草稿；当前内容仍只保存在内存中'
              : '浏览器存储不可用，当前内容仅保存在内存中',
            'error',
            6000
          )
      }
    },

    createDoc: async (title = DEFAULT_DOCUMENT_TITLE, folderId = null) => {
      clearSaveTimer()
      if (get().currentDocId && !(await saveDocNow())) {
        throw new Error('Current document could not be saved')
      }

      const now = Date.now()
      const doc: CanvasDoc = { ...createBlankDocument(now), title, folderId }
      const repository = getDocumentRepository()
      await repository.saveDocument({ ...doc, schemaVersion: CANVAS_SCHEMA_VERSION })
      const docs = normalizeAndSortDocuments(await repository.listDocuments())
      set({
        docs,
        ...createDocumentWorkspaceState(doc, { history: 'empty' }),
        selectedIds: [],
      })
      // 新文档，清空空间索引
      rebuildDocumentRuntimeIndexes(get(), [])
      return doc.id
    },

    openDoc: async (id) => {
      clearSaveTimer()
      const state = get()
      if (state.currentDocId && !(await saveDocNow())) {
        throw new Error('Current document could not be saved')
      }
      const doc = await getDocumentRepository().getDocument(id)
      if (doc) {
        const normalizedDoc = normalizeCanvasDocLayers(doc)
        set({
          ...createDocumentWorkspaceState(normalizedDoc),
          selectedIds: [],
        })
        // 加载新文档，重建空间索引
        rebuildDocumentRuntimeIndexes(get(), normalizedDoc.elements)
        useViewStore.getState().resetView()
      }
    },

    renameDoc: async (id, title) => {
      const nextTitle = title.trim()
      const state = get()
      const doc = state.docs.find((item: CanvasDoc) => item.id === id)
      if (!doc || !nextTitle || doc.title === nextTitle) return

      const updatedDoc = { ...doc, title: nextTitle, updatedAt: Date.now() }
      const previousDocs = state.docs
      set({
        docs: previousDocs
          .map((item: CanvasDoc) => (item.id === id ? updatedDoc : item))
          .sort((a: CanvasDoc, b: CanvasDoc) => b.updatedAt - a.updatedAt),
      })

      const rollback = () => {
        set((current: DocManagementState) => ({
          docs: current.docs
            .map((item) => (item.id === id && item.updatedAt === updatedDoc.updatedAt ? doc : item))
            .sort((a, b) => b.updatedAt - a.updatedAt),
        }))
      }

      try {
        const storedDoc = await getDocumentRepository().updateDocument(id, (current) =>
          current
            ? {
                ...current,
                schemaVersion: CANVAS_SCHEMA_VERSION,
                title: nextTitle,
                updatedAt: updatedDoc.updatedAt,
              }
            : undefined
        )
        if (!storedDoc) {
          rollback()
          return
        }
      } catch (error) {
        rollback()
        throw error
      }
    },

    deleteDoc: async (id) => {
      const repository = getDocumentRepository()
      await repository.deleteDocument(id)
      const { currentDocId } = get()
      const docs = sortDocuments(await repository.listDocuments())
      if (currentDocId === id) {
        const first = docs[0] ? normalizeCanvasDocLayers(docs[0]) : undefined
        set({
          docs,
          ...createDocumentWorkspaceState(first, { history: 'empty' }),
        })
        // 删除当前文档后加载第一个文档，重建空间索引
        rebuildDocumentRuntimeIndexes(get(), first?.elements ?? [])
      } else {
        set({ docs })
      }
    },

    duplicateDoc: async (id) => {
      clearSaveTimer()
      if (get().currentDocId && !(await saveDocNow())) {
        throw new Error('Current document could not be saved')
      }
      const repository = getDocumentRepository()
      const doc = await repository.getDocument(id)
      if (!doc) return
      const dup = createDuplicatedDocument(doc)
      await repository.saveDocument({ ...dup, schemaVersion: CANVAS_SCHEMA_VERSION })
      set({
        docs: sortDocuments(await repository.listDocuments()),
      })
    },

    importDoc: async (document) => {
      clearSaveTimer()
      const state = get()
      if (state.currentDocId && !(await saveDocNow())) {
        throw new Error('Current document could not be saved')
      }

      const imported = createImportedDocument(document)

      const repository = getDocumentRepository()
      await repository.saveDocument({ ...imported, schemaVersion: CANVAS_SCHEMA_VERSION })
      const docs = normalizeAndSortDocuments(await repository.listDocuments())

      set({
        docs,
        ...createDocumentWorkspaceState(imported, { history: 'empty' }),
        selectedIds: [],
        saveStatus: 'saved',
      })
      rebuildDocumentRuntimeIndexes(get(), imported.elements)
      useViewStore.getState().resetView()
      return imported.id
    },

    setDocumentSearchQuery: (query) => {
      set({ documentSearchQuery: query })
    },

    addRecentDocumentSearch: (query) => {
      const recentDocumentSearches = prependRecentDocumentSearch(
        get().recentDocumentSearches,
        query
      )
      if (!recentDocumentSearches) return

      persistRecentDocumentSearches(recentDocumentSearches)
      set({ recentDocumentSearches })
    },

    saveNow: async () => {
      await saveDocNow()
    },
  }
}
