import { useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import { useShallow } from 'zustand/react/shallow'
import { useThemeStore } from '../../store/useThemeStore'
import type {
  CanvasElement,
  ShapeElement,
  TextElement,
  ShapeKind,
  ToolType,
  UndoAction,
} from '../../store/types'
import { shallowClone, snapshot } from '../../store/helpers'
import { isTransparentImagePixel } from '../../canvas/canvasUtils'
import {
  clientToWorld,
  snapPointIfEnabled,
  snapTargetIfEnabled,
  worldToClient,
  zoomViewBoxAtScreenPoint,
} from '../../canvas/coordinates'
import {
  DRAG_THRESHOLD,
  RIGHT_CLICK_PAN_THRESHOLD,
  distanceSquared,
  hasMovedBeyondThreshold,
} from '../../canvas/gestureGeometry'
import {
  collectMarqueeElementIds,
  hasMarqueeArea,
  hasMarqueeDragSize,
  isMarqueeShrinking,
  isPointInsideMarquee,
  mergeMarqueeSelectionIds,
  normalizeMarqueeRect,
} from '../../canvas/marquee'
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
  calculateDragTransform,
  calculateResizeTransform,
  calculateRotationDelta,
  collectElementAnchorPositions,
  getElementAnchorPosition,
  radiansToNormalizedDegrees,
} from '../../canvas/selectionTransforms'
import {
  createAltDragDuplicatePlan,
  calculateSelectionBounds,
  createResizeHistorySnapshot,
  createRotationHistorySnapshot,
  filterExistingSelectionIds,
  getDragHistoryDetails,
  getRestoreSessionState,
  getRotationSessionGeometry,
  hasSessionGeometryChanges,
  resolveSelectionPress,
  type DragSession,
  type ResizeSession,
  type RotateSession,
} from '../../canvas/pointerSession'
import {
  getPenSampleUpdate,
  resolveShapeBindings,
  shouldCommitEraseSession,
} from '../../canvas/drawingSession'
import { createShapeElement, shouldCommitShape, updateShapeDraft } from '../../canvas/shapeElements'
import { createStrokeElement } from '../../canvas/strokeElements'
import {
  DEFAULT_INPUT_PRESSURE,
  changedTouchesInclude,
  findAcceptedTouch,
  getAcceptedTouches,
  getEventInputContact,
  isTouchEvent,
} from './touchInput'
// P12 箭头绑定: 导入绑定工具函数
import { tryBindToShape } from '../../store/bindingUtils'
import { eraseElementsAtPoint, getEraserWorldRadius } from '../../eraser/simpleEraser'
import { bindCanvasAuxiliaryEvents, bindCanvasInputEvents } from './pointerEvents'
import { bindCanvasPinchZoom } from './touchGestures'

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

  // Store selectors
  const {
    addElement,
    commitElements,
    moveElementById,
    moveElementsById,
    resizeElementById,
    setSelectedIds,
    restoreElementsSnapshot,
  } = useAppStore(
    useShallow((s) => ({
      addElement: s.addElement,
      commitElements: s.commitElements,
      moveElementById: s.moveElementById,
      moveElementsById: s.moveElementsById,
      resizeElementById: s.resizeElementById,
      setSelectedIds: s.setSelectedIds,
      restoreElementsSnapshot: s.restoreElementsSnapshot,
    }))
  )
  const { startPan, updatePan, endPan } = useViewStore(
    useShallow((s) => ({
      startPan: s.startPan,
      updatePan: s.updatePan,
      endPan: s.endPan,
    }))
  )

  // 移除独立 selector，改为在 handler 内用 getState() 读取
  // 避免任何 store 变化都触发整个 hook 重渲染

  // Drawing state
  const drawingRef = useRef(false)
  const currentPtsRef = useRef<number[][]>([])
  const currentPressuresRef = useRef<number[]>([])
  const activeTouchIdRef = useRef<number | null>(null)
  const isPinchingRef = useRef(false)
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null)
  const currentShapeRef = useRef<ShapeElement | null>(null)
  const eraseBeforeSnapshotRef = useRef<CanvasElement[] | null>(null)
  const eraseUndoBaseStackRef = useRef<UndoAction[] | null>(null)
  const eraserPartCounterRef = useRef(0)
  const penVelocityRef = useRef(0)

  const snapPointIfGridEnabled = useCallback((point: { x: number; y: number }) => {
    const { snapToGrid, gridSize } = useViewStore.getState()
    return snapPointIfEnabled(point, snapToGrid, gridSize)
  }, [])

  const snapResizeTargetIfGridEnabled = useCallback((target: { x?: number; y?: number }) => {
    const { snapToGrid, gridSize } = useViewStore.getState()
    return snapTargetIfEnabled(target, snapToGrid, gridSize)
  }, [])

  const finishEraseHistory = useCallback(() => {
    const beforeSnap = eraseBeforeSnapshotRef.current
    const baseUndoStack = eraseUndoBaseStackRef.current
    eraseBeforeSnapshotRef.current = null
    eraseUndoBaseStackRef.current = null
    if (!beforeSnap || !baseUndoStack) return

    const st = useAppStore.getState()
    if (!shouldCommitEraseSession(beforeSnap, st.elements, baseUndoStack, st.undoStack)) return

    useAppStore.getState().batchErase(beforeSnap, [], baseUndoStack)
  }, [])

  const beginEraseSession = useCallback(() => {
    const state = useAppStore.getState()
    eraseBeforeSnapshotRef.current = snapshot(state.elements)
    eraseUndoBaseStackRef.current = state.undoStack
  }, [])
  // 拖动阈值 - 防止选择时意外移动元素
  // 只有鼠标移动超过 DRAG_THRESHOLD 像素才开始真正拖动
  // 这是竞品 excalidraw 和 tldraw 都实现的核心 UX 改进
  const dragRef = useRef<DragSession | null>(null)
  const resizeRef = useRef<ResizeSession | null>(null)
  const rotateRef = useRef<RotateSession | null>(null)
  const marqueeRef = useRef<{ startX: number; startY: number; endX: number; endY: number } | null>(
    null
  )
  // Lasso 选择后直接拖拽
  // 用户框选元素后，不需要松开鼠标再点击，可以直接继续拖拽移动
  const marqueeToDragRef = useRef<{
    enabled: boolean
    lastMoveTime: number
  }>({
    enabled: true,
    lastMoveTime: 0,
  })
  // 右键拖拽平移画布
  // 遵循常见设计工具交互：右键拖动直接平移，右键点击显示菜单
  const rightClickPanRef = useRef<{
    enabled: boolean
    isPanning: boolean
    startScreenX: number
    startScreenY: number
    moved: boolean
  }>({
    enabled: true,
    isPanning: false,
    startScreenX: 0,
    startScreenY: 0,
    moved: false,
  })
  // 按住 Space 键临时切换 Pan 工具
  // 遵循常见设计工具交互：按住 Space 临时平移，松开恢复原工具
  const spacePanRef = useRef<{
    enabled: boolean
    isActive: boolean
    originalTool: string | null
    wasPanning: boolean
  }>({
    enabled: true,
    isActive: false,
    originalTool: null,
    wasPanning: false,
  })
  // Alt/Option + 拖拽复制选中元素
  // 遵循常见设计工具交互：按住 Alt 拖拽元素直接复制
  // 支持拖拽过程中动态按下/松开 Alt 键切换复制模式
  const altDragDuplicateRef = useRef<{
    enabled: boolean
    // 是否正在进行 Alt 复制拖拽
    isDuplicating: boolean
    // 原始选中的元素 ID（用于检测是否需要复制）
    originalSelectedIds: string[]
    // 是否已执行过复制（防止多次复制）
    hasDuplicated: boolean
  }>({
    enabled: true,
    isDuplicating: false,
    originalSelectedIds: [],
    hasDuplicated: false,
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

  const eraseAt = useCallback(
    (x: number, y: number, topOnly: boolean = false) => {
      const state = useAppStore.getState()
      const radius = getEraserWorldRadius(state.size, useViewStore.getState().viewBox.zoom)

      const candidateIds = state.spatialIndex?.search({
        x: x - radius,
        y: y - radius,
        w: radius * 2,
        h: radius * 2,
      })

      const ids = [...(candidateIds ?? state.elements.map((e) => e.id))]
      if (topOnly) {
        const cache = idToIndexCacheRef.current
        if (cache.els !== state.elements) {
          const map = new Map<string, number>()
          for (let i = 0; i < state.elements.length; i++) map.set(state.elements[i].id, i)
          idToIndexCacheRef.current = { els: state.elements, map }
        }
        const idToIndex = idToIndexCacheRef.current.map
        const layerOrder = getLayerOrderMap(state.layers)
        ids.sort((a, b) => {
          const aIndex = idToIndex.get(a)
          const bIndex = idToIndex.get(b)
          const aEl =
            state.idToElement.get(a) ?? (aIndex === undefined ? undefined : state.elements[aIndex])
          const bEl =
            state.idToElement.get(b) ?? (bIndex === undefined ? undefined : state.elements[bIndex])
          const layerDiff =
            (bEl ? (layerOrder.get(getElementLayerId(bEl)) ?? 0) : 0) -
            (aEl ? (layerOrder.get(getElementLayerId(aEl)) ?? 0) : 0)
          return layerDiff || (idToIndex.get(b) ?? 0) - (idToIndex.get(a) ?? 0)
        })
      }

      const candidates = ids
        .map((id) => state.idToElement.get(id))
        .filter((element): element is CanvasElement =>
          Boolean(element && isElementLayerEditable(element, state.layers))
        )
      const patch = eraseElementsAtPoint({
        elements: candidates,
        point: { x, y },
        radius,
        topOnly,
        getBounds: cachedBounds,
        createId: (sourceId, partIndex) =>
          `${sourceId}-part-${++eraserPartCounterRef.current}-${partIndex}`,
      })

      if (patch.removeIds.length === 0 && patch.additions.length === 0) return
      const removeIds = new Set(patch.removeIds)
      const nextElements = state.elements
        .filter((element) => !removeIds.has(element.id))
        .concat(patch.additions)
      commitElements(nextElements, { clearRedo: true })
    },
    [commitElements, cachedBounds]
  )

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
        curSize = st.size,
        curFillColor = st.fillColor,
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
        const h = hitHandle(pos.x, pos.y)
        if (h) {
          const st = useAppStore.getState()
          const el = st.idToElement.get(h.id)
          if (el) {
            // 旋转手柄交互
            // 支持批量旋转多个选中元素
            if (h.isRotate) {
              const selectedIds = st.selectedIds.length > 0 ? st.selectedIds : [h.id]
              const geometry = getRotationSessionGeometry(
                selectedIds,
                (id) => st.idToElement.get(id),
                cachedBounds
              )
              if (geometry) {
                rotateRef.current = {
                  ids: selectedIds,
                  startX: pos.x,
                  startY: pos.y,
                  ...geometry,
                  startElementsSnapshot: snapshot(st.elements),
                  startSelectedIds: [...st.selectedIds],
                }
              }
            } else {
              // 缩放手柄
              resizeRef.current = {
                ...h,
                startX: pos.x,
                startY: pos.y,
                origBounds: cachedBounds(el),
                origElement: { ...el } as CanvasElement,
                startElementsSnapshot: snapshot(st.elements),
                startSelectedIds: [...st.selectedIds],
              }
            }
          }
          scheduleRedraw()
          return
        }
        const hit = hitTest(pos.x, pos.y)
        if (hit) {
          const st = useAppStore.getState()
          const hitEl = st.idToElement.get(hit)
          const isMultiSelectKey = e.shiftKey || e.metaKey || e.ctrlKey
          const selectionPress = resolveSelectionPress({
            hitId: hit,
            hitElement: hitEl,
            elements: st.elements,
            selectedIds: st.selectedIds,
            multiSelect: isMultiSelectKey,
            isEditable: (element) => isElementLayerEditable(element, st.layers),
          })
          if (selectionPress.nextSelectedIds !== null) {
            setSelectedIds(selectionPress.nextSelectedIds)
          }
          const ids = selectionPress.dragIds
          const startPositions = collectElementAnchorPositions(ids, (id) => st.idToElement.get(id))
          // 记录屏幕坐标用于拖动阈值检测
          // 使用屏幕坐标而非世界坐标，确保阈值在所有缩放级别下一致
          const screenX = contact.clientX
          const screenY = contact.clientY

          // Alt/Option + 拖拽复制选中元素
          // 检测 Alt 键是否按下，初始化复制状态
          const altPressed = 'altKey' in e && (e as MouseEvent).altKey
          if (altPressed && altDragDuplicateRef.current.enabled) {
            altDragDuplicateRef.current = {
              ...altDragDuplicateRef.current,
              isDuplicating: true,
              originalSelectedIds: [...ids],
              hasDuplicated: false,
            }
          } else {
            // 重置 Alt 复制状态
            altDragDuplicateRef.current = {
              ...altDragDuplicateRef.current,
              isDuplicating: false,
              originalSelectedIds: [],
              hasDuplicated: false,
            }
          }

          dragRef.current = {
            x: pos.x,
            y: pos.y,
            id: hit,
            startPositions,
            startElementsSnapshot: snapshot(st.elements),
            dragStarted: false,
            startScreenX: screenX,
            startScreenY: screenY,
            startSelectedIds: [...st.selectedIds],
          }
          scheduleRedraw()
          return
        }
        // 按住 Cmd/Ctrl 框选追加选区
        // 匹配 Figma/Sketch/Photoshop 行业标准：按住修饰键框选时追加选区而非替换
        const isAppendSelectKey = e.metaKey || e.ctrlKey

        marqueeRef.current = { startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y }

        // 只有在不按住 Cmd/Ctrl 时才清空选区
        // 按住 Cmd/Ctrl 时保留现有选区，框选结果将追加到选区中
        if (!isAppendSelectKey) {
          setSelectedIds([])
        }

        scheduleRedraw()
        return
      }
      if (curTool === 'text') {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (rect) {
          const textPos = snapPointIfGridEnabled(pos)
          const screenX = (textPos.x - curVB.x) * curVB.zoom + rect.left
          const screenY = (textPos.y - curVB.y) * curVB.zoom + rect.top
          const hitEl = hitTest(pos.x, pos.y)
          const existing = hitEl
            ? (useAppStore.getState().idToElement.get(hitEl) as TextElement | undefined)
            : undefined
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
          setTimeout(() => textRef.current?.focus(), 50)
        }
        return
      }
      drawingRef.current = true
      if (curTool === 'pen') {
        currentPtsRef.current = [[pos.x, pos.y]]
        currentPressuresRef.current =
          contact.pressure === undefined ? [] : [contact.pressure ?? DEFAULT_INPUT_PRESSURE]
      } else if (curTool === 'eraser') {
        currentPressuresRef.current = []
        // 检测 Ctrl/Cmd 键，只擦除最顶层元素
        const topOnly = e.metaKey || e.ctrlKey
        beginEraseSession()
        eraseAt(pos.x, pos.y, topOnly)
      } else {
        currentPressuresRef.current = []
        const start = snapPointIfGridEnabled(pos)
        shapeStartRef.current = start
        currentShapeRef.current = createShapeElement({
          id: `shape-${Date.now()}`,
          kind: curTool as ShapeKind,
          start,
          color: curColor,
          size: curSize,
          fillColor: curFillColor,
        })
      }
    },
    [
      getPosFromContact,
      startPan,
      setSelectedIds,
      scheduleRedraw,
      startEditText,
      textRef,
      cachedBounds,
      canvasRef,
      hitTest,
      hitHandle,
      eraseAt,
      beginEraseSession,
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
      if (curTool === 'select' && resizeRef.current) {
        const { handle, id, startX, startY, origBounds: ob } = resizeRef.current
        const transform = calculateResizeTransform({
          handle,
          bounds: ob,
          totalDelta: { x: pos.x - startX, y: pos.y - startY },
          elementType: resizeRef.current.origElement?.type,
          shiftPressed: 'shiftKey' in e && (e as MouseEvent).shiftKey,
          snapTarget: snapResizeTargetIfGridEnabled,
        })
        if (!transform) {
          scheduleRedraw()
          return
        }

        snapLinesRef.current = { x: transform.linesX, y: transform.linesY }
        resizeElementById(id, transform.ax, transform.ay, transform.sx, transform.sy)
        scheduleRedraw()
        return
      }
      // 旋转拖拽交互
      // 支持批量旋转多个选中元素
      // 专业设计工具标准：拖拽选择框顶部的旋转手柄旋转元素
      if (curTool === 'select' && rotateRef.current) {
        const { ids, startX, startY, origRotations, commonCenterX, commonCenterY } =
          rotateRef.current

        const shiftPressed = 'shiftKey' in e && (e as MouseEvent).shiftKey
        const angleDelta = calculateRotationDelta({
          start: { x: startX, y: startY },
          current: pos,
          center: { x: commonCenterX, y: commonCenterY },
          referenceRotation: origRotations.get(ids[0]) || 0,
          shiftPressed,
        })

        // 批量旋转所有选中元素
        // 所有元素围绕共同中心点旋转相同角度
        useAppStore.getState().rotateElementsById(ids, angleDelta, commonCenterX, commonCenterY)

        scheduleRedraw()
        return
      }
      if (curTool === 'select' && marqueeRef.current) {
        // Lasso 选择后直接拖拽
        // 检测用户是否想要开始拖拽而不是继续扩大选择区域
        // 策略: 如果鼠标向选择区域内部移动，说明用户想拖拽而不是继续框选
        const m = marqueeRef.current
        const marqueeRect = normalizeMarqueeRect(
          { x: m.startX, y: m.startY },
          { x: m.endX, y: m.endY }
        )

        // 只有当框选区域有一定大小时才触发自动拖拽
        const now = performance.now()

        if (marqueeToDragRef.current.enabled && hasMarqueeDragSize(marqueeRect)) {
          // 检测鼠标是否向选择区域内部移动
          const isMovingInside = isPointInsideMarquee(pos, marqueeRect)

          // 检测鼠标移动方向是否是"收缩"而不是"扩大"
          const isShrinking = isMarqueeShrinking(
            { x: m.startX, y: m.startY },
            { x: m.endX, y: m.endY },
            pos
          )

          // 如果鼠标在选择区域内，或者区域在收缩，说明用户想开始拖拽
          if ((isMovingInside || isShrinking) && now - marqueeToDragRef.current.lastMoveTime > 50) {
            // 先完成选择
            const st = useAppStore.getState()
            const candidateIds = st.spatialIndex?.search(marqueeRect)
            const hits = collectMarqueeElementIds({
              candidateIds,
              getElement: (id) => st.idToElement.get(id),
              getBounds: cachedBounds,
              isSelectable: (element) => isElementLayerEditable(element, st.layers),
              rect: marqueeRect,
            })

            if (hits.length > 0) {
              setSelectedIds(hits)

              // 立即进入拖拽模式，无缝衔接
              const startPositions = collectElementAnchorPositions(hits, (id) =>
                st.idToElement.get(id)
              )

              const screenX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
              const screenY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY

              dragRef.current = {
                x: pos.x,
                y: pos.y,
                id: hits[0],
                startPositions,
                startElementsSnapshot: snapshot(st.elements),
                dragStarted: true, // 直接跳过阈值检测，立即开始拖拽
                startScreenX: screenX,
                startScreenY: screenY,
                startSelectedIds: [...st.selectedIds],
              }

              marqueeRef.current = null
              scheduleRedraw()
              return
            }
          }
        }

        marqueeToDragRef.current.lastMoveTime = now
        marqueeRef.current = { ...marqueeRef.current, endX: pos.x, endY: pos.y }
        scheduleRedraw()
        return
      }
      if (curTool === 'select' && dragRef.current) {
        // 拖动阈值检测 - 防止选择时意外移动元素
        // 只有当鼠标移动超过 DRAG_THRESHOLD 像素时才开始真正拖动
        if (!dragRef.current.dragStarted) {
          const screenX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
          const screenY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
          // 移动距离小于阈值时，不执行拖动
          if (
            !hasMovedBeyondThreshold(
              { x: dragRef.current.startScreenX, y: dragRef.current.startScreenY },
              { x: screenX, y: screenY },
              DRAG_THRESHOLD
            )
          ) {
            return
          }

          // 超过阈值，标记拖动开始
          dragRef.current.dragStarted = true
        }

        if (
          altDragDuplicateRef.current.isDuplicating &&
          !altDragDuplicateRef.current.hasDuplicated &&
          altDragDuplicateRef.current.originalSelectedIds.length > 0
        ) {
          const st = useAppStore.getState()
          const plan = createAltDragDuplicatePlan({
            originalIds: altDragDuplicateRef.current.originalSelectedIds,
            startPositions: dragRef.current.startPositions,
            getElement: (id) => st.idToElement.get(id),
            cloneElement: shallowClone,
            getAnchorPosition: getElementAnchorPosition,
            createId: (element) =>
              `${element.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          })

          for (const copy of plan.copies) addElement(copy)
          for (const move of plan.restoreMoves) moveElementById(move.id, move.dx, move.dy)

          const newIds = plan.copies.map((copy) => copy.id)
          setSelectedIds(newIds)
          dragRef.current.startPositions = plan.copyStartPositions
          altDragDuplicateRef.current.hasDuplicated = true
          if (plan.shouldStopAfterDuplicate) return
        }

        const pointerDelta = {
          x: pos.x - dragRef.current.x,
          y: pos.y - dragRef.current.y,
        }
        const st = useAppStore.getState()
        const ids = st.selectedIds.length > 0 ? st.selectedIds : [dragRef.current.id]
        const idSet = new Set(ids)
        const selectionBounds = calculateSelectionBounds(
          st.elements.filter(
            (element) => idSet.has(element.id) && isElementLayerEditable(element, st.layers)
          ),
          cachedBounds
        )
        if (!selectionBounds) return
        const { snapToGrid, gridSize } = useViewStore.getState()
        const transform = calculateDragTransform({
          bounds: selectionBounds,
          delta: pointerDelta,
          findSnaps: (movingBounds) => findSnaps(movingBounds, idSet),
          snapToGrid,
          gridSize,
        })
        snapLinesRef.current = { x: transform.linesX, y: transform.linesY }
        if (ids.length > 1)
          moveElementsById(ids, transform.dx, transform.dy, { recordHistory: false })
        else moveElementById(dragRef.current.id, transform.dx, transform.dy)
        dragRef.current = {
          ...dragRef.current,
          x: pos.x + transform.snapDx,
          y: pos.y + transform.snapDy,
          id: dragRef.current.id,
        }
        scheduleRedraw()
        return
      }
      if (curTool === 'pan' && useViewStore.getState().isPanning) {
        updatePan(contact.clientX, contact.clientY)
        scheduleRedraw()
        return
      }
      if (curTool === 'eraser') {
        // 检测 Ctrl/Cmd 键，只擦除最顶层元素
        const topOnly = e.metaKey || e.ctrlKey
        if (drawingRef.current) eraseAt(pos.x, pos.y, topOnly)
        scheduleRedraw()
        return
      }
      if (!drawingRef.current) return
      if (curTool === 'pen') {
        const update = getPenSampleUpdate(
          currentPtsRef.current,
          currentPressuresRef.current,
          pos,
          contact.pressure,
          DEFAULT_INPUT_PRESSURE
        )
        penVelocityRef.current = update.velocity
        currentPtsRef.current.push([pos.x, pos.y])
        if (update.hasPressure) {
          if (update.pressurePrefixLength > 0) {
            currentPressuresRef.current = new Array(update.pressurePrefixLength).fill(
              DEFAULT_INPUT_PRESSURE
            )
          }
          currentPressuresRef.current.push(update.pressure)
        }
      } else if (shapeStartRef.current && currentShapeRef.current) {
        const shift = 'shiftKey' in e && (e as MouseEvent).shiftKey
        const draftPos = snapPointIfGridEnabled(pos)
        currentShapeRef.current = updateShapeDraft(
          currentShapeRef.current,
          shapeStartRef.current,
          draftPos,
          shift
        )
      }
      scheduleRedraw()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      getPosFromContact,
      updatePan,
      scheduleRedraw,
      moveElementById,
      moveElementsById,
      resizeElementById,
      cachedBounds,
      findSnaps,
      snapLinesRef,
      eraseAt,
      snapPointIfGridEnabled,
      snapResizeTargetIfGridEnabled,
    ]
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
        if (rightClickPanRef.current.isPanning) {
          // 如果进行了平移，结束平移模式
          endPan()
        }
        // 重置右键平移状态
        rightClickPanRef.current = {
          ...rightClickPanRef.current,
          isPanning: false,
          moved: false,
        }
        clearEndedTouch()
        return
      }

      const curColor = useAppStore.getState().color,
        curSize = useAppStore.getState().size,
        curBrush = useAppStore.getState().brush
      if (drawingRef.current) {
        drawingRef.current = false
        const curTool = useAppStore.getState().tool
        if (curTool === 'pen') {
          const el = createStrokeElement({
            id: `stroke-${Date.now()}`,
            points: currentPtsRef.current,
            color: curColor,
            size: curSize,
            brush: curBrush,
            pressures: currentPressuresRef.current,
          })
          if (el) {
            addElement(el)
          }
          currentPtsRef.current = []
          currentPressuresRef.current = []
          penVelocityRef.current = 0
        } else if (curTool === 'eraser') {
          finishEraseHistory()
          currentPtsRef.current = []
          currentPressuresRef.current = []
        } else if (currentShapeRef.current) {
          if (shouldCommitShape(currentShapeRef.current)) {
            const shape = currentShapeRef.current
            if (shape.kind === 'arrow' || shape.kind === 'line') {
              const st = useAppStore.getState()
              const visibleElements = st.elements.filter((el) =>
                isElementLayerVisible(el, st.layers)
              )
              addElement(resolveShapeBindings(shape, visibleElements, tryBindToShape))
            } else {
              addElement(shape)
            }
          }
          currentShapeRef.current = null
          shapeStartRef.current = null
        }
        scheduleRedraw()
        clearEndedTouch()
        return
      }
      const curTool = useAppStore.getState().tool
      if (curTool === 'select') {
        if (marqueeRef.current) {
          const m = marqueeRef.current
          const marqueeRect = normalizeMarqueeRect(
            { x: m.startX, y: m.startY },
            { x: m.endX, y: m.endY }
          )
          if (hasMarqueeArea(marqueeRect)) {
            // P1-2 性能修复: 使用空间索引预筛选框选范围内的元素
            // 原实现: O(n) 遍历所有元素检测框选命中
            // 新实现: O(log n) R-tree 查询 + 少量精确检测
            const st = useAppStore.getState()
            const candidateIds = st.spatialIndex?.search(marqueeRect)
            const hits = collectMarqueeElementIds({
              candidateIds,
              getElement: (id) => st.idToElement.get(id),
              getBounds: cachedBounds,
              isSelectable: (element) => isElementLayerEditable(element, st.layers),
              rect: marqueeRect,
            })

            // 按住 Cmd/Ctrl 框选追加选区
            // 匹配 Figma/Sketch/Photoshop 行业标准：按住修饰键框选时追加选区而非替换
            const isAppendSelectKey = e.metaKey || e.ctrlKey
            setSelectedIds(mergeMarqueeSelectionIds(st.selectedIds, hits, isAppendSelectKey))
          }
          marqueeRef.current = null
        }
        if (dragRef.current?.startPositions) {
          const st = useAppStore.getState()
          const before = dragRef.current.startElementsSnapshot
          const history = getDragHistoryDetails(before, st.elements, dragRef.current.startPositions)
          if (before && history) {
            useAppStore.getState().pushUndo({
              type: 'snapshot',
              before: snapshot(before),
              after: snapshot(st.elements),
              label: history.label,
              affectedIds: history.affectedIds,
            })
          }
        }
        const resizeCur = resizeRef.current
        if (resizeCur?.origElement) {
          const afterEl = useAppStore.getState().idToElement.get(resizeCur.id)
          if (afterEl) {
            const origEl = resizeCur.origElement
            useAppStore.getState().pushUndo({
              type: 'clear',
              snapshot: createResizeHistorySnapshot(
                useAppStore.getState().elements,
                resizeCur.id,
                origEl
              ),
            })
          }
        }
        // 旋转结束处理
        // 支持批量旋转多个元素的撤销
        // 记录旋转操作到撤销栈
        const rotateCur = rotateRef.current
        if (rotateCur) {
          const { ids, origRotations } = rotateCur
          useAppStore.getState().pushUndo({
            type: 'clear',
            snapshot: createRotationHistorySnapshot(
              useAppStore.getState().elements,
              ids,
              origRotations
            ),
          })
        }
        dragRef.current = null
        resizeRef.current = null
        rotateRef.current = null
        snapLinesRef.current = { x: [], y: [] }
        // 重置 Alt 拖拽复制状态
        altDragDuplicateRef.current = {
          ...altDragDuplicateRef.current,
          isDuplicating: false,
          originalSelectedIds: [],
          hasDuplicated: false,
        }
        scheduleRedraw()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addElement, endPan, setSelectedIds, scheduleRedraw, cachedBounds, finishEraseHistory]
  )

  const cancelActiveInput = useCallback(
    (e?: Event) => {
      e?.preventDefault()
      const drag = dragRef.current
      const resize = resizeRef.current
      const rotate = rotateRef.current
      const { snapshot: restoreSnapshot, selectedIds: restoreSelectedIds } = getRestoreSessionState(
        drag,
        resize,
        rotate
      )

      drawingRef.current = false
      currentPtsRef.current = []
      currentPressuresRef.current = []
      currentShapeRef.current = null
      shapeStartRef.current = null
      finishEraseHistory()
      if (restoreSnapshot) {
        const hasElementChanges = hasSessionGeometryChanges(
          restoreSnapshot,
          useAppStore.getState().elements
        )
        if (hasElementChanges) {
          restoreElementsSnapshot(restoreSnapshot, restoreSelectedIds)
        } else if (restoreSelectedIds) {
          setSelectedIds(
            filterExistingSelectionIds(restoreSelectedIds, useAppStore.getState().elements)
          )
        }
      }

      dragRef.current = null
      resizeRef.current = null
      rotateRef.current = null
      marqueeRef.current = null
      snapLinesRef.current = { x: [], y: [] }
      rightClickPanRef.current = {
        ...rightClickPanRef.current,
        isPanning: false,
        moved: false,
      }
      activeTouchIdRef.current = null
      isPinchingRef.current = false
      penVelocityRef.current = 0
      if (useViewStore.getState().isPanning) endPan()
      if (spacePanRef.current.isActive) {
        const originalTool = spacePanRef.current.originalTool
        if (originalTool) useAppStore.getState().setTool(originalTool as ToolType)
        spacePanRef.current.isActive = false
        spacePanRef.current.originalTool = null
        spacePanRef.current.wasPanning = false
      }
      scheduleRedraw()
    },
    [
      endPan,
      restoreElementsSnapshot,
      scheduleRedraw,
      finishEraseHistory,
      snapLinesRef,
      setSelectedIds,
    ]
  )

  // Pointer events
  const handleStartRef = useRef<(e: MouseEvent | TouchEvent) => void>(() => {})
  const handleMoveRef = useRef<(e: MouseEvent | TouchEvent) => void>(() => {})
  const handleEndRef = useRef<(e: MouseEvent | TouchEvent) => void>(() => {})
  const handleCancelRef = useRef<(e: Event) => void>(() => {})
  useEffect(() => {
    handleStartRef.current = (e) => handleStart(e)
  }, [handleStart])
  useEffect(() => {
    handleMoveRef.current = (e) => handleMove(e)
  }, [handleMove])
  useEffect(() => {
    handleEndRef.current = (e) => handleEnd(e)
  }, [handleEnd])
  useEffect(() => {
    handleCancelRef.current = (e) => cancelActiveInput(e)
  }, [cancelActiveInput])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const unbindInputEvents = bindCanvasInputEvents(canvas, {
      onStart: (event) => handleStartRef.current(event),
      onMove: (event) => handleMoveRef.current(event),
      onEnd: (event) => handleEndRef.current(event),
      onCancel: (event) => handleCancelRef.current(event),
    })
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const vb = useViewStore.getState().viewBox
      const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      const newZoom = Math.max(0.2, Math.min(5, vb.zoom * zoomFactor))
      useViewStore
        .getState()
        .setViewBox(zoomViewBoxAtScreenPoint(vb, { x: mouseX, y: mouseY }, newZoom))
      scheduleRedraw()
    }
    // 按住 Space 键临时切换 Pan 工具
    // 监听 Space 键按下/松开，临时切换到平移模式
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && spacePanRef.current.enabled) {
        // 防止 Space 键触发滚动
        e.preventDefault()
        // 只在未激活时才切换，避免重复触发
        if (!spacePanRef.current.isActive) {
          const st = useAppStore.getState()
          // 保存当前工具并切换到 pan
          spacePanRef.current.originalTool = st.tool
          spacePanRef.current.isActive = true
          spacePanRef.current.wasPanning = false
          st.setTool('pan' as ToolType)
          scheduleRedraw()
        }
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && spacePanRef.current.enabled) {
        if (spacePanRef.current.isActive) {
          // 如果正在平移，先结束平移
          if (spacePanRef.current.wasPanning || useViewStore.getState().isPanning) {
            endPan()
          }
          // 恢复原来的工具
          const originalTool = spacePanRef.current.originalTool
          if (originalTool) {
            useAppStore.getState().setTool(originalTool as ToolType)
          }
          // 重置状态
          spacePanRef.current.isActive = false
          spacePanRef.current.originalTool = null
          spacePanRef.current.wasPanning = false
          scheduleRedraw()
        }
      }
    }
    // 使用 window 监听，确保焦点在 canvas 外也能工作
    // 右键拖拽平移画布
    // 当正在进行右键平移时，阻止默认右键菜单
    const onContextMenu = (e: MouseEvent) => {
      if (rightClickPanRef.current.isPanning || rightClickPanRef.current.moved) {
        e.preventDefault()
      }
    }
    // P12-双击交互体系
    // 双击文本元素进入编辑模式
    // 双击形状内部添加文本
    // 遵循常见设计工具交互：双击直接操作，无需切换工具
    const onDblClick = (e: MouseEvent) => {
      if (useAppStore.getState().tool !== 'select') return
      const pos = getPos(e)
      if (!pos) return
      const hitId = hitTest(pos.x, pos.y)
      if (!hitId) return
      const el = useAppStore.getState().idToElement.get(hitId)
      if (!el) return

      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const vb = useViewStore.getState().viewBox

      // 双击文本元素进入编辑模式
      if (el.type === 'text') {
        const screen = worldToClient({ x: el.x, y: el.y }, rect, vb)
        const screenX = screen.x
        const screenY = screen.y
        startEditText(el.x, el.y, screenX, screenY, el.color, el)
        setTimeout(() => textRef.current?.focus(), 50)
      }
      // 双击形状内部添加文本
      // 用户画完矩形/圆形后，直接双击即可添加标注文本，无需切换到文本工具
      // 文本自动居中放置在形状中心，符合流程图/架构图的标准用法
      else if (el.type === 'shape') {
        const b = cachedBounds(el)
        // 计算形状中心点（文本居中放置）
        const textX = b.x + b.w / 2
        const textY = b.y + b.h / 2
        const screen = worldToClient({ x: textX, y: textY }, rect, vb)
        const screenX = screen.x
        const screenY = screen.y

        // 使用形状的颜色作为文本颜色，保持视觉一致性
        // 默认字号 16，与工具栏默认一致
        startEditText(textX, textY, screenX, screenY, el.color)
        setTimeout(() => textRef.current?.focus(), 50)
      }
    }
    const unbindAuxiliaryEvents = bindCanvasAuxiliaryEvents(canvas, {
      onCancel: (event) => handleCancelRef.current(event),
      onWheel,
      onKeyDown,
      onKeyUp,
      onContextMenu,
      onDoubleClick: onDblClick,
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
        if (!drawingRef.current) return
        drawingRef.current = false
        currentPtsRef.current = []
        currentPressuresRef.current = []
        currentShapeRef.current = null
        shapeStartRef.current = null
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
  }, [canvasRef, scheduleRedraw])

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
    let rotationAngle: { angle: number; centerX: number; centerY: number } | null = null
    if (rotateRef.current) {
      const { startX, startY, commonCenterX, commonCenterY, origRotations, ids } = rotateRef.current
      const mouseX = mouseRef.current?.x ?? startX
      const mouseY = mouseRef.current?.y ?? startY

      const firstOrigRotation = origRotations.get(ids[0]) || 0
      const angleDelta = calculateRotationDelta({
        start: { x: startX, y: startY },
        current: { x: mouseX, y: mouseY },
        center: { x: commonCenterX, y: commonCenterY },
        referenceRotation: firstOrigRotation,
      })
      const degrees = radiansToNormalizedDegrees(firstOrigRotation + angleDelta)

      rotationAngle = {
        angle: degrees,
        centerX: commonCenterX,
        centerY: commonCenterY,
      }
    }

    const viewState = useViewStore.getState()

    return {
      drawing: drawingRef.current,
      currentPts: currentPtsRef.current,
      currentPressures: currentPressuresRef.current,
      currentShape: currentShapeRef.current,
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
      penVelocity: penVelocityRef.current,
      rotationAngle,
    }
  }, [snapLinesRef])

  return { getCursor, copySelectedToSystemClipboard, getDrawState, hoveredElementIdRef }
}
