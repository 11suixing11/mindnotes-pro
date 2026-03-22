# Phase 3: 离线优先编辑 + 实时协作

## 概述

Phase 3 专注于构建完全离线编辑能力和实时协作基础，利用现代 Web 技术如 IndexedDB、Service Worker v2 和 Yjs（CRDT）。

**时间**: Month 2 (约 4 周)  
**预期收益**:
- ✅ 完全离线编辑（无网络限制）
- ✅ 自动同步队列（网络恢复时）
- ✅ 冲突解决（多设备编辑）
- ✅ 实时协作基础（为 Phase 4 准备）

## Phase 3.1: 离线优先数据存储

### 目标
构建本地优先的数据架构，支持完全离线编辑。

### 实现方案

#### 1. IndexedDB 数据库设计
```
Database: mindnotes-pro-v1.4
├── stores: [
│   ├── documents {
│   │   keyPath: 'id',
│   │   indexes: ['updatedAt', 'syncStatus']
│   │ }
│   ├── changes {
│   │   keyPath: 'id',
│   │   indexes: ['documentId', 'timestamp', 'synced']
│   │ }
│   ├── assets {
│   │   keyPath: 'id',
│   │   indexes: ['documentId', 'mimeType']
│   │ }
│   └── syncQueue {
│       keyPath: 'id',
│       indexes: ['timestamp', 'priority']
│     }
│ ]
```

#### 2. OfflineStorageManager 类
```typescript
// src/utils/offlineStorageManager.ts

export class OfflineStorageManager {
  private db: IDBDatabase
  private syncQueue: SyncQueueItem[] = []

  async initialize(): Promise<void>
  async saveDocument(doc: Document): Promise<void>
  async getDocument(id: string): Promise<Document | null>
  async getAllDocuments(): Promise<Document[]>
  async deleteDocument(id: string): Promise<void>
  async recordChange(change: DocumentChange): Promise<void>
  async getChanges(docId: string): Promise<DocumentChange[]>
  async queueSync(item: SyncQueueItem): Promise<void>
  async processSyncQueue(): Promise<void>
}
```

#### 3. 同步策略
```
编辑流程:
  用户编辑
    ↓
  本地保存 (IndexedDB)
    ↓
  记录变更 (Changes Store)
    ↓
  如果在线 → 立即同步
    ↓
  如果离线 → 放入同步队列
    ↓
  网络恢复 → 自动处理队列
```

### 关键特性
- **事务性**: 所有操作原子化
- **版本控制**: 每个文档版本历史
- **增量同步**: 只同步变更而非整个文档
- **冲突追踪**: 记录冲突版本供后续合并

## Phase 3.2: 自动同步引擎

### 目标
实现智能同步，处理网络状态变化和冲突检测。

### 核心组件

#### 1. 同步状态机
```
┌─────────────┐
│   离线      │  (无网络)
└──────┬──────┘
       │
       │ 网络恢复
       ↓
┌─────────────┐
│  正在同步   │  (处理队列)
└──────┬──────┘
       │
       │ 同步完成/失败
       ↓
┌─────────────┐
│   在线      │  (已同步)
└──────┬──────┘
       │
       │ 网络断开
       ↓ (回到离线)
```

#### 2. SyncEngine 实现
```typescript
// src/utils/syncEngine.ts

export class SyncEngine {
  private state: 'online' | 'offline' | 'syncing' = 'offline'
  private retryCount = 0
  private maxRetries = 5

  async start(): Promise<void>
  async sync(): Promise<SyncResult>
  private async handleConflicts(): Promise<void>
  private async applyRemoteChanges(): Promise<void>
  private async uploadLocalChanges(): Promise<void>
  private async retryFailedSync(): Promise<void>
}
```

#### 3. 冲突解决策略
```
冲突检测:
  本地版本号 < 远程版本号
    ↓
  有未同步的本地更改?
    ├─ YES → 合并冲突
    │   ├─ CRDT: 使用 Yjs 自动合并
    │   ├─ 时间戳: 新版本覆盖旧版本
    │   └─ 用户选择: 展示 UI 让用户选择
    │
    └─ NO → 直接应用远程版本
```

### 关键特性
- **自动重试**: 指数退避重试 (1s, 2s, 4s, 8s, 16s)
- **乐观更新**: 本地立即反映，后台同步
- **冲突检测**: 版本号和时间戳对比
- **合并策略**: CRDT 优先，时间戳备选

## Phase 3.3: 实时协作基础

### 目标
建立多用户实时编辑的基础架构（CRDT + Yjs）。

