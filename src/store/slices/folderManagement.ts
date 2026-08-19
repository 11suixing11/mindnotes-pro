import type { CanvasFolder } from '../types'
import { getDocumentRepository } from '../documentRepository'
import { CANVAS_SCHEMA_VERSION } from '../schema'

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
      const repository = getDocumentRepository()
      await repository.saveFolder({ id, name, parentId, order: 0, expanded: true })
      set({ folders: await repository.listFolders() })
      return id
    },

    renameFolder: async (id, name) => {
      const repository = getDocumentRepository()
      const folder = await repository.getFolder(id)
      if (folder) {
        await repository.saveFolder({ ...folder, name })
        set({ folders: await repository.listFolders() })
      }
    },

    deleteFolder: async (id) => {
      // 将文件夹内的画布移到根目录（folderId 设为 null）
      const repository = getDocumentRepository()
      const docs = await repository.listDocuments()
      for (const doc of docs) {
        if (doc.folderId === id) {
          await repository.saveDocument({
            ...doc,
            schemaVersion: CANVAS_SCHEMA_VERSION,
            folderId: null,
          })
        }
      }
      await repository.deleteFolder(id)
      set({
        folders: await repository.listFolders(),
        docs: (await repository.listDocuments()).sort((a, b) => b.updatedAt - a.updatedAt),
      })
    },

    toggleFolder: async (id) => {
      const folder = get().folders.find((f: CanvasFolder) => f.id === id)
      if (folder) {
        const updated = { ...folder, expanded: !folder.expanded }
        await getDocumentRepository().saveFolder(updated)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set((s: any) => ({
          folders: s.folders.map((f: CanvasFolder) => (f.id === id ? updated : f)),
        }))
      }
    },
  }
}
