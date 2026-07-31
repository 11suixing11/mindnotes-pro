import type { CanvasDoc, CanvasElement, CanvasFolder } from '../types'
import * as storage from '../storage'
import { useViewStore } from '../useViewStore'
import { migrateOld, removeMigratedData } from '../migration'
import { saveDocNow, clearSaveTimer } from '../saveManager'
import { createDefaultLayer, normalizeCanvasDocLayers } from '../layers'
import { CANVAS_SCHEMA_VERSION } from '../schema'
import { useToastStore } from '../toastStore'
import type { CanvasBackupDocument } from '../backup'

const DOCUMENT_SEARCH_HISTORY_KEY = 'mn-sidebar-searches'
const MAX_RECENT_DOCUMENT_SEARCHES = 5
const LEGACY_DATABASE_MIGRATION_KEY = 'mindnotes-pro-v4.legacy-database-migrated'

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

function loadRecentDocumentSearches(): string[] {
  if (typeof localStorage === 'undefined') return []

  try {
    const parsed = JSON.parse(localStorage.getItem(DOCUMENT_SEARCH_HISTORY_KEY) ?? '[]')
    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is string => typeof item === 'string')
          .slice(0, MAX_RECENT_DOCUMENT_SEARCHES)
      : []
  } catch {
    return []
  }
}

function persistRecentDocumentSearches(searches: string[]) {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(DOCUMENT_SEARCH_HISTORY_KEY, JSON.stringify(searches))
  } catch {
    // Search remains usable even when persisted history is unavailable.
  }
}

function loadRuntimeElementIndexes(
  get: () => {
    idToElement?: Map<string, CanvasElement>
    idToIndex?: Map<string, number>
    spatialIndex?: { bulkLoad: (elements: CanvasElement[]) => void }
  },
  elements: CanvasElement[]
) {
  const state = get()
  state.idToElement?.clear()
  state.idToIndex?.clear()
  elements.forEach((element, index) => {
    state.idToElement?.set(element.id, element)
    state.idToIndex?.set(element.id, index)
  })
  state.spatialIndex?.bulkLoad(elements)
}

