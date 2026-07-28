import { create } from 'zustand'
import { getContentBounds } from '../canvas/canvasUtils'
import { elementBounds } from './types'
import { useAppStore } from './appStore'

export const GRID_SIZE_OPTIONS = [10, 20, 40] as const
export type GridSize = (typeof GRID_SIZE_OPTIONS)[number]
export const DEFAULT_GRID_SIZE: GridSize = 20

interface ViewState {
  viewBox: {
    x: number
    y: number
    zoom: number
  }
  isPanning: boolean
  lastPanPosition: { x: number; y: number } | null
  showGrid: boolean
  snapToGrid: boolean
  gridSize: GridSize
  // Quick Zoom Navigation (鹰眼模式)
  // 按 Z 键进入鹰眼模式，快速全局预览后定位到目标区域
  // 设计参考: tldraw, Figma, Sketch - 专业设计工具标准导航功能
  eagleEye: {
    isActive: boolean
    originalViewBox: { x: number; y: number; zoom: number } | null
    targetX: number
    targetY: number
  }
}

interface ViewActions {
  setViewBox: (viewBox: ViewState['viewBox']) => void
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  startPan: (x: number, y: number) => void
  updatePan: (x: number, y: number) => void
  endPan: () => void
  zoomToFit: (bounds: { x: number; y: number; w: number; h: number } | null) => void
  // Zoom to Selection (缩放到选中元素)
  // 设计参考: Figma Cmd+2, Sketch Cmd+2, Graphic Cmd+2 - 行业标准快捷键
  zoomToSelection: () => void
  toggleGrid: () => void
  toggleSnapToGrid: () => void
  setSnapToGrid: (enabled: boolean) => void
  setGridSize: (gridSize: GridSize) => void
  cycleGridSize: () => void
  // 鹰眼模式方法
  startEagleEye: () => void
  updateEagleEyeTarget: (x: number, y: number) => void
  commitEagleEye: () => void
  cancelEagleEye: () => void
}

const DEFAULT_VIEWBOX = { x: 0, y: 0, zoom: 1 }
const EAGLE_EYE_ZOOM = 0.15 // 鹰眼模式下的缩放级别，确保能看到整个画布
const FIT_PADDING = 60
const FIT_MAX_ZOOM = 3
const FIT_OVERLAY_GAP = 24

function getWindowSize() {
  return {
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }
}

