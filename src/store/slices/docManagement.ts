import type { CanvasDoc, CanvasFolder } from '../types'
import * as storage from '../storage'
import { useViewStore } from '../useViewStore'
import { migrateOld, removeMigratedData } from '../migration'
import { saveDocNow, clearSaveTimer } from '../saveManager'

export interface DocManagementState {
  docs: CanvasDoc[]
  currentDocId: string | null
  loaded: boolean
}

export interface DocManagementActions {
  init: () => Promise<void>
  createDoc: (title?: string, folderId?: string | null) => Promise<string>
  openDoc: (id: string) => Promise<void>
  renameDoc: (id: string, title: string) => Promise<void>
  deleteDoc: (id: string) => Promise<void>
  duplicateDoc: (id: string) => Promise<void>
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
      let docs = await storage.getAll<CanvasDoc>('docs')
      let folders = await storage.getAll<CanvasFolder>('folders')

      if (docs.length === 0) {
        const migrated = migrateOld()
        if (migrated) {
          await storage.put('docs', migrated)
          docs = [migrated]
        } else {
          const now = Date.now()
          const welcome: CanvasDoc = {
            id: `doc-${now}`,
            title: '欢迎使用 MindNotes',
            elements: [
              {
                type: 'text',
                id: `txt-${now}`,
                x: 80,
                y: 60,
                width: 500,
                height: 120,
                content:
                  '# 欢迎使用 MindNotes\n\n温暖纸笔化风格笔记本，支持自由绘图、形状绘制和文字记录。\n\n点击左上角按钮探索更多功能。',
                fontSize: 16,
                color: '#2c2416',
              },
            ],
            bgColor: '#ffffff',
            backgroundStyle: 'plain',
            folderId: null,
            createdAt: now,
            updatedAt: now,
          }
          await storage.put('docs', welcome)
          docs = [welcome]
        }
      }

      if (folders.length === 0) {
        await storage.put('folders', {
          id: 'folder-default',
          name: '我的笔记',
          parentId: null,
          order: 0,
          expanded: true,
        } as CanvasFolder)
        folders = await storage.getAll<CanvasFolder>('folders')
      }

      docs.sort((a, b) => b.updatedAt - a.updatedAt)
      const current = docs[0]

      set({
        docs,
        folders,
        currentDocId: current?.id ?? null,
        elements: current?.elements ?? [],
        bgColor: current?.bgColor ?? '#ffffff',
        backgroundStyle: current?.backgroundStyle ?? 'plain',
        undoStack: current?.undoStack ?? [],
        redoStack: current?.redoStack ?? [],
        loaded: true,
      })

      // 初始化空间索引
      get().spatialIndex?.bulkLoad(current?.elements ?? [])

      removeMigratedData()
    },

    createDoc: async (title = '未命名画布', folderId = null) => {
      const id = `doc-${Date.now()}`
      const now = Date.now()
      const doc: CanvasDoc = {
        id,
        title,
        elements: [],
        bgColor: '#ffffff',
        backgroundStyle: 'plain',
        folderId,
        createdAt: now,
        updatedAt: now,
      }
      await storage.put('docs', doc)
      const docs = (await storage.getAll<CanvasDoc>('docs')).sort(
        (a, b) => b.updatedAt - a.updatedAt
      )
      set({
        docs,
        currentDocId: id,
        elements: [],
        bgColor: '#ffffff',
        backgroundStyle: 'plain',
        undoStack: [],
        redoStack: [],
        selectedIds: [],
      })
      // 新文档，清空空间索引
      get().spatialIndex?.clear()
      return id
    },

    openDoc: async (id) => {
      clearSaveTimer()
      const state = get()
      if (state.currentDocId) await saveDocNow()
      const doc = await storage.get<CanvasDoc>('docs', id)
      if (doc) {
        set({
          currentDocId: id,
          elements: doc.elements,
          bgColor: doc.bgColor,
          backgroundStyle: doc.backgroundStyle ?? 'plain',
          undoStack: doc.undoStack ?? [],
          redoStack: doc.redoStack ?? [],
          selectedIds: [],
        })
        // 加载新文档，重建空间索引
        get().spatialIndex?.bulkLoad(doc.elements)
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
      const storedDocPromise = storage.get<CanvasDoc>('docs', id)

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
        const storedDoc = await storedDocPromise
        if (!storedDoc) {
          rollback()
          return
        }
        await storage.put('docs', {
          ...storedDoc,
          title: nextTitle,
          updatedAt: updatedDoc.updatedAt,
        })
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
        const first = docs[0]
        set({
          docs,
          currentDocId: first?.id ?? null,
          elements: first?.elements ?? [],
          bgColor: first?.bgColor ?? '#ffffff',
          backgroundStyle: first?.backgroundStyle ?? 'plain',
          undoStack: [],
          redoStack: [],
        })
        // 删除当前文档后加载第一个文档，重建空间索引
        get().spatialIndex?.bulkLoad(first?.elements ?? [])
      } else {
        set({ docs })
      }
    },

    duplicateDoc: async (id) => {
      const doc = await storage.get<CanvasDoc>('docs', id)
      if (!doc) return
      const now = Date.now()
      const dup: CanvasDoc = {
        ...doc,
        id: `doc-${now}`,
        title: `${doc.title} (副本)`,
        createdAt: now,
        updatedAt: now,
      }
      await storage.put('docs', dup)
      set({
        docs: (await storage.getAll<CanvasDoc>('docs')).sort((a, b) => b.updatedAt - a.updatedAt),
      })
    },

    saveNow: async () => {
      await saveDocNow()
    },
  }
}
