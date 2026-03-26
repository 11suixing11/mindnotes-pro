import type { StoreName } from './types'

/**
 * IndexedDB 数据库管理器
 * 处理底层数据库操作
 */
export class DatabaseManager {
  private db: IDBDatabase | null = null
  private readonly dbName: string
  private readonly dbVersion: number

  constructor(dbName: string, dbVersion: number = 1) {
    this.dbName = dbName
    this.dbVersion = dbVersion
  }

  /**
   * 打开数据库
   */
  async open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        this.onUpgradeNeeded(event)
      }
    })
  }

  /**
   * 数据库升级处理
   */
  protected onUpgradeNeeded(event: IDBVersionChangeEvent): void {
    console.log('数据库升级:', event.oldVersion, '->', event.newVersion)
  }

  /**
   * 获取对象存储
   */
  getStore(name: StoreName, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) {
      throw new Error('数据库未初始化')
    }

    return this.db.transaction(name, mode).objectStore(name)
  }

  /**
   * 添加记录
   */
  async add<T>(storeName: StoreName, data: T): Promise<IDBValidKey> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite')
      const request = store.add(data)
      request.onsuccess = () => resolve(request.result as IDBValidKey)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 获取记录
   */
  async get<T>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName)
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result as T | undefined)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 更新记录
   */
  async put<T>(storeName: StoreName, data: T): Promise<IDBValidKey> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite')
      const request = store.put(data)
      request.onsuccess = () => resolve(request.result as IDBValidKey)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 删除记录
   */
  async delete(storeName: StoreName, key: IDBValidKey): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite')
      const request = store.delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 获取所有记录
   */
  async getAll<T>(storeName: StoreName): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName)
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result as T[])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 关闭数据库
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  /**
   * 获取数据库实例
   */
  getDb(): IDBDatabase | null {
    return this.db
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.db !== null
  }
}

export default DatabaseManager
