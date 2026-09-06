import { worldToClient, zoomViewBoxAtScreenPoint } from '../../canvas/coordinates'
import type { ViewBox } from '../../core/viewport'
import type { CanvasElement, TextElement, ToolType } from '../../store/types'
import { isInteractiveShortcutTarget } from '../../keyboard/shortcuts'
import type { CanvasAuxiliaryEventHandlers } from './pointerEvents'

interface MutableValue<T> {
  current: T
}

interface Point {
  x: number
  y: number
}

interface Bounds extends Point {
  w: number
  h: number
}

export interface RightClickPanState {
  enabled: boolean
  isPanning: boolean
  startScreenX: number
  startScreenY: number
  moved: boolean
}

export interface SpacePanState {
  enabled: boolean
  isActive: boolean
  originalTool: ToolType | null
  wasPanning: boolean
}

interface CanvasAuxiliaryInputOptions {
  canvas: HTMLCanvasElement
  rightClickPanRef: MutableValue<RightClickPanState>
  spacePanRef: MutableValue<SpacePanState>
  getTool: () => ToolType
  setTool: (tool: ToolType) => void
  getElement: (id: string) => CanvasElement | undefined
  getViewBox: () => ViewBox
  setViewBox: (viewBox: ViewBox) => void
  getIsPanning: () => boolean
  endPan: () => void
  getEditCanvasRect: () => DOMRect | null
  getPosition: (event: MouseEvent) => Point | null
  hitTest: (x: number, y: number) => string | null
  getBounds: (element: CanvasElement) => Bounds
  startEditText: (
    x: number,
    y: number,
    screenX: number,
    screenY: number,
    color: string,
    existing?: TextElement
  ) => void
  focusTextEditor: () => void
  scheduleFocusTextEditor?: () => void
  scheduleRedraw: () => void
}

/** Build non-pointer canvas interactions without owning their listener lifecycle. */
export function createCanvasAuxiliaryInputHandlers(
  options: CanvasAuxiliaryInputOptions
): Omit<CanvasAuxiliaryEventHandlers, 'onCancel'> {
  const {
    canvas,
    rightClickPanRef,
    spacePanRef,
    getTool,
    setTool,
    getElement,
    getViewBox,
    setViewBox,
    getIsPanning,
    endPan,
    getEditCanvasRect,
    getPosition,
    hitTest,
    getBounds,
    startEditText,
    focusTextEditor,
    scheduleFocusTextEditor,
    scheduleRedraw,
  } = options

  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    const rect = canvas.getBoundingClientRect()
    const screenPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
    const viewBox = getViewBox()
    const zoomFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1
    const nextZoom = Math.max(0.2, Math.min(5, viewBox.zoom * zoomFactor))
    setViewBox(zoomViewBoxAtScreenPoint(viewBox, screenPoint, nextZoom))
    scheduleRedraw()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const state = spacePanRef.current
    if (
      event.code !== 'Space' ||
      event.repeat ||
      !state.enabled ||
      isInteractiveShortcutTarget(event.target)
    ) {
      return
    }

    event.preventDefault()
    if (state.isActive) return

    state.originalTool = getTool()
    state.isActive = true
    state.wasPanning = false
    setTool('pan')
    scheduleRedraw()
  }

  const onKeyUp = (event: KeyboardEvent) => {
    const state = spacePanRef.current
    if (event.code !== 'Space' || !state.enabled || !state.isActive) return

    if (state.wasPanning || getIsPanning()) endPan()
    if (state.originalTool) setTool(state.originalTool)

    state.isActive = false
    state.originalTool = null
    state.wasPanning = false
    scheduleRedraw()
  }

  const onContextMenu = (event: MouseEvent) => {
    const state = rightClickPanRef.current
    if (!state.enabled || event.button !== 2) return
    // 右键菜单一律由右键抬起路径决策：拖拽平移后不弹菜单，纯点击在
    // handleEnd 中以编程方式打开。部分平台（如 Linux）的 contextmenu 在
    // 按下时机触发，此时拖拽距离尚未产生，无法在这里区分点击与拖拽。
    event.preventDefault()
  }

  const focusAfterStartingEdit = () => {
    if (scheduleFocusTextEditor) scheduleFocusTextEditor()
    else setTimeout(focusTextEditor, 50)
  }

  const onDoubleClick = (event: MouseEvent) => {
    if (getTool() !== 'select') return

    const position = getPosition(event)
    if (!position) return
    const hitId = hitTest(position.x, position.y)
    if (!hitId) return
    const element = getElement(hitId)
    if (!element) return

    const rect = getEditCanvasRect()
    if (!rect) return
    const viewBox = getViewBox()

    if (element.type === 'text') {
      const screen = worldToClient({ x: element.x, y: element.y }, rect, viewBox)
      startEditText(element.x, element.y, screen.x, screen.y, element.color, element)
      focusAfterStartingEdit()
    } else if (element.type === 'shape') {
      const bounds = getBounds(element)
      const textPosition = {
        x: bounds.x + bounds.w / 2,
        y: bounds.y + bounds.h / 2,
      }
      const screen = worldToClient(textPosition, rect, viewBox)
      startEditText(textPosition.x, textPosition.y, screen.x, screen.y, element.color)
      focusAfterStartingEdit()
    }
  }

  return { onWheel, onKeyDown, onKeyUp, onContextMenu, onDoubleClick }
}
