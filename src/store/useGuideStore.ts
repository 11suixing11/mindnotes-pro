import { create } from 'zustand'

interface GuideState {
  showGuides: boolean
  snapToGrid: boolean
  gridSize: number
  guideLines: Array<{ type: 'horizontal' | 'vertical'; position: number }> | null
}

interface GuideActions {
  setGuideLines: (guides: Array<{ type: 'horizontal' | 'vertical'; position: number }>) => void
  clearGuideLines: () => void
  toggleShowGuides: () => void
  toggleSnapToGrid: () => void
  setGridSize: (size: number) => void
}

export const useGuideStore = create<GuideState & GuideActions>((set) => ({
  showGuides: true,
  snapToGrid: false,
  gridSize: 20,
  guideLines: null,

  setGuideLines: (guides) => set({ guideLines: guides }),

  clearGuideLines: () => set({ guideLines: null }),

  toggleShowGuides: () =>
    set((state) => ({ showGuides: !state.showGuides })),

  toggleSnapToGrid: () =>
    set((state) => ({ snapToGrid: !state.snapToGrid })),

  setGridSize: (size) => set({ gridSize: size }),
}))

export default useGuideStore
