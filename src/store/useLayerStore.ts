import { create } from 'zustand'

export interface Layer {
  id: string
  name: string
  type: 'strokes' | 'shapes' | 'text' | 'image'
  visible: boolean
  locked: boolean
  opacity: number
  order: number
}

interface LayerState {
  layers: Layer[]
  selectedLayerId: string | null
  showLayersPanel: boolean
}

interface LayerActions {
  addLayer: (layer: Layer) => void
  removeLayer: (id: string) => void
  updateLayer: (id: string, updates: Partial<Layer>) => void
  setSelectedLayer: (id: string | null) => void
  toggleLayersPanel: () => void
  toggleLayerLock: (id: string) => void
  toggleLayerHidden: (id: string) => void
  moveLayerUp: (id: string) => void
  moveLayerDown: (id: string) => void
  reorderLayers: (newOrder: string[]) => void
}

export const useLayerStore = create<LayerState & LayerActions>((set, _get) => ({
  layers: [],
  selectedLayerId: null,
  showLayersPanel: false,

  addLayer: (layer) =>
    set((state) => ({
      layers: [...state.layers, layer],
    })),

  removeLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter(l => l.id !== id),
      selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId,
    })),

  updateLayer: (id, updates) =>
    set((state) => ({
      layers: state.layers.map(l =>
        l.id === id ? { ...l, ...updates } : l
      ),
    })),

  setSelectedLayer: (id) => set({ selectedLayerId: id }),

  toggleLayersPanel: () =>
    set((state) => ({ showLayersPanel: !state.showLayersPanel })),

  toggleLayerLock: (id) =>
    set((state) => ({
      layers: state.layers.map(l =>
        l.id === id ? { ...l, locked: !l.locked } : l
      ),
    })),

  toggleLayerHidden: (id) =>
    set((state) => ({
      layers: state.layers.map(l =>
        l.id === id ? { ...l, visible: !l.visible } : l
      ),
    })),

  moveLayerUp: (id) =>
    set((state) => {
      const index = state.layers.findIndex(l => l.id === id)
      if (index === -1 || index === state.layers.length - 1) return state
      const layers = [...state.layers]
      ;[layers[index], layers[index + 1]] = [layers[index + 1], layers[index]]
      return { layers }
    }),

  moveLayerDown: (id) =>
    set((state) => {
      const index = state.layers.findIndex(l => l.id === id)
      if (index <= 0) return state
      const layers = [...state.layers]
      ;[layers[index], layers[index - 1]] = [layers[index - 1], layers[index]]
      return { layers }
    }),

  reorderLayers: (newOrder) =>
    set((state) => ({
      layers: newOrder
        .map(id => state.layers.find(l => l.id === id))
        .filter((l): l is Layer => !!l),
    })),
}))

export default useLayerStore
