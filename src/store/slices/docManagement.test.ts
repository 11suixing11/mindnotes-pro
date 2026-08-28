import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useAppStore } from '../appStore'
import { useToastStore } from '../toastStore'
import { clearSaveTimer, resetSaveCache, saveDocNow } from '../saveManager'
import { loadRecoveryDraft, saveRecoveryDraft } from '../recovery'
import { CANVAS_SCHEMA_VERSION } from '../schema'
import type { AppStore } from '../sliceTypes'
import type * as StorageModule from '../storage'

type StoredRecord = { id: string } & Record<string, unknown>

// Mock storage module to use in-memory store
vi.mock('../storage', () => {
  const store: Record<string, Record<string, StoredRecord>> = {}
  return {
    getAll: vi.fn(async (storeName: string) => Object.values(store[storeName] ?? {})),
    get: vi.fn(async (storeName: string, id: string) => store[storeName]?.[id]),
    update: vi.fn(
      async (
        storeName: string,
        id: string,
        updater: (record: StoredRecord | undefined) => StoredRecord | undefined
      ) => {
        const next = updater(store[storeName]?.[id])
        if (next !== undefined) {
          if (!store[storeName]) store[storeName] = {}
          store[storeName][id] = next
        }
        return next
      }
    ),
    put: vi.fn(async (storeName: string, record: StoredRecord) => {
      if (!store[storeName]) store[storeName] = {}
      store[storeName][record.id] = record
    }),
    del: vi.fn(async (storeName: string, id: string) => {
      delete store[storeName]?.[id]
    }),
    readLegacyDatabase: vi.fn(async () => null),
    __store: store,
  }
})
// Mock migration
vi.mock('../migration', () => ({
  migrateOld: vi.fn(() => null),
  removeMigratedData: vi.fn(),
}))

const storageMock = (await import('../storage')) as typeof StorageModule & {
  __store: Record<string, Record<string, StoredRecord>>
}

function clearMockStorage() {
  for (const key of Object.keys(storageMock.__store)) {
    delete storageMock.__store[key]
  }
}

