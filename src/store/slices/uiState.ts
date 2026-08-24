export interface UIState {
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
}

export interface UIActions {
  setSaveStatus: (s: UIState['saveStatus']) => void
}

export function createUISlice(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _get: any
): UIState & UIActions {
  return {
    saveStatus: 'idle',
    setSaveStatus: (s) => set({ saveStatus: s }),
  }
}
