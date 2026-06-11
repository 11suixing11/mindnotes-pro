export interface UIState {
  sidebarOpen: boolean
  saveStatus: 'idle' | 'saving' | 'saved'
}

export interface UIActions {
  setSidebarOpen: (open: boolean) => void
  setSaveStatus: (s: 'idle' | 'saving' | 'saved') => void
}

export function createUISlice(set: any, _get: any): UIState & UIActions {
  return {
    // State
    sidebarOpen: true,
    saveStatus: 'idle',

    // Actions
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setSaveStatus: (s) => set({ saveStatus: s }),
  }
}
