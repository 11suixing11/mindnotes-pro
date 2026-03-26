// 同步引擎类型定义

export interface SyncResult {
  success: boolean
  itemsSynced: number
  itemsFailed: number
  conflictsDetected: number
  errors: string[]
  duration: number
}

export interface ConflictInfo {
  documentId: string
  localVersion: number
  remoteVersion: number
  localContent: string
  remoteContent: string
  timestamp: number
}

export type SyncState = 'online' | 'offline' | 'syncing'

export interface SyncEvent {
  type: 'sync-start' | 'sync-complete' | 'sync-error' | 'conflict-detected'
  data: any
}

export interface SyncStats {
  totalSyncs: number
  successfulSyncs: number
  failedSyncs: number
  conflictsResolved: number
  lastSyncTime: number | null
  averageSyncDuration: number
}
