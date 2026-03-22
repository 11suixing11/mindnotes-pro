/**
 * Collaboration Engine - 实时多用户协作
 * Phase 3.3 - 基于 Yjs CRDT 的实时编辑
 * 
 * 注意: 这是初始化框架，完整的 Yjs 集成将在 Phase 3.4 实现
 */

export interface CollaborativeUser {
  userId: string
  userName: string
  color: string
  cursor?: CursorPosition
  selection?: Selection
  lastUpdate: number
  isActive: boolean
}

export interface CursorPosition {
  line: number
  ch: number
}

export interface Selection {
  start: CursorPosition
  end: CursorPosition
}

export interface RemoteChange {
  userId: string
  change: any // Y.YEvent type
  timestamp: number
}

export class CollaborationEngine {
  private documentId: string
  private userId: string
  private userName: string
  private userColor: string
  private localUsers: Map<string, CollaborativeUser> = new Map()
  private listeners: Map<string, Function[]> = new Map()
  private wsProvider: any = null // WebsocketProvider placeholder
  private initialized = false

  constructor(documentId: string, userId: string, userName: string) {
    this.documentId = documentId
    this.userId = userId
    this.userName = userName
    this.userColor = this.generateUserColor()
  }

  /**
   * 初始化协作文档
   */
  async initializeSharedDocument(): Promise<void> {
    if (this.initialized) return

    try {
      // 创建本地用户对象
      const localUser: CollaborativeUser = {
        userId: this.userId,
        userName: this.userName,
        color: this.userColor,
        lastUpdate: Date.now(),
        isActive: true
      }

      this.localUsers.set(this.userId, localUser)

      // 连接到协作服务（模拟）
      // 完整实现需要 WebSocket 连接到协作后端
      this.connectToServer()

      this.initialized = true
      this.emit('initialized', {
        documentId: this.documentId,
        localUser: localUser
      })

      console.log(`🤝 协作文档已初始化: ${this.documentId}`)
    } catch (error) {
      console.error('Failed to initialize shared document:', error)
      this.emit('error', { error: String(error) })
    }
  }

  /**
   * 连接到协作服务
   */
  private connectToServer(): void {
    try {
      // 模拟 WebSocket 连接
      // 实际应实现真实的 WebSocket/Server-Sent Events 连接
      const serverUrl = `ws://localhost:3000/collaborate/${this.documentId}`
      
      console.log(`📡 连接到协作服务器: ${serverUrl}`)
      
      // 广播本地用户状态
      this.broadcastUserState()
    } catch (error) {
      console.error('Server connection failed:', error)
    }
  }

  /**
   * 广播用户状态（光标、选择等）
   */
  private broadcastUserState(): void {
    const user = this.localUsers.get(this.userId)
    if (!user) return

    // 定期更新用户状态（降低网络开销）
    const update = {
      userId: this.userId,
      userName: this.userName,
      color: this.userColor,
      cursor: user.cursor,
      selection: user.selection,
      timestamp: Date.now()
    }

    // 发送到服务器
    this.emit('user-state-changed', update)
  }

  /**
   * 更新本地光标位置
   */
  updateLocalCursor(position: CursorPosition): void {
    const user = this.localUsers.get(this.userId)
    if (user) {
      user.cursor = position
      user.lastUpdate = Date.now()
      this.broadcastUserState()
      this.emit('local-cursor-moved', position)
    }
  }

  /**
   * 更新本地选择
   */
  updateLocalSelection(selection: Selection): void {
    const user = this.localUsers.get(this.userId)
    if (user) {
      user.selection = selection
      user.lastUpdate = Date.now()
      this.broadcastUserState()
      this.emit('local-selection-changed', selection)
    }
  }

  /**
   * 处理远程变更
   */
  handleRemoteChange(change: RemoteChange): void {
    try {
      // 应用远程变更到本地编辑器
      // 完整实现需要 CRDT 合并逻辑
      
      this.emit('remote-change', {
        userId: change.userId,
        timestamp: change.timestamp
      })
    } catch (error) {
      console.error('Failed to handle remote change:', error)
    }
  }

  /**
   * 处理远程用户加入
   */
  handleRemoteUserJoined(user: CollaborativeUser): void {
    this.localUsers.set(user.userId, {
      ...user,
      isActive: true
    })

    this.emit('user-joined', user)
    console.log(`👤 用户已加入: ${user.userName}`)
  }

