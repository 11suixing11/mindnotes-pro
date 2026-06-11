import type { CanvasFolder } from '../types'
import * as storage from '../storage'

export interface FolderManagementState {
  folders: CanvasFolder[]
}

export interface FolderManagementActions {
  createFolder: (name: string, parentId?: string | null) => Promise<string>
  renameFolder: (id: string, name: string) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  toggleFolder: (id: string) => void
}

export function createFolderManagementSlice(
  set: any,
  _get: any
): FolderManagementState & FolderManagementActions {
  return {
    // State
    folders: [],

    // Actions
    createFolder: async (name, parentId = null) => {
      const id = `folder-${Date.now()}`
      await storage.put('folders', { id, name, parentId, order: 0, expanded: true })
      set({ folders: await storage.getAll<CanvasFolder>('folders') })
      return id
    },

    renameFolder: async (id, name) => {
      const folder = await storage.get<CanvasFolder>('folders', id)
      if (folder) {
        await storage.put('folders', { ...folder, name })
        set({ folders: await storage.getAll<CanvasFolder>('folders') })
      }
    },

    deleteFolder: async (id) => {
      await storage.del('folders', id)
      set({ folders: await storage.getAll<CanvasFolder>('folders') })
    },

    toggleFolder: (id) => {
      set((s: any) => ({
        folders: s.folders.map((f: CanvasFolder) =>
          f.id === id ? { ...f, expanded: !f.expanded } : f
        ),
      }))
    },
  }
}
