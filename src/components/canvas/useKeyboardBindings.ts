import { useEffect, useRef, type MutableRefObject } from 'react'
import { sanitizeSvgDataUrl } from '../../canvas/svgSanitizer'
import {
  findShortcutAction,
  isEditableShortcutTarget,
  type ShortcutActionId,
} from '../../keyboard/shortcuts'
import { useAppStore } from '../../store/appStore'
import type { ToolType } from '../../store/types'
import { useShortcutStore } from '../../store/useShortcutStore'
import { useViewStore } from '../../store/useViewStore'

interface Options {
  copySelectedToSystemClipboard?: () => void
  hoveredElementIdRef?: MutableRefObject<string | null>
}

const TOOL_BY_ACTION: Partial<Record<ShortcutActionId, ToolType>> = {
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

const SHIFT_COLOR_PALETTE = [
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

const ALT_COLOR_PRESETS = [
  '#3A2E22',
  '#C07856',
  '#B8A0D0',
  '#D49898',
  '#90B888',
  '#90B4D0',
  '#D0B888',
  '#A8CCE0',
]

function getViewportCenter(): { x: number; y: number } {
  const vb = useViewStore.getState().viewBox
  const vw = window.innerWidth
  const vh = window.innerHeight
  return {
    x: vb.x + vw / 2 / vb.zoom,
    y: vb.y + vh / 2 / vb.zoom,
  }
}

function pastePlainTextAtViewportCenter(text: string): void {
  if (!text || text.trim().length === 0) return

  const st = useAppStore.getState()
  const center = getViewportCenter()
  const fontSize = 16
  const avgCharWidth = fontSize * 0.6
  const lineHeight = fontSize * 1.4
  const lines = text.split('\n')
  const maxLineLength = Math.max(...lines.map((line) => line.length))
  const width = Math.max(100, Math.min(600, Math.round(maxLineLength * avgCharWidth)))
  const height = Math.round(lines.length * lineHeight + 16)

  st.addElement({
    type: 'text',
    id: `text-${Date.now()}`,
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
    content: text,
    fontSize,
    color: '#1a1a1a',
  })
}

function pasteImageAtViewportCenter(dataUrl: string): void {
  const safeDataUrl = sanitizeSvgDataUrl(dataUrl)
  const img = new Image()
  img.onload = () => {
    const st = useAppStore.getState()
    const center = getViewportCenter()
    const maxDim = 400
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
    const width = Math.round(img.width * scale)
    const height = Math.round(img.height * scale)
    st.addElement({
      type: 'image',
      id: `img-${Date.now()}`,
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height,
      dataUrl: safeDataUrl,
    })
  }
  img.src = safeDataUrl
}

async function pasteClipboardImageOrCanvasSelection(): Promise<void> {
  const st = useAppStore.getState()
  const clipRead = navigator.clipboard?.read?.bind(navigator.clipboard)
  if (!clipRead) {
    st.paste()
    return
  }

  try {
    const items = await clipRead()
    for (const item of items) {
      for (const type of item.types) {
        if (!type.startsWith('image/')) continue

        const blob = await item.getType(type)
        const reader = new FileReader()
        reader.onload = () => pasteImageAtViewportCenter(reader.result as string)
        reader.readAsDataURL(blob)
        return
      }
    }
    st.paste()
  } catch {
    st.paste()
  }
}

function handleQuickColorShortcut(e: KeyboardEvent): boolean {
  const st = useAppStore.getState()

  if (!e.ctrlKey && !e.metaKey && !e.altKey && e.shiftKey && /^[0-9]$/.test(e.key)) {
    e.preventDefault()
    const index = e.key === '0' ? 9 : parseInt(e.key, 10) - 1
    const targetColor = SHIFT_COLOR_PALETTE[index]
    if (targetColor) st.setColor(targetColor)
    return true
  }

  const colorIndex = parseInt(e.key, 10) - 1
  if (e.altKey && colorIndex >= 0 && colorIndex < ALT_COLOR_PRESETS.length) {
    e.preventDefault()
    st.setColor(ALT_COLOR_PRESETS[colorIndex])
    return true
  }

  return false
}

function handleKeyboardNudge(e: KeyboardEvent): boolean {
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return false

  const st = useAppStore.getState()
  if (st.selectedIds.length === 0) return false

  e.preventDefault()
  let step = 1
  if (e.ctrlKey || e.metaKey) step = 10
  else if (e.shiftKey) step = 50

  const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
  const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
  st.moveElementsById(st.selectedIds, dx, dy)
  return true
}

function executeShortcutAction(
  action: ShortcutActionId,
  e: KeyboardEvent,
  optionsRef: MutableRefObject<Options>
): boolean {
  const st = useAppStore.getState()
  const vs = useViewStore.getState()
  const targetTool = TOOL_BY_ACTION[action]

  if (targetTool) {
    e.preventDefault()
    st.setTool(targetTool)
    return true
  }

  switch (action) {
    case 'edit.undo':
      e.preventDefault()
      st.undo()
      return true
    case 'edit.redo':
      e.preventDefault()
      st.redo()
      return true
    case 'edit.copy':
      e.preventDefault()
      st.copySelected()
      optionsRef.current.copySelectedToSystemClipboard?.()
      return true
    case 'edit.pastePlainText': {
      e.preventDefault()
      const clipReadText = navigator.clipboard?.readText?.bind(navigator.clipboard)
      if (!clipReadText) return true
      clipReadText()
        .then(pastePlainTextAtViewportCenter)
        .catch(() => {
          // Clipboard access can be denied by the browser.
        })
      return true
    }
    case 'edit.paste':
      e.preventDefault()
      void pasteClipboardImageOrCanvasSelection()
      return true
    case 'edit.selectAll':
      e.preventDefault()
      st.setSelectedIds(st.elements.map((el) => el.id))
      return true
    case 'edit.delete':
      e.preventDefault()
      if (st.selectedIds.length > 0) st.removeElements(st.selectedIds)
      return true
    case 'edit.duplicate':
      e.preventDefault()
      st.duplicateSelected()
      return true
    case 'arrange.group':
      e.preventDefault()
      st.groupSelected()
      return true
    case 'arrange.ungroup':
      e.preventDefault()
      st.ungroupSelected()
      return true
    case 'arrange.lock':
      e.preventDefault()
      st.lockSelected()
      return true
    case 'arrange.unlock':
      e.preventDefault()
      st.unlockSelected()
      return true
    case 'view.zoomIn':
      e.preventDefault()
      vs.zoomIn()
      return true
    case 'view.zoomOut':
      e.preventDefault()
      vs.zoomOut()
      return true
    case 'view.reset':
      e.preventDefault()
      vs.resetView()
      return true
    case 'view.zoomToSelection':
      e.preventDefault()
      vs.zoomToSelection()
      return true
    case 'view.toggleGrid':
      e.preventDefault()
      vs.toggleGrid()
      return true
    case 'view.toggleGridSnap':
      e.preventDefault()
      vs.toggleSnapToGrid()
      return true
    case 'style.eyedropper': {
      e.preventDefault()
      const hoveredElementId = optionsRef.current.hoveredElementIdRef?.current
      if (hoveredElementId && st.idToElement.get(hoveredElementId)) {
        st.applyStyleFromElement(hoveredElementId)
      } else {
        st.toggleStyleEyedropper()
      }
      return true
    }
    case 'style.cycleGeometry':
      e.preventDefault()
      st.cycleGeometryTool()
      return true
    case 'help.shortcuts':
      return false
  }

  return false
}

export function useKeyboardBindings(options: Options = {}) {
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableShortcutTarget(e.target)) return

      const action = findShortcutAction(e, useShortcutStore.getState().bindings)
      if (action && executeShortcutAction(action, e, optionsRef)) return

      if (handleQuickColorShortcut(e)) return
      if (handleKeyboardNudge(e)) return
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
