import { create } from 'zustand'
import { createToolSettingsSlice } from './slices/toolSettings'
import type { ToolSettingsState, ToolSettingsActions } from './slices/toolSettings'
import { createCanvasElementsSlice } from './slices/canvasElements'
import type { CanvasElementsState, CanvasElementsActions } from './slices/canvasElements'
import { createHistorySlice } from './slices/history'
import type { HistoryState, HistoryActions } from './slices/history'
import { createDocManagementSlice } from './slices/docManagement'
import type { DocManagementState, DocManagementActions } from './slices/docManagement'
import { createFolderManagementSlice } from './slices/folderManagement'
import type { FolderManagementState, FolderManagementActions } from './slices/folderManagement'
import { createUISlice } from './slices/uiState'
import type { UIState, UIActions } from './slices/uiState'
import { initSaveManager } from './saveManager'

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
  FolderManagementState,
  FolderManagementActions,
  UIState,
  UIActions,
}

export type AppState = ToolSettingsState &
  CanvasElementsState &
  HistoryState &
  DocManagementState &
  FolderManagementState &
  UIState

export type AppActions = ToolSettingsActions &
  CanvasElementsActions &
  HistoryActions &
  DocManagementActions &
  FolderManagementActions &
  UIActions

export const useAppStore = create<AppState & AppActions>((set, get) => {
  const storeApi = { getState: get, setState: set }
  initSaveManager(storeApi)

  return {
    ...createToolSettingsSlice(set, get),
    ...createCanvasElementsSlice(set, get),
    ...createHistorySlice(set, get),
    ...createDocManagementSlice(set, get),
    ...createFolderManagementSlice(set, get),
    ...createUISlice(set, get),
  }
})
