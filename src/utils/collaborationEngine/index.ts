/**
 * Collaboration Engine - 实时多用户协作
 * 基于事件驱动的协作引擎
 */

import { UserPresenceManager } from './UserPresenceManager'
import { ChangeProcessor } from './ChangeProcessor'
import type {
  CollaborativeUser,
  CursorPosition,
  Selection,
  RemoteChange,
  CollaborationEventMap,
  CollaborationEvent,
} from './types'

export class CollaborationEngine {
  private documentId: string
  private userId: string
  private userName: string
  private userColor: string
  private presenceManager: UserPresenceManager
  private changeProcessor: ChangeProcessor
  private eventListeners: Map<string, Function[]> = new Map()
  private initialized = false
  private isConnected = false

  constructor(documentId: string, userId: string, userName: string) {
    this.documentId = documentId
    this.userId = userId
    this.userName = userName
    this.userColor = this.generateUserColor()
    this.presenceManager = new UserPresenceManager()
    this.changeProcessor = new ChangeProcessor()
  }

  /**
   * 生成用户颜色
   */
  private generateUserColor(): string {
    const colors = ['#e03131', '#1864ab', '#2b8a3e', '#e8590c', '#9c36b5']
    const index = this.userId.charCodeAt(0) % colors.length
    return colors[index]
  }

  /**
   * 初始化协作文档
   */
  async initializeSharedDocument(): Promise<void> {
    if (this.initialized) return

    try {
      const localUser: CollaborativeUser = {
        userId: this.userId,
        userName: this.userName,
        color: this.userColor,
        lastUpdate: Date.now(),
        isActive: true,
      }

      this.presenceManager.updateUser(localUser)
      this.connectToServer()
      this.initialized = true

      this.emit('initialized', {
        documentId: this.documentId,
        localUser: localUser,
      })

      console.log(`🤝 协作文档已初始化：${this.documentId}`)
    } catch (error) {
      console.error('协作文档初始化失败:', error)
      this.emit('error', { error: error as Error })
      throw error
    }
  }

  /**
   * 连接到协作服务器
   */
  private connectToServer(): void {
    // 模拟连接
    this.isConnected = true
    this.presenceManager.startHeartbeat((userId) => {
      this.emit('user-left', { userId })
    })

    this.emit('connected', {
      users: this.presenceManager.getAllUsers(),
    })
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.isConnected = false
    this.presenceManager.stopHeartbeat()
    this.changeProcessor.reset()

    this.emit('disconnected', {
      reason: 'User disconnected',
    })
  }

  /**
   * 更新光标位置
   */
  updateCursor(cursor: CursorPosition): void {
    if (!this.isConnected) return

    this.presenceManager.updateCursor(this.userId, cursor)
    this.broadcastCursorUpdate(cursor)
  }

  /**
   * 更新选择区域
   */
  updateSelection(selection: Selection): void {
    if (!this.isConnected) return

    this.presenceManager.updateSelection(this.userId, selection)
    this.broadcastSelectionUpdate(selection)
  }

  /**
   * 广播光标更新
   */
  private broadcastCursorUpdate(cursor: CursorPosition): void {
    this.emit('cursor-update', {
      userId: this.userId,
      cursor,
    })
  }

  /**
   * 广播选择更新
   */
  private broadcastSelectionUpdate(selection: Selection): void {
    this.emit('selection-update', {
      userId: this.userId,
      selection,
    })
  }

  /**
   * 处理远程变更
   */
  handleRemoteChange(change: RemoteChange): void {
    this.changeProcessor.addChange(change)
    this.emit('remote-change', { change })
  }

  /**
   * 同步变更
   */
  async sync(): Promise<void> {
    const changes = this.changeProcessor.consumePendingChanges()
    
    // 应用变更
    for (const change of changes) {
      this.changeProcessor.markProcessed(change)
    }

    this.emit('sync', {
      timestamp: Date.now(),
    })
  }

  /**
   * 事件监听
   */
  on<K extends CollaborationEvent>(
    event: K,
    callback: (data: CollaborationEventMap[K]) => void
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  /**
   * 移除事件监听
   */
  off<K extends CollaborationEvent>(
    event: K,
    callback: (data: CollaborationEventMap[K]) => void
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * 触发事件
   */
  private emit<K extends CollaborationEvent>(
    event: K,
    data: CollaborationEventMap[K]
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach((callback) => callback(data))
    }
  }

  /**
   * 获取在线用户
   */
  getActiveUsers(): CollaborativeUser[] {
    return this.presenceManager.getAllUsers()
  }

  /**
   * 获取连接状态
   */
  getConnectionState(): { isConnected: boolean; userCount: number } {
    return {
      isConnected: this.isConnected,
      userCount: this.presenceManager.getActiveUserCount(),
    }
  }

  /**
   * 销毁引擎
   */
  destroy(): void {
    this.disconnect()
    this.presenceManager.clear()
    this.eventListeners.clear()
  }
}

export default CollaborationEngine
