import type { CollaborativeUser, CursorPosition, Selection } from './types'

/**
 * 用户存在管理器
 * 管理在线用户列表和光标位置
 */
export class UserPresenceManager {
  private users: Map<string, CollaborativeUser> = new Map()
  private heartbeatInterval: number | null = null
  private readonly HEARTBEAT_INTERVAL = 5000 // 5 秒

  /**
   * 添加或更新用户
   */
  updateUser(user: CollaborativeUser): void {
    this.users.set(user.userId, user)
  }

  /**
   * 移除用户
   */
  removeUser(userId: string): void {
    this.users.delete(userId)
  }

  /**
   * 获取用户
   */
  getUser(userId: string): CollaborativeUser | undefined {
    return this.users.get(userId)
  }

  /**
   * 获取所有用户
   */
  getAllUsers(): CollaborativeUser[] {
    return Array.from(this.users.values())
  }

  /**
   * 获取活跃用户数
   */
  getActiveUserCount(): number {
    return Array.from(this.users.values()).filter(u => u.isActive).length
  }

  /**
   * 更新用户光标
   */
  updateCursor(userId: string, cursor: CursorPosition): void {
    const user = this.users.get(userId)
    if (user) {
      user.cursor = cursor
      user.lastUpdate = Date.now()
    }
  }

  /**
   * 更新用户选择
   */
  updateSelection(userId: string, selection: Selection): void {
    const user = this.users.get(userId)
    if (user) {
      user.selection = selection
      user.lastUpdate = Date.now()
    }
  }

  /**
   * 启动心跳检测
   */
  startHeartbeat(onInactiveUser?: (userId: string) => void): void {
    this.heartbeatInterval = window.setInterval(() => {
      const now = Date.now()
      const timeout = this.HEARTBEAT_INTERVAL * 2

      this.users.forEach((user, userId) => {
        if (now - user.lastUpdate > timeout && user.isActive) {
          user.isActive = false
          onInactiveUser?.(userId)
        }
      })
    }, this.HEARTBEAT_INTERVAL)
  }

  /**
   * 停止心跳检测
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * 清理所有用户
   */
  clear(): void {
    this.users.clear()
    this.stopHeartbeat()
  }
}

export default UserPresenceManager