### Yjs 集成
```typescript
// src/utils/collaborationEngine.ts

import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export class CollaborationEngine {
  private ydoc: Y.Doc
  private ytext: Y.Text
  private provider: WebsocketProvider
  
  // 初始化共享文档
  async initializeSharedDocument(docId: string): Promise<void>
  
  // 绑定编辑器
  bindEditor(editor: Editor): void
  
  // 获取活跃用户
  getActiveUsers(): CollaborativeUser[]
  
  // 订阅远程变更
  onRemoteChange(callback: (change: Y.YEvent) => void): void
}
```

### 数据结构
```typescript
// Yjs 共享数据类型
const ydoc = new Y.Doc()
const ytext = ydoc.getText('shared-text')           // 共享文本
const ymeta = ydoc.getMap('metadata')               // 文档元数据
const yawareness = ydoc.getAwareness()              // 用户感知
const yundoManager = new Y.UndoManager([ytext])     // 撤销/重做
```

### 用户感知（光标 + 选择）
```typescript
// 本地光标/选择状态
const localState = {
  userId: getCurrentUserId(),
  userName: getCurrentUserName(),
  color: hashUserColor(),
  cursor: { line: 0, ch: 0 },
  selection: null,
  timestamp: Date.now()
}

// 广播给其他用户
ydoc.getAwareness().setLocalState(localState)

// 监听其他用户状态变化
ydoc.getAwareness().on('change', changes => {
  renderRemoteCursors(changes)
})
```

### 关键特性
- **CRDT**: 自动合并冲突，保证一致性
- **Operational Transform**: 备选方案，用于向后兼容
- **用户感知**: 实时显示其他用户光标和选择
- **撤销/重做**: 支持多用户环境下的历史管理

## Phase 3.4: 冲突解决 UI

### 冲突检测告知
```tsx
interface ConflictAlert {
  type: 'conflict' | 'resolved' | 'error'
  message: string
  actions: ConflictAction[]
}

// UI Component
<ConflictResolver
  conflict={conflict}
  localVersion={localDoc}
  remoteVersion={remoteDoc}
  onResolve={(strategy) => handleResolution(strategy)}
/>
```

### 合并策略选项
1. **Keep Local**: 保留本地版本
2. **Accept Remote**: 接受远程版本
3. **Auto-Merge**: 使用 CRDT 自动合并
4. **Manual Merge**: 手动编辑后合并

## 实现时间表

### 周 1-2: 离线存储
- [ ] IndexedDB 数据库设计
- [ ] OfflineStorageManager 实现
- [ ] 本地变更记录
- [ ] 测试覆盖率 > 80%

### 周 3: 同步引擎
- [ ] SyncEngine 核心逻辑
- [ ] 网络状态监测
- [ ] 重试机制
- [ ] 集成测试

### 周 4: 协作基础
- [ ] Yjs 集成
- [ ] WebSocket 连接
- [ ] 用户感知
- [ ] 冲突解决 UI

## 性能目标

| 指标 | 目标 |
|------|------|
| 离线编辑延迟 | < 50ms |
| 同步延迟 | < 200ms |
| 冲突检测时间 | < 100ms |
| 内存占用 (IndexedDB) | < 100KB 每个文档 |
| 同步队列吞吐量 | 100+ 操作/秒 |

## 依赖项

- [x] Service Worker v2 (Phase 1)
- [x] performanceMonitor (Phase 1)
- [ ] Yjs (新增)
- [ ] y-websocket (新增)
- [ ] idb (localStorage 替代)
- [ ] diff-match-patch (文本对比)

## 风险和缓解

| 风险 | 缓解策略 |
|------|---------|
| IndexedDB 配额超限 | 实施清理策略，压缩旧变更 |
| 网络间歇性问题 | 指数退避重试，队列持久化 |
| 冲突过多 | 实施乐观锁，检测编辑冲突 |
| 用户感知延迟 | 优化广播频率，批量更新 |

## 成功指标

- ✅ 离线编辑完全可用 (100% 功能)
- ✅ 自动同步成功率 > 99%
- ✅ 冲突检测准确率 > 95%
- ✅ 用户满意度 > 4.5/5
- ✅ 向后兼容性 100%

## 下一步 (Phase 4)

- 全球 CDN 部署 (Asia, EU, Americas, Oceania)
- 高级协作功能 (权限管理、注释)
- 离线分析和警报
- 移动应用发布 (iOS + Android)

---

**Status**: 🔲 Phase 3 计划中  
**Next**: 开始 Phase 3.1 离线存储实现