function createBlankDocument(now = Date.now()): CanvasDoc {
  const layers = [createDefaultLayer(now)]
  return {
    schemaVersion: CANVAS_SCHEMA_VERSION,
    id: createDocumentId(now),
    title: '未命名画布',
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

function createDocumentId(now = Date.now()): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `doc-${crypto.randomUUID()}`
  }
  return `doc-${now}-${Math.random().toString(36).slice(2, 8)}`
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
        let docs = await storage.getAll<CanvasDoc>('docs')
        let folders = await storage.getAll<CanvasFolder>('folders')
        let migratedLocalStorage = false

        if (docs.length === 0 && localStorage.getItem(LEGACY_DATABASE_MIGRATION_KEY) !== '1') {
          try {
            const legacy = await storage.readLegacyDatabase<CanvasDoc, CanvasFolder>()
            const legacyDocs = (legacy?.docs ?? []).map((doc) => normalizeCanvasDocLayers(doc))

            for (const doc of legacyDocs) await storage.put('docs', doc)
            if (folders.length === 0) {
              for (const folder of legacy?.folders ?? []) await storage.put('folders', folder)
              folders = legacy?.folders ?? []
            }
            docs = legacyDocs
            localStorage.setItem(LEGACY_DATABASE_MIGRATION_KEY, '1')
          } catch (error) {
            console.warn('[documents] Legacy database migration could not be completed', error)
          }
        }

        if (docs.length === 0) {
          const migrated = migrateOld()
          if (migrated) {
            await storage.put('docs', migrated)
            docs = [migrated]
            migratedLocalStorage = true
          } else {
            const blank = createBlankDocument()
            await storage.put('docs', blank)
            docs = [blank]
          }
        }

        if (folders.length === 0) {
          const defaultFolder: CanvasFolder = {
            id: 'folder-default',
            name: '我的笔记',
            parentId: null,
            order: 0,
            expanded: true,
          }
          await storage.put('folders', defaultFolder)
          folders = [defaultFolder]
        }

        docs = docs.map((doc) => normalizeCanvasDocLayers(doc))
        docs.sort((a, b) => b.updatedAt - a.updatedAt)
        const current = docs[0]

        set({
          docs,
          folders,
          currentDocId: current?.id ?? null,
          elements: current?.elements ?? [],
          layers: current?.layers ?? [createDefaultLayer()],
          activeLayerId: current?.activeLayerId ?? createDefaultLayer().id,
          bgColor: current?.bgColor ?? '#ffffff',
          backgroundStyle: current?.backgroundStyle ?? 'plain',
          undoStack: current?.undoStack ?? [],
          redoStack: current?.redoStack ?? [],
          loaded: true,
          saveStatus: 'idle',
        })

        loadRuntimeElementIndexes(get, current?.elements ?? [])
        if (migratedLocalStorage) removeMigratedData()
      } catch (error) {
        console.error('[documents] Failed to initialize persistent storage', error)
        const blank = createBlankDocument()
        set({
          docs: [blank],
          folders: [],
          currentDocId: blank.id,
          elements: [],
          layers: blank.layers,
          activeLayerId: blank.activeLayerId,
          bgColor: blank.bgColor,
          backgroundStyle: blank.backgroundStyle,
          undoStack: [],
          redoStack: [],
          loaded: true,
          saveStatus: 'error',
        })
        loadRuntimeElementIndexes(get, [])
        useToastStore.getState().show('浏览器存储不可用，当前内容仅保存在内存中', 'error', 6000)
      }
    },

    createDoc: async (title = '未命名画布', folderId = null) => {
      clearSaveTimer()
      if (get().currentDocId && !(await saveDocNow())) {
        throw new Error('Current document could not be saved')
      }

      const now = Date.now()
      const id = createDocumentId(now)
      const doc: CanvasDoc = { ...createBlankDocument(now), id, title, folderId }
      const layers = doc.layers ?? [createDefaultLayer(now)]
      await storage.put('docs', doc)
      const docs = (await storage.getAll<CanvasDoc>('docs'))
        .map((doc) => normalizeCanvasDocLayers(doc))
        .sort((a, b) => b.updatedAt - a.updatedAt)
      set({
        docs,
        currentDocId: id,
        elements: [],
        layers,
        activeLayerId: layers[0].id,
        bgColor: '#ffffff',
        backgroundStyle: 'plain',
        undoStack: [],
        redoStack: [],
        selectedIds: [],
      })
      // 新文档，清空空间索引
      loadRuntimeElementIndexes(get, [])
      return id
    },

    openDoc: async (id) => {
      clearSaveTimer()
      const state = get()
      if (state.currentDocId && !(await saveDocNow())) {
        throw new Error('Current document could not be saved')
      }
      const doc = await storage.get<CanvasDoc>('docs', id)
      if (doc) {
        const normalizedDoc = normalizeCanvasDocLayers(doc)
        set({
          currentDocId: id,
          elements: normalizedDoc.elements,
          layers: normalizedDoc.layers,
          activeLayerId: normalizedDoc.activeLayerId,
          bgColor: normalizedDoc.bgColor,
          backgroundStyle: normalizedDoc.backgroundStyle ?? 'plain',
          undoStack: normalizedDoc.undoStack ?? [],
          redoStack: normalizedDoc.redoStack ?? [],
          selectedIds: [],
        })
        // 加载新文档，重建空间索引
        loadRuntimeElementIndexes(get, normalizedDoc.elements)
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
        const storedDoc = await storage.update<CanvasDoc>('docs', id, (current) =>
          current
            ? {
                ...current,
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
      await storage.del('docs', id)
      const { currentDocId } = get()
      const docs = (await storage.getAll<CanvasDoc>('docs')).sort(
        (a, b) => b.updatedAt - a.updatedAt
      )
      if (currentDocId === id) {
        const first = docs[0] ? normalizeCanvasDocLayers(docs[0]) : undefined
        set({
          docs,
          currentDocId: first?.id ?? null,
          elements: first?.elements ?? [],
          layers: first?.layers ?? [createDefaultLayer()],
          activeLayerId: first?.activeLayerId ?? createDefaultLayer().id,
          bgColor: first?.bgColor ?? '#ffffff',
          backgroundStyle: first?.backgroundStyle ?? 'plain',
          undoStack: [],
          redoStack: [],
        })
        // 删除当前文档后加载第一个文档，重建空间索引
        loadRuntimeElementIndexes(get, first?.elements ?? [])
      } else {
        set({ docs })
      }
    },

    duplicateDoc: async (id) => {
      clearSaveTimer()
      if (get().currentDocId && !(await saveDocNow())) {
        throw new Error('Current document could not be saved')
      }
      const doc = await storage.get<CanvasDoc>('docs', id)
      if (!doc) return
      const now = Date.now()
      const dup: CanvasDoc = {
        ...normalizeCanvasDocLayers(doc),
        id: createDocumentId(now),
        title: `${doc.title} (副本)`,
        createdAt: now,
        updatedAt: now,
      }
      await storage.put('docs', dup)
      set({
        docs: (await storage.getAll<CanvasDoc>('docs')).sort((a, b) => b.updatedAt - a.updatedAt),
      })
    },

    importDoc: async (document) => {
      clearSaveTimer()
      const state = get()
      if (state.currentDocId && !(await saveDocNow())) {
        throw new Error('Current document could not be saved')
      }

      const now = Date.now()
      const id = createDocumentId(now)
      const imported = normalizeCanvasDocLayers({
        schemaVersion: CANVAS_SCHEMA_VERSION,
        id,
        title: `${document.title.trim() || '导入的画布'}（导入）`,
        elements: document.elements,
        layers: document.layers,
        activeLayerId: document.activeLayerId,
        bgColor: document.bgColor,
        backgroundStyle: document.backgroundStyle,
        folderId: null,
        createdAt: now,
        updatedAt: now,
      })

      await storage.put('docs', imported)
      const docs = (await storage.getAll<CanvasDoc>('docs'))
        .map((doc) => normalizeCanvasDocLayers(doc))
        .sort((a, b) => b.updatedAt - a.updatedAt)

      set({
        docs,
        currentDocId: imported.id,
        elements: imported.elements,
        layers: imported.layers,
        activeLayerId: imported.activeLayerId,
        bgColor: imported.bgColor,
        backgroundStyle: imported.backgroundStyle,
        undoStack: [],
        redoStack: [],
        selectedIds: [],
        saveStatus: 'saved',
      })
      loadRuntimeElementIndexes(get, imported.elements)
      useViewStore.getState().resetView()
      return imported.id
    },

    setDocumentSearchQuery: (query) => {
      set({ documentSearchQuery: query })
    },

    addRecentDocumentSearch: (query) => {
      const nextSearch = query.trim()
      if (!nextSearch) return

      const recentDocumentSearches = [
        nextSearch,
        ...get().recentDocumentSearches.filter(
          (item: string) => item.toLowerCase() !== nextSearch.toLowerCase()
        ),
      ].slice(0, MAX_RECENT_DOCUMENT_SEARCHES)

      persistRecentDocumentSearches(recentDocumentSearches)
      set({ recentDocumentSearches })
    },

    saveNow: async () => {
      await saveDocNow()
    },
  }
}
