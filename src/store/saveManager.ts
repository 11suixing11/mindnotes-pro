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
  const { currentDocId, elements, bgColor, undoStack, redoStack } = _storeRef.getState()
  if (!currentDocId) return

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

  const docs = (await storage.getAll<CanvasDoc>('docs')).sort((a, b) => b.updatedAt - a.updatedAt)
  _storeRef.setState({ docs, saveStatus: 'saved' })

  // Reset save status after 2 seconds
  setTimeout(() => {
    if (_storeRef?.getState().saveStatus === 'saved') {
      _storeRef.setState({ saveStatus: 'idle' })
    }
  }, 2000)
}

// Clean up on HMR
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearSaveTimer()
  })
}
