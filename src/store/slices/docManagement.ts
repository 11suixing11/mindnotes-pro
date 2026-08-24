import type { CanvasDoc } from '../types'
import { getDocumentRepository } from '../documentRepository'
import { useViewStore } from '../useViewStore'
import { saveDocNow, clearSaveTimer } from '../saveManager'
import { normalizeCanvasDocLayers } from '../layers'
import { CANVAS_SCHEMA_VERSION } from '../schema'
import { useToastStore } from '../toastStore'
import type { CanvasBackupDocument } from '../backup'
import {
  DEFAULT_DOCUMENT_TITLE,
  createBlankDocument,
  createDuplicatedDocument,
  createReplacedDocument,
  normalizeAndSortDocuments,
  selectCanonicalDocument,
  sortDocuments,
} from './documentRecords'
import { rebuildDocumentRuntimeIndexes } from './documentRuntimeIndexes'
import { createDocumentWorkspaceState } from './documentWorkspace'
import {
  createDocumentInitializationFallback,
  initializeDocuments,
  removeMigratedData,
} from './documentInitialization'

export interface DocManagementState {
  docs: CanvasDoc[]
  currentDocId: string | null
  loaded: boolean
}

export interface DocManagementActions {
  init: () => Promise<void>
  /** Legacy command retained for non-UI migration/test compatibility. */
  createDoc: (title?: string, folderId?: string | null) => Promise<string>
  /** Legacy command retained for non-UI migration/test compatibility. */
  openDoc: (id: string) => Promise<void>
  /** Legacy command retained for non-UI migration/test compatibility. */
  renameDoc: (id: string, title: string) => Promise<void>
  /** Legacy command retained for non-UI migration/test compatibility. */
  deleteDoc: (id: string) => Promise<void>
  /** Legacy command retained for non-UI migration/test compatibility. */
  duplicateDoc: (id: string) => Promise<void>
  /** Import into the one canonical board without creating another document. */
  replaceCurrentDoc: (document: CanvasBackupDocument) => Promise<string>
  /** Compatibility alias; import still replaces the single board. */
  importDoc: (document: CanvasBackupDocument) => Promise<string>
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

    // Actions
    init: async () => {
      try {
        const initialization = await initializeDocuments()
        const { docs, recovery } = initialization
        const current = selectCanonicalDocument(docs)

        set({
          docs,
          ...createDocumentWorkspaceState(current),
          loaded: true,
          saveStatus: 'idle',
        })

        rebuildDocumentRuntimeIndexes(get(), current?.elements ?? [])
        if (recovery.recoveredDocumentIds.length > 0) {
          useToastStore.getState().show('已恢复最近一次未保存草稿', 'warning', 5000)
        }
        if (initialization.migratedLocalStorage) removeMigratedData()
      } catch (error) {
        console.error('[documents] Failed to initialize persistent storage', error)
        const { document: fallback, recoveredFromDraft } = createDocumentInitializationFallback()
        set({
          docs: [fallback],
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

    // Legacy multi-document commands remain internal compatibility APIs. The
    // application shell no longer mounts a document sidebar or exposes them.
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
        if (!storedDoc) rollback()
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
      set({ docs: sortDocuments(await repository.listDocuments()) })
    },

    replaceCurrentDoc: async (document) => {
      clearSaveTimer()
      const state = get()
      if (state.currentDocId && !(await saveDocNow())) {
        throw new Error('Current document could not be saved')
      }

      const existing =
        state.docs.find((item: CanvasDoc) => item.id === state.currentDocId) ??
        selectCanonicalDocument(state.docs)
      const replaced = createReplacedDocument(document, existing)

      const repository = getDocumentRepository()
      await repository.saveDocument({ ...replaced, schemaVersion: CANVAS_SCHEMA_VERSION })

      set({
        docs: [replaced],
        ...createDocumentWorkspaceState(replaced, { history: 'empty' }),
        selectedIds: [],
        saveStatus: 'saved',
      })
      rebuildDocumentRuntimeIndexes(get(), replaced.elements)
      useViewStore.getState().resetView()
      return replaced.id
    },

    // Importing always replaces the current single board rather than
    // appending a document.
    importDoc: async (document) => get().replaceCurrentDoc(document),

    saveNow: async () => {
      await saveDocNow()
    },
  }
}
