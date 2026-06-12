export interface UIState {
  saveStatus: 'idle' | 'saving' | 'saved'
}

export interface UIActions {
  setSaveStatus: (s: 'idle' | 'saving' | 'saved') => void
}

export function createUISlice(set: any, _get: any): UIState & UIActions {
  return {
    saveStatus: 'idle',
    setSaveStatus: (s) => set({ saveStatus: s }),
  }
}
