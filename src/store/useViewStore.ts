import { create } from 'zustand'
import type { CanvasState } from './types'

const DEFAULT_VIEWBOX = { x: 0, y: 0, zoom: 1 }

interface ViewActions {
  setViewBox: (viewBox: CanvasState['viewBox']) => void
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  startPan: (x: number, y: number) => void
  updatePan: (x: number, y: number) => void
  endPan: () => void
}

export const useViewStore = create<CanvasState & ViewActions>((set, get) => ({
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

  resetView: () => set({ viewBox: DEFAULT_VIEWBOX }),

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
}))
