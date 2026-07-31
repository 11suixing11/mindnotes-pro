export interface UIState {
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  sidebarOpen: boolean
}

export interface UIActions {
  setSaveStatus: (s: UIState['saveStatus']) => void
  setSidebarOpen: (open: boolean) => void
}

export function shouldOpenSidebarByDefault(): boolean {
  return false
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
