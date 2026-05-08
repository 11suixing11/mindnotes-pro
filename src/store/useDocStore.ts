import { create } from 'zustand'
import type { DocMeta, DocData } from './db'
import * as db from './db'
import type { Stroke, Shape } from './types'

interface DocState {
  docs: DocMeta[]
  currentId: string | null
  loaded: boolean
}

interface DocActions {
  init: () => Promise<void>
  createDoc: (title?: string) => Promise<string>
  openDoc: (id: string) => Promise<DocData | null>
  saveCurrent: (strokes: Stroke[], shapes: Shape[], canvasBg: string) => Promise<void>
  renameDoc: (id: string, title: string) => Promise<void>
  deleteDoc: (id: string) => Promise<void>
  saveVersion: () => Promise<void>
}

export const useDocStore = create<DocState & DocActions>((set, get) => ({
  docs: [],
  currentId: null,
  loaded: false,

  init: async () => {
    const docs = await db.listDocs()
    if (docs.length === 0) {
      const migrated = db.migrateLocalStorage()
      if (migrated) {
        await db.saveDoc(migrated)
        const updated = await db.listDocs()
        set({ docs: updated, currentId: migrated.id, loaded: true })
        return
      }
      const id = `doc-${Date.now()}`
      const now = Date.now()
      await db.saveDoc({ id, title: '我的画布', createdAt: now, updatedAt: now, strokes: [], shapes: [], canvasBg: '#ffffff', strokeCount: 0, shapeCount: 0 })
      const updated = await db.listDocs()
      set({ docs: updated, currentId: id, loaded: true })
    } else {
      set({ docs, currentId: docs[0].id, loaded: true })
    }
  },

  createDoc: async (title) => {
    const id = `doc-${Date.now()}`
    const now = Date.now()
    const doc: DocData = { id, title: title || '未命名画布', createdAt: now, updatedAt: now, strokes: [], shapes: [], canvasBg: '#ffffff', strokeCount: 0, shapeCount: 0 }
    await db.saveDoc(doc)
    const docs = await db.listDocs()
    set({ docs, currentId: id })
    return id
  },

  openDoc: async (id) => {
    const doc = await db.getDoc(id)
    if (doc) set({ currentId: id })
    return doc
  },

  saveCurrent: async (strokes, shapes, canvasBg) => {
    const { currentId, docs } = get()
    if (!currentId) return
    const existing = await db.getDoc(currentId)
    const now = Date.now()
    const doc: DocData = {
      id: currentId,
      title: existing?.title || '未命名画布',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      strokes,
      shapes,
      canvasBg,
      strokeCount: strokes.length,
      shapeCount: shapes.length,
    }
    await db.saveDoc(doc)
    const updated = await db.listDocs()
    set({ docs: updated })
  },

  renameDoc: async (id, title) => {
    const existing = await db.getDoc(id)
    if (!existing) return
    await db.saveDoc({ ...existing, title, updatedAt: Date.now() })
    const docs = await db.listDocs()
    set({ docs })
  },

  deleteDoc: async (id) => {
    await db.deleteDoc(id)
    const { docs, currentId } = get()
    const remaining = docs.filter((d) => d.id !== id)
    if (currentId === id) {
      set({ docs: remaining, currentId: remaining[0]?.id ?? null })
    } else {
      set({ docs: remaining })
    }
  },

  saveVersion: async () => {
    const { currentId } = get()
    if (!currentId) return
    const doc = await db.getDoc(currentId)
    if (!doc) return
    await db.saveVersion({
      id: `v-${Date.now()}`,
      docId: currentId,
      timestamp: Date.now(),
      strokes: doc.strokes,
      shapes: doc.shapes,
    })
  },
}))

export default useDocStore
