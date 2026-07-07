import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useAppStore } from '../appStore'

// Mock storage module to use in-memory store
vi.mock('../storage', () => {
  const store: Record<string, Record<string, any>> = {}
  return {
    getAll: vi.fn(async (storeName: string) => Object.values(store[storeName] ?? {})),
    get: vi.fn(async (storeName: string, id: string) => store[storeName]?.[id]),
    put: vi.fn(async (storeName: string, record: any) => {
      if (!store[storeName]) store[storeName] = {}
      store[storeName][record.id] = record
    }),
    del: vi.fn(async (storeName: string, id: string) => {
      delete store[storeName]?.[id]
    }),
    __store: store,
  }
})

// Mock migration
vi.mock('../migration', () => ({
  migrateOld: vi.fn(() => null),
  removeMigratedData: vi.fn(),
}))

const storageMock = (await import('../storage')) as any

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
    useAppStore.setState({
      docs: [],
      currentDocId: null,
      loaded: false,
      elements: [],
      bgColor: '#ffffff',
      undoStack: [],
      redoStack: [],
      selectedIds: [],
    } as any)
  })

  afterEach(() => {
    vi.useRealTimers()
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
