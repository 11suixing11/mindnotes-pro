export interface UIState {
  saveStatus: 'idle' | 'saving' | 'saved'
  sidebarOpen: boolean
}

export interface UIActions {
  setSaveStatus: (s: 'idle' | 'saving' | 'saved') => void
  setSidebarOpen: (open: boolean) => void
}

export function shouldOpenSidebarByDefault(): boolean {
  if (typeof window === 'undefined') return true
  return window.innerWidth >= 768
}

export function createUISlice(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _get: any
): UIState & UIActions {
  return {
    saveStatus: 'idle',
    sidebarOpen: shouldOpenSidebarByDefault(),
    setSaveStatus: (s) => set({ saveStatus: s }),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
  }
}
