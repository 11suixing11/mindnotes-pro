import type { CanvasElement, CanvasLayer } from '../types'
import { createCanvasLayer, isLayerWritable } from '../layers'
import { incrementSaveGeneration, scheduleSave } from '../saveManager'
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

    incrementSaveGeneration()
    set({ elements: plan.elements, selectedIds: plan.selectedIds })
    replaceElementCollection(plan.elements, get())
    scheduleSave()
  }

  return {
    createLayer: (name) => {
      const state = get()
      const order =
        state.layers.length === 0
          ? 0
          : Math.max(...state.layers.map((layer: CanvasLayer) => layer.order)) + 1
      const layer = createCanvasLayer(name ?? `图层 ${order + 1}`, order)
      incrementSaveGeneration()
      set({
        layers: [...state.layers, layer],
        activeLayerId: layer.id,
      })
      scheduleSave()
      return layer.id
    },

    renameLayer: (id, name) => {
      const nextName = name.trim()
      if (!nextName) return
      const state = get()
      const layer = state.layers.find((item: CanvasLayer) => item.id === id)
      if (!layer || layer.name === nextName) return
      incrementSaveGeneration()
      set({
        layers: state.layers.map((item: CanvasLayer) =>
          item.id === id ? { ...item, name: nextName, updatedAt: Date.now() } : item
        ),
      })
      scheduleSave()
    },

    deleteLayer: (id) => {
      const state = get()
      const plan = createLayerDeletionPlan(state, id)
      if (!plan) return

      incrementSaveGeneration()
      set({
        layers: plan.layers,
        activeLayerId: plan.activeLayerId,
        elements: plan.elements,
        selectedIds: plan.selectedIds,
      })
      replaceElementCollection(plan.elements, get())
      scheduleSave()
    },

    setActiveLayer: (id) => {
      const state = get()
      if (!isLayerWritable(state.layers, id) || state.activeLayerId === id) return
      // The active layer is part of the persisted workspace metadata. Treat
      // switching it as a document mutation so a refresh does not silently
      // revert the user's next drawing target.
      incrementSaveGeneration()
      set({ activeLayerId: id })
      scheduleSave()
    },

    setLayerVisibility: (id, visible) => {
      const state = get()
      const plan = createLayerVisibilityPlan(state, id, visible, Date.now())
      if (!plan) return

      incrementSaveGeneration()
      set({
        layers: plan.layers,
        activeLayerId: plan.activeLayerId,
        selectedIds: plan.selectedIds,
      })
      scheduleSave()
    },

    setLayerLocked: (id, locked) => {
      const state = get()
      const plan = createLayerLockPlan(state, id, locked, Date.now())
      if (!plan) return

      incrementSaveGeneration()
      set({
        layers: plan.layers,
        activeLayerId: plan.activeLayerId,
        selectedIds: plan.selectedIds,
      })
      scheduleSave()
    },

    moveLayer: (id, direction) => {
      const state = get()
      const plan = createLayerReorderPlan(state.layers, id, direction, Date.now())
      if (!plan) return

      incrementSaveGeneration()
      set({ layers: plan })
      scheduleSave()
    },

    moveElementsToLayer,

    moveSelectedToLayer: (layerId) => {
      moveElementsToLayer(get().selectedIds, layerId)
    },
  }
}