function overlaps(a: DOMRect, b: DOMRect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function getFitArea() {
  const { width, height } = getWindowSize()
  if (typeof document === 'undefined') {
    return { left: 0, top: 0, right: width, bottom: height }
  }

  const canvas = document.getElementById('main-canvas') as HTMLCanvasElement | null
  const canvasRect = canvas?.getBoundingClientRect()
  if (!canvasRect) {
    return { left: 0, top: 0, right: width, bottom: height }
  }

  const viewportLeft = Math.max(0, -canvasRect.left)
  const viewportTop = Math.max(0, -canvasRect.top)
  const viewportRight = Math.max(viewportLeft, Math.min(canvasRect.width, width - canvasRect.left))
  const viewportBottom = Math.max(viewportTop, Math.min(canvasRect.height, height - canvasRect.top))

  let left = viewportLeft
  let top = viewportTop
  let right = viewportRight
  let bottom = viewportBottom
  const visibleRect = new DOMRect(
    canvasRect.left + viewportLeft,
    canvasRect.top + viewportTop,
    viewportRight - viewportLeft,
    viewportBottom - viewportTop
  )

  const canvasToolbar = document.querySelector('[aria-label="Canvas tools"]') as HTMLElement | null
  const canvasToolbarRect = canvasToolbar?.getBoundingClientRect()
  if (canvasToolbarRect && overlaps(canvasToolbarRect, visibleRect)) {
    top = Math.max(top, canvasToolbarRect.bottom - canvasRect.top + FIT_OVERLAY_GAP)
  }

  const drawingToolbar = document.querySelector(
    '[aria-label="Drawing tools"]'
  ) as HTMLElement | null
  const drawingToolbarRect = drawingToolbar?.getBoundingClientRect()
  if (drawingToolbarRect && overlaps(drawingToolbarRect, visibleRect)) {
    left = Math.max(left, drawingToolbarRect.right - canvasRect.left + FIT_OVERLAY_GAP)
  }

  const status = document.querySelector('[aria-label="Application status"]') as HTMLElement | null
  const statusRect = status?.getBoundingClientRect()
  if (statusRect && overlaps(statusRect, visibleRect)) {
    bottom = Math.min(bottom, statusRect.top - canvasRect.top - FIT_OVERLAY_GAP)
  }

  if (right - left < 240) {
    left = viewportLeft
    right = viewportRight
  }
  if (bottom - top < 220) {
    top = viewportTop
    bottom = viewportBottom
  }

  return { left, top, right, bottom }
}

function getFitViewBox(bounds: { x: number; y: number; w: number; h: number }, padding: number) {
  const area = getFitArea()
  const areaWidth = Math.max(1, area.right - area.left)
  const areaHeight = Math.max(1, area.bottom - area.top)
  const scaleX = Math.max(0.01, (areaWidth - padding * 2) / (bounds.w || 1))
  const scaleY = Math.max(0.01, (areaHeight - padding * 2) / (bounds.h || 1))
  const zoom = Math.min(scaleX, scaleY, FIT_MAX_ZOOM)
  const centerScreenX = area.left + areaWidth / 2
  const centerScreenY = area.top + areaHeight / 2
  const centerWorldX = bounds.x + bounds.w / 2
  const centerWorldY = bounds.y + bounds.h / 2

  return {
    x: centerWorldX - centerScreenX / zoom,
    y: centerWorldY - centerScreenY / zoom,
    zoom,
  }
}

export const useViewStore = create<ViewState & ViewActions>((set, get) => ({
  viewBox: DEFAULT_VIEWBOX,
  isPanning: false,
  lastPanPosition: null,
  showGrid: false,
  snapToGrid: false,
  gridSize: DEFAULT_GRID_SIZE,
  eagleEye: {
    isActive: false,
    originalViewBox: null,
    targetX: 0,
    targetY: 0,
  },

  setViewBox: (viewBox) => set({ viewBox }),

  zoomIn: () =>
    set((state) => ({
      viewBox: { ...state.viewBox, zoom: Math.min(state.viewBox.zoom * 1.2, 5) },
    })),

  zoomOut: () =>
    set((state) => ({
      viewBox: { ...state.viewBox, zoom: Math.max(state.viewBox.zoom / 1.2, 0.2) },
    })),

  resetView: () =>
    set({ viewBox: { ...DEFAULT_VIEWBOX }, isPanning: false, lastPanPosition: null }),

  startPan: (x, y) => set({ isPanning: true, lastPanPosition: { x, y } }),

  updatePan: (x, y) => {
    const { lastPanPosition, viewBox } = get()
    if (!lastPanPosition) return
    const dx = (x - lastPanPosition.x) / viewBox.zoom
    const dy = (y - lastPanPosition.y) / viewBox.zoom
    set({
      viewBox: { ...viewBox, x: viewBox.x - dx, y: viewBox.y - dy },
      lastPanPosition: { x, y },
    })
  },

  endPan: () => set({ isPanning: false, lastPanPosition: null }),

  zoomToFit: (bounds: { x: number; y: number; w: number; h: number } | null) => {
    if (!bounds) return
    set({ viewBox: getFitViewBox(bounds, FIT_PADDING) })
  },

  // Zoom to Selection (缩放到选中元素)
  // 专业设计工具标准功能：选中元素后一键缩放到合适大小查看细节
  // 用户价值：处理复杂画布时，无需手动滚动缩放，一键定位到选中内容
  zoomToSelection: () => {
    const appState = useAppStore.getState()
    const selectedIds = appState.selectedIds
    if (selectedIds.length === 0) return

    // 获取所有选中元素
    const selectedElements = selectedIds
      .map((id) => appState.idToElement.get(id))
      .filter((el): el is NonNullable<typeof el> => el !== undefined)

    if (selectedElements.length === 0) return

    // 计算选中元素的整体边界
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const el of selectedElements) {
      // 使用 elementBounds 统一处理所有类型元素（包括 StrokeElement）
      const bounds = elementBounds(el)
      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.w)
      maxY = Math.max(maxY, bounds.y + bounds.h)
    }

    const bounds = {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
    }

    // 复用 zoomToFit 的逻辑，缩放到选中元素边界
    set({ viewBox: getFitViewBox(bounds, 80) })
  },

  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),

  toggleSnapToGrid: () =>
    set((state) => {
      const enabled = !state.snapToGrid
      return {
        snapToGrid: enabled,
        showGrid: enabled ? true : state.showGrid,
      }
    }),

  setSnapToGrid: (enabled) =>
    set((state) => ({
      snapToGrid: enabled,
      showGrid: enabled ? true : state.showGrid,
    })),

  setGridSize: (gridSize) => set({ gridSize }),

  cycleGridSize: () =>
    set((state) => {
      const index = GRID_SIZE_OPTIONS.indexOf(state.gridSize)
      const nextIndex = index === -1 ? 0 : (index + 1) % GRID_SIZE_OPTIONS.length
      return { gridSize: GRID_SIZE_OPTIONS[nextIndex] }
    }),

  // 启动鹰眼模式
  // 1. 保存当前视口
  // 2. 计算所有元素的边界
  // 3. 缩放到全局视图
  startEagleEye: () => {
    const state = get()
    if (state.eagleEye.isActive) return

    // 保存原始视口
    const originalViewBox = { ...state.viewBox }

    // 计算所有元素的边界
    const elements = useAppStore.getState().elements
    const allBounds = getContentBounds(elements, 100)

    // 计算目标视口 - 居中显示所有内容
    const vw = window.innerWidth
    const vh = window.innerHeight

    let targetX: number
    let targetY: number

    if (allBounds) {
      // 居中显示所有元素
      targetX = allBounds.x - (vw / EAGLE_EYE_ZOOM - allBounds.w) / 2
      targetY = allBounds.y - (vh / EAGLE_EYE_ZOOM - allBounds.h) / 2
    } else {
      // 没有元素时居中显示原点
      targetX = -vw / EAGLE_EYE_ZOOM / 2
      targetY = -vh / EAGLE_EYE_ZOOM / 2
    }

    set({
      viewBox: { x: targetX, y: targetY, zoom: EAGLE_EYE_ZOOM },
      eagleEye: {
        isActive: true,
        originalViewBox,
        targetX: originalViewBox.x + vw / originalViewBox.zoom / 2,
        targetY: originalViewBox.y + vh / originalViewBox.zoom / 2,
      },
    })
  },

  // 更新鹰眼模式下的目标位置（鼠标移动时）
  updateEagleEyeTarget: (x: number, y: number) => {
    const state = get()
    if (!state.eagleEye.isActive) return
    set({
      eagleEye: {
        ...state.eagleEye,
        targetX: x,
        targetY: y,
      },
    })
  },

  // 确认鹰眼模式选择 - 平滑放大到目标区域
  commitEagleEye: () => {
    const state = get()
    if (!state.eagleEye.isActive) return

    const vw = window.innerWidth
    const vh = window.innerHeight
    const originalZoom = state.eagleEye.originalViewBox?.zoom || 1

    // 以目标点为中心放大
    const x = state.eagleEye.targetX - vw / originalZoom / 2
    const y = state.eagleEye.targetY - vh / originalZoom / 2

    set({
      viewBox: { x, y, zoom: originalZoom },
      eagleEye: {
        isActive: false,
        originalViewBox: null,
        targetX: 0,
        targetY: 0,
      },
    })
  },

  // 取消鹰眼模式 - 返回原始视口
  cancelEagleEye: () => {
    const state = get()
    if (!state.eagleEye.isActive || !state.eagleEye.originalViewBox) return

    set({
      viewBox: { ...state.eagleEye.originalViewBox },
      eagleEye: {
        isActive: false,
        originalViewBox: null,
        targetX: 0,
        targetY: 0,
      },
    })
  },
}))
