import type { CanvasFolder, CanvasDoc } from '../types'
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: any
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
      // 将文件夹内的画布移到根目录（folderId 设为 null）
      const docs = await storage.getAll<CanvasDoc>('docs')
      for (const doc of docs) {
        if (doc.folderId === id) {
          await storage.put('docs', { ...doc, folderId: null })
        }
      }
      await storage.del('folders', id)
      set({
        folders: await storage.getAll<CanvasFolder>('folders'),
        docs: (await storage.getAll<CanvasDoc>('docs')).sort((a, b) => b.updatedAt - a.updatedAt),
      })
    },

    toggleFolder: async (id) => {
      const folder = get().folders.find((f: CanvasFolder) => f.id === id)
      if (folder) {
        const updated = { ...folder, expanded: !folder.expanded }
        await storage.put('folders', updated)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set((s: any) => ({
          folders: s.folders.map((f: CanvasFolder) => (f.id === id ? updated : f)),
        }))
      }
    },
  }
}