  /**
   * 处理远程用户离开
   */
  handleRemoteUserLeft(userId: string): void {
    this.localUsers.delete(userId)
    this.emit('user-left', { userId })
    console.log(`👤 用户已离开: ${userId}`)
  }

  /**
   * 获取活跃用户列表
   */
  getActiveUsers(): CollaborativeUser[] {
    return Array.from(this.localUsers.values())
      .filter(user => user.isActive)
      .sort((a, b) => b.lastUpdate - a.lastUpdate)
  }

  /**
   * 获取特定用户信息
   */
  getUser(userId: string): CollaborativeUser | undefined {
    return this.localUsers.get(userId)
  }

  /**
   * 订阅远程变更
   */
  onRemoteChange(callback: (change: RemoteChange) => void): void {
    this.on('remote-change', callback)
  }

  /**
   * 订阅光标变更
   */
  onRemoteCursor(callback: (data: { userId: string; position: CursorPosition }) => void): void {
    this.on('remote-cursor', callback)
  }

  /**
   * 订阅选择变更
   */
  onRemoteSelection(callback: (data: { userId: string; selection: Selection }) => void): void {
    this.on('remote-selection', callback)
  }

  /**
   * 生成用户颜色
   */
  private generateUserColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE',
      '#85C1E2', '#F8B88B', '#D7E7D4', '#FFEAA7', '#DDA5C4'
    ]
    
    const hash = this.userId.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0)
    }, 0)
    
    return colors[Math.abs(hash) % colors.length]
  }

  /**
   * 事件系统
   */
  private on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(listener)
  }

  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error(`Error in ${event} listener:`, error)
        }
      })
    }
  }

  /**
   * 销毁协作引擎
   */
  destroy(): void {
    // 通知服务器用户离开
    this.emit('user-left', { userId: this.userId })
    
    // 清理连接
    if (this.wsProvider) {
      this.wsProvider.disconnect()
    }

    this.localUsers.clear()
    this.listeners.clear()
    this.initialized = false
  }

  /**
   * 获取协作统计
   */
  getStats(): {
    documentId: string
    userId: string
    activeUsers: number
    initialized: boolean
  } {
    return {
      documentId: this.documentId,
      userId: this.userId,
      activeUsers: this.getActiveUsers().length,
      initialized: this.initialized
    }
  }
}

/**
 * 冲突解决策略
 */
export enum ConflictResolutionStrategy {
  // CRDT 自动合并（推荐）
  CRDT = 'crdt',
  
  // 时间戳：新版本覆盖旧版本
  TIMESTAMP = 'timestamp',
  
  // 用户选择：显示 UI 让用户选择
  USER_CHOICE = 'user-choice',
  
  // 保留本地
  KEEP_LOCAL = 'keep-local',
  
  // 保留远程
  KEEP_REMOTE = 'keep-remote'
}

/**
 * 协作配置
 */
export interface CollaborationConfig {
  documentId: string
  userId: string
  userName: string
  serverUrl?: string
  enableAutoSync?: boolean
  autoSyncInterval?: number // ms
  conflictResolutionStrategy?: ConflictResolutionStrategy
  maxRetries?: number
  retryDelay?: number // ms
}

/**
 * 创建协作引擎实例
 */
export function createCollaborationEngine(config: CollaborationConfig): CollaborationEngine {
  const engine = new CollaborationEngine(
    config.documentId,
    config.userId,
    config.userName
  )

  return engine
}

// 创建并导出全局协作引擎工厂
export class CollaborationEngineFactory {
  private static engines: Map<string, CollaborationEngine> = new Map()

  static async createEngine(config: CollaborationConfig): Promise<CollaborationEngine> {
    const existingEngine = this.engines.get(config.documentId)
    if (existingEngine) {
      return existingEngine
    }

    const engine = createCollaborationEngine(config)
    await engine.initializeSharedDocument()
    
    this.engines.set(config.documentId, engine)
    return engine
  }

  static getEngine(documentId: string): CollaborationEngine | undefined {
    return this.engines.get(documentId)
  }

  static destroyEngine(documentId: string): void {
    const engine = this.engines.get(documentId)
    if (engine) {
      engine.destroy()
      this.engines.delete(documentId)
    }
  }

  static getEngineStat(): Map<string, any> {
    const stats = new Map()
    this.engines.forEach((engine, docId) => {
      stats.set(docId, engine.getStats())
    })
    return stats
  }
}
