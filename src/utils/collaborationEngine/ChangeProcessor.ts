import type { RemoteChange } from './types'

/**
 * 变更处理器
 * 跟踪和合并远程变更
 */
export class ChangeProcessor {
  private pendingChanges: RemoteChange[] = []
  private processedIds: Set<string> = new Set()
  private readonly MAX_PENDING = 100

  /**
   * 添加变更
   */
  addChange(change: RemoteChange): void {
    const changeId = `${change.userId}-${change.timestamp}`
    
    if (this.processedIds.has(changeId)) {
      return
    }

    this.pendingChanges.push(change)
    
    if (this.pendingChanges.length > this.MAX_PENDING) {
      this.pendingChanges.shift()
    }
  }

  /**
   * 标记变更已处理
   */
  markProcessed(change: RemoteChange): void {
    const changeId = `${change.userId}-${change.timestamp}`
    this.processedIds.add(changeId)
  }

  /**
   * 获取待处理变更
   */
  getPendingChanges(): RemoteChange[] {
    return [...this.pendingChanges]
  }

  /**
   * 获取并清除待处理变更
   */
  consumePendingChanges(): RemoteChange[] {
    const changes = [...this.pendingChanges]
    this.pendingChanges = []
    return changes
  }

  /**
   * 清除已处理记录
   */
  clearProcessed(): void {
    this.processedIds.clear()
  }

  /**
   * 重置
   */
  reset(): void {
    this.pendingChanges = []
    this.processedIds.clear()
  }
}

export default ChangeProcessor