describe('docManagement slice', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    clearMockStorage()
    clearSaveTimer()
    resetSaveCache()
    vi.mocked(storageMock.getAll).mockClear()
    vi.mocked(storageMock.get).mockClear()
    vi.mocked(storageMock.put).mockClear()
    vi.mocked(storageMock.update).mockClear()
    vi.mocked(storageMock.del).mockClear()
    vi.mocked(storageMock.readLegacyDatabase).mockClear()
    useToastStore.setState({ toasts: [] })
    useAppStore.setState({
      docs: [],
      currentDocId: null,
      loaded: false,
      elements: [],
      bgColor: '#ffffff',
      backgroundStyle: 'plain',
      undoStack: [],
      redoStack: [],
      selectedIds: [],
      saveStatus: 'idle',
      persistenceMode: 'persistent',
      lastSavedAt: null,
      saveError: null,
    } satisfies Partial<AppStore>)
  })

  afterEach(() => {
    clearSaveTimer()
    vi.useRealTimers()
  })

  describe('init', () => {
    it('creates an empty untitled canvas for a first-time user', async () => {
      await useAppStore.getState().init()

      const state = useAppStore.getState()
      expect(state.loaded).toBe(true)
      expect(state.docs).toHaveLength(1)
      expect(state.docs[0].title).toBe('未命名画布')
      expect(state.docs[0].elements).toEqual([])
      expect(state.elements).toEqual([])
    })

    it('restores a memory-only draft that is not present in IndexedDB', async () => {
      saveRecoveryDraft({
        schemaVersion: 5,
        id: 'memory-only-doc',
        title: '仅内存草稿',
        elements: [
          {
            type: 'shape',
            id: 'memory-only-shape',
            kind: 'rectangle',
            x: 10,
            y: 20,
            w: 40,
            h: 30,
            color: '#0f766e',
            size: 2,
          },
        ],
        bgColor: '#ffffff',
        folderId: null,
        createdAt: 1,
        updatedAt: 2,
      })

      await useAppStore.getState().init()

      const state = useAppStore.getState()
      expect(state.currentDocId).toBe('memory-only-doc')
      expect(state.docs[0]?.title).toBe('仅内存草稿')
      expect(state.elements).toEqual([expect.objectContaining({ id: 'memory-only-shape' })])
      expect(loadRecoveryDraft('memory-only-doc')).not.toBeNull()
    })

    it('imports the canonical document from the previous IndexedDB database once', async () => {
      vi.mocked(storageMock.readLegacyDatabase).mockResolvedValueOnce({
        docs: [
          {
            schemaVersion: 3,
            id: 'legacy-doc',
            title: '旧版项目',
            elements: [],
            bgColor: '#fffaf0',
            folderId: 'legacy-folder',
            createdAt: 1,
            updatedAt: 2,
          },
        ],
        folders: [
          {
            id: 'legacy-folder',
            name: '旧文件夹',
            parentId: null,
            order: 0,
            expanded: true,
          },
        ],
      })

      await useAppStore.getState().init()

      const state = useAppStore.getState()
      expect(state.docs).toHaveLength(1)
      expect(state.docs[0]).toMatchObject({
        id: 'legacy-doc',
        title: '旧版项目',
        schemaVersion: CANVAS_SCHEMA_VERSION,
      })
      expect(state.docs[0].layers?.[0].name).toBe('图层 1')
      expect(localStorage.getItem('mindnotes-pro-v5.v4-imported')).toBe('1')
    })

    it('does not inspect the legacy source when v5 documents already exist', async () => {
      storageMock.__store.docs = {
        current: {
          schemaVersion: CANVAS_SCHEMA_VERSION,
          id: 'current',
          title: '当前项目',
          elements: [],
          bgColor: '#ffffff',
          folderId: null,
          createdAt: 10,
          updatedAt: 20,
        },
      }

      await useAppStore.getState().init()

      expect(vi.mocked(storageMock.readLegacyDatabase)).not.toHaveBeenCalled()
      expect(useAppStore.getState().docs.map((doc) => doc.id)).toEqual(['current'])
    })

    it('keeps v4 migration retryable when the v5 write fails', async () => {
      vi.mocked(storageMock.readLegacyDatabase).mockResolvedValueOnce({
        docs: [
          {
            schemaVersion: 4,
            id: 'legacy-doc',
            title: 'Legacy',
            elements: [],
            bgColor: '#ffffff',
            folderId: null,
            createdAt: 1,
            updatedAt: 2,
          },
        ],
        folders: [],
      })
      vi.mocked(storageMock.put).mockRejectedValueOnce(new Error('quota exceeded'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

      await useAppStore.getState().init()

      expect(useAppStore.getState().saveStatus).toBe('error')
      expect(localStorage.getItem('mindnotes-pro-v5.v4-imported')).toBeNull()
      expect(storageMock.__store.docs).toBeUndefined()
      consoleSpy.mockRestore()
    })

    it('falls back to an editable in-memory canvas when storage cannot initialize', async () => {
      vi.mocked(storageMock.getAll).mockRejectedValueOnce(new Error('storage blocked'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

      await useAppStore.getState().init()

      const state = useAppStore.getState()
      expect(state.loaded).toBe(true)
      expect(state.saveStatus).toBe('error')
      expect(state.docs).toHaveLength(1)
      expect(state.elements).toEqual([])
      const toasts = useToastStore.getState().toasts
      expect(toasts[toasts.length - 1]?.message).toContain('仅保存在内存中')
      consoleSpy.mockRestore()
    })

    it('restores the latest recovery draft when storage cannot initialize', async () => {
      saveRecoveryDraft({
        schemaVersion: 4,
        id: 'recovery-doc',
        title: '恢复草稿',
        elements: [
          {
            type: 'shape',
            id: 'recovered-shape',
            kind: 'rectangle',
            x: 10,
            y: 20,
            w: 80,
            h: 40,
            color: '#0f766e',
            size: 2,
          },
        ],
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
        updatedAt: 2,
      })
      vi.mocked(storageMock.getAll).mockRejectedValueOnce(new Error('storage blocked'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

      await useAppStore.getState().init()

      const state = useAppStore.getState()
      expect(state.currentDocId).toBe('recovery-doc')
      expect(state.docs[0].title).toBe('恢复草稿')
      expect(state.elements).toEqual([expect.objectContaining({ id: 'recovered-shape' })])
      const toasts = useToastStore.getState().toasts
      expect(toasts[toasts.length - 1]?.message).toContain('已恢复最近一次未保存草稿')
      consoleSpy.mockRestore()
    })

    it('restores a newer recovery draft over the persisted document', async () => {
      const persisted = {
        schemaVersion: CANVAS_SCHEMA_VERSION,
        id: 'recoverable-doc',
        title: '旧版本',
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
        backgroundStyle: 'plain' as const,
        folderId: null,
        createdAt: 1,
        updatedAt: 10,
      }
      storageMock.__store.docs = { [persisted.id]: persisted }
      saveRecoveryDraft(
        {
          ...persisted,
          title: '恢复版本',
          elements: [
            {
              type: 'shape',
              id: 'recovered-shape',
              kind: 'rectangle',
              x: 10,
              y: 20,
              w: 80,
              h: 40,
              color: '#0f766e',
              size: 2,
            },
          ],
          updatedAt: 20,
        },
        20
      )

      await useAppStore.getState().init()

      const state = useAppStore.getState()
      expect(state.currentDocId).toBe('recoverable-doc')
      expect(state.docs[0]).toMatchObject({ title: '恢复版本', updatedAt: 20 })
      expect(state.elements).toEqual([expect.objectContaining({ id: 'recovered-shape' })])
      const toasts = useToastStore.getState().toasts
      expect(toasts[toasts.length - 1]?.message).toContain('已恢复最近一次未保存草稿')
    })
  })

  describe('createDoc', () => {
    it('creates a new doc and sets it as current', async () => {
      const id = await useAppStore.getState().createDoc('My Doc')
      expect(id).toBeTruthy()
      const state = useAppStore.getState()
      expect(state.currentDocId).toBe(id)
      expect(state.elements).toEqual([])
      expect(state.undoStack).toEqual([])
      expect(state.redoStack).toEqual([])
    })

    it('persists doc to storage', async () => {
      const id = await useAppStore.getState().createDoc('Test')
      const stored = storageMock.__store['docs']?.[id]
      expect(stored).toBeTruthy()
      expect(stored.title).toBe('Test')
      expect(stored.backgroundStyle).toBe('plain')
    })

    it('assigns default title when none provided', async () => {
      const id = await useAppStore.getState().createDoc()
      const stored = storageMock.__store['docs']?.[id]
      expect(stored.title).toBeTruthy()
    })

    it('sets folderId when provided', async () => {
      const id = await useAppStore.getState().createDoc('Folded', 'folder-1')
      const stored = storageMock.__store['docs']?.[id]
      expect(stored.folderId).toBe('folder-1')
    })

    it('clears selectedIds', async () => {
      useAppStore.setState({ selectedIds: ['a', 'b'] })
      await useAppStore.getState().createDoc('New')
      expect(useAppStore.getState().selectedIds).toEqual([])
    })

    it('saves pending edits before switching to a new document', async () => {
      const existingId = await useAppStore.getState().createDoc('Existing')
      useAppStore.getState().addElement({
        type: 'shape',
        id: 'shape-pending',
        kind: 'rectangle',
        x: 0,
        y: 0,
        w: 20,
        h: 20,
        color: '#000000',
        size: 2,
      })

      const newId = await useAppStore.getState().createDoc('New')

      expect(newId).not.toBe(existingId)
      expect(storageMock.__store.docs[existingId].elements).toHaveLength(1)
      expect(useAppStore.getState().currentDocId).toBe(newId)
    })

    it('does not leave the current document when pending edits cannot be saved', async () => {
      const existingId = await useAppStore.getState().createDoc('Existing')
      useAppStore.getState().addElement({
        type: 'shape',
        id: 'shape-pending',
        kind: 'rectangle',
        x: 0,
        y: 0,
        w: 20,
        h: 20,
        color: '#000000',
        size: 2,
      })
      vi.mocked(storageMock.update).mockRejectedValueOnce(new Error('quota exceeded'))
      vi.spyOn(console, 'error').mockImplementation(() => undefined)

      await expect(useAppStore.getState().createDoc('Blocked')).rejects.toThrow(
        'Current document could not be saved'
      )

      expect(useAppStore.getState().currentDocId).toBe(existingId)
      expect(useAppStore.getState().docs).toHaveLength(1)
      expect(useAppStore.getState().saveStatus).toBe('error')
    })
  })

  describe('deleteDoc', () => {
    it('removes doc from storage', async () => {
      const id = await useAppStore.getState().createDoc('ToDelete')
      expect(storageMock.__store['docs']?.[id]).toBeTruthy()
      await useAppStore.getState().deleteDoc(id)
      expect(storageMock.__store['docs']?.[id]).toBeFalsy()
    })

    it('switches to another doc when deleting current', async () => {
      const id1 = await useAppStore.getState().createDoc('Doc1')
      vi.advanceTimersByTime(10) // ensure unique id/timestamp
      const id2 = await useAppStore.getState().createDoc('Doc2')
      expect(useAppStore.getState().currentDocId).toBe(id2)
      await useAppStore.getState().deleteDoc(id2)
      expect(useAppStore.getState().currentDocId).toBe(id1)
    })

    it('sets currentDocId to null when last doc is deleted', async () => {
      const id = await useAppStore.getState().createDoc('Only')
      await useAppStore.getState().deleteDoc(id)
      expect(useAppStore.getState().currentDocId).toBeNull()
    })

    it('does not change currentDocId when deleting non-current doc', async () => {
      const id1 = await useAppStore.getState().createDoc('A')
      vi.advanceTimersByTime(10)
      const id2 = await useAppStore.getState().createDoc('B')
      expect(useAppStore.getState().currentDocId).toBe(id2)
      await useAppStore.getState().deleteDoc(id1)
      expect(useAppStore.getState().currentDocId).toBe(id2)
    })

    it('waits for an in-flight save before deleting and does not recreate the document', async () => {
      const id = await useAppStore.getState().createDoc('Race')
      useAppStore.getState().addElement({
        type: 'shape',
        id: 'pending-delete-shape',
        kind: 'rectangle',
        x: 0,
        y: 0,
        w: 20,
        h: 20,
        color: '#000000',
        size: 2,
      })

      let releaseSave: (() => void) | undefined
      const saveGate = new Promise<void>((resolve) => {
        releaseSave = resolve
      })
      const defaultUpdate = vi.mocked(storageMock.update).getMockImplementation()
      if (!defaultUpdate) throw new Error('Expected an update mock implementation')
      vi.mocked(storageMock.update).mockImplementationOnce(async (...args) => {
        await saveGate
        return defaultUpdate(...args)
      })

      const savePromise = saveDocNow()
      await vi.waitFor(() => expect(storageMock.update).toHaveBeenCalledTimes(1))
      const deletePromise = useAppStore.getState().deleteDoc(id)

      releaseSave?.()
      await Promise.all([savePromise, deletePromise])

      expect(storageMock.__store.docs[id]).toBeUndefined()
      expect(useAppStore.getState().docs.some((doc) => doc.id === id)).toBe(false)
    })

    it('clears a deleted document recovery draft', async () => {
      const id = await useAppStore.getState().createDoc('Draft to delete')
      const current = useAppStore.getState().docs.find((doc) => doc.id === id)
      if (!current) throw new Error('Expected current document')
      saveRecoveryDraft(current, 100)

      await useAppStore.getState().deleteDoc(id)

      expect(loadRecoveryDraft(id)).toBeNull()
    })
  })

  describe('renameDoc', () => {
    it('updates doc title in storage', async () => {
      const id = await useAppStore.getState().createDoc('Old Name')
      await useAppStore.getState().renameDoc(id, 'New Name')
      const stored = storageMock.__store['docs']?.[id]
      expect(stored.title).toBe('New Name')
    })

    it('updates the docs list in state', async () => {
      const id = await useAppStore.getState().createDoc('Original')
      await useAppStore.getState().renameDoc(id, 'Renamed')
      const doc = useAppStore.getState().docs.find((d) => d.id === id)
      expect(doc?.title).toBe('Renamed')
    })

    it('updates state before storage persistence completes', async () => {
      const id = await useAppStore.getState().createDoc('Original')
      const defaultUpdate = vi.mocked(storageMock.update).getMockImplementation()
      if (!defaultUpdate) throw new Error('Expected an update mock implementation')
      let releaseUpdate: (() => void) | undefined
      const updateGate = new Promise<void>((resolve) => {
        releaseUpdate = resolve
      })
      vi.mocked(storageMock.update).mockImplementationOnce(async (...args) => {
        await updateGate
        return defaultUpdate(...args)
      })

      const renamePromise = useAppStore.getState().renameDoc(id, 'Immediate')

      expect(useAppStore.getState().docs.find((doc) => doc.id === id)?.title).toBe('Immediate')

      await vi.waitFor(() => expect(storageMock.update).toHaveBeenCalledTimes(1))
      releaseUpdate?.()
      await renamePromise
      expect(storageMock.__store.docs[id].title).toBe('Immediate')
    })

    it('trims titles and ignores blank names', async () => {
      const id = await useAppStore.getState().createDoc('Original')

      await useAppStore.getState().renameDoc(id, '  Trimmed  ')
      expect(useAppStore.getState().docs.find((doc) => doc.id === id)?.title).toBe('Trimmed')

      await useAppStore.getState().renameDoc(id, '   ')
      expect(useAppStore.getState().docs.find((doc) => doc.id === id)?.title).toBe('Trimmed')
    })
  })

  describe('duplicateDoc', () => {
    it('creates a copy with a new id', async () => {
      const id = await useAppStore.getState().createDoc('Original')
      vi.advanceTimersByTime(10)
      await useAppStore.getState().duplicateDoc(id)
      const docs = useAppStore.getState().docs
      expect(docs.length).toBe(2)
      const dup = docs.find((d) => d.id !== id)
      expect(dup).toBeTruthy()
      if (dup) expect(dup.title).toContain('Original')
    })

    it('does nothing for non-existent doc', async () => {
      await useAppStore.getState().createDoc('A')
      const countBefore = useAppStore.getState().docs.length
      await useAppStore.getState().duplicateDoc('non-existent')
      expect(useAppStore.getState().docs.length).toBe(countBefore)
    })

    it('saves pending edits in the current doc before duplicating another doc', async () => {
      const currentId = await useAppStore.getState().createDoc('Current')
      const targetId = await useAppStore.getState().createDoc('Target')
      await useAppStore.getState().openDoc(currentId)
      useAppStore.getState().addElement({
        type: 'shape',
        id: 'pending-before-duplicate',
        kind: 'rectangle',
        x: 0,
        y: 0,
        w: 20,
        h: 20,
        color: '#000000',
        size: 2,
      })

      await useAppStore.getState().duplicateDoc(targetId)

      expect(storageMock.__store.docs[currentId].elements).toEqual([
        expect.objectContaining({ id: 'pending-before-duplicate' }),
      ])
      expect(useAppStore.getState().docs).toHaveLength(3)
    })
  })

  describe('importDoc', () => {
    it('replaces the current canonical document in place', async () => {
      const existingId = await useAppStore.getState().createDoc('Existing')
      const layer = {
        id: 'layer-imported',
        name: '导入图层',
        visible: true,
        locked: false,
        order: 0,
        createdAt: 1,
        updatedAt: 1,
      }

      const importedId = await useAppStore.getState().importDoc({
        title: '项目草图',
        elements: [
          {
            type: 'text',
            id: 'text-imported',
            layerId: layer.id,
            x: 20,
            y: 30,
            width: 160,
            height: 32,
            content: '可编辑内容',
            fontSize: 18,
            color: '#111827',
          },
        ],
        layers: [layer],
        activeLayerId: layer.id,
        bgColor: '#ffffff',
        backgroundStyle: 'plain',
      })

      expect(importedId).toBe(existingId)
      expect(useAppStore.getState().currentDocId).toBe(importedId)
      expect(useAppStore.getState().docs).toHaveLength(1)
      expect(useAppStore.getState().docs.find((doc) => doc.id === importedId)?.title).toBe(
        '项目草图'
      )
      expect(useAppStore.getState().elements[0]).toMatchObject({
        id: 'text-imported',
        content: '可编辑内容',
      })
    })

    it('records an undo step that restores the full workspace after import', async () => {
      const existingId = await useAppStore.getState().createDoc('原始画布')
      const originalLayer = useAppStore.getState().layers[0]
      const originalElement = {
        type: 'shape' as const,
        id: 'original-shape',
        layerId: originalLayer.id,
        kind: 'rectangle' as const,
        x: 1,
        y: 2,
        w: 30,
        h: 40,
        color: '#111111',
        size: 3,
      }
      useAppStore.getState().addElement(originalElement)
      await saveDocNow()

      const importedLayer = {
        id: 'layer-new',
        name: '导入层',
        visible: true,
        locked: false,
        order: 0,
        createdAt: 10,
        updatedAt: 10,
      }
      await useAppStore.getState().replaceCurrentDoc({
        title: '导入后',
        elements: [
          {
            type: 'shape',
            id: 'imported-shape',
            layerId: importedLayer.id,
            kind: 'circle',
            x: 10,
            y: 20,
            w: 50,
            h: 60,
            color: '#222222',
            size: 4,
          },
        ],
        layers: [importedLayer],
        activeLayerId: importedLayer.id,
        bgColor: '#eeeeee',
        backgroundStyle: 'dots',
      })

      const importAction =
        useAppStore.getState().undoStack[useAppStore.getState().undoStack.length - 1]
      expect(importAction).toMatchObject({
        type: 'snapshot',
        label: 'Import canvas',
        workspace: {
          before: { title: '原始画布' },
          after: { title: '导入后' },
        },
      })
      useAppStore.getState().undo()

      const undone = useAppStore.getState()
      expect(undone.currentDocId).toBe(existingId)
      expect(undone.docs[0]?.title).toBe('原始画布')
      expect(undone.elements).toEqual([expect.objectContaining({ id: 'original-shape' })])
      expect(undone.layers).toEqual([expect.objectContaining({ id: originalLayer.id })])
      expect(undone.activeLayerId).toBe(originalLayer.id)
      expect(undone.bgColor).toBe('#ffffff')
      expect(undone.backgroundStyle).toBe('plain')
      expect(undone.docs[0]?.undoStack).toEqual(undone.undoStack)
      expect(undone.docs[0]?.redoStack).toEqual(undone.redoStack)

      useAppStore.getState().redo()
      const redone = useAppStore.getState()
      expect(redone.docs[0]?.title).toBe('导入后')
      expect(redone.elements).toEqual([expect.objectContaining({ id: 'imported-shape' })])
      expect(redone.layers).toEqual([expect.objectContaining({ id: importedLayer.id })])
      expect(redone.activeLayerId).toBe(importedLayer.id)
      expect(redone.bgColor).toBe('#eeeeee')
      expect(redone.backgroundStyle).toBe('dots')
      expect(redone.docs[0]?.undoStack).toEqual(redone.undoStack)
      expect(redone.docs[0]?.redoStack).toEqual(redone.redoStack)
    })

    it('captures edits made while the pre-import save is pending', async () => {
      await useAppStore.getState().createDoc('并发导入')
      useAppStore.getState().addElement({
        type: 'shape',
        id: 'before-save',
        kind: 'rectangle',
        x: 0,
        y: 0,
        w: 20,
        h: 20,
        color: '#111111',
        size: 2,
      })

      let releaseSave: (() => void) | undefined
      const saveGate = new Promise<void>((resolve) => {
        releaseSave = resolve
      })
      const defaultUpdate = vi.mocked(storageMock.update).getMockImplementation()
      if (!defaultUpdate) throw new Error('Expected an update mock implementation')
      vi.mocked(storageMock.update).mockImplementationOnce(async (...args) => {
        await saveGate
        return defaultUpdate(...args)
      })

      const replacePromise = useAppStore.getState().replaceCurrentDoc({
        title: '导入结果',
        elements: [],
        layers: [useAppStore.getState().layers[0]],
        activeLayerId: useAppStore.getState().activeLayerId,
        bgColor: '#ffffff',
        backgroundStyle: 'plain',
      })
      await vi.waitFor(() => expect(storageMock.update).toHaveBeenCalledTimes(1))

      useAppStore.getState().addElement({
        type: 'shape',
        id: 'during-save',
        kind: 'circle',
        x: 30,
        y: 30,
        w: 20,
        h: 20,
        color: '#222222',
        size: 2,
      })
      releaseSave?.()
      await replacePromise

      useAppStore.getState().undo()
      expect(useAppStore.getState().elements).toEqual([
        expect.objectContaining({ id: 'before-save' }),
        expect.objectContaining({ id: 'during-save' }),
      ])
    })

    it('cancels the import when the workspace changes while the import write is pending', async () => {
      const existingId = await useAppStore.getState().createDoc('并发写入')
      useAppStore.getState().addElement({
        type: 'shape',
        id: 'before-import-write',
        kind: 'rectangle',
        x: 0,
        y: 0,
        w: 20,
        h: 20,
        color: '#111111',
        size: 2,
      })

      let releaseImportWrite: (() => void) | undefined
      const importWriteGate = new Promise<void>((resolve) => {
        releaseImportWrite = resolve
      })
      const defaultPut = vi.mocked(storageMock.put).getMockImplementation()
      if (!defaultPut) throw new Error('Expected a put mock implementation')
      vi.mocked(storageMock.put).mockImplementationOnce(async (...args) => {
        await importWriteGate
        return defaultPut(...args)
      })

      const replacePromise = useAppStore.getState().replaceCurrentDoc({
        title: '导入中',
        elements: [],
        layers: [useAppStore.getState().layers[0]],
        activeLayerId: useAppStore.getState().activeLayerId,
        bgColor: '#ffffff',
        backgroundStyle: 'plain',
      })

      await vi.waitFor(() =>
        expect(
          vi
            .mocked(storageMock.put)
            .mock.calls.some(
              ([, record]) =>
                !!record &&
                typeof record === 'object' &&
                (record as { title?: unknown }).title === '导入中'
            )
        ).toBe(true)
      )

      useAppStore.getState().addElement({
        type: 'shape',
        id: 'during-import-write',
        kind: 'circle',
        x: 30,
        y: 30,
        w: 20,
        h: 20,
        color: '#222222',
        size: 2,
      })
      releaseImportWrite?.()

      await expect(replacePromise).rejects.toThrow('导入已取消：导入期间画布发生变化，请重试')

      const current = useAppStore.getState()
      expect(current.currentDocId).toBe(existingId)
      expect(current.docs[0]?.title).toBe('并发写入')
      expect(current.elements).toEqual([
        expect.objectContaining({ id: 'before-import-write' }),
        expect.objectContaining({ id: 'during-import-write' }),
      ])
      expect(storageMock.__store.docs[existingId]).toMatchObject({
        title: '并发写入',
        elements: [
          expect.objectContaining({ id: 'before-import-write' }),
          expect.objectContaining({ id: 'during-import-write' }),
        ],
      })
    })

    it('restores persistence when an automatic save finishes before the import write', async () => {
      const existingId = await useAppStore.getState().createDoc('自动保存竞态')
      useAppStore.getState().addElement({
        type: 'shape',
        id: 'before-automatic-save',
        kind: 'rectangle',
        x: 0,
        y: 0,
        w: 20,
        h: 20,
        color: '#111111',
        size: 2,
      })
      await saveDocNow()

      let releaseImportWrite: (() => void) | undefined
      const importWriteGate = new Promise<void>((resolve) => {
        releaseImportWrite = resolve
      })
      const defaultPut = vi.mocked(storageMock.put).getMockImplementation()
      if (!defaultPut) throw new Error('Expected a put mock implementation')
      vi.mocked(storageMock.put).mockImplementationOnce(async (...args) => {
        await importWriteGate
        return defaultPut(...args)
      })

      const replacePromise = useAppStore.getState().replaceCurrentDoc({
        title: '自动保存导入',
        elements: [],
        layers: [useAppStore.getState().layers[0]],
        activeLayerId: useAppStore.getState().activeLayerId,
        bgColor: '#ffffff',
        backgroundStyle: 'plain',
      })
      await vi.waitFor(() => expect(storageMock.put).toHaveBeenCalledTimes(2))

      useAppStore.getState().addElement({
        type: 'shape',
        id: 'during-automatic-save',
        kind: 'circle',
        x: 30,
        y: 30,
        w: 20,
        h: 20,
        color: '#222222',
        size: 2,
      })
      await vi.advanceTimersByTimeAsync(1500)
      expect(storageMock.__store.docs[existingId]).toMatchObject({
        elements: [
          expect.objectContaining({ id: 'before-automatic-save' }),
          expect.objectContaining({ id: 'during-automatic-save' }),
        ],
      })

      releaseImportWrite?.()
      await expect(replacePromise).rejects.toThrow('导入已取消：导入期间画布发生变化，请重试')
      expect(storageMock.__store.docs[existingId]).toMatchObject({
        title: '自动保存竞态',
        elements: [
          expect.objectContaining({ id: 'before-automatic-save' }),
          expect.objectContaining({ id: 'during-automatic-save' }),
        ],
      })
    })
  })

  describe('openDoc', () => {
    it('loads doc elements into state', async () => {
      // Create doc with elements directly in storage
      vi.advanceTimersByTime(10)
      const id = `doc-${Date.now()}`
      storageMock.__store['docs'] = {
        [id]: {
          id,
          title: 'Canvas Doc',
          elements: [
            { type: 'stroke', id: 's1', points: [[0, 0]], color: '#000', size: 2, brush: 'pen' },
          ],
          bgColor: '#ffffff',
          folderId: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      }
      // Set currentDocId to null so openDoc does not call saveDocNow
      useAppStore.setState({ currentDocId: null } as any)

      await useAppStore.getState().openDoc(id)
      expect(useAppStore.getState().elements).toHaveLength(1)
      expect(useAppStore.getState().currentDocId).toBe(id)
    })

    it('loads each document background style', async () => {
      const id = `doc-${Date.now()}`
      storageMock.__store['docs'] = {
        [id]: {
          id,
          title: 'Dotted Canvas',
          elements: [],
          bgColor: '#fffdf5',
          backgroundStyle: 'dots',
          folderId: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      }
      useAppStore.setState({ currentDocId: null } as any)

      await useAppStore.getState().openDoc(id)

      expect(useAppStore.getState().bgColor).toBe('#fffdf5')
      expect(useAppStore.getState().backgroundStyle).toBe('dots')
    })

    it('defaults legacy documents to a plain background', async () => {
      const id = `doc-${Date.now()}`
      storageMock.__store['docs'] = {
        [id]: {
          id,
          title: 'Legacy Canvas',
          elements: [],
          bgColor: '#ffffff',
          folderId: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      }
      useAppStore.setState({ currentDocId: null } as any)

      await useAppStore.getState().openDoc(id)

      expect(useAppStore.getState().backgroundStyle).toBe('plain')
    })

    it('clears selectedIds when opening', async () => {
      useAppStore.setState({ selectedIds: ['a'] })
      const id = await useAppStore.getState().createDoc('Doc')
      useAppStore.setState({ selectedIds: ['a'] })
      // Set currentDocId to different value to avoid saving over it
      useAppStore.setState({ currentDocId: null } as any)
      await useAppStore.getState().openDoc(id)
      expect(useAppStore.getState().selectedIds).toEqual([])
    })
  })
})
