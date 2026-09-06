import { afterEach, describe, expect, it, vi } from 'vitest'
import { zoomViewBoxAtScreenPoint } from '../../canvas/coordinates'
import type { CanvasElement, ShapeElement, TextElement, ToolType } from '../../store/types'
import {
  createCanvasAuxiliaryInputHandlers,
  type RightClickPanState,
  type SpacePanState,
} from './canvasAuxiliaryInput'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function createHarness(
  overrides: {
    tool?: ToolType
    element?: CanvasElement
    position?: { x: number; y: number } | null
    bounds?: { x: number; y: number; w: number; h: number }
    viewBox?: { x: number; y: number; zoom: number }
  } = {}
) {
  const canvas = document.createElement('canvas')
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    x: 10,
    y: 20,
    left: 10,
    top: 20,
    right: 810,
    bottom: 620,
    width: 800,
    height: 600,
    toJSON: () => ({}),
  })
  let tool = overrides.tool ?? 'pen'
  const viewBox = overrides.viewBox ?? { x: 0, y: 0, zoom: 1 }
  const rightClickPanRef: { current: RightClickPanState } = {
    current: {
      enabled: true,
      isPanning: false,
      startScreenX: 0,
      startScreenY: 0,
      moved: false,
    },
  }
  const spacePanRef: { current: SpacePanState } = {
    current: {
      enabled: true,
      isActive: false,
      originalTool: null,
      wasPanning: false,
    },
  }
  const setTool = vi.fn((nextTool: ToolType) => {
    tool = nextTool
  })
  const setViewBox = vi.fn()
  const endPan = vi.fn()
  const startEditText = vi.fn()
  const focusTextEditor = vi.fn()
  const scheduleRedraw = vi.fn()
  const handlers = createCanvasAuxiliaryInputHandlers({
    canvas,
    rightClickPanRef,
    spacePanRef,
    getTool: () => tool,
    setTool,
    getElement: () => overrides.element,
    getViewBox: () => viewBox,
    setViewBox,
    getIsPanning: () => false,
    endPan,
    getEditCanvasRect: () => canvas.getBoundingClientRect(),
    getPosition: () => overrides.position ?? { x: 25, y: 35 },
    hitTest: () => overrides.element?.id ?? null,
    getBounds: () => overrides.bounds ?? { x: 20, y: 30, w: 80, h: 40 },
    startEditText,
    focusTextEditor,
    scheduleRedraw,
  })

  return {
    handlers,
    rightClickPanRef,
    spacePanRef,
    setTool,
    setViewBox,
    endPan,
    startEditText,
    focusTextEditor,
    scheduleRedraw,
  }
}

