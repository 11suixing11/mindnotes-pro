import { incrementSaveGeneration, isHydrating, scheduleSave } from './saveManager'
import type { AppActions, AppState } from './appStore'

/**
 * Document-bearing state keys persisted by saveManager's persistCurrentDocument.
 * A reference change in any of these keys marks the document dirty and
 * schedules a debounced save, so slices never call the save manager directly.
 * Workspace hydration (load/switch/import) is exempt via begin/endHydration.
 */
const DOCUMENT_STATE_KEYS = [
  'elements',
  'layers',
  'activeLayerId',
  'bgColor',
  'backgroundStyle',
  'backgroundImage',
  'undoStack',
  'redoStack',
] as const

interface AutoSaveSchedulerStore {
  subscribe: (
    listener: (state: AppState & AppActions, prevState: AppState & AppActions) => void
  ) => () => void
}

/** Install the centralized document save scheduling subscription. */
export function installAutoSaveScheduler(store: AutoSaveSchedulerStore): () => void {
  return store.subscribe((state, prevState) => {
    if (isHydrating()) return
    for (const key of DOCUMENT_STATE_KEYS) {
      if (state[key] !== prevState[key]) {
        incrementSaveGeneration()
        scheduleSave()
        return
      }
    }
  })
}
