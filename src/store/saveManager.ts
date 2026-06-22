import type { CanvasDoc, CanvasElement, UndoAction } from './types'
import * as storage from './storage'
const SAVE_DELAY = 1500
interface StoreRef {
  setState: (partial: Record<string, unknown>) => void
  getState: () => {
    currentDocId: string | null
    elements: CanvasElement[]
    bgColor: string
    undoStack: UndoAction[]
    redoStack: UndoAction[]
    saveStatus: string
    docs: CanvasDoc[]
  }
}
/**
 * Save manager encapsulates the save timer and save logic.
 * This keeps the timer state private and provides a clean API.
 */
let _saveTimer: ReturnType<typeof setTimeout> | null = null
let _storeRef: StoreRef | null = null
// P0 性能优化: 使用 generation 计数器替代内容哈希
// 彻底解决中间元素修改无法被检测的问题（数据丢失bug）
let _saveGeneration: number = 0
let _lastSavedGeneration: number = -1
let _lastSaveTime: number = 0
// P0 性能优化: 使用 Map 进行 O(1) 文档查找，替代 O(n) 的 findIndex
let _docsIndexMap: Map<string, number> | null = null
/**
 * P0 修复: 重建文档索引 Map
 * 在文档列表变化时调用
 */
function rebuildDocsIndex(docs: CanvasDoc[]): void {
  _docsIndexMap = new Map()
  for (let i = 0; i < docs.length; i++) {
    _docsIndexMap.set(docs[i].id, i)
  }
}
/**
 * P0 修复: 递增保存 generation 计数器
 * 每次 mutation 调用此函数标记内容已修改
 */
export function incrementSaveGeneration(): void {
  _saveGeneration++
}
/**
 * Initialize the save manager with a reference to the store.
 */
export function initSaveManager(store: StoreRef): void {
  _storeRef = store
}
/**
 * Clear any pending save timer.
 */
export function clearSaveTimer(): void {
  if (_saveTimer) {
    clearTimeout(_saveTimer)
    _saveTimer = null
  }
}
/**
 * Schedule a save after the configured delay.
 */
export function scheduleSave(): void {
  if (!_storeRef) return
  // P0 性能优化: 节流 - 最小保存间隔 500ms
  const now = Date.now()
  if (now - _lastSaveTime < 500) {
    // 太频繁了，重置计时器但不立即触发
    clearSaveTimer()
    _saveTimer = setTimeout(() => {
      scheduleSave()
    }, SAVE_DELAY)
    return
  }
  clearSaveTimer()
  _storeRef.setState({ saveStatus: 'saving' })
  _saveTimer = setTimeout(() => {
    saveDocNow()
  }, SAVE_DELAY)
}
/**
 * Save the current document immediately.
 */
export async function saveDocNow(): Promise<void> {
  if (!_storeRef) return
  const state = _storeRef.getState()
  const { currentDocId, elements, bgColor, undoStack, redoStack } = state
  if (!currentDocId) return
  // P0 修复: 使用 generation 计数器检测变化
  // 彻底解决中间元素修改无法被检测的数据丢失bug
  if (_saveGeneration === _lastSavedGeneration) {
    // 内容未变化，直接标记为已保存
    _storeRef.setState({ saveStatus: 'saved' })
    setTimeout(() => {
      if (_storeRef?.getState().saveStatus === 'saved') {
        _storeRef.setState({ saveStatus: 'idle' })
      }
    }, 1000)
    return
  }
  const existing = await storage.get<CanvasDoc>('docs', currentDocId)
  const now = Date.now()
  await storage.put('docs', {
    id: currentDocId,
    title: existing?.title ?? '未命名画布',
    elements,
    bgColor,
    folderId: existing?.folderId ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    undoStack,
    redoStack,
  })
  // 更新缓存
  _lastSavedGeneration = _saveGeneration
  _lastSaveTime = now
  // P1 性能优化: 增量更新文档列表，避免每次都重新获取所有文档
  // 只更新当前修改的文档，而不是重新 fetch 全部
  // P0 修复: 复用已有的 state 变量，避免重复调用 getState()
  const currentDocs = state.docs || []
  const updatedDoc = {
    id: currentDocId,
    title: existing?.title ?? '未命名画布',
    elements,
    bgColor,
    folderId: existing?.folderId ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    undoStack,
    redoStack,
  }
  // P0 性能优化: 使用 Map 进行 O(1) 文档查找
  // 策略：当前修改的文档一定是最新的，直接移到最前面即可 O(n)
  let docs: CanvasDoc[]
  // 延迟初始化索引
  if (!_docsIndexMap) {
    rebuildDocsIndex(currentDocs)
  }
  const existingIndex = _docsIndexMap?.get(currentDocId) ?? -1
  if (existingIndex >= 0) {
    // 文档已存在：移到最前面
    docs = [updatedDoc, ...currentDocs.slice(0, existingIndex), ...currentDocs.slice(existingIndex + 1)]
  } else {
    // 新文档：插入到最前面
    docs = [updatedDoc, ...currentDocs]
  }
  // 重建索引
  rebuildDocsIndex(docs)
  _storeRef.setState({ docs, saveStatus: 'saved' })
  // Reset save status after 2 seconds
  setTimeout(() => {
    if (_storeRef?.getState().saveStatus === 'saved') {
      _storeRef.setState({ saveStatus: 'idle' })
    }
  }, 2000)
}
/**
 * P1 性能优化: 强制重置缓存（用于导入/导出等场景）
 */
export function resetSaveCache(): void {
  _lastSavedGeneration = -1
  _lastSaveTime = 0
  _docsIndexMap = null
}
// Clean up on HMR
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearSaveTimer()
  })
}
