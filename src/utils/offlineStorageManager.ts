/**
 * Offline-First Storage Manager
 * 离线优先数据存储层 - Phase 3.1
 * 
 * 支持完全离线编辑，自动同步到云端
 */

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
  priority: number // 0-100, 越高越优先
  timestamp: number
  retryCount: number
  lastRetry?: number
}

export class OfflineStorageManager {
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'mindnotes-pro-offline'
  private readonly DB_VERSION = 1
  private syncQueue: SyncQueueItem[] = []

  /**
   * 初始化 IndexedDB
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 文档存储
        if (!db.objectStoreNames.contains('documents')) {
          const docStore = db.createObjectStore('documents', { keyPath: 'id' })
          docStore.createIndex('updatedAt', 'lastModified')
          docStore.createIndex('syncStatus', 'syncStatus')
        }

        // 变更存储
        if (!db.objectStoreNames.contains('changes')) {
          const changeStore = db.createObjectStore('changes', { keyPath: 'id' })
          changeStore.createIndex('documentId', 'documentId')
          changeStore.createIndex('timestamp', 'timestamp')
          changeStore.createIndex('synced', 'synced')
        }

        // 资源存储
        if (!db.objectStoreNames.contains('assets')) {
          const assetStore = db.createObjectStore('assets', { keyPath: 'id' })
          assetStore.createIndex('documentId', 'documentId')
        }

        // 同步队列
        if (!db.objectStoreNames.contains('syncQueue')) {
          const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' })
          queueStore.createIndex('timestamp', 'timestamp')
          queueStore.createIndex('priority', 'priority')
        }
      }
    })
  }

  /**
   * 保存文档
   */
  async saveDocument(doc: Document): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents'], 'readwrite')
      const store = transaction.objectStore('documents')
      
      const docWithSync = {
        ...doc,
        lastModified: Date.now(),
        syncStatus: 'pending' as const
      }
      
      const request = store.put(docWithSync)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * 获取单个文档
   */
  async getDocument(id: string): Promise<Document | null> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents'], 'readonly')
      const store = transaction.objectStore('documents')
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  /**
   * 获取所有文档
   */
  async getAllDocuments(): Promise<Document[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents'], 'readonly')
      const store = transaction.objectStore('documents')
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  /**
   * 删除文档
   */
  async deleteDocument(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents', 'changes'], 'readwrite')
      
      // 删除文档
      const docStore = transaction.objectStore('documents')
      docStore.delete(id)
      
      // 删除相关变更
      const changeStore = transaction.objectStore('changes')
      const index = changeStore.index('documentId')
      index.getAll(id).onsuccess = (event) => {
        (event.target as IDBRequest).result.forEach((change: DocumentChange) => {
          changeStore.delete(change.id)
        })
      }

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  }

  /**
   * 记录文档变更
   */
  async recordChange(change: DocumentChange): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['changes', 'documents'], 'readwrite')
      
      // 记录变更
      const changeStore = transaction.objectStore('changes')
      changeStore.add(change)
      
      // 更新文档的 lastModified
      const docStore = transaction.objectStore('documents')
      const docRequest = docStore.get(change.documentId)
      
      docRequest.onsuccess = () => {
        const doc = docRequest.result
        if (doc) {
          doc.lastModified = change.timestamp
          doc.version++
          doc.syncStatus = 'pending'
          docStore.put(doc)
        }
      }

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  }

  /**
   * 获取文档的所有变更
   */
  async getChanges(docId: string): Promise<DocumentChange[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['changes'], 'readonly')
      const store = transaction.objectStore('changes')
      const index = store.index('documentId')
      const request = index.getAll(docId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const changes = request.result.sort((a, b) => a.timestamp - b.timestamp)
        resolve(changes)
      }
    })
  }

  /**
   * 获取未同步的变更
   */
  async getUnsyncedChanges(docId: string): Promise<DocumentChange[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['changes'], 'readonly')
      const store = transaction.objectStore('changes')
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const changes = request.result
          .filter(c => c.documentId === docId && !c.synced)
          .sort((a, b) => a.timestamp - b.timestamp)
        resolve(changes)
      }
    })
  }

  /**
   * 标记变更为已同步
   */
  async markChangesSynced(changeIds: string[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['changes'], 'readwrite')
      const store = transaction.objectStore('changes')

      changeIds.forEach(id => {
        const request = store.get(id)
        request.onsuccess = () => {
          const change = request.result
          if (change) {
            change.synced = true
            store.put(change)
          }
        }
      })

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  }

  /**
   * 加入同步队列
   */
  async queueSync(item: SyncQueueItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite')
      const store = transaction.objectStore('syncQueue')
      const request = store.add(item)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.syncQueue.push(item)
        resolve()
      }
    })
  }

  /**
   * 获取待同步项目
   */
  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readonly')
      const store = transaction.objectStore('syncQueue')
      const index = store.index('priority')
      const request = index.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        // 按优先级和时间戳排序
        const items = request.result.sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority
          return a.timestamp - b.timestamp
        })
        resolve(items)
      }
    })
  }

  /**
   * 清除已同步的队列项目
   */
  async clearSyncedItems(itemIds: string[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite')
      const store = transaction.objectStore('syncQueue')

      itemIds.forEach(id => {
        store.delete(id)
      })

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => {
        this.syncQueue = this.syncQueue.filter(item => !itemIds.includes(item.id))
        resolve()
      }
    })
  }

  /**
   * 获取数据库统计信息
   */
  async getStats(): Promise<{
    documentCount: number
    changeCount: number
    syncQueueSize: number
    storageUsed: number
  }> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents', 'changes', 'syncQueue'], 'readonly')
      
      const docStore = transaction.objectStore('documents')
      const changeStore = transaction.objectStore('changes')
      const queueStore = transaction.objectStore('syncQueue')

      let documentCount = 0
      let changeCount = 0
      let syncQueueSize = 0

      docStore.count().onsuccess = (e) => {
        documentCount = (e.target as IDBRequest).result
      }

      changeStore.count().onsuccess = (e) => {
        changeCount = (e.target as IDBRequest).result
      }

      queueStore.count().onsuccess = (e) => {
        syncQueueSize = (e.target as IDBRequest).result
      }

      transaction.oncomplete = () => {
        resolve({
          documentCount,
          changeCount,
          syncQueueSize,
          storageUsed: documentCount * 5 + changeCount * 1 // 粗略估计 KB
        })
      }

      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * 清空所有数据（谨慎使用）
   */
  async clear(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents', 'changes', 'assets', 'syncQueue'], 'readwrite')
      
      transaction.objectStore('documents').clear()
      transaction.objectStore('changes').clear()
      transaction.objectStore('assets').clear()
      transaction.objectStore('syncQueue').clear()

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => {
        this.syncQueue = []
        resolve()
      }
    })
  }
}

// 创建全局实例
export const offlineStorage = new OfflineStorageManager()
