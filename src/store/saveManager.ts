import type {
  CanvasBackgroundStyle,
  CanvasDoc,
  CanvasElement,
  CanvasLayer,
  UndoAction,
} from './types'
import { getDocumentRepository } from './documentRepository'
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
    persistenceMode: 'persistent' | 'memory-only'
    lastSavedAt: number | null
    saveError: string | null
    docs: CanvasDoc[]
  }
}

type StoreState = ReturnType<StoreRef['getState']>

export interface ActiveTextRecoveryDraft {
  elementId: string
  element: CanvasElement | null
}

interface TrackedActiveTextRecoveryDraft extends ActiveTextRecoveryDraft {
  documentId: string
  generation: number
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
let _workspaceGeneration = 0
let _saveInFlight: Promise<boolean> | null = null
let _activeTextRecoveryDraft: TrackedActiveTextRecoveryDraft | null = null
const _deletedDocumentIds = new Set<string>()
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
  if (!documentId) {
    _workspaceGeneration += 1
    return
  }
  _saveGenerations.set(documentId, (_saveGenerations.get(documentId) ?? 0) + 1)
}

/**
 * Read the in-memory mutation generation for a document.
 *
 * Import replacement uses this as an optimistic concurrency token: the
 * document must not be swapped into the live store if an edit landed while
 * the replacement record was being written.
 */
