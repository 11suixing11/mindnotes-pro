import { getContentBounds } from '../../canvas/canvasUtils'
import type { ShortcutActionId } from '../../keyboard/shortcuts'
import { useAppStore } from '../../store/appStore'
import type { ToolType } from '../../store/types'
import { useViewStore } from '../../store/useViewStore'
import {
  pasteClipboardImageOrCanvasSelection,
  pastePlainTextAtViewportCenter,
} from './keyboardPaste'
import { useToastStore } from '../../store/toastStore'
import type { StyleCommandResult } from '../../store/slices/toolSettings'

interface MutableValue<T> {
  current: T
}

type ClearConfirmation = (elementCount: number, clearAll: () => boolean) => Promise<boolean>

export interface KeyboardBindingOptions {
  copySelectedToSystemClipboard?: () => void
  hoveredElementIdRef?: MutableValue<string | null>
  requestClearCanvas?: ClearConfirmation
}

export const TOOL_BY_ACTION: Partial<Record<ShortcutActionId, ToolType>> = {
  'tool.select': 'select',
  'tool.pen': 'pen',
  'tool.eraser': 'eraser',
  'tool.pan': 'pan',
  'tool.text': 'text',
  'tool.rectangle': 'rectangle',
  'tool.circle': 'circle',
  'tool.line': 'line',
  'tool.arrow': 'arrow',
}

export const SHIFT_COLOR_PALETTE = [
  '#1A1A1A',
  '#4A4A4A',
  '#7A7A7A',
  '#A0A0A0',
  '#D0D0D0',
  '#E03131',
  '#F59F00',
  '#2B8A3E',
  '#1971C2',
  '#7950F2',
]

export const ALT_COLOR_PRESETS = [
  '#3A2E22',
  '#C07856',
  '#B8A0D0',
  '#D49898',
  '#90B888',
  '#90B4D0',
  '#D0B888',
  '#A8CCE0',
]

function notifyBlockedStyleCommand(result: StyleCommandResult) {
  if (result.status !== 'blocked') return
  if (result.reason === 'locked-selection') {
    useToastStore.getState().show('所选内容包含锁定对象，未修改任何样式', 'warning')
  } else if (result.reason === 'incompatible') {
    useToastStore.getState().show('所选内容没有可共同修改的颜色', 'warning')
  }
}

export function handleQuickColorShortcut(event: KeyboardEvent): boolean {
  const store = useAppStore.getState()

  if (
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    event.shiftKey &&
    /^[0-9]$/.test(event.key)
  ) {
    event.preventDefault()
    const index = event.key === '0' ? 9 : parseInt(event.key, 10) - 1
    const targetColor = SHIFT_COLOR_PALETTE[index]
    if (targetColor) notifyBlockedStyleCommand(store.applyStyle({ color: targetColor }))
    return true
  }

  const colorIndex = parseInt(event.key, 10) - 1
  if (event.altKey && colorIndex >= 0 && colorIndex < ALT_COLOR_PRESETS.length) {
    event.preventDefault()
    notifyBlockedStyleCommand(store.applyStyle({ color: ALT_COLOR_PRESETS[colorIndex] }))
    return true
  }

  return false
}

export function handleKeyboardNudge(event: KeyboardEvent): boolean {
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return false

  const store = useAppStore.getState()
  if (store.selectedIds.length === 0) return false

  event.preventDefault()
  let step = 1
  if (event.ctrlKey || event.metaKey) step = 10
  else if (event.shiftKey) step = 50

  const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
  const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
  store.moveElementsById(store.selectedIds, dx, dy)
  return true
}

export function handleEscapeShortcut(event: KeyboardEvent): boolean {
  if (event.key !== 'Escape') return false

  const store = useAppStore.getState()
  if (!store.styleEyedropperActive) return false

  event.preventDefault()
  store.toggleStyleEyedropper()
  return true
}

