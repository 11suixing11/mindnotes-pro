import { create } from 'zustand'
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
}

const DEFAULT_VIEWBOX = { x: 0, y: 0, zoom: 1 }
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

  const canvasToolbar = document.querySelector('.topbar') as HTMLElement | null
  const canvasToolbarRect = canvasToolbar?.getBoundingClientRect()
  if (canvasToolbarRect && overlaps(canvasToolbarRect, visibleRect)) {
    top = Math.max(top, canvasToolbarRect.bottom - canvasRect.top + FIT_OVERLAY_GAP)
  }

  const drawingToolbar = document.querySelector('.sidebar') as HTMLElement | null
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
  const zoom = Math.max(0.2, Math.min(scaleX, scaleY, FIT_MAX_ZOOM))
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

}))
