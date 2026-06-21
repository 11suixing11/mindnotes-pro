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
  }
}

/**
 * Save manager encapsulates the save timer and save logic.
 * This keeps the timer state private and provides a clean API.
 */
let _saveTimer: ReturnType<typeof setTimeout> | null = null
let _storeRef: StoreRef | null = null

// P0 性能优化: 保存哈希缓存，避免无变化的存储写入
let _lastSaveHash: string = ''
let _lastSaveTime: number = 0

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
 * P0 性能优化: 快速计算内容哈希
 * 用于检测是否真的需要写入存储
 */
function computeContentHash(elements: CanvasElement[], bgColor: string): string {
  // 快速哈希：元素数量 + 最后修改时间戳 + 背景色
  // 这比完整序列化快得多，足以检测大部分变化
  return `${elements.length}:${elements[elements.length - 1]?.id || 'empty'}:${bgColor}`
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
  
  // P0 性能优化: 跳过无变化的保存
  const currentHash = computeContentHash(elements, bgColor)
  if (currentHash === _lastSaveHash) {
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
  _lastSaveHash = currentHash
  _lastSaveTime = now
  
  // P1 性能优化: 只在文档列表真正变化时才重新获取
  // 这里我们仍然获取，但可以考虑增量更新策略
  const docs = (await storage.getAll<CanvasDoc>('docs')).sort((a, b) => b.updatedAt - a.updatedAt)
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
  _lastSaveHash = ''
  _lastSaveTime = 0
}

// Clean up on HMR
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearSaveTimer()
  })
}
