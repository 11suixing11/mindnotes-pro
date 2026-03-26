import { DatabaseManager } from './DatabaseManager'
import type { Document, StoreName } from './types'

/**
 * 文档存储管理器
 * 处理文档的 CRUD 操作
 */
export class DocumentStore {
  private db: DatabaseManager
  private readonly STORE_NAME: StoreName = 'documents'

  constructor(db: DatabaseManager) {
    this.db = db
  }

  /**
   * 创建或更新文档
   */
  async save(document: Document): Promise<void> {
    await this.db.put(this.STORE_NAME, document)
  }

  /**
   * 获取文档
   */
  async getById(id: string): Promise<Document | undefined> {
    return this.db.get<Document>(this.STORE_NAME, id)
  }

  /**
   * 获取所有文档
   */
  async getAll(): Promise<Document[]> {
    return this.db.getAll<Document>(this.STORE_NAME)
  }

  /**
   * 删除文档
   */
  async delete(id: string): Promise<void> {
    await this.db.delete(this.STORE_NAME, id)
  }

  /**
   * 获取未同步的文档
   */
  async getPendingSync(): Promise<Document[]> {
    const all = await this.getAll()
    return all.filter(doc => doc.syncStatus === 'pending')
  }

  /**
   * 获取有冲突的文档
   */
  async getConflicts(): Promise<Document[]> {
    const all = await this.getAll()
    return all.filter(doc => doc.syncStatus === 'conflict')
  }

  /**
   * 标记为已同步
   */
  async markSynced(id: string): Promise<void> {
    const doc = await this.getById(id)
    if (doc) {
      doc.syncStatus = 'synced'
      doc.lastSyncedAt = Date.now()
      await this.save(doc)
    }
  }

  /**
   * 标记为冲突
   */
  async markConflict(id: string): Promise<void> {
    const doc = await this.getById(id)
    if (doc) {
      doc.syncStatus = 'conflict'
      await this.save(doc)
    }
  }

  /**
   * 统计文档数量
   */
  async count(): Promise<number> {
    const all = await this.getAll()
    return all.length
  }
}

export default DocumentStore
