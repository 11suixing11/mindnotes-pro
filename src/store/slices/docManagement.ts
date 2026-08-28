import type { CanvasDoc, CanvasWorkspaceMetadata, CurrentCanvasDoc, UndoAction } from '../types'
import { getDocumentRepository } from '../documentRepository'
import { useViewStore } from '../useViewStore'
import {
  saveDocNow,
  clearSaveTimer,
  getSaveGeneration,
  incrementSaveGeneration,
  markDocumentDeleted,
  unmarkDocumentDeleted,
} from '../saveManager'
import { clearRecoveryDraftForDocument } from '../recovery'
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
import { appendUndoAction } from './canvasElementCommit'
import { snapshot } from '../helpers'
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

function createWorkspaceMetadata(
  title: string,
  source: Pick<CanvasWorkspaceMetadata, 'layers' | 'activeLayerId' | 'bgColor' | 'backgroundStyle'>
): CanvasWorkspaceMetadata {
  return {
    title,
    layers: source.layers.map((layer) => ({ ...layer })),
    activeLayerId: source.activeLayerId,
    bgColor: source.bgColor,
    backgroundStyle: source.backgroundStyle,
  }
}

function normalizeCurrentDocument(document: CanvasDoc): CurrentCanvasDoc {
  const normalized = normalizeCanvasDocLayers(document)
  return {
    ...normalized,
    schemaVersion: CANVAS_SCHEMA_VERSION,
  }
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
          persistenceMode: 'persistent',
          lastSavedAt: current?.updatedAt ?? null,
          saveError: null,
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
          persistenceMode: 'memory-only',
          lastSavedAt: null,
          saveError: error instanceof Error ? error.message : '浏览器存储初始化失败',
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
      if (state.currentDocId === id) incrementSaveGeneration()
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
      clearSaveTimer()
      if (get().currentDocId === id) await saveDocNow()
      markDocumentDeleted(id)
      const repository = getDocumentRepository()
      try {
        await repository.deleteDocument(id)
        clearRecoveryDraftForDocument(id, Number.POSITIVE_INFINITY)
      } catch (error) {
        unmarkDocumentDeleted(id)
        throw error
      }
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
      if (get().currentDocId && !(await saveDocNow())) {
        throw new Error('Current document could not be saved')
      }

      // Saving can yield to edits. Import history must capture the latest
      // workspace after that await so undo never drops concurrent changes.
      const state = get()
      const importIdentity = state.currentDocId
      const importGeneration = getSaveGeneration(importIdentity)
      const importDocs = state.docs
      const existing =
        state.docs.find((item: CanvasDoc) => item.id === state.currentDocId) ??
        selectCanonicalDocument(state.docs)
      const replaced = createReplacedDocument(document, existing)
      const importAction: UndoAction = {
        type: 'snapshot',
        before: snapshot(state.elements),
        after: snapshot(replaced.elements),
        label: 'Import canvas',
        affectedIds: [
          ...new Set([...state.elements, ...replaced.elements].map((element) => element.id)),
        ],
        workspace: {
          before: createWorkspaceMetadata(existing?.title ?? '未命名画布', state),
          after: createWorkspaceMetadata(replaced.title, {
            layers: replaced.layers ?? [],
            activeLayerId: replaced.activeLayerId ?? '',
            bgColor: replaced.bgColor,
            backgroundStyle: replaced.backgroundStyle ?? 'plain',
          }),
        },
      }
      const undoStack = appendUndoAction(state.undoStack, importAction)
      const replacedWithHistory: CanvasDoc = { ...replaced, undoStack, redoStack: [] }

      const repository = getDocumentRepository()
      await repository.saveDocument({
        ...replacedWithHistory,
        schemaVersion: CANVAS_SCHEMA_VERSION,
      })

      const latestState = get()
      const identityChanged = latestState.currentDocId !== importIdentity
      const generationChanged = getSaveGeneration(importIdentity) !== importGeneration
      const docsChanged = latestState.docs !== importDocs

      if (identityChanged || generationChanged || docsChanged) {
        // The write completed after another command changed the live board.
        // Never replace that newer workspace with the imported snapshot. Put
        // the persisted record back in the same state the user is still
        // editing (or remove a newly-created import when the old record no
        // longer exists), then reject so the UI reports a retryable import.
        try {
          if (!identityChanged && importIdentity === replaced.id) {
            // saveDocNow also updates the save-generation cache/status after
            // restoring the latest live workspace. It captures edits that
            // landed while the import write was in flight.
            if (!(await saveDocNow({ force: true }))) throw new Error('原画板保存失败')
          } else if (existing && existing.id === replaced.id) {
            const oldDocumentIsStillOpen = latestState.docs.some(
              (item: CanvasDoc) => item.id === replaced.id
            )
            if (!oldDocumentIsStillOpen) {
              await repository.deleteDocument(replaced.id)
            } else {
              const latestDocument =
                latestState.docs.find((item: CanvasDoc) => item.id === replaced.id) ?? existing
              await repository.saveDocument(normalizeCurrentDocument(latestDocument))
            }
          } else {
            await repository.deleteDocument(replaced.id)
          }
        } catch (rollbackError) {
          console.error('[documents] Failed to roll back a conflicting import', rollbackError)
          const recoveryError = new Error('导入已取消，但原画板恢复失败，请导出恢复备份后重试')
          Object.assign(recoveryError, { cause: rollbackError })
          throw recoveryError
        }

        throw new Error('导入已取消：导入期间画布发生变化，请重试')
      }

      set({
        docs: [replacedWithHistory],
        ...createDocumentWorkspaceState(replacedWithHistory),
        selectedIds: [],
        saveStatus: 'saved',
        persistenceMode: 'persistent',
        lastSavedAt: replaced.updatedAt,
        saveError: null,
      })
      rebuildDocumentRuntimeIndexes(get(), replacedWithHistory.elements)
      useViewStore.getState().resetView()
      return replacedWithHistory.id
    },

    // Importing always replaces the current single board rather than
    // appending a document.
    importDoc: async (document) => get().replaceCurrentDoc(document),

    saveNow: async () => {
      await saveDocNow()
    },
  }
}
