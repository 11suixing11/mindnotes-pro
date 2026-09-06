export type PersistenceMode = 'persistent' | 'memory-only'

export interface UIState {
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  persistenceMode: PersistenceMode
  lastSavedAt: number | null
  saveError: string | null
  activeTextEditingId: string | null
}

export interface UIActions {
  setSaveStatus: (s: UIState['saveStatus']) => void
  setPersistenceState: (state: Partial<Omit<UIState, 'saveStatus'>>) => void
  setActiveTextEditingId: (id: string | null) => void
}

export function createUISlice(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _get: any
): UIState & UIActions {
  return {
    saveStatus: 'idle',
    persistenceMode: 'persistent',
    lastSavedAt: null,
    saveError: null,
    activeTextEditingId: null,
    setSaveStatus: (s) => set({ saveStatus: s }),
    setPersistenceState: (state) => set(state),
    setActiveTextEditingId: (activeTextEditingId) => set({ activeTextEditingId }),
  }
}
