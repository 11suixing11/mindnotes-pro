import { create } from 'zustand'
import { getContentBounds } from '../canvas/canvasUtils'
import { elementBounds } from './types'
import { useAppStore } from './appStore'

interface ViewState {
  viewBox: {
    x: number
    y: number
    zoom: number
  }
  isPanning: boolean
  lastPanPosition: { x: number; y: number } | null
  showGrid: boolean
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
  // 鹰眼模式方法
  startEagleEye: () => void
  updateEagleEyeTarget: (x: number, y: number) => void
  commitEagleEye: () => void
  cancelEagleEye: () => void
}

const DEFAULT_VIEWBOX = { x: 0, y: 0, zoom: 1 }
const EAGLE_EYE_ZOOM = 0.15 // 鹰眼模式下的缩放级别，确保能看到整个画布

export const useViewStore = create<ViewState & ViewActions>((set, get) => ({
  viewBox: DEFAULT_VIEWBOX,
  isPanning: false,
  lastPanPosition: null,
  showGrid: false,
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
    const padding = 60
    const vw = window.innerWidth
    const vh = window.innerHeight
    const scaleX = (vw - padding * 2) / (bounds.w || 1)
    const scaleY = (vh - padding * 2) / (bounds.h || 1)
    const zoom = Math.min(scaleX, scaleY, 3)
    const x = bounds.x - (vw / zoom - bounds.w) / 2
    const y = bounds.y - (vh / zoom - bounds.h) / 2
    set({ viewBox: { x, y, zoom } })
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
    const padding = 80 // 选中元素使用更大的内边距，视觉效果更好
    const vw = window.innerWidth
    const vh = window.innerHeight
    const scaleX = (vw - padding * 2) / (bounds.w || 1)
    const scaleY = (vh - padding * 2) / (bounds.h || 1)
    const zoom = Math.min(scaleX, scaleY, 3)
    const x = bounds.x - (vw / zoom - bounds.w) / 2
    const y = bounds.y - (vh / zoom - bounds.h) / 2

    set({ viewBox: { x, y, zoom } })
  },

  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),

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

    let targetX = 0
    let targetY = 0

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
