import type { SyncQueueItem, DocumentChange } from './types'

/**
 * 同步队列管理器
 * 管理待同步的变更队列
 */
export class SyncQueueManager {
  private queue: SyncQueueItem[] = []
  private readonly MAX_RETRIES = 3

  /**
   * 添加到队列
   */
  addToQueue(documentId: string, changes: DocumentChange[], priority: number = 50): void {
    const item: SyncQueueItem = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      documentId,
      changes,
      priority,
      timestamp: Date.now(),
      retryCount: 0,
    }

    this.queue.push(item)
    this.sortByPriority()
  }

  /**
   * 按优先级排序
   */
  private sortByPriority(): void {
    this.queue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority
      }
      return a.timestamp - b.timestamp
    })
  }

  /**
   * 获取下一个待同步项
   */
  getNext(): SyncQueueItem | null {
    return this.queue.length > 0 ? this.queue[0] : null
  }

  /**
   * 移除已完成的项
   */
  removeCompleted(id: string): void {
    this.queue = this.queue.filter(item => item.id !== id)
  }

  /**
   * 标记为失败并重试
   */
  markFailed(id: string): boolean {
    const item = this.queue.find(i => i.id === id)
    if (!item) return false

    item.retryCount++
    item.lastRetry = Date.now()

    if (item.retryCount >= this.MAX_RETRIES) {
      this.removeCompleted(id)
      return false
    }

    // 降低优先级，稍后重试
    item.priority = Math.max(0, item.priority - 20)
    this.sortByPriority()

    return true
  }

  /**
   * 获取队列统计
   */
  getStats(): {
    total: number
    pending: number
    failed: number
    averagePriority: number
  } {
    const total = this.queue.length
    const pending = this.queue.filter(i => i.retryCount === 0).length
    const failed = this.queue.filter(i => i.retryCount >= this.MAX_RETRIES).length
    const averagePriority = total > 0
      ? this.queue.reduce((sum, i) => sum + i.priority, 0) / total
      : 0

    return { total, pending, failed, averagePriority }
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = []
  }

  /**
   * 获取所有队列项
   */
  getAll(): SyncQueueItem[] {
    return [...this.queue]
  }

  /**
   * 获取队列长度
   */
  getLength(): number {
    return this.queue.length
  }
}

export default SyncQueueManager
