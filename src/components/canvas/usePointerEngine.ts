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
} from '../../store/types'
import { distToSegSq, elementBounds, isTransparentImagePixel } from '../../canvas/canvasUtils'
import { drawElement } from '../../canvas/canvasDrawing'
import {
  lockResizeScalesToAspectRatio,
  shouldPreserveResizeAspectRatio,
} from '../../canvas/resizeRules'
import { createStrokeElement } from '../../canvas/strokeElements'
// P12 箭头绑定: 导入绑定工具函数
import { tryBindToShape } from '../../store/bindingUtils'
// 物理擦除引擎集成
import { useEraserStore, type EraserPoint } from '../../eraser'

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
    existing?: { id: string; content: string; fontSize: number }
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
    removeElement,
    moveElementById,
    moveElementsById,
    resizeElementById,
    setSelectedIds,
  } = useAppStore(
    useShallow((s) => ({
      addElement: s.addElement,
      removeElement: s.removeElement,
      moveElementById: s.moveElementById,
      moveElementsById: s.moveElementsById,
      resizeElementById: s.resizeElementById,
      setSelectedIds: s.setSelectedIds,
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
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null)
  const currentShapeRef = useRef<ShapeElement | null>(null)
  const erasedRef = useRef<Set<string>>(new Set())

  // 擦除轨迹跟踪（用于光标拖尾渲染）- 移到开头，在 handleMove 使用前声明
  // P0 性能优化: 使用固定大小环形缓冲区，避免数组 splice/shift 产生的 GC 压力
  // 原实现: 每次 mousemove 都可能触发 O(n) 数组重排，60fps 下产生大量 GC
  // 新实现: 环形缓冲区 O(1) 写入，读取时只需遍历有效范围
  const eraserTrailRef = useRef<{ x: number; y: number; time: number }[]>(
    Array.from({ length: 64 }, () => ({ x: 0, y: 0, time: 0 }))
  )
  const eraserTrailIndexRef = useRef(0)
  const eraserTrailCountRef = useRef(0)
  const penVelocityRef = useRef(0)

  // 物理擦除状态
  const lastErasePointRef = useRef<{ x: number; y: number; time: number } | null>(null)
  // 拖动阈值 - 防止选择时意外移动元素
  // 只有鼠标移动超过 DRAG_THRESHOLD 像素才开始真正拖动
  // 这是竞品 excalidraw 和 tldraw 都实现的核心 UX 改进
  const DRAG_THRESHOLD = 4 // 像素，考虑缩放后的实际距离
  const dragRef = useRef<{
    x: number
    y: number
    id: string
    startPositions?: Map<string, { x: number; y: number }>
    // 拖动阈值状态跟踪
    dragStarted: boolean
    startScreenX: number
    startScreenY: number
  } | null>(null)
  const resizeRef = useRef<{
    handle: number
    id: string
    startX: number
    startY: number
    origBounds: { x: number; y: number; w: number; h: number }
    origElement: CanvasElement | null
  } | null>(null)
  // 旋转拖拽状态
  // 支持批量旋转多个元素
  const rotateRef = useRef<{
    ids: string[]
    startX: number
    startY: number
    origRotations: Map<string, number>
    commonCenterX: number
    commonCenterY: number
  } | null>(null)
  const marqueeRef = useRef<{ startX: number; startY: number; endX: number; endY: number } | null>(
    null
  )
  // Lasso 选择后直接拖拽
  // 用户框选元素后，不需要松开鼠标再点击，可以直接继续拖拽移动
  const marqueeToDragRef = useRef<{
    enabled: boolean
    lastMoveTime: number
    selectionComplete: boolean
  }>({
    enabled: true,
    lastMoveTime: 0,
    selectionComplete: false,
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
  const RIGHT_CLICK_PAN_THRESHOLD = 3 // 像素，超过此距离才进入平移模式
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
  // 导出悬停元素 ID 供键盘快捷键使用
  useEffect(() => {
    ;(window as any).__mindnotes_hovered_element_id__ = hoveredElementIdRef
  }, [])

  const getPos = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      const vb = useViewStore.getState().viewBox
      let cx: number, cy: number
      if ('touches' in e && e.touches.length > 0) {
        cx = e.touches[0].clientX
        cy = e.touches[0].clientY
      } else if ('changedTouches' in e && e.changedTouches.length > 0) {
        cx = e.changedTouches[0].clientX
        cy = e.changedTouches[0].clientY
      } else {
        cx = (e as MouseEvent).clientX
        cy = (e as MouseEvent).clientY
      }
      return { x: (cx - rect.left) / vb.zoom + vb.x, y: (cy - rect.top) / vb.zoom + vb.y }
    },
    [canvasRef]
  )

  // 缓存 idToIndex Map，避免每次 hitTest 重建
  const idToIndexCacheRef = useRef<{ els: CanvasElement[]; map: Map<string, number> }>({
    els: [],
    map: new Map(),
  })

  const hitTest = useCallback(
    (px: number, py: number): string | null => {
      const r = 12 / (useViewStore.getState().viewBox.zoom || 1)
      const state = useAppStore.getState()
      const els = state.elements

      // 使用缓存的 idToIndex，仅在 elements 引用变化时重建
      const cache = idToIndexCacheRef.current
      if (cache.els !== els) {
        const map = new Map<string, number>()
        for (let i = 0; i < els.length; i++) map.set(els[i].id, i)
        idToIndexCacheRef.current = { els, map }
      }
      const idToIndex = idToIndexCacheRef.current.map

      // P0 性能优化: 先用空间索引快速筛选候选元素（O(log n)）
      const candidateIds = state.spatialIndex?.search({
        x: px - r,
        y: py - r,
        w: r * 2,
        h: r * 2,
      })

      // 如果空间索引可用，直接遍历候选元素而非全部元素
      // 从后向前遍历以保持 Z-order（后绘制的在上层）
      if (candidateIds && candidateIds.length > 0) {
        // 使用缓存的 idToIndex 排序，避免每次重建
        candidateIds.sort((a, b) => {
          return (idToIndex.get(b) ?? 0) - (idToIndex.get(a) ?? 0)
        })

        for (const id of candidateIds) {
          const idx = idToIndex.get(id)
          if (idx === undefined) continue
          const el = els[idx]

          // 跳过锁定的元素，无法选中
          if (el.locked) continue

          // 精确检测
          if (el.type === 'image') {
            if (
              px >= el.x - r &&
              px <= el.x + el.width + r &&
              py >= el.y - r &&
              py <= el.y + el.height + r
            ) {
              // 图片透明像素点击穿透
              // 点击图片透明区域时，跳过该图片，继续检测下面的元素
              // 遵循常见设计工具行为
              if (isTransparentImagePixel(el, px, py)) {
                continue
              }
              return el.id
            }
          } else if (el.type === 'text') {
            if (
              px >= el.x - r &&
              px <= el.x + (el.width || 100) + r &&
              py >= el.y - r &&
              py <= el.y + (el.height || 30) + r
            )
              return el.id
          } else if (el.type === 'shape') {
            const b = cachedBounds(el)
            if (px >= b.x - r && px <= b.x + b.w + r && py >= b.y - r && py <= b.y + b.h + r)
              return el.id
          } else if (el.type === 'stroke' && el.points.length >= 2) {
            // P1 性能优化: 使用边界框快速排除，避免逐点距离计算
            const b = cachedBounds(el)
            if (px < b.x - r || px > b.x + b.w + r || py < b.y - r || py > b.y + b.h + r) continue

            // P1 性能优化: 使用平方距离比较，避免 Math.sqrt 开销
            const threshold = r + el.size / 2
            const thresholdSq = threshold * threshold
            for (let j = 1; j < el.points.length; j++) {
              if (
                distToSegSq(
                  px,
                  py,
                  el.points[j - 1][0],
                  el.points[j - 1][1],
                  el.points[j][0],
                  el.points[j][1]
                ) < thresholdSq
              )
                return el.id
            }
          }
        }
        return null
      }

      // 降级: 空间索引不可用时用原有的 O(n) 遍历
      for (let i = els.length - 1; i >= 0; i--) {
        const el = els[i]
        // 跳过锁定的元素，无法选中
        if (el.locked) continue
        if (el.type === 'image') {
          if (
            px >= el.x - r &&
            px <= el.x + el.width + r &&
            py >= el.y - r &&
            py <= el.y + el.height + r
          ) {
            // 图片透明像素点击穿透
            if (isTransparentImagePixel(el, px, py)) {
              continue
            }
            return el.id
          }
        } else if (el.type === 'text') {
          if (
            px >= el.x - r &&
            px <= el.x + (el.width || 100) + r &&
            py >= el.y - r &&
            py <= el.y + (el.height || 30) + r
          )
            return el.id
        } else if (el.type === 'shape') {
          const b = cachedBounds(el)
          if (px >= b.x - r && px <= b.x + b.w + r && py >= b.y - r && py <= b.y + b.h + r)
            return el.id
        } else if (el.type === 'stroke' && el.points.length >= 2) {
          // P1 性能优化: 使用平方距离比较，避免 Math.sqrt 开销
          const threshold = r + el.size / 2
          const thresholdSq = threshold * threshold
          for (let j = 1; j < el.points.length; j++) {
            if (
              distToSegSq(
                px,
                py,
                el.points[j - 1][0],
                el.points[j - 1][1],
                el.points[j][0],
                el.points[j][1]
              ) < thresholdSq
            )
              return el.id
          }
        }
      }
      return null
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
      const selIds = state.selectedIds
      if (selIds.length === 0) return null
      const hr = 12 / (useViewStore.getState().viewBox.zoom || 1)
      const edgeHr = 10 / (useViewStore.getState().viewBox.zoom || 1)
      // 旋转手柄命中检测
      // 专业设计工具标准：选择框顶部中央的旋转手柄
      const rotateHr = 15 / (useViewStore.getState().viewBox.zoom || 1)
      for (const selId of selIds) {
        const el = state.idToElement.get(selId)
        if (!el) continue
        const b = cachedBounds(el)
        // 先检测旋转手柄（优先级高于缩放手柄）
        const rotateHandleX = b.x + b.w / 2
        const rotateHandleY = b.y - 20 / (useViewStore.getState().viewBox.zoom || 1)
        if (Math.abs(px - rotateHandleX) < rotateHr && Math.abs(py - rotateHandleY) < rotateHr) {
          return { handle: 99, id: selId, bounds: b, isRotate: true }
        }

        // 边缘手柄命中检测
        // 手柄编号约定:
        // 0-3: 角落手柄 (左上、右上、左下、右下)
        // 4: 上边缘中点
        // 5: 下边缘中点
        // 6: 左边缘中点
        // 7: 右边缘中点

        // 小形状防重叠 - 动态计算边缘手柄实际位置
        // 与 drawSelBox 中的逻辑保持一致
        const zoom = useViewStore.getState().viewBox.zoom || 1
        const cornerR = 4 / zoom
        const edgeR = 3.5 / zoom
        const minSafeWidth = (cornerR + edgeR + 4 / zoom) * 2
        const minSafeHeight = (cornerR + edgeR + 4 / zoom) * 2

        let edgeTopY = b.y
        let edgeBottomY = b.y + b.h
        let edgeLeftX = b.x
        let edgeRightX = b.x + b.w

        if (b.w < minSafeWidth) {
          const offset = (minSafeWidth - b.w) / 2 + 2 / zoom
          edgeLeftX = b.x + offset
          edgeRightX = b.x + b.w - offset
        }
        if (b.h < minSafeHeight) {
          const offset = (minSafeHeight - b.h) / 2 + 2 / zoom
          edgeTopY = b.y + offset
          edgeBottomY = b.y + b.h - offset
        }

        // 边缘手柄（优先级低于角落手柄，所以先检测角落）
        const edges: [number, number, number][] = [
          [b.x + b.w / 2, edgeTopY, 4], // 上边缘中点
          [b.x + b.w / 2, edgeBottomY, 5], // 下边缘中点
          [edgeLeftX, b.y + b.h / 2, 6], // 左边缘中点
          [edgeRightX, b.y + b.h / 2, 7], // 右边缘中点
        ]

        // 角落手柄（优先级最高）
        const corners: [number, number, number][] = [
          [b.x, b.y, 0],
          [b.x + b.w, b.y, 1],
          [b.x, b.y + b.h, 2],
          [b.x + b.w, b.y + b.h, 3],
        ]

        // 先检测角落手柄（用户优先想要抓住角落）
        for (const [cx, cy, handle] of corners) {
          if (Math.abs(px - cx) < hr && Math.abs(py - cy) < hr)
            return { handle, id: selId, bounds: b }
        }

        // 再检测边缘手柄
        for (const [ex, ey, handle] of edges) {
          if (Math.abs(px - ex) < edgeHr && Math.abs(py - ey) < edgeHr)
            return { handle, id: selId, bounds: b, isEdge: true }
        }
      }
      return null
    },
    [cachedBounds]
  )

  /**
   * 传统擦除模式（兼容模式）
   * topOnly 参数 - 只擦除最顶层元素
   * 遵循常见设计工具交互：按住 Ctrl/Cmd 擦除时只删除最顶层的重叠形状
   * 用户价值：解决重叠元素难以精确擦除单个的痛点
   */
  const eraseAtSimple = useCallback(
    (x: number, y: number, topOnly: boolean = false) => {
      const r = useAppStore.getState().size * 2 + 10,
        r2 = r * r
      const state = useAppStore.getState()

      // 使用空间索引预筛选，直接遍历候选而非全部元素
      const candidateIds = state.spatialIndex?.search({
        x: x - r,
        y: y - r,
        w: r * 2,
        h: r * 2,
      })

      // 按 Z-order 排序（后绘制的在上层）
      // 使用缓存的 idToIndex 进行 O(1) 查找和排序
      const cache = idToIndexCacheRef.current
      if (cache.els !== state.elements) {
        const map = new Map<string, number>()
        for (let i = 0; i < state.elements.length; i++) map.set(state.elements[i].id, i)
        idToIndexCacheRef.current = { els: state.elements, map }
      }
      const idToIndex = idToIndexCacheRef.current.map

      // 按 Z-order 降序排列（最上层在前）
      const sortedIds = (candidateIds ?? state.elements.map((e) => e.id)).sort((a, b) => {
        return (idToIndex.get(b) ?? 0) - (idToIndex.get(a) ?? 0)
      })

      let topElementErased = false

      for (const id of sortedIds) {
        // topOnly 模式下，擦除最顶层元素后立即停止
        if (topOnly && topElementErased) break
        if (erasedRef.current.has(id)) continue
        const el = state.idToElement.get(id)
        if (!el) continue

        if (el.type === 'stroke') {
          const segments: number[][][] = []
          let cur: number[][] = []
          let hit = false
          for (const p of el.points) {
            if ((p[0] - x) ** 2 + (p[1] - y) ** 2 < r2) {
              hit = true
              if (cur.length >= 2) segments.push(cur)
              cur = []
            } else cur.push(p)
          }
          if (cur.length >= 2) segments.push(cur)
          if (!hit) continue
          erasedRef.current.add(el.id)
          removeElement(el.id)
          for (const seg of segments)
            addElement({
              ...el,
              id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              points: seg,
            })
          // 标记已擦除最顶层元素
          topElementErased = true
        } else {
          const b = cachedBounds(el)
          if (x >= b.x - r && x <= b.x + b.w + r && y >= b.y - r && y <= b.y + b.h + r) {
            erasedRef.current.add(el.id)
            removeElement(el.id)
            // 标记已擦除最顶层元素
            topElementErased = true
          }
        }
      }
    },
    [removeElement, addElement, cachedBounds]
  )

  /**
   * 物理擦除模式
   * 支持压力感应、速度计算、笔触精确分割、压感笔倾斜
   * topOnly 参数 - 只擦除最顶层元素
   */
  const eraseAtPhysics = useCallback(
    (
      x: number,
      y: number,
      pressure: number = 0.5,
      e?: MouseEvent | TouchEvent,
      topOnly: boolean = false
    ) => {
      const state = useAppStore.getState()
      const eraserStore = useEraserStore.getState()

      // topOnly 模式下，物理擦除降级到简单模式（只擦除最顶层）
      // 物理擦除主要用于笔触精确分割，不适合精确擦除单个顶层元素
      if (topOnly) {
        eraseAtSimple(x, y, true)
        return
      }

      // 计算速度
      const now = performance.now()
      let velocity = 0
      let direction = 0

      if (lastErasePointRef.current) {
        const dx = x - lastErasePointRef.current.x
        const dy = y - lastErasePointRef.current.y
        const dt = now - lastErasePointRef.current.time
        velocity = dt > 0 ? Math.sqrt(dx * dx + dy * dy) / dt : 0
        direction = Math.atan2(dy, dx)
      }
      lastErasePointRef.current = { x, y, time: now }

      // 构建擦除点
      const erasePoint: EraserPoint = {
        x,
        y,
        pressure,
        velocity: Math.min(velocity, 10),
        direction,
        timestamp: now,
        tiltX: e && 'tiltX' in e ? (e as PointerEvent).tiltX : undefined,
        tiltY: e && 'tiltY' in e ? (e as PointerEvent).tiltY : undefined,
      }

      // 设置橡皮擦大小
      eraserStore.engine.setBaseSize(useAppStore.getState().size)

      // 执行物理擦除
      const result = eraserStore.addErasePoint(erasePoint, state.elements)

      // 发射橡皮屑粒子
      eraserStore.emitParticles(erasePoint)

      if (result) {
        // 应用擦除结果
        for (const modified of result.modifiedStrokes) {
          if (erasedRef.current.has(modified.id)) continue

          if (modified.action === 'delete') {
            erasedRef.current.add(modified.id)
            removeElement(modified.id)
          } else if (modified.action === 'split' && modified.segments) {
            erasedRef.current.add(modified.id)
            removeElement(modified.id)
            for (const seg of modified.segments) {
              addElement(seg)
            }
          }
        }
      } else {
        // 降级到简单模式
        eraseAtSimple(x, y)
      }
    },
    [removeElement, addElement, eraseAtSimple]
  )

  /**
   * 统一擦除入口
   * 自动选择物理/简单模式
   * topOnly 参数 - 只擦除最顶层元素
   */
  const eraseAt = useCallback(
    (
      x: number,
      y: number,
      pressure?: number,
      e?: MouseEvent | TouchEvent,
      topOnly: boolean = false
    ) => {
      const eraserStore = useEraserStore.getState()
      if (eraserStore.shouldUsePhysics()) {
        eraseAtPhysics(x, y, pressure, e, topOnly)
      } else {
        eraseAtSimple(x, y, topOnly)
      }
    },
    [eraseAtPhysics, eraseAtSimple]
  )

  const handleStart = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const pos = getPos(e)
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
        const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
        const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
        spacePanRef.current.wasPanning = true
        startPan(cx, cy)
        return
      }

      if (curTool === 'pan') {
        const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
        const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
        startPan(cx, cy)
        return
      }
      if (curTool === 'select') {
        const h = hitHandle(pos.x, pos.y)
        if (h) {
          const el = useAppStore.getState().idToElement.get(h.id)
          if (el) {
            // 旋转手柄交互
            // 支持批量旋转多个选中元素
            if (h.isRotate) {
              const st = useAppStore.getState()
              const selectedIds = st.selectedIds.length > 0 ? st.selectedIds : [h.id]

              // 计算所有选中元素的共同中心点（用于批量旋转）
              let minX = Infinity,
                minY = Infinity,
                maxX = -Infinity,
                maxY = -Infinity
              const origRotations = new Map<string, number>()

              for (const id of selectedIds) {
                const selEl = st.idToElement.get(id)
                if (!selEl) continue
                const b = cachedBounds(selEl)
                minX = Math.min(minX, b.x)
                minY = Math.min(minY, b.y)
                maxX = Math.max(maxX, b.x + b.w)
                maxY = Math.max(maxY, b.y + b.h)
                origRotations.set(id, (selEl as any).rotation || 0)
              }

              // 初始化旋转状态
              rotateRef.current = {
                ids: selectedIds,
                startX: pos.x,
                startY: pos.y,
                origRotations,
                // 计算共同中心点（所有选中元素的边界框中心）
                commonCenterX: (minX + maxX) / 2,
                commonCenterY: (minY + maxY) / 2,
              }
            } else {
              // 缩放手柄
              resizeRef.current = {
                ...h,
                startX: pos.x,
                startY: pos.y,
                origBounds: cachedBounds(el),
                origElement: { ...el } as CanvasElement,
              }
            }
          }
          scheduleRedraw()
          return
        }
        const hit = hitTest(pos.x, pos.y)
        if (hit) {
          const st = useAppStore.getState()
          // 组选择逻辑 - 点击组内元素时选中整个组
          // 参考: 通用编辑器安全处理做法
          const hitEl = st.idToElement.get(hit)
          let effectiveHit = hit
          const groupMembers: string[] = []

          // 如果点击的元素属于某个组，选中整个组
          if (hitEl?.groupId) {
            const groupId = hitEl.groupId
            // 收集该组的所有成员
            for (const el of st.elements) {
              if (el.groupId === groupId) {
                groupMembers.push(el.id)
              }
            }
            // 如果组内成员都已选中，则使用原点击元素（允许单独选择）
            // 否则选中整个组
            const allGroupSelected = groupMembers.every((id) => st.selectedIds.includes(id))
            if (!allGroupSelected && groupMembers.length > 0) {
              effectiveHit = groupMembers[0]
            }
          }

          const ids = st.selectedIds.includes(effectiveHit)
            ? st.selectedIds
            : groupMembers.length > 0
              ? groupMembers
              : [effectiveHit]

          // Cmd/Ctrl+click 添加到多选
          // 匹配 Figma/Sketch/Photoshop 专业工具标准：Shift 或 Cmd/Ctrl 都支持多选
          const isMultiSelectKey = e.shiftKey || e.metaKey || e.ctrlKey

          if (isMultiSelectKey) {
            // Shift/Cmd/Ctrl+click: 切换选中状态（添加或移除）
            if (groupMembers.length > 0) {
              // 点击组元素: 切换整个组的选中状态
              const allSelected = groupMembers.every((id) => st.selectedIds.includes(id))
              if (allSelected) {
                setSelectedIds(st.selectedIds.filter((id) => !groupMembers.includes(id)))
              } else {
                setSelectedIds([...new Set([...st.selectedIds, ...groupMembers])])
              }
            } else if (st.selectedIds.includes(hit)) {
              // 已选中的元素: 从选区中移除
              setSelectedIds(st.selectedIds.filter((id) => id !== hit))
            } else {
              // 未选中的元素: 添加到选区
              setSelectedIds([...st.selectedIds, hit])
            }
          } else {
            if (groupMembers.length > 0) {
              // 点击组元素: 选中整个组
              const allGroupSelected = groupMembers.every((id) => st.selectedIds.includes(id))
              if (!allGroupSelected) {
                setSelectedIds(groupMembers)
              }
            } else if (!st.selectedIds.includes(hit)) {
              setSelectedIds([hit])
            }
          }
          const startPositions = new Map<string, { x: number; y: number }>()
          // 使用 idToElement O(1) 查找替代遍历所有 elements
          // 原实现: 1000 元素 + 选中 5 个 = 1000 * O(5) = 5000 次比较
          // 新实现: O(ids.length) 次 Map 查找
          for (const id of ids) {
            const el = st.idToElement.get(id)
            if (!el) continue
            if (el.type === 'stroke')
              startPositions.set(id, { x: el.points[0]?.[0] ?? 0, y: el.points[0]?.[1] ?? 0 })
            else if (el.type === 'shape' || el.type === 'text' || el.type === 'image')
              startPositions.set(id, { x: el.x, y: el.y })
          }
          // 记录屏幕坐标用于拖动阈值检测
          // 使用屏幕坐标而非世界坐标，确保阈值在所有缩放级别下一致
          const screenX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
          const screenY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY

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
            dragStarted: false,
            startScreenX: screenX,
            startScreenY: screenY,
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
          const screenX = (pos.x - curVB.x) * curVB.zoom + rect.left
          const screenY = (pos.y - curVB.y) * curVB.zoom + rect.top
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
              { id: existing.id, content: existing.content, fontSize: existing.fontSize }
            )
          else startEditText(pos.x, pos.y, screenX, screenY, curColor)
          setTimeout(() => textRef.current?.focus(), 50)
        }
        return
      }
      drawingRef.current = true
      erasedRef.current = new Set()
      if (curTool === 'pen') currentPtsRef.current = [[pos.x, pos.y]]
      else if (curTool === 'eraser') {
        // P1-4 性能优化: 删除无用的全量快照克隆
        // batchErase 不再需要 preEraseSnapshot，避免每次擦除开始时克隆所有元素
        // 检测 Ctrl/Cmd 键，只擦除最顶层元素
        const topOnly = e.metaKey || e.ctrlKey
        eraseAt(pos.x, pos.y, undefined, e, topOnly)
      } else {
        shapeStartRef.current = pos
        currentShapeRef.current = {
          type: 'shape',
          id: `shape-${Date.now()}`,
          kind: curTool as ShapeKind,
          x: pos.x,
          y: pos.y,
          w: 0,
          h: 0,
          color: curColor,
          size: curSize,
          fillColor: curFillColor !== 'transparent' ? curFillColor : undefined,
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      getPos,
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
    ]
  )

  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const pos = getPos(e)
      mouseRef.current = pos

      // 鹰眼模式下更新目标位置
      // 鼠标移动时实时更新用户选择的放大目标位置
      const vs = useViewStore.getState()
      if (vs.eagleEye.isActive) {
        vs.updateEagleEyeTarget(pos.x, pos.y)
      }

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
        const dx = screenX - rightClickPanRef.current.startScreenX
        const dy = screenY - rightClickPanRef.current.startScreenY
        const distSq = dx * dx + dy * dy

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

      // P1-5 性能优化: 仅在橡皮擦工具时更新粒子系统指针位置
      // 避免每次 mousemove（60fps）都调用，即使不在擦除模式
      const curTool = useAppStore.getState().tool
      if (curTool === 'eraser') {
        const { particleSystem, particlesEnabled } = useEraserStore.getState()
        if (particlesEnabled && particleSystem) {
          particleSystem.updatePointerPosition(pos.x, pos.y, 1 / 60)
        }
      }
      if (curTool === 'select' && resizeRef.current) {
        const { handle, id, startX, startY, origBounds: ob } = resizeRef.current
        const totalDx = pos.x - startX,
          totalDy = pos.y - startY

        if (ob.w < 1 || ob.h < 1) {
          scheduleRedraw()
          return
        }

        // 边缘手柄缩放支持
        // 手柄编号约定:
        // 0-3: 角落手柄 (左上、右上、左下、右下) - 同时调整宽高
        // 4: 上边缘中点 - 只调整高度
        // 5: 下边缘中点 - 只调整高度
        // 6: 左边缘中点 - 只调整宽度
        // 7: 右边缘中点 - 只调整宽度

        // 角落手柄锚点（对角点）
        const cornerAnchors: [number, number][] = [
          [ob.x + ob.w, ob.y + ob.h], // 0: 左上 -> 右下锚点
          [ob.x, ob.y + ob.h], // 1: 右上 -> 左下锚点
          [ob.x + ob.w, ob.y], // 2: 左下 -> 右上锚点
          [ob.x, ob.y], // 3: 右下 -> 左上锚点
        ]

        // 角落手柄原始位置
        const cornerOrigins: [number, number][] = [
          [ob.x, ob.y], // 0: 左上
          [ob.x + ob.w, ob.y], // 1: 右上
          [ob.x, ob.y + ob.h], // 2: 左下
          [ob.x + ob.w, ob.y + ob.h], // 3: 右下
        ]

        let ax = 0,
          ay = 0
        let nsx = 1,
          nsy = 1

        if (handle >= 0 && handle <= 3) {
          // 角落手柄：同时调整宽高
          ax = cornerAnchors[handle][0]
          ay = cornerAnchors[handle][1]
          const orig = cornerOrigins[handle]
          const targetX = orig[0] + totalDx
          const targetY = orig[1] + totalDy

          nsx = Math.max(
            0.1,
            Math.min(
              10,
              handle === 0 || handle === 2
                ? (targetX - ax) / (orig[0] - ax || 1)
                : (ax - targetX) / (ax - orig[0] || 1)
            )
          )
          nsy = Math.max(
            0.1,
            Math.min(
              10,
              handle === 0 || handle === 1
                ? (targetY - ay) / (orig[1] - ay || 1)
                : (ay - targetY) / (ay - orig[1] || 1)
            )
          )

          // Images preserve aspect ratio by default; Shift allows freeform image resizing.
          // Non-image elements keep the existing Shift-to-preserve behavior.
          const shiftPressed = 'shiftKey' in e && (e as MouseEvent).shiftKey
          if (
            shouldPreserveResizeAspectRatio(
              resizeRef.current.origElement?.type,
              handle,
              shiftPressed
            )
          ) {
            const locked = lockResizeScalesToAspectRatio(nsx, nsy)
            nsx = locked.sx
            nsy = locked.sy
          }
        } else if (handle === 4) {
          // 上边缘中点：只调整高度（向下锚定）
          ax = ob.x + ob.w / 2
          ay = ob.y + ob.h // 底部作为锚点
          const targetY = ob.y + totalDy
          nsy = Math.max(0.1, Math.min(10, (ay - targetY) / ob.h))
        } else if (handle === 5) {
          // 下边缘中点：只调整高度（向上锚定）
          ax = ob.x + ob.w / 2
          ay = ob.y // 顶部作为锚点
          const targetY = ob.y + ob.h + totalDy
          nsy = Math.max(0.1, Math.min(10, (targetY - ay) / ob.h))
        } else if (handle === 6) {
          // 左边缘中点：只调整宽度（向右锚定）
          ax = ob.x + ob.w // 右侧作为锚点
          ay = ob.y + ob.h / 2
          const targetX = ob.x + totalDx
          nsx = Math.max(0.1, Math.min(10, (ax - targetX) / ob.w))
        } else if (handle === 7) {
          // 右边缘中点：只调整宽度（向左锚定）
          ax = ob.x // 左侧作为锚点
          ay = ob.y + ob.h / 2
          const targetX = ob.x + ob.w + totalDx
          nsx = Math.max(0.1, Math.min(10, (targetX - ax) / ob.w))
        }

        resizeElementById(id, ax, ay, nsx, nsy)
        scheduleRedraw()
        return
      }
      // 旋转拖拽交互
      // 支持批量旋转多个选中元素
      // 专业设计工具标准：拖拽选择框顶部的旋转手柄旋转元素
      if (curTool === 'select' && rotateRef.current) {
        const { ids, startX, startY, origRotations, commonCenterX, commonCenterY } =
          rotateRef.current

        // 计算起始向量：从共同中心点到起始拖拽点
        const startVecX = startX - commonCenterX
        const startVecY = startY - commonCenterY
        // 计算当前向量：从共同中心点到当前鼠标位置
        const currentVecX = pos.x - commonCenterX
        const currentVecY = pos.y - commonCenterY

        // 使用 Math.atan2 计算两个向量的角度
        const startAngle = Math.atan2(startVecY, startVecX)
        const currentAngle = Math.atan2(currentVecY, currentVecX)

        // 计算角度差（弧度）
        let angleDelta = currentAngle - startAngle

        // Shift 键步进旋转
        // 专业设计工具标准：按住 Shift 键时旋转对齐到 15° 的整数倍
        const shiftPressed = 'shiftKey' in e && (e as MouseEvent).shiftKey
        if (shiftPressed) {
          // 15° = π/12 弧度
          const step = Math.PI / 12
          // 获取第一个元素的原始旋转角度作为参考（所有元素相对旋转相同角度）
          const firstOrigRotation = origRotations.get(ids[0]) || 0
          const totalAngle = firstOrigRotation + angleDelta
          // 对齐到最近的 15° 步进
          const snappedAngle = Math.round(totalAngle / step) * step
          angleDelta = snappedAngle - firstOrigRotation
        }

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
        const x1 = Math.min(m.startX, m.endX)
        const y1 = Math.min(m.startY, m.endY)
        const x2 = Math.max(m.startX, m.endX)
        const y2 = Math.max(m.startY, m.endY)

        // 只有当框选区域有一定大小时才触发自动拖拽
        const marqueeSize = Math.max(x2 - x1, y2 - y1)
        const now = performance.now()

        if (marqueeToDragRef.current.enabled && marqueeSize > 20) {
          // 检测鼠标是否向选择区域内部移动
          const isMovingInside = pos.x >= x1 && pos.x <= x2 && pos.y >= y1 && pos.y <= y2

          // 检测鼠标移动方向是否是"收缩"而不是"扩大"
          const prevWidth = x2 - x1
          const prevHeight = y2 - y1
          const newX1 = Math.min(m.startX, pos.x)
          const newY1 = Math.min(m.startY, pos.y)
          const newX2 = Math.max(m.startX, pos.x)
          const newY2 = Math.max(m.startY, pos.y)
          const newWidth = newX2 - newX1
          const newHeight = newY2 - newY1

          const isShrinking = newWidth < prevWidth * 0.95 || newHeight < prevHeight * 0.95

          // 如果鼠标在选择区域内，或者区域在收缩，说明用户想开始拖拽
          if ((isMovingInside || isShrinking) && now - marqueeToDragRef.current.lastMoveTime > 50) {
            // 先完成选择
            const st = useAppStore.getState()
            const candidateIds = st.spatialIndex?.search({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 })
            const hits: string[] = []
            for (const id of candidateIds ?? []) {
              const el = st.idToElement.get(id)
              if (!el) continue
              const b = cachedBounds(el)
              if (b.x + b.w >= x1 && b.x <= x2 && b.y + b.h >= y1 && b.y <= y2) hits.push(el.id)
            }

            if (hits.length > 0) {
              setSelectedIds(hits)

              // 立即进入拖拽模式，无缝衔接
              const startPositions = new Map<string, { x: number; y: number }>()
              for (const id of hits) {
                const el = st.idToElement.get(id)
                if (!el) continue
                if (el.type === 'stroke')
                  startPositions.set(id, { x: el.points[0]?.[0] ?? 0, y: el.points[0]?.[1] ?? 0 })
                else if (el.type === 'shape' || el.type === 'text' || el.type === 'image')
                  startPositions.set(id, { x: el.x, y: el.y })
              }

              const screenX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
              const screenY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY

              dragRef.current = {
                x: pos.x,
                y: pos.y,
                id: hits[0],
                startPositions,
                dragStarted: true, // 直接跳过阈值检测，立即开始拖拽
                startScreenX: screenX,
                startScreenY: screenY,
              }

              marqueeRef.current = null
              marqueeToDragRef.current.selectionComplete = true
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
          const dxScreen = screenX - dragRef.current.startScreenX
          const dyScreen = screenY - dragRef.current.startScreenY
          const distSq = dxScreen * dxScreen + dyScreen * dyScreen

          // 移动距离小于阈值时，不执行拖动
          if (distSq < DRAG_THRESHOLD * DRAG_THRESHOLD) {
            return
          }

          // 超过阈值，标记拖动开始
          dragRef.current.dragStarted = true
        }

        // Alt 拖拽复制时保持原始元素位置不变
        // 问题: 之前按住 Alt 拖拽时，原始元素会跟着鼠标一起移动
        // 修复: 匹配 Figma/Excalidraw/Sketch 专业工具标准行为 - 原始元素保持原位，只有新复制的元素跟随鼠标
        // 用户价值: 这是所有专业设计软件的标准交互，用户有强烈的心理预期
        if (
          altDragDuplicateRef.current.isDuplicating &&
          !altDragDuplicateRef.current.hasDuplicated &&
          altDragDuplicateRef.current.originalSelectedIds.length > 0
        ) {
          const st = useAppStore.getState()
          const newIds: string[] = []
          const newStartPositions = new Map<string, { x: number; y: number }>()

          // 1. 复制所有原始选中元素
          for (const id of altDragDuplicateRef.current.originalSelectedIds) {
            const el = st.idToElement.get(id)
            if (!el) continue

            // 深拷贝元素，生成新 ID
            const newId = `${el.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
            const newEl = { ...el, id: newId }

            // stroke 类型需要特殊处理 points 数组
            if (el.type === 'stroke') {
              ;(newEl as any).points = el.points.map((p: number[]) => [...p])
            }

            addElement(newEl)
            newIds.push(newId)

            // 记录新元素的起始位置（用于拖拽计算）
            if (el.type === 'stroke') {
              newStartPositions.set(newId, {
                x: (el as any).points[0]?.[0] ?? 0,
                y: (el as any).points[0]?.[1] ?? 0,
              })
            } else if (el.type === 'shape' || el.type === 'text' || el.type === 'image') {
              newStartPositions.set(newId, { x: (el as any).x, y: (el as any).y })
            }
          }

          // 2. 关键修复: 将原始元素移回原位（撤销已发生的移动）
          // 因为在复制发生前，原始元素已经跟随鼠标移动了一段距离
          // 我们需要把它们移回 startPositions 记录的起始位置
          const originalIds = altDragDuplicateRef.current.originalSelectedIds
          const startPositions = dragRef.current.startPositions

          if (!startPositions) {
            // 如果没有起始位置记录，直接跳过修复（理论上不会发生）
            setSelectedIds(newIds)
            dragRef.current.startPositions = newStartPositions
            altDragDuplicateRef.current.hasDuplicated = true
            return
          }

          for (const id of originalIds) {
            const el = st.idToElement.get(id)
            if (!el) continue

            const startPos = startPositions.get(id)
            if (!startPos) continue

            if (el.type === 'stroke') {
              // 计算 stroke 当前位置与起始位置的偏移
              const currentX = el.points[0]?.[0] ?? 0
              const currentY = el.points[0]?.[1] ?? 0
              const dx = startPos.x - currentX
              const dy = startPos.y - currentY

              // 只有当确实有偏移时才移动
              if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
                moveElementById(id, dx, dy)
              }
            } else if (el.type === 'shape' || el.type === 'text' || el.type === 'image') {
              // 计算元素当前位置与起始位置的偏移
              const dx = startPos.x - el.x
              const dy = startPos.y - el.y

              // 只有当确实有偏移时才移动
              if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
                moveElementById(id, dx, dy)
              }
            }
          }

          // 3. 选中新复制的元素（让用户拖拽的是新元素）
          setSelectedIds(newIds)

          // 4. 更新 dragRef 的 startPositions 为新元素的位置
          dragRef.current.startPositions = newStartPositions

          // 5. 标记已复制，防止多次复制
          altDragDuplicateRef.current.hasDuplicated = true
        }

        let dx = pos.x - dragRef.current.x,
          dy = pos.y - dragRef.current.y
        const st = useAppStore.getState()
        const ids = st.selectedIds.length > 0 ? st.selectedIds : [dragRef.current.id]
        const idSet = new Set(ids)
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity
        for (const el of st.elements) {
          if (!idSet.has(el.id)) continue
          const b = cachedBounds(el)
          minX = Math.min(minX, b.x)
          minY = Math.min(minY, b.y)
          maxX = Math.max(maxX, b.x + b.w)
          maxY = Math.max(maxY, b.y + b.h)
        }
        const snap = findSnaps(
          { x: minX + dx, y: minY + dy, w: maxX - minX, h: maxY - minY },
          idSet
        )
        dx += snap.dx
        dy += snap.dy
        snapLinesRef.current = { x: snap.linesX, y: snap.linesY }
        if (ids.length > 1) moveElementsById(ids, dx, dy)
        else moveElementById(dragRef.current.id, dx, dy)
        dragRef.current = {
          x: pos.x + snap.dx,
          y: pos.y + snap.dy,
          id: dragRef.current.id,
          dragStarted: dragRef.current.dragStarted,
          startScreenX: dragRef.current.startScreenX,
          startScreenY: dragRef.current.startScreenY,
        }
        scheduleRedraw()
        return
      }
      if (curTool === 'pan' && useViewStore.getState().isPanning) {
        const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
        const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
        updatePan(cx, cy)
        scheduleRedraw()
        return
      }
      if (curTool === 'eraser') {
        // P0 性能优化: 环形缓冲区写入擦除轨迹 - O(1) 无 GC
        // 原实现: 每次 mousemove 可能触发 splice，产生数组重排和 GC
        // 新实现: 固定大小环形缓冲区，覆盖旧数据，零分配
        const now = performance.now()
        const idx = eraserTrailIndexRef.current
        eraserTrailRef.current[idx].x = pos.x
        eraserTrailRef.current[idx].y = pos.y
        eraserTrailRef.current[idx].time = now
        eraserTrailIndexRef.current = (idx + 1) & 63 // 位运算模 64
        eraserTrailCountRef.current = Math.min(eraserTrailCountRef.current + 1, 64)

        // 检测 Ctrl/Cmd 键，只擦除最顶层元素
        const topOnly = e.metaKey || e.ctrlKey
        if (drawingRef.current) eraseAt(pos.x, pos.y, undefined, e, topOnly)
        scheduleRedraw()
        return
      }
      if (!drawingRef.current) return
      if (curTool === 'pen') {
        // 跟踪笔触速度
        if (currentPtsRef.current.length > 0) {
          const last = currentPtsRef.current[currentPtsRef.current.length - 1]
          const dx = pos.x - last[0]
          const dy = pos.y - last[1]
          penVelocityRef.current = Math.sqrt(dx * dx + dy * dy)
        }
        currentPtsRef.current.push([pos.x, pos.y])
      } else if (shapeStartRef.current && currentShapeRef.current) {
        let w = pos.x - shapeStartRef.current.x,
          h = pos.y - shapeStartRef.current.y
        const shift = 'shiftKey' in e && (e as MouseEvent).shiftKey
        if (
          shift &&
          (currentShapeRef.current.kind === 'rectangle' ||
            currentShapeRef.current.kind === 'circle')
        ) {
          const sz = Math.max(Math.abs(w), Math.abs(h))
          w = sz * Math.sign(w || 1)
          h = sz * Math.sign(h || 1)
        }
        currentShapeRef.current = { ...currentShapeRef.current, w, h }
      }
      scheduleRedraw()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      getPos,
      updatePan,
      scheduleRedraw,
      moveElementById,
      moveElementsById,
      resizeElementById,
      cachedBounds,
      findSnaps,
      snapLinesRef,
      eraseAt,
    ]
  )

  const handleEnd = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()

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
          })
          if (el) {
            addElement(el)
          }
          currentPtsRef.current = []
          penVelocityRef.current = 0
        } else if (curTool === 'eraser') {
          // P1-4 性能优化: 删除无用的全量快照克隆
          erasedRef.current.clear()
          currentPtsRef.current = []
        } else if (currentShapeRef.current) {
          if (Math.abs(currentShapeRef.current.w) > 2 || Math.abs(currentShapeRef.current.h) > 2) {
            // P12 箭头绑定: 检测箭头/线条端点是否靠近形状边缘
            // 如果靠近，自动建立绑定关系
            const shape = currentShapeRef.current
            if (shape.kind === 'arrow' || shape.kind === 'line') {
              const st = useAppStore.getState()
              // 计算起点和终点坐标
              const startPoint: [number, number] = [shape.x, shape.y]
              const endPoint: [number, number] = [shape.x + shape.w, shape.y + shape.h]

              // 检测起点绑定
              const startBinding = tryBindToShape(startPoint, st.elements, shape.id)
              // 检测终点绑定
              const endBinding = tryBindToShape(endPoint, st.elements, shape.id)

              // 如果有绑定，更新形状的绑定信息
              if (startBinding || endBinding) {
                const updatedShape = { ...shape }
                if (startBinding) {
                  updatedShape.startBinding = startBinding
                }
                if (endBinding) {
                  updatedShape.endBinding = endBinding
                }
                addElement(updatedShape)
              } else {
                addElement(shape)
              }
            } else {
              addElement(shape)
            }
          }
          currentShapeRef.current = null
          shapeStartRef.current = null
        }
        scheduleRedraw()
        return
      }
      const curTool = useAppStore.getState().tool
      if (curTool === 'select') {
        if (marqueeRef.current) {
          const m = marqueeRef.current
          const x1 = Math.min(m.startX, m.endX),
            y1 = Math.min(m.startY, m.endY),
            x2 = Math.max(m.startX, m.endX),
            y2 = Math.max(m.startY, m.endY)
          if (x2 - x1 > 3 || y2 - y1 > 3) {
            // P1-2 性能修复: 使用空间索引预筛选框选范围内的元素
            // 原实现: O(n) 遍历所有元素检测框选命中
            // 新实现: O(log n) R-tree 查询 + 少量精确检测
            const st = useAppStore.getState()
            const candidateIds = st.spatialIndex?.search({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 })
            const hits: string[] = []
            for (const id of candidateIds ?? []) {
              const el = st.idToElement.get(id)
              if (!el) continue
              const b = cachedBounds(el)
              if (b.x + b.w >= x1 && b.x <= x2 && b.y + b.h >= y1 && b.y <= y2) hits.push(el.id)
            }

            // 按住 Cmd/Ctrl 框选追加选区
            // 匹配 Figma/Sketch/Photoshop 行业标准：按住修饰键框选时追加选区而非替换
            const isAppendSelectKey = e.metaKey || e.ctrlKey
            if (isAppendSelectKey) {
              // 按住 Cmd/Ctrl 时：将新选中的元素追加到现有选区
              // 使用 Set 去重，确保同一元素不会被重复选中
              setSelectedIds([...new Set([...st.selectedIds, ...hits])])
            } else {
              // 不按住修饰键时：替换选区（原有行为）
              setSelectedIds(hits)
            }
          }
          marqueeRef.current = null
        }
        if (dragRef.current?.startPositions) {
          const st = useAppStore.getState()
          const sp = dragRef.current.startPositions
          const deltas: { id: string; dx: number; dy: number }[] = []
          for (const el of st.elements) {
            const startPos = sp.get(el.id)
            if (!startPos) continue
            let cx: number, cy: number
            if (el.type === 'stroke') {
              cx = el.points[0]?.[0] ?? 0
              cy = el.points[0]?.[1] ?? 0
            } else if (el.type === 'shape' || el.type === 'text' || el.type === 'image') {
              cx = el.x
              cy = el.y
            } else {
              cx = 0
              cy = 0
            }
            const dx = cx - startPos.x,
              dy = cy - startPos.y
            if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) deltas.push({ id: el.id, dx, dy })
          }
          if (deltas.length > 0) useAppStore.getState().pushUndo({ type: 'move', deltas })
        }
        const resizeCur = resizeRef.current
        if (resizeCur?.origElement) {
          const afterEl = useAppStore.getState().idToElement.get(resizeCur.id)
          if (afterEl) {
            const origEl = resizeCur.origElement
            useAppStore.getState().pushUndo({
              type: 'clear',
              snapshot: useAppStore
                .getState()
                .elements.map((e) => (e.id === resizeCur.id ? origEl : e)),
            })
          }
        }
        // 旋转结束处理
        // 支持批量旋转多个元素的撤销
        // 记录旋转操作到撤销栈
        const rotateCur = rotateRef.current
        if (rotateCur) {
          const { ids, origRotations } = rotateCur
          const idSet = new Set(ids)
          // 保存所有旋转元素的原始状态到撤销栈
          useAppStore.getState().pushUndo({
            type: 'clear',
            snapshot: useAppStore.getState().elements.map((e) => {
              if (idSet.has(e.id)) {
                // 创建旋转前的元素副本
                const origEl = { ...e }
                const origRotation = origRotations.get(e.id) || 0
                ;(origEl as any).rotation = origRotation
                return origEl
              }
              return e
            }),
          })
        }
        dragRef.current = null
        resizeRef.current = null
        rotateRef.current = null
        snapLinesRef.current = { x: [], y: [] }
        // 重置 Lasso 拖拽状态
        marqueeToDragRef.current.selectionComplete = false
        // 重置 Alt 拖拽复制状态
        altDragDuplicateRef.current = {
          ...altDragDuplicateRef.current,
          isDuplicating: false,
          originalSelectedIds: [],
          hasDuplicated: false,
        }
        scheduleRedraw()
        return
      }
      if (curTool === 'pan') {
        endPan()
        return
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addElement, endPan, setSelectedIds, scheduleRedraw, cachedBounds]
  )

  // Pointer events
  const handleStartRef = useRef<(e: MouseEvent | TouchEvent) => void>(() => {})
  const handleMoveRef = useRef<(e: MouseEvent | TouchEvent) => void>(() => {})
  const handleEndRef = useRef<(e: MouseEvent | TouchEvent) => void>(() => {})
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
    const canvas = canvasRef.current
    if (!canvas) return
    const onStart = (e: MouseEvent | TouchEvent) => handleStartRef.current(e)
    const onMove = (e: MouseEvent | TouchEvent) => handleMoveRef.current(e)
    const onEnd = (e: MouseEvent | TouchEvent) => handleEndRef.current(e)
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const vb = useViewStore.getState().viewBox
      const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      const newZoom = Math.max(0.2, Math.min(5, vb.zoom * zoomFactor))
      const worldX = mouseX / vb.zoom + vb.x
      const worldY = mouseY / vb.zoom + vb.y
      const newX = worldX - mouseX / newZoom
      const newY = worldY - mouseY / newZoom
      useViewStore.getState().setViewBox({ x: newX, y: newY, zoom: newZoom })
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
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    canvas.addEventListener('mousedown', onStart)
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseup', onEnd)
    canvas.addEventListener('mouseleave', onEnd)

    // 右键拖拽平移画布
    // 当正在进行右键平移时，阻止默认右键菜单
    const onContextMenu = (e: MouseEvent) => {
      if (rightClickPanRef.current.isPanning || rightClickPanRef.current.moved) {
        e.preventDefault()
      }
    }
    canvas.addEventListener('contextmenu', onContextMenu)

    // P12-双击交互体系
    // 双击文本元素进入编辑模式
    // 双击形状内部添加文本
    // 遵循常见设计工具交互：双击直接操作，无需切换工具
    const onDblClick = (e: MouseEvent) => {
      if (useAppStore.getState().tool !== 'select') return
      const pos = getPos(e)
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
        const screenX = (el.x - vb.x) * vb.zoom + rect.left
        const screenY = (el.y - vb.y) * vb.zoom + rect.top
        startEditText(el.x, el.y, screenX, screenY, el.color, {
          id: el.id,
          content: el.content,
          fontSize: el.fontSize,
        })
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
        const screenX = (textX - vb.x) * vb.zoom + rect.left
        const screenY = (textY - vb.y) * vb.zoom + rect.top

        // 使用形状的颜色作为文本颜色，保持视觉一致性
        // 默认字号 16，与工具栏默认一致
        startEditText(textX, textY, screenX, screenY, el.color)
        setTimeout(() => textRef.current?.focus(), 50)
      }
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('dblclick', onDblClick)
    canvas.addEventListener('touchstart', onStart, { passive: false })
    canvas.addEventListener('touchmove', onMove, { passive: false })
    canvas.addEventListener('touchend', onEnd, { passive: false })
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)

      canvas.removeEventListener('mousedown', onStart)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseup', onEnd)
      canvas.removeEventListener('mouseleave', onEnd)
      canvas.removeEventListener('contextmenu', onContextMenu)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('dblclick', onDblClick)
      canvas.removeEventListener('touchstart', onStart)
      canvas.removeEventListener('touchmove', onMove)
      canvas.removeEventListener('touchend', onEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef])

  // Touch pinch zoom
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let pinching = false,
      pinchDist = 0,
      pinchMid = { x: 0, y: 0 }
    function getTouchDist(e: TouchEvent) {
      const dx = e.touches[0].clientX - e.touches[1].clientX,
        dy = e.touches[0].clientY - e.touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }
    function getTouchMid(e: TouchEvent) {
      return {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      }
    }
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        // Cancel any ongoing single-finger drawing when a second finger touches
        if (drawingRef.current) {
          drawingRef.current = false
          currentPtsRef.current = []
          currentShapeRef.current = null
          shapeStartRef.current = null
        }
        pinching = true
        pinchDist = getTouchDist(e)
        pinchMid = getTouchMid(e)
        e.preventDefault()
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (!pinching || e.touches.length < 2) return
      e.preventDefault()
      const newDist = getTouchDist(e),
        newMid = getTouchMid(e),
        scale = Math.max(0.1, Math.min(10, newDist / pinchDist))
      const vb = useViewStore.getState().viewBox
      const newZoom = Math.max(0.2, Math.min(5, vb.zoom * scale))

      // Zoom around the pinch midpoint: keep the world point under the midpoint fixed
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) {
        pinchDist = newDist
        pinchMid = newMid
        return
      }
      const midX = newMid.x - rect.left
      const midY = newMid.y - rect.top
      const worldX = midX / vb.zoom + vb.x
      const worldY = midY / vb.zoom + vb.y
      const newX = worldX - midX / newZoom
      const newY = worldY - midY / newZoom
      // Also account for midpoint panning (finger movement)
      const panDx = (newMid.x - pinchMid.x) / newZoom
      const panDy = (newMid.y - pinchMid.y) / newZoom
      useViewStore.getState().setViewBox({
        x: newX - panDx,
        y: newY - panDy,
        zoom: newZoom,
      })
      pinchDist = newDist
      pinchMid = newMid
      scheduleRedraw()
    }
    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) pinching = false
    }
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd, { passive: false })
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
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
    const selEls = els.filter((e) => selSet.has(e.id))
    if (selEls.length === 0) return
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (const el of selEls) {
      const b = elementBounds(el)
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.w)
      maxY = Math.max(maxY, b.y + b.h)
    }
    const pad = 8,
      w = maxX - minX + pad * 2,
      h = maxY - minY + pad * 2
    const offscreen = document.createElement('canvas')
    const odpr = window.devicePixelRatio || 1
    offscreen.width = w * odpr
    offscreen.height = h * odpr
    const octx = offscreen.getContext('2d')
    if (!octx) return
    octx.setTransform(odpr, 0, 0, odpr, 0, 0)
    octx.translate(-minX + pad, -minY + pad)
    const dark = useThemeStore.getState().isDarkMode
    for (const el of selEls) drawElement(octx, el, dark)
    try {
      const blob = await new Promise<Blob | null>((r) => offscreen.toBlob(r, 'image/png'))
      if (blob) await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      // Clipboard API may be blocked by browser permissions
    } catch {
      /* Clipboard API may fail silently */
    }
  }

  // getDrawState for renderer
  const getDrawState = useCallback(() => {
    // P0 性能优化: 从环形缓冲区中过滤有效轨迹点
    // 只返回最近 300ms 内的点，渲染器无需处理过期数据
    const now = performance.now()
    const trail: { x: number; y: number; time: number }[] = []
    const count = eraserTrailCountRef.current
    for (let i = 0; i < count; i++) {
      const idx = (eraserTrailIndexRef.current - count + i + 64) & 63
      const pt = eraserTrailRef.current[idx]
      if (now - pt.time <= 300) trail.push(pt)
    }

    // 旋转角度显示
    // 拖拽旋转手柄时计算并返回当前旋转角度值（度数）
    // 用户价值：精确控制旋转角度，专业设计时必备
    let rotationAngle: { angle: number; centerX: number; centerY: number } | null = null
    if (rotateRef.current) {
      const { startX, startY, commonCenterX, commonCenterY, origRotations, ids } = rotateRef.current
      const mouseX = mouseRef.current?.x ?? startX
      const mouseY = mouseRef.current?.y ?? startY

      // 计算从起始点到当前点的角度变化
      const startVecX = startX - commonCenterX
      const startVecY = startY - commonCenterY
      const startAngle = Math.atan2(startVecY, startVecX)

      const currentVecX = mouseX - commonCenterX
      const currentVecY = mouseY - commonCenterY
      const currentAngle = Math.atan2(currentVecY, currentVecX)

      const angleDelta = currentAngle - startAngle
      const firstOrigRotation = origRotations.get(ids[0]) || 0
      const totalAngle = firstOrigRotation + angleDelta

      // 转换为度数并归一化到 0-360
      const degrees = ((((totalAngle * 180) / Math.PI) % 360) + 360) % 360

      rotationAngle = {
        angle: degrees,
        centerX: commonCenterX,
        centerY: commonCenterY,
      }
    }

    return {
      drawing: drawingRef.current,
      currentPts: currentPtsRef.current,
      currentShape: currentShapeRef.current,
      mousePos: mouseRef.current,
      marquee: marqueeRef.current,
      snapLines: snapLinesRef.current,
      tool: useAppStore.getState().tool,
      color: useAppStore.getState().color,
      size: useAppStore.getState().size,
      brush: useAppStore.getState().brush,
      showGrid: useViewStore.getState().showGrid ?? false,
      showRulers: false,
      gridSize: 20,
      eraserTrail: trail,
      penVelocity: penVelocityRef.current,
      rotationAngle,
    }
  }, [snapLinesRef])

  return { getCursor, copySelectedToSystemClipboard, getDrawState }
}
