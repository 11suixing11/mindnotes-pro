import type { ToolSettingsState, ToolSettingsActions } from './slices/toolSettings'
import type { CanvasElementsState, CanvasElementsActions } from './slices/canvasElements'
import type { HistoryState, HistoryActions } from './slices/history'
import type { DocManagementState, DocManagementActions } from './slices/docManagement'
import type { FolderManagementState, FolderManagementActions } from './slices/folderManagement'
import type { UIState, UIActions } from './slices/uiState'

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

export type AppStore = AppState & AppActions
