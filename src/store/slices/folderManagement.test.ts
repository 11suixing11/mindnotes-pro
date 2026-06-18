import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFolderManagementSlice } from './folderManagement'
import type { CanvasFolder } from '../types'

// Mock storage module with in-memory store
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

const storageMock = (await import('../storage')) as any

function clearMockStorage() {
  for (const key of Object.keys(storageMock.__store)) {
    delete storageMock.__store[key]
  }
}

describe('folderManagement slice', () => {
  let state: any
  let set: ReturnType<typeof vi.fn>
  let get: ReturnType<typeof vi.fn>
  let slice: ReturnType<typeof createFolderManagementSlice>

  beforeEach(() => {
    vi.useFakeTimers()
    clearMockStorage()
    vi.clearAllMocks()
    state = { folders: [], docs: [] }
    set = vi.fn((update: any) => {
      if (typeof update === 'function') {
        Object.assign(state, update(state))
      } else {
        Object.assign(state, update)
      }
    }) as any
    get = vi.fn(() => state) as any
    slice = createFolderManagementSlice(set, get)
  })

  describe('initial state', () => {
    it('starts with empty folders array', () => {
      expect(slice.folders).toEqual([])
    })
  })

  describe('createFolder', () => {
    it('creates a folder with name and returns an id', async () => {
      const id = await slice.createFolder('My Folder')
      expect(id).toMatch(/^folder-/)
      expect(storageMock.put).toHaveBeenCalledWith(
        'folders',
        expect.objectContaining({ name: 'My Folder', parentId: null, expanded: true })
      )
    })

    it('creates a folder with parentId', async () => {
      await slice.createFolder('Sub Folder', 'parent-1')
      expect(storageMock.put).toHaveBeenCalledWith(
        'folders',
        expect.objectContaining({ name: 'Sub Folder', parentId: 'parent-1' })
      )
    })

    it('sets folders state after creation', async () => {
      storageMock.__store['folders'] = {
        'folder-1': { id: 'folder-1', name: 'Existing', parentId: null, order: 0, expanded: true },
      }
      await slice.createFolder('New Folder')
      expect(set).toHaveBeenCalled()
    })
  })

  describe('renameFolder', () => {
    it('renames an existing folder', async () => {
      storageMock.__store['folders'] = {
        'folder-1': { id: 'folder-1', name: 'Old Name', parentId: null, order: 0, expanded: true },
      }
      await slice.renameFolder('folder-1', 'New Name')
      expect(storageMock.put).toHaveBeenCalledWith(
        'folders',
        expect.objectContaining({ id: 'folder-1', name: 'New Name' })
      )
    })

    it('does nothing for non-existent folder', async () => {
      await slice.renameFolder('non-existent', 'New Name')
      // Should not call put since folder is undefined
      expect(storageMock.put).not.toHaveBeenCalled()
    })
  })

  describe('deleteFolder', () => {
    it('deletes folder from storage', async () => {
      storageMock.__store['folders'] = {
        'folder-1': { id: 'folder-1', name: 'Folder', parentId: null, order: 0, expanded: true },
      }
      storageMock.__store['docs'] = {}
      await slice.deleteFolder('folder-1')
      expect(storageMock.del).toHaveBeenCalledWith('folders', 'folder-1')
    })

    it('moves docs in deleted folder to root (null folderId)', async () => {
      storageMock.__store['folders'] = {
        'folder-1': { id: 'folder-1', name: 'Folder', parentId: null, order: 0, expanded: true },
      }
      storageMock.__store['docs'] = {
        'doc-1': { id: 'doc-1', title: 'Doc 1', folderId: 'folder-1' },
        'doc-2': { id: 'doc-2', title: 'Doc 2', folderId: 'other-folder' },
      }
      await slice.deleteFolder('folder-1')
      expect(storageMock.put).toHaveBeenCalledWith(
        'docs',
        expect.objectContaining({ id: 'doc-1', folderId: null })
      )
      // doc-2 should not be updated
      expect(storageMock.put).not.toHaveBeenCalledWith(
        'docs',
        expect.objectContaining({ id: 'doc-2', folderId: null })
      )
    })

    it('updates both folders and docs state after deletion', async () => {
      storageMock.__store['folders'] = {
        'folder-1': { id: 'folder-1', name: 'Folder', parentId: null, order: 0, expanded: true },
      }
      storageMock.__store['docs'] = {
        'doc-1': { id: 'doc-1', title: 'Doc 1', folderId: null, updatedAt: 100 },
      }
      await slice.deleteFolder('folder-1')
      expect(set).toHaveBeenCalled()
    })
  })

  describe('toggleFolder', () => {
    it('toggles expanded state from true to false', async () => {
      storageMock.__store['folders'] = {
        'folder-1': { id: 'folder-1', name: 'Folder', parentId: null, order: 0, expanded: true },
      }
      state.folders = [{ id: 'folder-1', name: 'Folder', parentId: null, order: 0, expanded: true }]
      await slice.toggleFolder('folder-1')
      expect(storageMock.put).toHaveBeenCalledWith(
        'folders',
        expect.objectContaining({ id: 'folder-1', expanded: false })
      )
    })

    it('toggles expanded state from false to true', async () => {
      storageMock.__store['folders'] = {
        'folder-1': { id: 'folder-1', name: 'Folder', parentId: null, order: 0, expanded: false },
      }
      state.folders = [
        { id: 'folder-1', name: 'Folder', parentId: null, order: 0, expanded: false },
      ]
      await slice.toggleFolder('folder-1')
      expect(storageMock.put).toHaveBeenCalledWith(
        'folders',
        expect.objectContaining({ id: 'folder-1', expanded: true })
      )
    })

    it('does nothing for non-existent folder', async () => {
      state.folders = []
      await slice.toggleFolder('non-existent')
      expect(storageMock.put).not.toHaveBeenCalled()
    })

    it('only toggles the targeted folder', async () => {
      const f1 = { id: 'folder-1', name: 'F1', parentId: null, order: 0, expanded: true }
      const f2 = { id: 'folder-2', name: 'F2', parentId: null, order: 1, expanded: true }
      state.folders = [f1, f2]
      storageMock.__store['folders'] = { 'folder-1': f1, 'folder-2': f2 }
      await slice.toggleFolder('folder-1')
      // The set callback should map over folders
      const setCall = set.mock.calls[0][0]
      if (typeof setCall === 'function') {
        const result = setCall(state)
        const updatedFolders = result.folders
        expect(updatedFolders.find((f: CanvasFolder) => f.id === 'folder-1')?.expanded).toBe(false)
        expect(updatedFolders.find((f: CanvasFolder) => f.id === 'folder-2')?.expanded).toBe(true)
      }
    })
  })
})
