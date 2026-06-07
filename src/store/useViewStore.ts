import { create } from 'zustand'

interface ViewState {
  viewBox: {
    x: number
    y: number
    zoom: number
  }
  isPanning: boolean
  lastPanPosition: { x: number; y: number } | null
}

interface ViewActions {
  setViewBox: (viewBox: ViewState['viewBox']) => void
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  startPan: (x: number, y: number) => void
  updatePan: (x: number, y: number) => void
  endPan: () => void
  zoomToFit: (bounds: { x: number; y: number; w: number; h: number } | null) => void
}

const DEFAULT_VIEWBOX = { x: 0, y: 0, zoom: 1 }

export const useViewStore = create<ViewState & ViewActions>((set, get) => ({
  viewBox: DEFAULT_VIEWBOX,
  isPanning: false,
  lastPanPosition: null,

  setViewBox: (viewBox) => set({ viewBox }),

  zoomIn: () =>
    set((state) => ({
      viewBox: { ...state.viewBox, zoom: Math.min(state.viewBox.zoom * 1.2, 5) },
    })),

  zoomOut: () =>
    set((state) => ({
      viewBox: { ...state.viewBox, zoom: Math.max(state.viewBox.zoom / 1.2, 0.2) },
    })),

  resetView: () => set({ viewBox: { ...DEFAULT_VIEWBOX }, isPanning: false, lastPanPosition: null }),

  startPan: (x, y) => set({ isPanning: true, lastPanPosition: { x, y } }),

  updatePan: (x, y) => {
    const { lastPanPosition, viewBox } = get()
    if (!lastPanPosition) return

    const dx = (x - lastPanPosition.x) / viewBox.zoom
    const dy = (y - lastPanPosition.y) / viewBox.zoom

    set({
      viewBox: { ...viewBox, x: viewBox.x - dx, y: viewBox.y - dy },
      lastPanPosition: { x, y },
    })
  },

  endPan: () => set({ isPanning: false, lastPanPosition: null }),

  zoomToFit: (bounds: { x: number; y: number; w: number; h: number } | null) => {
    if (!bounds) return
    const padding = 60
    const vw = window.innerWidth
    const vh = window.innerHeight
    const scaleX = (vw - padding * 2) / (bounds.w || 1)
    const scaleY = (vh - padding * 2) / (bounds.h || 1)
    const zoom = Math.min(scaleX, scaleY, 3)
    const x = bounds.x - (vw / zoom - bounds.w) / 2
    const y = bounds.y - (vh / zoom - bounds.h) / 2
    set({ viewBox: { x, y, zoom } })
  },
}))
