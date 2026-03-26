// 离线存储管理器类型定义

export interface Document {
  id: string
  title: string
  content: string
  version: number
  lastModified: number
  lastSyncedAt: number | null
  syncStatus: 'synced' | 'pending' | 'conflict'
  createdAt: number
  createdBy: string
}

export interface DocumentChange {
  id: string
  documentId: string
  operation: 'insert' | 'delete' | 'modify'
  content: string
  position?: number
  timestamp: number
  userId: string
  synced: boolean
  remoteId?: string
}

export interface SyncQueueItem {
  id: string
  documentId: string
  changes: DocumentChange[]
  priority: number
  timestamp: number
  retryCount: number
  lastRetry?: number
}

export interface Asset {
  id: string
  type: 'image' | 'audio' | 'video' | 'file'
  data: Blob
  metadata: {
    name: string
    size: number
    mimeType: string
    createdAt: number
  }
}

export type StoreName = 'documents' | 'changes' | 'assets' | 'syncQueue' | 'settings'

export interface StorageStats {
  documentCount: number
  changeCount: number
  assetCount: number
  pendingSyncCount: number
  totalSize: number
}
