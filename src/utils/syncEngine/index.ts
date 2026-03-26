/**
 * 同步引擎
 */

import OfflineStorageManager from '../offlineStorageManager/index'
import { ConflictResolver } from './ConflictResolver'
import { SyncScheduler } from './SyncScheduler'
import { StatsTracker } from './StatsTracker'
import type { DocumentChange, Document } from '../offlineStorageManager/types'
import type { SyncState, SyncResult, SyncEvent } from './types'

export class SyncEngine {
  private state: SyncState = 'offline'
  private isInitialized = false
  private syncInProgress = false
  private offlineStorage: OfflineStorageManager
  private conflictResolver: ConflictResolver
  private scheduler: SyncScheduler
  private statsTracker: StatsTracker
  private listeners: Map<string, Function[]> = new Map()

  constructor() {
    this.offlineStorage = new OfflineStorageManager()
    this.conflictResolver = new ConflictResolver()
    this.scheduler = new SyncScheduler()
    this.statsTracker = new StatsTracker()
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)

    this.state = navigator.onLine ? 'online' : 'offline'
    await this.offlineStorage.initialize()

    if (this.state === 'online') {
      this.startSync()
    }

    this.isInitialized = true
    this.emit('initialized', { state: this.state })
  }

  private handleOnline = () => {
    console.log('🌐 网络已连接')
    this.state = 'online'
    this.emit('network-status', { status: 'online' })
    this.startSync()
  }

  private handleOffline = () => {
    console.log('📴 网络已断开')
    this.state = 'offline'
    this.emit('network-status', { status: 'offline' })
  }

  async startSync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        itemsSynced: 0,
        itemsFailed: 0,
        conflictsDetected: 0,
        errors: ['同步正在进行中'],
        duration: 0,
      }
    }

    const startTime = Date.now()
    this.syncInProgress = true
    this.emit('sync-start', {})

    try {
      const items = await this.offlineStorage.getPendingSyncItems()
      let itemsSynced = 0
      let itemsFailed = 0
      let conflictsDetected = 0
      const errors: string[] = []

      for (const item of items) {
        try {
          const localDoc = await this.offlineStorage.getDocument(item.documentId)
          if (!localDoc) continue

          const conflict = this.conflictResolver.detect(localDoc, {
            id: item.documentId,
            content: 'remote-content',
            version: localDoc.version,
            lastModified: Date.now(),
          })

          if (conflict) {
            conflictsDetected++
            this.emit('conflict-detected', { conflict })
          } else {
            await this.offlineStorage.markDocumentSynced(item.documentId)
            itemsSynced++
          }
        } catch (error) {
          itemsFailed++
          errors.push(`同步失败：${item.documentId}`)
        }
      }

      const duration = Date.now() - startTime
      this.statsTracker.recordSync(errors.length === 0, duration)

      const result: SyncResult = {
        success: errors.length === 0,
        itemsSynced,
        itemsFailed,
        conflictsDetected,
        errors,
        duration,
      }

      this.emit('sync-complete', result)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.statsTracker.recordSync(false, duration)

      this.emit('sync-error', { error })
      return {
        success: false,
        itemsSynced: 0,
        itemsFailed: 0,
        conflictsDetected: 0,
        errors: [error instanceof Error ? error.message : '未知错误'],
        duration,
      }
    } finally {
      this.syncInProgress = false
    }
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) listeners.splice(index, 1)
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  getState(): SyncState {
    return this.state
  }

  getStats() {
    return this.statsTracker.getStats()
  }

  getConflicts() {
    return this.conflictResolver.getAllConflicts()
  }

  async destroy(): Promise<void> {
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    this.listeners.clear()
    this.offlineStorage.close()
  }
}

export default SyncEngine
