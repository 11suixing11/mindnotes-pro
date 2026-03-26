// 协作引擎类型定义

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
  change: any
  timestamp: number
}

export interface CollaborationState {
  isConnected: boolean
  users: Map<string, CollaborativeUser>
  pendingChanges: RemoteChange[]
  lastSyncTime: number | null
}

export type CollaborationEvent =
  | 'initialized'
  | 'connected'
  | 'disconnected'
  | 'user-joined'
  | 'user-left'
  | 'cursor-update'
  | 'selection-update'
  | 'remote-change'
  | 'sync'
  | 'error'

export interface CollaborationEventMap {
  initialized: { documentId: string; localUser: CollaborativeUser }
  connected: { users: CollaborativeUser[] }
  disconnected: { reason: string }
  'user-joined': { user: CollaborativeUser }
  'user-left': { userId: string }
  'cursor-update': { userId: string; cursor: CursorPosition }
  'selection-update': { userId: string; selection: Selection }
  'remote-change': { change: RemoteChange }
  sync: { timestamp: number }
  error: { error: Error }
}
