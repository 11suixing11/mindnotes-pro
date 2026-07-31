import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useAppStore } from '../appStore'
import { useToastStore } from '../toastStore'
import { clearSaveTimer, resetSaveCache } from '../saveManager'
import { saveRecoveryDraft } from '../recovery'
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
      documentSearchQuery: '',
      recentDocumentSearches: [],
      elements: [],
      bgColor: '#ffffff',
      backgroundStyle: 'plain',
      undoStack: [],
      redoStack: [],
      selectedIds: [],
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

    it('imports documents and folders from the previous IndexedDB database once', async () => {
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
        schemaVersion: 4,
      })
      expect(state.docs[0].layers?.[0].name).toBe('图层 1')
      expect(state.folders).toEqual([expect.objectContaining({ id: 'legacy-folder' })])
      expect(localStorage.getItem('mindnotes-pro-v4.legacy-database-migrated')).toBe('1')
    })

    it('does not inspect or overwrite legacy data when v4 documents already exist', async () => {
      storageMock.__store.docs = {
        current: {
          schemaVersion: 4,
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
    it('persists an imported canvas as a separate current document', async () => {
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

      expect(importedId).not.toBe(existingId)
      expect(useAppStore.getState().currentDocId).toBe(importedId)
      expect(useAppStore.getState().docs).toHaveLength(2)
      expect(useAppStore.getState().docs.find((doc) => doc.id === importedId)?.title).toBe(
        '项目草图（导入）'
      )
      expect(useAppStore.getState().elements[0]).toMatchObject({
        id: 'text-imported',
        content: '可编辑内容',
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

  describe('document search state', () => {
    it('updates the document search query', () => {
      useAppStore.getState().setDocumentSearchQuery('roadmap')

      expect(useAppStore.getState().documentSearchQuery).toBe('roadmap')
    })

    it('stores recent document searches with deduplication and persistence', () => {
      const state = useAppStore.getState()

      state.addRecentDocumentSearch('alpha')
      state.addRecentDocumentSearch('beta')
      state.addRecentDocumentSearch(' Alpha ')

      expect(useAppStore.getState().recentDocumentSearches).toEqual(['Alpha', 'beta'])
      expect(JSON.parse(localStorage.getItem('mn-sidebar-searches') ?? '[]')).toEqual([
        'Alpha',
        'beta',
      ])
    })

    it('keeps only the five most recent document searches', () => {
      const state = useAppStore.getState()

      for (const query of ['one', 'two', 'three', 'four', 'five', 'six']) {
        state.addRecentDocumentSearch(query)
      }

      expect(useAppStore.getState().recentDocumentSearches).toEqual([
        'six',
        'five',
        'four',
        'three',
        'two',
      ])
    })
  })
})