describe('createCanvasAuxiliaryInputHandlers', () => {
  it('zooms around the wheel position and requests a redraw', () => {
    const viewBox = { x: 40, y: 60, zoom: 1 }
    const { handlers, setViewBox, scheduleRedraw } = createHarness({ viewBox })
    const event = new WheelEvent('wheel', {
      clientX: 110,
      clientY: 220,
      deltaY: -1,
      cancelable: true,
    })

    handlers.onWheel(event)

    expect(event.defaultPrevented).toBe(true)
    expect(setViewBox).toHaveBeenCalledWith(
      zoomViewBoxAtScreenPoint(viewBox, { x: 100, y: 200 }, 1.1)
    )
    expect(scheduleRedraw).toHaveBeenCalledTimes(1)
  })

  it('temporarily switches to pan while Space is held and restores the original tool', () => {
    const { handlers, spacePanRef, setTool, endPan, scheduleRedraw } = createHarness({
      tool: 'rectangle',
    })
    const keyDown = new KeyboardEvent('keydown', {
      code: 'Space',
      cancelable: true,
    })

    handlers.onKeyDown(keyDown)
    spacePanRef.current.wasPanning = true
    handlers.onKeyDown(new KeyboardEvent('keydown', { code: 'Space', repeat: true }))
    handlers.onKeyUp(new KeyboardEvent('keyup', { code: 'Space' }))

    expect(keyDown.defaultPrevented).toBe(true)
    expect(setTool.mock.calls).toEqual([['pan'], ['rectangle']])
    expect(endPan).toHaveBeenCalledTimes(1)
    expect(spacePanRef.current).toMatchObject({
      isActive: false,
      originalTool: null,
      wasPanning: false,
    })
    expect(scheduleRedraw).toHaveBeenCalledTimes(2)
  })

  it('leaves Space available to focused text controls and buttons', () => {
    const { handlers, spacePanRef, setTool, scheduleRedraw } = createHarness({
      tool: 'rectangle',
    })
    const textarea = document.createElement('textarea')
    const keyDown = new KeyboardEvent('keydown', {
      key: ' ',
      code: 'Space',
      isComposing: true,
      cancelable: true,
    })
    Object.defineProperty(keyDown, 'target', { value: textarea })

    handlers.onKeyDown(keyDown)

    expect(keyDown.defaultPrevented).toBe(false)
    expect(spacePanRef.current.isActive).toBe(false)
    expect(setTool).not.toHaveBeenCalled()
    expect(scheduleRedraw).not.toHaveBeenCalled()

    const button = document.createElement('button')
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    button.append(icon)
    const buttonKeyDown = new KeyboardEvent('keydown', {
      key: ' ',
      code: 'Space',
      cancelable: true,
    })
    Object.defineProperty(buttonKeyDown, 'target', { value: icon })

    handlers.onKeyDown(buttonKeyDown)

    expect(buttonKeyDown.defaultPrevented).toBe(false)
    expect(spacePanRef.current.isActive).toBe(false)
    expect(setTool).not.toHaveBeenCalled()
  })

  it('ignores Space keyup when no canvas Space pan session was started', () => {
    const { handlers, setTool, endPan, scheduleRedraw } = createHarness({ tool: 'circle' })

    handlers.onKeyUp(new KeyboardEvent('keyup', { key: ' ', code: 'Space' }))

    expect(setTool).not.toHaveBeenCalled()
    expect(endPan).not.toHaveBeenCalled()
    expect(scheduleRedraw).not.toHaveBeenCalled()
  })

  it('suppresses every right-button context menu and leaves keyboard menus alone', () => {
    const { handlers, rightClickPanRef } = createHarness()
    const rightButtonEvent = new MouseEvent('contextmenu', {
      button: 2,
      cancelable: true,
    })
    handlers.onContextMenu(rightButtonEvent)

    rightClickPanRef.current.enabled = false
    const disabledEvent = new MouseEvent('contextmenu', {
      button: 2,
      cancelable: true,
    })
    handlers.onContextMenu(disabledEvent)

    const keyboardEvent = new MouseEvent('contextmenu', { cancelable: true })
    handlers.onContextMenu(keyboardEvent)

    expect(rightButtonEvent.defaultPrevented).toBe(true)
    expect(disabledEvent.defaultPrevented).toBe(false)
    expect(keyboardEvent.defaultPrevented).toBe(false)
  })

  it('opens an existing text element at its client position', () => {
    vi.useFakeTimers()
    const element: TextElement = {
      type: 'text',
      id: 'text-1',
      x: 30,
      y: 40,
      width: 100,
      height: 30,
      content: 'Note',
      color: '#123456',
      fontSize: 16,
    }
    const { handlers, startEditText, focusTextEditor } = createHarness({
      tool: 'select',
      element,
      viewBox: { x: 10, y: 20, zoom: 2 },
    })

    handlers.onDoubleClick(new MouseEvent('dblclick'))
    vi.advanceTimersByTime(50)

    expect(startEditText).toHaveBeenCalledWith(30, 40, 50, 60, '#123456', element)
    expect(focusTextEditor).toHaveBeenCalledTimes(1)
  })

  it('starts centered text editing when a shape is double-clicked', () => {
    vi.useFakeTimers()
    const element: ShapeElement = {
      type: 'shape',
      id: 'shape-1',
      kind: 'rectangle',
      x: 20,
      y: 30,
      w: 80,
      h: 40,
      color: '#654321',
      size: 2,
    }
    const { handlers, startEditText, focusTextEditor } = createHarness({
      tool: 'select',
      element,
      bounds: { x: 20, y: 30, w: 80, h: 40 },
      viewBox: { x: 10, y: 20, zoom: 2 },
    })

    handlers.onDoubleClick(new MouseEvent('dblclick'))
    vi.advanceTimersByTime(50)

    expect(startEditText).toHaveBeenCalledWith(60, 50, 110, 80, '#654321')
    expect(focusTextEditor).toHaveBeenCalledTimes(1)
  })
})