export function executeShortcutAction(
  action: ShortcutActionId,
  event: KeyboardEvent,
  optionsRef: MutableValue<KeyboardBindingOptions>
): boolean {
  const store = useAppStore.getState()
  const viewStore = useViewStore.getState()
  const targetTool = TOOL_BY_ACTION[action]

  if (targetTool) {
    event.preventDefault()
    store.setTool(targetTool)
    return true
  }

  switch (action) {
    case 'edit.undo':
      event.preventDefault()
      store.undo()
      return true
    case 'edit.redo':
      event.preventDefault()
      store.redo()
      return true
    case 'edit.copy':
      event.preventDefault()
      store.copySelected()
      optionsRef.current.copySelectedToSystemClipboard?.()
      return true
    case 'edit.pastePlainText': {
      event.preventDefault()
      const toast = useToastStore.getState().show
      const readText = navigator.clipboard?.readText?.bind(navigator.clipboard)
      if (!readText) {
        toast('浏览器不支持读取系统剪贴板', 'warning')
        return true
      }
      readText()
        .then(pastePlainTextAtViewportCenter)
        .catch(() => {
          toast('无法读取系统剪贴板，请检查浏览器权限', 'error')
        })
      return true
    }
    case 'edit.paste':
      event.preventDefault()
      void pasteClipboardImageOrCanvasSelection()
      return true
    case 'edit.selectAll':
      event.preventDefault()
      store.setSelectedIds(store.elements.map((element) => element.id))
      return true
    case 'edit.delete':
      event.preventDefault()
      if (store.selectedIds.length > 0) {
        const selectedIds = new Set(store.selectedIds)
        const isWholeCanvasSelection =
          selectedIds.size === store.elements.length &&
          store.elements.every((element) => selectedIds.has(element.id))
        if (isWholeCanvasSelection && optionsRef.current.requestClearCanvas) {
          void optionsRef.current.requestClearCanvas(store.elements.length, store.clearAll)
        } else {
          store.removeElements(store.selectedIds)
        }
      }
      return true
    case 'edit.duplicate':
      event.preventDefault()
      store.duplicateSelected()
      return true
    case 'arrange.group':
      event.preventDefault()
      store.groupSelected()
      return true
    case 'arrange.ungroup':
      event.preventDefault()
      store.ungroupSelected()
      return true
    case 'arrange.lock':
      event.preventDefault()
      store.lockSelected()
      return true
    case 'arrange.unlock':
      event.preventDefault()
      store.unlockSelected()
      return true
    case 'view.zoomIn':
      event.preventDefault()
      viewStore.zoomIn()
      return true
    case 'view.zoomOut':
      event.preventDefault()
      viewStore.zoomOut()
      return true
    case 'view.reset':
      event.preventDefault()
      viewStore.resetView()
      return true
    case 'view.zoomToSelection':
      event.preventDefault()
      viewStore.zoomToSelection(
        getContentBounds(
          store.selectedIds
            .map((id) => store.idToElement.get(id))
            .filter((element): element is NonNullable<typeof element> => element !== undefined)
        )
      )
      return true
    case 'view.toggleGrid':
      event.preventDefault()
      viewStore.toggleGrid()
      return true
    case 'view.toggleGridSnap':
      event.preventDefault()
      viewStore.toggleSnapToGrid()
      return true
    case 'style.eyedropper': {
      event.preventDefault()
      const hoveredElementId = optionsRef.current.hoveredElementIdRef?.current
      if (hoveredElementId && store.idToElement.get(hoveredElementId)) {
        notifyBlockedStyleCommand(store.applyStyleFromElement(hoveredElementId))
      } else {
        store.toggleStyleEyedropper()
      }
      return true
    }
    case 'style.cycleGeometry':
      event.preventDefault()
      store.cycleGeometryTool()
      return true
    case 'help.shortcuts':
      return false
  }

  return false
}