export function getSaveGeneration(documentId: string | null | undefined): number {
  if (!documentId) return _workspaceGeneration
  return _saveGenerations.get(documentId) ?? 0
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

/** Prevent delayed or in-flight saves from recreating a deleted document. */
export function markDocumentDeleted(documentId: string): void {
  _deletedDocumentIds.add(documentId)
  if (_activeTextRecoveryDraft?.documentId === documentId) {
    _activeTextRecoveryDraft = null
  }
  if (_storeRef?.getState().currentDocId === documentId) clearSaveTimer()
}

/** Allow a failed delete operation to make the document writable again. */
export function unmarkDocumentDeleted(documentId: string): void {
  _deletedDocumentIds.delete(documentId)
}

function isDocumentDeleted(documentId: string): boolean {
  return _deletedDocumentIds.has(documentId)
}

function clearSaveStatusTimer(): void {
  if (_saveStatusTimer) {
    clearTimeout(_saveStatusTimer)
    _saveStatusTimer = null
  }
}

function markDocumentSaved(documentId: string, savedAt = Date.now()): void {
  if (!_storeRef || _storeRef.getState().currentDocId !== documentId) return

  clearSaveStatusTimer()
  _storeRef.setState({
    saveStatus: 'saved',
    persistenceMode: 'persistent',
    lastSavedAt: savedAt,
    saveError: null,
  })
  _saveStatusTimer = setTimeout(() => {
    if (_storeRef?.getState().currentDocId === documentId) {
      if (_storeRef.getState().saveStatus === 'saved') _storeRef.setState({ saveStatus: 'idle' })
    }
    _saveStatusTimer = null
  }, 2000)
}

function createRecoveryDocument(state: StoreState): CanvasDoc | null {
  const { currentDocId } = state
  if (!currentDocId) return null

  const currentStateDoc = state.docs.find((doc) => doc.id === currentDocId)
  return {
    schemaVersion: CANVAS_SCHEMA_VERSION,
    id: currentDocId,
    title: currentStateDoc?.title ?? '未命名画布',
    elements: state.elements,
    layers: state.layers,
    activeLayerId: state.activeLayerId,
    bgColor: state.bgColor,
    backgroundStyle: state.backgroundStyle,
    folderId: currentStateDoc?.folderId ?? null,
    createdAt: currentStateDoc?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    undoStack: state.undoStack,
    redoStack: state.redoStack,
  }
}

function rebaseActiveTextRecoveryDraft(
  state: StoreState,
  draft: TrackedActiveTextRecoveryDraft
): ActiveTextRecoveryDraft {
  const currentGeneration = _saveGenerations.get(draft.documentId) ?? 0
  if (draft.generation >= currentGeneration) return draft

  return {
    elementId: draft.elementId,
    element: state.elements.find((element) => element.id === draft.elementId) ?? null,
  }
}

/**
 * Synchronously write the current in-memory board to the recovery journal.
 * This is intentionally separate from IndexedDB persistence so pagehide/
 * beforeunload still has a durable last line of defence when the browser
 * terminates pending async transactions.
 */
export function saveRecoveryDraftNow(): boolean {
  if (!_storeRef) return false
  const state = _storeRef.getState()
  if (_activeTextRecoveryDraft?.documentId === state.currentDocId) {
    return saveActiveTextRecoveryDraftNow(
      rebaseActiveTextRecoveryDraft(state, _activeTextRecoveryDraft)
    )
  }
  if (state.saveStatus !== 'saving' && state.saveStatus !== 'error') return false
  const document = createRecoveryDocument(state)
  return document ? saveRecoveryDraft(document) : false
}

/**
 * Write the latest active textarea value into the recovery journal. Text is
 * already mirrored into the live store; this checkpoint protects the final
 * DOM value as an independent last line of defence against a tab/process crash.
 */
export function saveActiveTextRecoveryDraftNow(draft: ActiveTextRecoveryDraft): boolean {
  if (!_storeRef) return false

  const state = _storeRef.getState()
  const document = createRecoveryDocument(state)
  if (!document) return false

  _activeTextRecoveryDraft = {
    ...draft,
    documentId: document.id,
    generation: _saveGenerations.get(document.id) ?? 0,
  }

  const elementIndex = document.elements.findIndex((element) => element.id === draft.elementId)
  const elements = [...document.elements]
  if (draft.element) {
    if (elementIndex >= 0) elements[elementIndex] = draft.element
    else elements.push(draft.element)
  } else if (elementIndex >= 0) {
    elements.splice(elementIndex, 1)
  }

  return saveRecoveryDraft({
    ...document,
    elements,
    updatedAt: Date.now(),
  })
}

/** Stop rebasing recovery checkpoints after the textarea session has ended. */
export function clearActiveTextRecoveryDraft(): void {
  const activeDraft = _activeTextRecoveryDraft
  _activeTextRecoveryDraft = null
  if (!activeDraft || !_storeRef) return

  const state = _storeRef.getState()
  if (
    state.currentDocId === activeDraft.documentId &&
    state.saveStatus !== 'saving' &&
    state.saveStatus !== 'error'
  ) {
    clearRecoveryDraftForDocument(activeDraft.documentId, Number.POSITIVE_INFINITY)
  }
}
/**
 * Schedule a save after the configured delay.
 */
export function scheduleSave(): void {
  if (!_storeRef) return
  const now = Date.now()
  const state = _storeRef.getState()
  const documentId = state.currentDocId
  if (!documentId) {
    if (state.persistenceMode !== 'memory-only') {
      _storeRef.setState({ saveStatus: 'idle', saveError: null })
    }
    return
  }
  const lastSaveTime = _lastSaveTimes.get(documentId) ?? 0
  const minimumIntervalRemaining = Math.max(0, 500 - (now - lastSaveTime))
  const delay = Math.max(SAVE_DELAY, minimumIntervalRemaining)
  clearSaveTimer()
  if (state.persistenceMode !== 'memory-only') {
    _storeRef.setState({ saveStatus: 'saving' })
  }
  _saveTimer = setTimeout(() => {
    void saveDocNow()
  }, delay)
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
  if (isDocumentDeleted(currentDocId)) return true
  // 使用 generation 计数器检测变化
  // 彻底解决中间元素修改无法被检测的数据丢失bug
  const generationAtStart = _saveGenerations.get(currentDocId) ?? 0
  if (_lastSavedGenerations.get(currentDocId) === generationAtStart) {
    markDocumentSaved(currentDocId)
    return true
  }
  const recoveryDocument = createRecoveryDocument(state)

  try {
    const now = Date.now()
    const updatedDoc = await getDocumentRepository().updateDocument(currentDocId, (existing) => {
      if (isDocumentDeleted(currentDocId)) return undefined
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
    if (isDocumentDeleted(currentDocId)) return true
    // 更新缓存
    _lastSavedGenerations.set(currentDocId, generationAtStart)
    _lastSaveTimes.set(currentDocId, now)
    clearRecoveryDraftForDocument(currentDocId, now)
    if (_activeTextRecoveryDraft?.documentId === currentDocId) {
      // Recreate the still-open textarea checkpoint after clearing older
      // recovery records. It may contain a final DOM character that has not
      // reached the live store yet.
      saveActiveTextRecoveryDraftNow(
        rebaseActiveTextRecoveryDraft(_storeRef.getState(), _activeTextRecoveryDraft)
      )
    }
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
    _storeRef.setState({ docs })
    if (isCurrentDocument) markDocumentSaved(currentDocId, now)

    if (
      (_saveGenerations.get(currentDocId) ?? 0) !== generationAtStart &&
      _storeRef.getState().currentDocId === currentDocId
    ) {
      scheduleSave()
    }
    return true
  } catch (error) {
    if (isDocumentDeleted(currentDocId)) return true
    console.error('[save] Failed to persist the current document', error)
    // Re-read the store after the failed async write. Typing or another
    // mutation may have advanced while IndexedDB was pending, so the snapshot
    // captured before the await can already be stale.
    const latestRecoveryDocument = createRecoveryDocument(_storeRef.getState())
    const recoverySaved =
      _activeTextRecoveryDraft?.documentId === currentDocId
        ? saveActiveTextRecoveryDraftNow(
            rebaseActiveTextRecoveryDraft(_storeRef.getState(), _activeTextRecoveryDraft)
          )
        : latestRecoveryDocument
          ? saveRecoveryDraft(latestRecoveryDocument)
          : recoveryDocument
            ? saveRecoveryDraft(recoveryDocument)
            : false
    if (_storeRef.getState().currentDocId === currentDocId) {
      const message = error instanceof Error ? error.message : '浏览器存储写入失败'
      _storeRef.setState({
        saveStatus: 'error',
        persistenceMode: 'memory-only',
        saveError: message,
      })
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
    if (
      (_saveGenerations.get(currentDocId) ?? 0) !== generationAtStart &&
      _storeRef.getState().currentDocId === currentDocId
    ) {
      scheduleSave()
    }
    return false
  }
}

/**
 * Serialize saves so an older, slower IndexedDB request cannot finish after a
 * newer request and overwrite its in-memory document list or save status.
 */
export interface SaveNowOptions {
  /** Persist even when the generation cache says the board is already saved. */
  force?: boolean
}

export function saveDocNow(options: SaveNowOptions = {}): Promise<boolean> {
  if (_saveInFlight) {
    const pending = _saveInFlight
    return pending.then((result) => {
      if (!result || !_storeRef) return result
      const currentDocId = _storeRef.getState().currentDocId
      if (options.force && currentDocId) {
        // An in-flight save may have completed before a conflicting write
        // (for example an import) became visible. Invalidate its cache after
        // waiting so the forced retry really writes the live workspace back.
        _lastSavedGenerations.delete(currentDocId)
      }
      if (
        !currentDocId ||
        (!options.force &&
          _lastSavedGenerations.get(currentDocId) === (_saveGenerations.get(currentDocId) ?? 0))
      ) {
        return result
      }
      return saveDocNow(options)
    })
  }

  if (options.force) {
    const currentDocId = _storeRef?.getState().currentDocId
    if (currentDocId) _lastSavedGenerations.delete(currentDocId)
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
  _workspaceGeneration = 0
  _deletedDocumentIds.clear()
  _docsIndexMap = null
  _activeTextRecoveryDraft = null
  clearSaveStatusTimer()
}
// Clean up on HMR
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearSaveTimer()
    clearSaveStatusTimer()
  })
}
