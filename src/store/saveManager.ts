import type {
  CanvasBackgroundStyle,
  CanvasDoc,
  CanvasElement,
  CanvasLayer,
  UndoAction,
} from './types'
import * as storage from './storage'
import { CANVAS_SCHEMA_VERSION } from './schema'
import { useToastStore } from './toastStore'
import { clearRecoveryDraftForDocument, saveRecoveryDraft } from './recovery'
const SAVE_DELAY = 1500
interface StoreRef {
  setState: (partial: Record<string, unknown>) => void
  getState: () => {
    currentDocId: string | null
    elements: CanvasElement[]
    layers: CanvasLayer[]
    activeLayerId: string
    bgColor: string
    backgroundStyle: CanvasBackgroundStyle
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
let _saveStatusTimer: ReturnType<typeof setTimeout> | null = null
let _storeRef: StoreRef | null = null
// P0 性能优化: 使用按文档 generation 计数器替代内容哈希
// 彻底解决中间元素修改无法被检测的问题（数据丢失bug）
let _saveGenerations = new Map<string, number>()
let _lastSavedGenerations = new Map<string, number>()
let _lastSaveTimes = new Map<string, number>()
let _saveInFlight: Promise<boolean> | null = null
// P0 性能优化: 使用 Map 进行 O(1) 文档查找，替代 O(n) 的 findIndex
let _docsIndexMap: Map<string, number> | null = null
/**
 * 重建文档索引 Map
 * 在文档列表变化时调用
 */
function rebuildDocsIndex(docs: CanvasDoc[]): void {
  _docsIndexMap = new Map()
  for (let i = 0; i < docs.length; i++) {
    _docsIndexMap.set(docs[i].id, i)
  }
}
/**
 * 递增保存 generation 计数器
 * 每次 mutation 调用此函数标记内容已修改
 */
export function incrementSaveGeneration(): void {
  const documentId = _storeRef?.getState().currentDocId
  if (!documentId) return
  _saveGenerations.set(documentId, (_saveGenerations.get(documentId) ?? 0) + 1)
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

function clearSaveStatusTimer(): void {
  if (_saveStatusTimer) {
    clearTimeout(_saveStatusTimer)
    _saveStatusTimer = null
  }
}

function markDocumentSaved(documentId: string): void {
  if (!_storeRef || _storeRef.getState().currentDocId !== documentId) return

  clearSaveStatusTimer()
  _storeRef.setState({ saveStatus: 'saved' })
  _saveStatusTimer = setTimeout(() => {
    if (_storeRef?.getState().currentDocId === documentId) {
      if (_storeRef.getState().saveStatus === 'saved') _storeRef.setState({ saveStatus: 'idle' })
    }
    _saveStatusTimer = null
  }, 2000)
}
/**
 * Schedule a save after the configured delay.
 */
export function scheduleSave(): void {
  if (!_storeRef) return
  // P0 性能优化: 节流 - 最小保存间隔 500ms
  const now = Date.now()
  const documentId = _storeRef.getState().currentDocId
  if (!documentId) {
    _storeRef.setState({ saveStatus: 'saving' })
    return
  }
  const lastSaveTime = _lastSaveTimes.get(documentId) ?? 0
  if (now - lastSaveTime < 500) {
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
    void saveDocNow()
  }, SAVE_DELAY)
}
/**
 * Save the current document immediately.
 */
async function persistCurrentDocument(): Promise<boolean> {
  if (!_storeRef) return false
  const state = _storeRef.getState()
  const {
    currentDocId,
    elements,
    layers,
    activeLayerId,
    bgColor,
    backgroundStyle,
    undoStack,
    redoStack,
  } = state
  if (!currentDocId) return true
  // 使用 generation 计数器检测变化
  // 彻底解决中间元素修改无法被检测的数据丢失bug
  const generationAtStart = _saveGenerations.get(currentDocId) ?? 0
  if (_lastSavedGenerations.get(currentDocId) === generationAtStart) {
    markDocumentSaved(currentDocId)
    return true
  }
  const recoveryDocument: CanvasDoc = {
    schemaVersion: CANVAS_SCHEMA_VERSION,
    id: currentDocId,
    title: state.docs.find((doc) => doc.id === currentDocId)?.title ?? '未命名画布',
    elements,
    layers,
    activeLayerId,
    bgColor,
    backgroundStyle,
    folderId: state.docs.find((doc) => doc.id === currentDocId)?.folderId ?? null,
    createdAt: state.docs.find((doc) => doc.id === currentDocId)?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    undoStack,
    redoStack,
  }

  try {
    const now = Date.now()
    const updatedDoc = await storage.update<CanvasDoc>('docs', currentDocId, (existing) => {
      const currentStateDoc = _storeRef?.getState().docs.find((doc) => doc.id === currentDocId)
      if (!existing && !currentStateDoc) return undefined

      return {
        schemaVersion: CANVAS_SCHEMA_VERSION,
        id: currentDocId,
        title: currentStateDoc?.title ?? existing?.title ?? '未命名画布',
        elements,
        layers,
        activeLayerId,
        bgColor,
        backgroundStyle,
        folderId: currentStateDoc?.folderId ?? existing?.folderId ?? null,
        createdAt: currentStateDoc?.createdAt ?? existing?.createdAt ?? now,
        updatedAt: now,
        undoStack,
        redoStack,
      }
    })
    // 更新缓存
    _lastSavedGenerations.set(currentDocId, generationAtStart)
    _lastSaveTimes.set(currentDocId, now)
    clearRecoveryDraftForDocument(currentDocId, now)
    // P1 性能优化: 增量更新文档列表，避免每次都重新获取所有文档
    // 只更新当前修改的文档，而不是重新 fetch 全部
    // 复用已有的 state 变量，避免重复调用 getState()
    const currentDocs = _storeRef.getState().docs ?? []
    // P0 性能优化: 使用 Map 进行 O(1) 文档查找
    // 策略：当前修改的文档一定是最新的，直接移到最前面即可 O(n)
    let docs: CanvasDoc[]
    rebuildDocsIndex(currentDocs)
    const existingIndex = _docsIndexMap?.get(currentDocId) ?? -1
    if (updatedDoc && existingIndex >= 0) {
      const currentDoc = currentDocs[existingIndex]
      const mergedDoc: CanvasDoc = {
        ...updatedDoc,
        title: currentDoc.title,
        folderId: currentDoc.folderId,
        createdAt: currentDoc.createdAt,
        updatedAt: Math.max(updatedDoc.updatedAt, currentDoc.updatedAt),
      }
      // 文档已存在：移到最前面
      docs = [
        mergedDoc,
        ...currentDocs.slice(0, existingIndex),
        ...currentDocs.slice(existingIndex + 1),
      ]
    } else if (updatedDoc) {
      // 新文档：插入到最前面
      docs = [updatedDoc, ...currentDocs]
    } else {
      docs = currentDocs
    }
    // 重建索引
    rebuildDocsIndex(docs)
    const isCurrentDocument = _storeRef.getState().currentDocId === currentDocId
    _storeRef.setState(isCurrentDocument ? { docs, saveStatus: 'saved' } : { docs })
    if (isCurrentDocument) markDocumentSaved(currentDocId)

    if (
      (_saveGenerations.get(currentDocId) ?? 0) !== generationAtStart &&
      _storeRef.getState().currentDocId === currentDocId
    ) {
      scheduleSave()
    }
    return true
  } catch (error) {
    console.error('[save] Failed to persist the current document', error)
    const recoverySaved = saveRecoveryDraft(recoveryDocument)
    if (_storeRef.getState().currentDocId === currentDocId) {
      _storeRef.setState({ saveStatus: 'error' })
    }
    useToastStore
      .getState()
      .show(
        recoverySaved
          ? '保存失败，已保留本地恢复草稿；请检查浏览器存储权限后重试'
          : '保存失败，请检查浏览器存储权限后重试',
        'error',
        5000
      )
    return false
  }
}

/**
 * Serialize saves so an older, slower IndexedDB request cannot finish after a
 * newer request and overwrite its in-memory document list or save status.
 */
export function saveDocNow(): Promise<boolean> {
  if (_saveInFlight) {
    const pending = _saveInFlight
    return pending.then((result) => {
      if (!result || !_storeRef) return result
      const currentDocId = _storeRef.getState().currentDocId
      if (
        !currentDocId ||
        _lastSavedGenerations.get(currentDocId) === (_saveGenerations.get(currentDocId) ?? 0)
      ) {
        return result
      }
      return saveDocNow()
    })
  }

  const pending = persistCurrentDocument()
  _saveInFlight = pending
  return pending.finally(() => {
    if (_saveInFlight === pending) _saveInFlight = null
  })
}
/**
 * P1 性能优化: 强制重置缓存（用于导入/导出等场景）
 */
export function resetSaveCache(): void {
  _saveGenerations = new Map()
  _lastSavedGenerations = new Map()
  _lastSaveTimes = new Map()
  _docsIndexMap = null
  clearSaveStatusTimer()
}
// Clean up on HMR
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearSaveTimer()
    clearSaveStatusTimer()
  })
}
