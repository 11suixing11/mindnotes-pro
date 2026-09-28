import type { CanvasElement, CanvasLayer } from '../types'
import { createCanvasLayer, isLayerWritable } from '../layers'
import {
  createLayerDeletionPlan,
  createLayerLockPlan,
  createLayerReorderPlan,
  createLayerVisibilityPlan,
  createMoveElementsToLayerPlan,
} from './canvasElementLayers'

export interface CanvasElementLayerActions {
  createLayer: (name?: string) => string
  renameLayer: (id: string, name: string) => void
  deleteLayer: (id: string) => void
  setActiveLayer: (id: string) => void
  setLayerVisibility: (id: string, visible: boolean) => void
  setLayerLocked: (id: string, locked: boolean) => void
  moveLayer: (id: string, direction: 'up' | 'down') => void
  moveElementsToLayer: (ids: string[], layerId: string) => void
  moveSelectedToLayer: (layerId: string) => void
}

interface CanvasElementLayerActionContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: any
  replaceElementCollection: (elements: CanvasElement[], state?: unknown) => void
}

/** Store coordination for layer actions; pure transforms remain in canvasElementLayers. */
export function createCanvasElementLayerActions(
  context: CanvasElementLayerActionContext
): CanvasElementLayerActions {
  const { set, get, replaceElementCollection } = context

  const moveElementsToLayer = (ids: string[], layerId: string) => {
    const state = get()
    const plan = createMoveElementsToLayerPlan(state, ids, layerId)
    if (!plan) return

    set({ elements: plan.elements, selectedIds: plan.selectedIds })
    replaceElementCollection(plan.elements, get())
  }

  return {
    createLayer: (name) => {
      const state = get()
      const order =
        state.layers.length === 0
          ? 0
          : Math.max(...state.layers.map((layer: CanvasLayer) => layer.order)) + 1
      const layer = createCanvasLayer(name ?? `图层 ${order + 1}`, order)
      set({
        layers: [...state.layers, layer],
        activeLayerId: layer.id,
      })
      return layer.id
    },

    renameLayer: (id, name) => {
      const nextName = name.trim()
      if (!nextName) return
      const state = get()
      const layer = state.layers.find((item: CanvasLayer) => item.id === id)
      if (!layer || layer.name === nextName) return
      set({
        layers: state.layers.map((item: CanvasLayer) =>
          item.id === id ? { ...item, name: nextName, updatedAt: Date.now() } : item
        ),
      })
    },

    deleteLayer: (id) => {
      const state = get()
      const plan = createLayerDeletionPlan(state, id)
      if (!plan) return

      set({
        layers: plan.layers,
        activeLayerId: plan.activeLayerId,
        elements: plan.elements,
        selectedIds: plan.selectedIds,
      })
      replaceElementCollection(plan.elements, get())
    },

    setActiveLayer: (id) => {
      const state = get()
      if (!isLayerWritable(state.layers, id) || state.activeLayerId === id) return
      // The active layer is part of the persisted workspace metadata. The
      // centralized save subscription treats the switch as a document
      // mutation so a refresh does not revert the user's next drawing target.
      set({ activeLayerId: id })
    },

    setLayerVisibility: (id, visible) => {
      const state = get()
      const plan = createLayerVisibilityPlan(state, id, visible, Date.now())
      if (!plan) return

      set({
        layers: plan.layers,
        activeLayerId: plan.activeLayerId,
        selectedIds: plan.selectedIds,
      })
    },

    setLayerLocked: (id, locked) => {
      const state = get()
      const plan = createLayerLockPlan(state, id, locked, Date.now())
      if (!plan) return

      set({
        layers: plan.layers,
        activeLayerId: plan.activeLayerId,
        selectedIds: plan.selectedIds,
      })
    },

    moveLayer: (id, direction) => {
      const state = get()
      const plan = createLayerReorderPlan(state.layers, id, direction, Date.now())
      if (!plan) return

      set({ layers: plan })
    },

    moveElementsToLayer,

    moveSelectedToLayer: (layerId) => {
      moveElementsToLayer(get().selectedIds, layerId)
    },
  }
}
