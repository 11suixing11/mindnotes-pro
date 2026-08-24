import { create } from 'zustand'
import { createToolSettingsSlice } from './slices/toolSettings'
import type { ToolSettingsState, ToolSettingsActions } from './slices/toolSettings'
import { createCanvasElementsSlice } from './slices/canvasElements'
import type { CanvasElementsState, CanvasElementsActions } from './slices/canvasElements'
import { createHistorySlice } from './slices/history'
import type { HistoryState, HistoryActions } from './slices/history'
import { createDocManagementSlice } from './slices/docManagement'
import type { DocManagementState, DocManagementActions } from './slices/docManagement'
import { createUISlice } from './slices/uiState'
import type { UIState, UIActions } from './slices/uiState'
import { initSaveManager } from './saveManager'
import { bindThemeAppPort } from './useThemeStore'

// Re-export all slice types for consumers
export type {
  ToolSettingsState,
  ToolSettingsActions,
  CanvasElementsState,
  CanvasElementsActions,
  HistoryState,
  HistoryActions,
  DocManagementState,
  DocManagementActions,
  UIState,
  UIActions,
}

export type AppState = ToolSettingsState &
  CanvasElementsState &
  HistoryState &
  DocManagementState &
  UIState

export type AppActions = ToolSettingsActions &
  CanvasElementsActions &
  HistoryActions &
  DocManagementActions &
  UIActions

export const useAppStore = create<AppState & AppActions>((set, get) => {
  const storeApi = { getState: get, setState: set }
  initSaveManager(storeApi)
  bindThemeAppPort(() => {
    const state = get()
    return {
      color: state.color,
      elements: state.elements,
      bgColor: state.bgColor,
      setColor: state.setColor,
      setBgColor: state.setBgColor,
      commitElements: state.commitElements,
    }
  })

  return {
    ...createToolSettingsSlice(set, get),
    ...createCanvasElementsSlice(set, get),
    ...createHistorySlice(set, get),
    ...createDocManagementSlice(set, get),
    ...createUISlice(set, get),
  }
})
