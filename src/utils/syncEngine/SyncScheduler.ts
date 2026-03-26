/**
 * 同步调度器
 */

export class SyncScheduler {
  private syncQueue: Array<() => Promise<void>> = []
  private isSyncing = false
  private retryCount = 0
  private readonly maxRetries = 5
  private readonly retryDelays = [1000, 2000, 4000, 8000, 16000]

  async schedule(syncTask: () => Promise<void>): Promise<void> {
    this.syncQueue.push(syncTask)
    await this.processQueue()
  }

  private async processQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) return

    this.isSyncing = true

    while (this.syncQueue.length > 0) {
      const task = this.syncQueue.shift()
      if (!task) break

      try {
        await task()
        this.retryCount = 0
      } catch (error) {
        console.error('同步任务失败:', error)
        await this.handleRetry(task)
      }
    }

    this.isSyncing = false
  }

  private async handleRetry(task: () => Promise<void>): Promise<void> {
    if (this.retryCount >= this.maxRetries) {
      console.error('达到最大重试次数，放弃同步')
      return
    }

    const delay = this.retryDelays[this.retryCount]
    console.log(`重试同步任务 (${this.retryCount + 1}/${this.maxRetries})，延迟 ${delay}ms`)
    
    await new Promise(resolve => setTimeout(resolve, delay))
    this.retryCount++
    
    try {
      await task()
      this.retryCount = 0
    } catch (error) {
      await this.handleRetry(task)
    }
  }

  getQueueLength(): number {
    return this.syncQueue.length
  }

  isBusy(): boolean {
    return this.isSyncing
  }

  clearQueue(): void {
    this.syncQueue = []
  }
}

export default SyncScheduler
