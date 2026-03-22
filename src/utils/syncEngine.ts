/**
 * Sync Engine - 离线到在线的自动同步
 * Phase 3.2 - 网络感知同步和冲突检测
 */

import { offlineStorage, DocumentChange, SyncQueueItem, Document } from './offlineStorageManager'

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

type SyncState = 'online' | 'offline' | 'syncing'

export class SyncEngine {
  private state: SyncState = 'offline'
  private retryCount = 0
  private readonly maxRetries = 5
  private readonly retryDelays = [1000, 2000, 4000, 8000, 16000] // ms
  private isInitialized = false
  private listeners: Map<string, Function[]> = new Map()
  private lastSyncTime = 0
  private syncInProgress = false

  /**
   * 初始化同步引擎
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // 监听网络状态变化
    window.addEventListener('online', () => this.onNetworkOnline())
    window.addEventListener('offline', () => this.onNetworkOffline())

    // 初始化状态
    this.state = navigator.onLine ? 'online' : 'offline'
    
    // 初始化离线存储
    await offlineStorage.initialize()

    // 如果在线，立即开始同步
    if (this.state === 'online') {
      this.startSync()
    }

    this.isInitialized = true
    this.emit('initialized', { state: this.state })
  }

  /**
   * 网络上线
   */
  private onNetworkOnline(): void {
    console.log('🌐 网络已连接')
    this.state = 'online'
    this.retryCount = 0
    this.emit('network-status', { status: 'online' })
    
    // 开始同步先前未同步的数据
    this.startSync()
  }

  /**
   * 网络离线
   */
  private onNetworkOffline(): void {
    console.log('📴 网络已断开')
    this.state = 'offline'
    this.emit('network-status', { status: 'offline' })
  }

