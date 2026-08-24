import { useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import { useShallow } from 'zustand/react/shallow'
import { useThemeStore } from '../../store/useThemeStore'
import type { CanvasElement, TextElement } from '../../store/types'
import { isTransparentImagePixel } from '../../canvas/canvasUtils'
import { clientToWorld, snapPointIfEnabled } from '../../canvas/coordinates'
import { RIGHT_CLICK_PAN_THRESHOLD, distanceSquared } from '../../canvas/gestureGeometry'
import { findSelectionHandleAtPoint, findTopmostElementAtPoint } from '../../canvas/hitTesting'
import { copyElementsToSystemClipboard } from '../../canvas/systemClipboard'
import {
  getElementLayerId,
  getLayerOrderMap,
  getRenderableElements,
  isElementLayerEditable,
  isElementLayerVisible,
} from '../../store/layers'
import {
  changedTouchesInclude,
  findAcceptedTouch,
  getAcceptedTouches,
  getEventInputContact,
  isTouchEvent,
} from './touchInput'
import {
  createCanvasAuxiliaryInputHandlers,
  type RightClickPanState,
  type SpacePanState,
} from './canvasAuxiliaryInput'
import {
  bindCanvasAuxiliaryEvents,
  bindCanvasInputEvents,
  type CanvasInputHandlers,
} from './pointerEvents'
import { bindCanvasPinchZoom } from './touchGestures'
import { useDrawingPointerHandlers } from './useDrawingPointerHandlers'
import { useSelectPointerHandlers } from './useSelectPointerHandlers'

// 模块级常量，避免每次渲染重建
const CURSOR_MAP: Record<string, string> = {
  select: 'default',
  pen: 'crosshair',
  eraser: 'none',
  pan: 'grab',
  text: 'text',
  rectangle: 'crosshair',
  circle: 'crosshair',
  arrow: 'crosshair',
  line: 'crosshair',
}
// P5 样式吸管光标 - 使用 CSS 自定义光标
const EYEDROPPER_CURSOR = 'crosshair'

export function usePointerEngine(opts: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  cachedBounds: (el: CanvasElement) => { x: number; y: number; w: number; h: number }
  scheduleRedraw: () => void
  startEditText: (
    x: number,
    y: number,
    screenX: number,
    screenY: number,
    color: string,
    existing?: TextElement
  ) => void
  textRef: React.RefObject<HTMLTextAreaElement | null>
  findSnaps: (
    bounds: { x: number; y: number; w: number; h: number },
    exclude: Set<string>
  ) => { dx: number; dy: number; linesX: number[]; linesY: number[] }
  snapLinesRef: React.MutableRefObject<{ x: number[]; y: number[] }>
}) {
  const {
    canvasRef,
    cachedBounds,
    scheduleRedraw,
    startEditText,
    textRef,
    findSnaps,
    snapLinesRef,
  } = opts

  const { startPan, updatePan, endPan } = useViewStore(
    useShallow((s) => ({
      startPan: s.startPan,
      updatePan: s.updatePan,
      endPan: s.endPan,
    }))
  )

  // 移除独立 selector，改为在 handler 内用 getState() 读取
  // 避免任何 store 变化都触发整个 hook 重渲染

  const activeTouchIdRef = useRef<number | null>(null)
  const isPinchingRef = useRef(false)
  const cursorRef = useRef(CURSOR_MAP.pen)

  const snapPointIfGridEnabled = useCallback((point: { x: number; y: number }) => {
    const { snapToGrid, gridSize } = useViewStore.getState()
    return snapPointIfEnabled(point, snapToGrid, gridSize)
  }, [])

  const rightClickPanRef = useRef<RightClickPanState>({
    enabled: true,
    isPanning: false,
    startScreenX: 0,
    startScreenY: 0,
    moved: false,
  })
  // 按住 Space 键临时切换 Pan 工具
  // 遵循常见设计工具交互：按住 Space 临时平移，松开恢复原工具
  const spacePanRef = useRef<SpacePanState>({
    enabled: true,
    isActive: false,
    originalTool: null,
    wasPanning: false,
  })
  const mouseRef = useRef<{ x: number; y: number } | null>(null)
  // 悬停元素跟踪
  // 用于 Q 键快速复制样式：悬停在元素上按 Q 键直接复制样式，无需进入吸管模式
  const hoveredElementIdRef = useRef<string | null>(null)

  const getPosFromContact = useCallback(
    (contact: { clientX: number; clientY: number }) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      const vb = useViewStore.getState().viewBox
      return clientToWorld({ x: contact.clientX, y: contact.clientY }, rect, vb)
    },
    [canvasRef]
  )

  const getPos = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const contact = getEventInputContact(e, activeTouchIdRef.current)
      return contact ? getPosFromContact(contact) : null
    },
    [getPosFromContact]
  )

  // 缓存 idToIndex Map，避免每次 hitTest 重建
  const idToIndexCacheRef = useRef<{ els: CanvasElement[]; map: Map<string, number> }>({
    els: [],
    map: new Map(),
  })

  const { startDrawing, moveDrawing, finishDrawing, cancelDrawing, abortDrawing, getDrawingState } =
    useDrawingPointerHandlers({
      cachedBounds,
      scheduleRedraw,
      elementIndexCacheRef: idToIndexCacheRef,
    })

  const hitTest = useCallback(
    (px: number, py: number): string | null => {
      const tolerance = 12 / (useViewStore.getState().viewBox.zoom || 1)
      const state = useAppStore.getState()
      const elements = state.elements

      // Keep the id index cache local to the hook so spatial candidates can be
      // ordered without rebuilding a map on every pointer event.
      const cache = idToIndexCacheRef.current
      if (cache.els !== elements) {
        const map = new Map<string, number>()
        for (let index = 0; index < elements.length; index++) map.set(elements[index].id, index)
        idToIndexCacheRef.current = { els: elements, map }
      }
      const candidateIds = state.spatialIndex?.search({
        x: px - tolerance,
        y: py - tolerance,
        w: tolerance * 2,
        h: tolerance * 2,
      })

      return (
        findTopmostElementAtPoint({
          point: { x: px, y: py },
          tolerance,
          elements,
          layers: state.layers,
          candidateIds,
          idToElement: state.idToElement,
          idToIndex: idToIndexCacheRef.current.map,
          getBounds: cachedBounds,
          isElementEditable: isElementLayerEditable,
          getLayerId: getElementLayerId,
          getLayerOrder: getLayerOrderMap,
          getRenderableElements,
          isImagePixelTransparent: isTransparentImagePixel,
        })?.id ?? null
      )
    },
    [cachedBounds]
  )

  const hitHandle = useCallback(
    (
      px: number,
      py: number
    ): {
      handle: number
      id: string
      bounds: { x: number; y: number; w: number; h: number }
      isRotate?: boolean
      isEdge?: boolean
    } | null => {
      const state = useAppStore.getState()
      if (state.selectedIds.length === 0) return null
      const zoom = useViewStore.getState().viewBox.zoom || 1
      const selectedElements = state.selectedIds
        .map((id) => state.idToElement.get(id))
        .filter((element): element is CanvasElement =>
          Boolean(element && isElementLayerEditable(element, state.layers))
        )

      return findSelectionHandleAtPoint({
        point: { x: px, y: py },
        zoom,
        selectedElements,
        getBounds: cachedBounds,
      })
    },
    [cachedBounds]
  )

  const {
    handleSelectStart,
    handleSelectMove,
    handleSelectEnd,
    cancelSelectionInput,
    getSelectionRotationAngle,
    marqueeRef,
  } = useSelectPointerHandlers({
    cachedBounds,
    scheduleRedraw,
    hitTest,
    hitHandle,
    findSnaps,
    snapLinesRef,
  })

  const handleStart = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      let contact = getEventInputContact(e, activeTouchIdRef.current)
      if (isTouchEvent(e)) {
        if (isPinchingRef.current) return

        const acceptedTouches = getAcceptedTouches(e.touches)
        if (acceptedTouches.length >= 2) return

        if (activeTouchIdRef.current !== null) {
          const activeContact = findAcceptedTouch(e.touches, activeTouchIdRef.current)
          if (activeContact) return
          activeTouchIdRef.current = null
        }

        contact = acceptedTouches[0] ?? null
        if (!contact) return
        activeTouchIdRef.current = contact.identifier
      }
      if (!contact) return
      const pos = getPosFromContact(contact)
      const st = useAppStore.getState()

      // 样式吸管点击应用
      // 当样式吸管激活时，点击元素应用其样式
      if (st.styleEyedropperActive) {
        const hitId = hitTest(pos.x, pos.y)
        if (hitId) {
          st.applyStyleFromElement(hitId)
        }
        return
      }

      const curTool = st.tool,
        curColor = st.color,
        curVB = useViewStore.getState().viewBox

      // 右键拖拽平移画布
      // 检测右键按下，记录起始位置
      if ('button' in e && (e as MouseEvent).button === 2 && rightClickPanRef.current.enabled) {
        const screenX = (e as MouseEvent).clientX
        const screenY = (e as MouseEvent).clientY
        rightClickPanRef.current = {
          ...rightClickPanRef.current,
          isPanning: false,
          startScreenX: screenX,
          startScreenY: screenY,
          moved: false,
        }
        // 先启动平移模式，后续在 handleMove 中检测是否真正移动
        startPan(screenX, screenY)
        return
      }

      // 按住 Space 键临时切换 Pan 工具
      // 如果 Space 键已激活，直接进入平移模式
      if (spacePanRef.current.isActive && spacePanRef.current.enabled) {
        spacePanRef.current.wasPanning = true
        startPan(contact.clientX, contact.clientY)
        return
      }

      if (curTool === 'pan') {
        startPan(contact.clientX, contact.clientY)
        return
      }
      if (curTool === 'select') {
        handleSelectStart(e, contact, pos)
        return
      }
      if (curTool === 'text') {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (rect) {
          const textPos = snapPointIfGridEnabled(pos)
          const screenX = (textPos.x - curVB.x) * curVB.zoom + rect.left
          const screenY = (textPos.y - curVB.y) * curVB.zoom + rect.top
          const hitEl = hitTest(pos.x, pos.y)
          const hitElement = hitEl ? useAppStore.getState().idToElement.get(hitEl) : undefined
          // The text tool can be used on top of shapes to create a new label.
          // Only an actual text element is an existing editor session; casting
          // every hit element to TextElement makes shape.content undefined and
          // crashes the editor while normalizing the text format.
          const existing = hitElement?.type === 'text' ? (hitElement as TextElement) : undefined
          if (existing)
            startEditText(
              existing.x,
              existing.y,
              (existing.x - curVB.x) * curVB.zoom + rect.left,
              (existing.y - curVB.y) * curVB.zoom + rect.top,
              existing.color,
              existing
            )
          else startEditText(textPos.x, textPos.y, screenX, screenY, curColor)
          requestAnimationFrame(() => textRef.current?.focus())
        }
        return
      }
      startDrawing({
        position: pos,
        pressure: contact.pressure,
        topOnly: e.metaKey || e.ctrlKey,
      })
    },
    [
      getPosFromContact,
      startPan,
      handleSelectStart,
      startEditText,
      textRef,
      canvasRef,
      hitTest,
      startDrawing,
      snapPointIfGridEnabled,
    ]
  )

  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      let contact = getEventInputContact(e, activeTouchIdRef.current)
      if (isTouchEvent(e)) {
        if (isPinchingRef.current) return

        const acceptedTouches = getAcceptedTouches(e.touches)
        if (acceptedTouches.length >= 2) return
        if (activeTouchIdRef.current === null && acceptedTouches.length === 1) {
          activeTouchIdRef.current = acceptedTouches[0].identifier
          contact = acceptedTouches[0]
        }
      }
      if (!contact) return
      const pos = getPosFromContact(contact)
      mouseRef.current = pos

      // 样式吸管悬停预览
      // 当样式吸管激活时，检测悬停元素并更新样式预览
      const st = useAppStore.getState()
      const hitId = hitTest(pos.x, pos.y)

      // 更新悬停元素跟踪
      // 用于 Q 键快速复制样式：悬停在元素上按 Q 键直接复制样式
      hoveredElementIdRef.current = hitId

      if (st.styleEyedropperActive) {
        if (hitId) {
          const el = st.idToElement.get(hitId)
          if (el) {
            if (el.type === 'stroke') {
              st.setStyleEyedropperPreview({
                color: el.color,
                size: el.size,
                brush: el.brush,
              })
            } else if (el.type === 'shape') {
              st.setStyleEyedropperPreview({
                color: el.color,
                size: el.size,
                brush: 'pen',
              })
            } else if (el.type === 'text') {
              st.setStyleEyedropperPreview({
                color: el.color,
                size: Math.round(el.fontSize / 4),
                brush: 'pen',
              })
            }
          }
        } else {
          st.setStyleEyedropperPreview(null)
        }
      }

      // 右键拖拽平移画布
      // 检测右键拖动，超过阈值则进入平移模式
      if (
        'buttons' in e &&
        (e as MouseEvent).buttons === 2 &&
        rightClickPanRef.current.enabled &&
        useViewStore.getState().isPanning
      ) {
        const screenX = (e as MouseEvent).clientX
        const screenY = (e as MouseEvent).clientY
        const distSq = distanceSquared(
          {
            x: rightClickPanRef.current.startScreenX,
            y: rightClickPanRef.current.startScreenY,
          },
          { x: screenX, y: screenY }
        )

        if (distSq > RIGHT_CLICK_PAN_THRESHOLD * RIGHT_CLICK_PAN_THRESHOLD) {
          rightClickPanRef.current.moved = true
          rightClickPanRef.current.isPanning = true
        }

        if (rightClickPanRef.current.isPanning) {
          updatePan(screenX, screenY)
          scheduleRedraw()
          return
        }
      }

      const curTool = useAppStore.getState().tool
      const nextCursor = getCursor()
      if (nextCursor !== cursorRef.current) {
        cursorRef.current = nextCursor
        const canvas = canvasRef.current
        if (canvas) canvas.style.cursor = nextCursor
      }
      if (curTool === 'select') {
        handleSelectMove(e, pos)
        return
      }
      if (curTool === 'pan' && useViewStore.getState().isPanning) {
        updatePan(contact.clientX, contact.clientY)
        scheduleRedraw()
        return
      }
      moveDrawing({
        position: pos,
        pressure: contact.pressure,
        topOnly: e.metaKey || e.ctrlKey,
        preserveSquare: 'shiftKey' in e && (e as MouseEvent).shiftKey,
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getPosFromContact, updatePan, scheduleRedraw, handleSelectMove, moveDrawing]
  )

  const handleEnd = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const isTouchEnd = isTouchEvent(e)
      if (isTouchEnd) {
        if (isPinchingRef.current) return
        const activeTouchId = activeTouchIdRef.current
        if (activeTouchId === null || !changedTouchesInclude(e, activeTouchId)) return
      }
      const clearEndedTouch = () => {
        if (isTouchEnd) activeTouchIdRef.current = null
      }

      // 右键拖拽平移画布
      // 处理右键释放
      if ('button' in e && (e as MouseEvent).button === 2 && rightClickPanRef.current.enabled) {
        if (useViewStore.getState().isPanning) endPan()
        rightClickPanRef.current = {
          ...rightClickPanRef.current,
          isPanning: false,
        }
        clearEndedTouch()
        return
      }

      if (finishDrawing()) {
        clearEndedTouch()
        return
      }
      const curTool = useAppStore.getState().tool
      if (curTool === 'select') {
        handleSelectEnd(e)
        clearEndedTouch()
        return
      }
      if (curTool === 'pan') {
        endPan()
        clearEndedTouch()
        return
      }
      clearEndedTouch()
    },
    [endPan, finishDrawing, handleSelectEnd]
  )

  const cancelActiveInput = useCallback(
    (e?: Event) => {
      e?.preventDefault()

      cancelDrawing()
      cancelSelectionInput()

      rightClickPanRef.current = {
        ...rightClickPanRef.current,
        isPanning: false,
        moved: false,
      }
      activeTouchIdRef.current = null
      isPinchingRef.current = false
      if (useViewStore.getState().isPanning) endPan()
      if (spacePanRef.current.isActive) {
        const originalTool = spacePanRef.current.originalTool
        if (originalTool) useAppStore.getState().setTool(originalTool)
        spacePanRef.current.isActive = false
        spacePanRef.current.originalTool = null
        spacePanRef.current.wasPanning = false
      }
      scheduleRedraw()
    },
    [cancelDrawing, cancelSelectionInput, endPan, scheduleRedraw]
  )

  // Pointer events
  const inputHandlersRef = useRef<CanvasInputHandlers>({
    onStart: () => {},
    onMove: () => {},
    onEnd: () => {},
    onCancel: () => {},
  })
  useEffect(() => {
    inputHandlersRef.current = {
      onStart: handleStart,
      onMove: handleMove,
      onEnd: handleEnd,
      onCancel: cancelActiveInput,
    }
  }, [cancelActiveInput, handleEnd, handleMove, handleStart])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const unbindInputEvents = bindCanvasInputEvents(canvas, {
      onStart: (event) => inputHandlersRef.current.onStart(event),
      onMove: (event) => inputHandlersRef.current.onMove(event),
      onEnd: (event) => inputHandlersRef.current.onEnd(event),
      onCancel: (event) => inputHandlersRef.current.onCancel(event),
    })
    const auxiliaryHandlers = createCanvasAuxiliaryInputHandlers({
      canvas,
      rightClickPanRef,
      spacePanRef,
      getTool: () => useAppStore.getState().tool,
      setTool: (tool) => useAppStore.getState().setTool(tool),
      getElement: (id) => useAppStore.getState().idToElement.get(id),
      getViewBox: () => useViewStore.getState().viewBox,
      setViewBox: (viewBox) => useViewStore.getState().setViewBox(viewBox),
      getIsPanning: () => useViewStore.getState().isPanning,
      endPan,
      getEditCanvasRect: () => canvasRef.current?.getBoundingClientRect() ?? null,
      getPosition: getPos,
      hitTest,
      getBounds: cachedBounds,
      startEditText,
      focusTextEditor: () => textRef.current?.focus(),
      scheduleFocusTextEditor: () => {
        requestAnimationFrame(() => textRef.current?.focus())
      },
      scheduleRedraw,
    })
    const unbindAuxiliaryEvents = bindCanvasAuxiliaryEvents(canvas, {
      onCancel: (event) => inputHandlersRef.current.onCancel(event),
      ...auxiliaryHandlers,
    })
    return () => {
      unbindInputEvents()
      unbindAuxiliaryEvents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef])

  // Touch pinch zoom
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    return bindCanvasPinchZoom(canvas, {
      cancelDrawing: () => {
        abortDrawing()
      },
      setPinching: (active) => {
        isPinchingRef.current = active
      },
      clearActiveTouch: () => {
        activeTouchIdRef.current = null
      },
      getCanvasRect: () => canvasRef.current?.getBoundingClientRect() ?? null,
      getViewBox: () => useViewStore.getState().viewBox,
      setViewBox: (viewBox) => useViewStore.getState().setViewBox(viewBox),
      scheduleRedraw,
    })
  }, [abortDrawing, canvasRef, scheduleRedraw])

  // Cursor (使用模块级常量，避免每次渲染重建)
  const cursorMap = CURSOR_MAP
  function getCursor() {
    // 样式吸管激活时显示特殊光标
    if (useAppStore.getState().styleEyedropperActive) {
      return EYEDROPPER_CURSOR
    }
    if (useViewStore.getState().isPanning) return 'grabbing'
    if (useAppStore.getState().tool === 'select' && mouseRef.current) {
      const h = hitHandle(mouseRef.current.x, mouseRef.current.y)
      if (h) {
        // 边缘手柄光标支持
        // 手柄编号约定:
        // 0-3: 角落手柄 - 对角光标
        // 4: 上边缘中点 - 上下光标
        // 5: 下边缘中点 - 上下光标
        // 6: 左边缘中点 - 左右光标
        // 7: 右边缘中点 - 左右光标
        if (h.handle === 4 || h.handle === 5) {
          return 'ns-resize' // 上下边缘：垂直调整光标
        } else if (h.handle === 6 || h.handle === 7) {
          return 'ew-resize' // 左右边缘：水平调整光标
        } else {
          // 角落手柄
          return ['nwse-resize', 'nesw-resize', 'nesw-resize', 'nwse-resize'][h.handle]
        }
      }
    }
    return cursorMap[useAppStore.getState().tool] ?? 'crosshair'
  }

  // Copy to clipboard
  async function copySelectedToSystemClipboard() {
    const st = useAppStore.getState()
    const selIds = st.selectedIds
    if (selIds.length === 0) return
    // P1-3 性能修复: 使用 Set.has O(1) 替代 Array.includes O(n)
    // 原实现: O(els.length * selIds.length) = 1000 * 10 = 10000 次比较
    // 新实现: O(els.length) = 1000 次哈希查找
    const selSet = new Set(selIds)
    const els = st.elements
    const selEls = els.filter((e) => selSet.has(e.id) && isElementLayerVisible(e, st.layers))
    if (selEls.length === 0) return
    const dark = useThemeStore.getState().isDarkMode
    await copyElementsToSystemClipboard(selEls, { isDarkMode: dark })
  }

  // getDrawState for renderer
  const getDrawState = useCallback(() => {
    // 旋转角度显示
    // 拖拽旋转手柄时计算并返回当前旋转角度值（度数）
    // 用户价值：精确控制旋转角度，专业设计时必备
    const rotationAngle = getSelectionRotationAngle(mouseRef.current)

    const viewState = useViewStore.getState()
    const drawingState = getDrawingState()

    return {
      drawing: drawingState.drawing,
      currentPts: drawingState.currentPts,
      currentPressures: drawingState.currentPressures,
      currentShape: drawingState.currentShape,
      mousePos: mouseRef.current,
      marquee: marqueeRef.current,
      snapLines: snapLinesRef.current,
      tool: useAppStore.getState().tool,
      color: useAppStore.getState().color,
      size: useAppStore.getState().size,
      brush: useAppStore.getState().brush,
      showGrid: viewState.showGrid ?? false,
      showRulers: false,
      gridSize: viewState.gridSize,
      penVelocity: drawingState.penVelocity,
      rotationAngle,
    }
  }, [getDrawingState, getSelectionRotationAngle, marqueeRef, snapLinesRef])

  return { getCursor, copySelectedToSystemClipboard, getDrawState, hoveredElementIdRef }
}