  /**
   * 开始同步
   */
  async startSync(): Promise<void> {
    if (this.syncInProgress) return
    if (this.state === 'offline') return

    this.syncInProgress = true
    this.state = 'syncing'
    this.emit('sync-started', {})

    try {
      const result = await this.sync()
      
      this.lastSyncTime = Date.now()
      this.emit('sync-completed', result)
      
      if (result.success) {
        this.state = 'online'
      } else if (this.retryCount < this.maxRetries) {
        this.scheduleRetry()
      }
    } catch (error) {
      console.error('Sync error:', error)
      this.emit('sync-error', { error: String(error) })
      this.scheduleRetry()
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * 主同步方法
   */
  async sync(): Promise<SyncResult> {
    const startTime = Date.now()
    const result: SyncResult = {
      success: true,
      itemsSynced: 0,
      itemsFailed: 0,
      conflictsDetected: 0,
      errors: [],
      duration: 0
    }

    try {
      // 获取待同步项目
      const items = await offlineStorage.getPendingSyncItems()
      
      if (items.length === 0) {
        result.duration = Date.now() - startTime
        return result
      }

      console.log(`📤 同步 ${items.length} 个项目...`)

      // 处理每个项目
      for (const item of items) {
        try {
          // 获取文档最新状态
          const localDoc = await offlineStorage.getDocument(item.documentId)
          if (!localDoc) continue

          // 模拟上传到服务器
          const syncSuccess = await this.uploadDocument(localDoc, item.changes)
          
          if (syncSuccess) {
            // 标记变更为已同步
            const changeIds = item.changes.map(c => c.id)
            await offlineStorage.markChangesSynced(changeIds)
            result.itemsSynced++
          } else {
            result.itemsFailed++
            result.errors.push(`Failed to sync document: ${item.documentId}`)
          }
        } catch (error) {
          result.itemsFailed++
          result.errors.push(String(error))
        }
      }

      // 处理冲突
      const conflicts = await this.handleConflicts()
      result.conflictsDetected = conflicts.length

      // 清除已同步的队列项目
      const syncedItemIds = items.slice(0, result.itemsSynced).map(i => i.id)
      await offlineStorage.clearSyncedItems(syncedItemIds)

      result.success = result.itemsFailed === 0 && result.conflictsDetected === 0
      result.duration = Date.now() - startTime

      console.log(`✅ 同步完成: ${result.itemsSynced} 成功, ${result.itemsFailed} 失败, ${result.conflictsDetected} 冲突`)

      return result
    } catch (error) {
      result.success = false
      result.errors.push(String(error))
      result.duration = Date.now() - startTime
      return result
    }
  }

  /**
   * 上传文档到服务器（模拟）
   */
  private async uploadDocument(doc: Document, changes: DocumentChange[]): Promise<boolean> {
    try {
      // 模拟 HTTP POST 请求
      // 实际应用中应该是真实的 API 调用
      const response = await fetch('/api/documents/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: doc,
          changes: changes
        })
      }).catch(() => null)

      if (!response || !response.ok) {
        // 网络错误，返回失败
        return false
      }

      return true
    } catch (error) {
      console.error('Upload error:', error)
      return false
    }
  }

  /**
   * 处理冲突
   */
  private async handleConflicts(): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = []

    // 从服务器获取最新版本（模拟）
    const documents = await offlineStorage.getAllDocuments()

    for (const doc of documents) {
      if (doc.syncStatus === 'conflict') {
        // 检测冲突
        const remoteVersion = await this.fetchRemoteVersion(doc.id)
        
        if (remoteVersion && remoteVersion > doc.version) {
          conflicts.push({
            documentId: doc.id,
            localVersion: doc.version,
            remoteVersion: remoteVersion.version,
            localContent: doc.content,
            remoteContent: remoteVersion.content,
            timestamp: Date.now()
          })

          this.emit('conflict-detected', {
            documentId: doc.id,
            conflict: conflicts[conflicts.length - 1]
          })
        }
      }
    }

    return conflicts
  }

  /**
   * 获取远程版本（模拟）
   */
  private async fetchRemoteVersion(docId: string): Promise<Document | null> {
    try {
      // 实际应该是真实的 API 调用
      const response = await fetch(`/api/documents/${docId}`)
        .catch(() => null)
      
      if (!response) return null
      
      return await response.json()
    } catch (error) {
      console.error('Fetch remote version error:', error)
      return null
    }
  }

  /**
   * 排定重试
   */
  private scheduleRetry(): void {
    if (this.retryCount >= this.maxRetries) {
      console.error('❌ 达到最大重试次数')
      this.emit('sync-failed', { reason: 'max-retries-exceeded' })
      return
    }

    const delay = this.retryDelays[this.retryCount]
    this.retryCount++
    
    console.log(`⏰ 将在 ${delay}ms 后重试 (${this.retryCount}/${this.maxRetries})...`)
    
    setTimeout(() => {
      if (this.state === 'online') {
        this.startSync()
      }
    }, delay)
  }

  /**
   * 解决冲突
   */
  async resolveConflict(
    docId: string,
    strategy: 'local' | 'remote' | 'merge'
  ): Promise<void> {
    const doc = await offlineStorage.getDocument(docId)
    if (!doc) return

    switch (strategy) {
      case 'local':
        doc.syncStatus = 'pending'
        break
      case 'remote':
        // 覆盖本地内容
        const remote = await this.fetchRemoteVersion(docId)
        if (remote) {
          doc.content = remote.content
          doc.version = remote.version
          doc.syncStatus = 'synced'
        }
        break
      case 'merge':
        // 自动合并 (CRDT 或 OT)
        doc.syncStatus = 'pending'
        break
    }

    await offlineStorage.saveDocument(doc)
    this.emit('conflict-resolved', { documentId: docId, strategy })
  }

  /**
   * 获取当前状态
   */
  getState(): SyncState {
    return this.state
  }

  /**
   * 获取同步统计
   */
  async getStats(): Promise<{
    state: SyncState
    lastSyncTime: number
    pendingItems: number
    stats: Awaited<ReturnType<typeof offlineStorage.getStats>>
  }> {
    const stats = await offlineStorage.getStats()
    const pendingItems = await offlineStorage.getPendingSyncItems()

    return {
      state: this.state,
      lastSyncTime: this.lastSyncTime,
      pendingItems: pendingItems.length,
      stats
    }
  }

  /**
   * 事件监听
   */
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(listener)
  }

  /**
   * 事件取消监听
   */
  off(event: string, listener: Function): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(listener => listener(data))
    }
  }
}

// 创建全局实例
export const syncEngine = new SyncEngine()
