import type { ToolType, BrushType, CanvasBackgroundStyle } from '../types'
import { incrementSaveGeneration, scheduleSave } from '../saveManager'

// 扩展颜色历史记录 - 基于 tldraw #1665 用户需求
export const COLOR_HISTORY_KEY = 'mn-recent-colors'
export const MAX_COLOR_HISTORY = 10

function loadColorHistory(): string[] {
  if (typeof localStorage === 'undefined') return []

  try {
    const parsed = JSON.parse(localStorage.getItem(COLOR_HISTORY_KEY) ?? '[]')
    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .slice(0, MAX_COLOR_HISTORY)
      : []
  } catch {
    return []
  }
}

function persistColorHistory(colors: string[]) {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(COLOR_HISTORY_KEY, JSON.stringify(colors))
  } catch {
    // Recent colors remain usable during this session even when persistence is unavailable.
  }
}

export interface ToolSettingsState {
  tool: ToolType
  brush: BrushType
  color: string
  fillColor: string
  size: number
  bgColor: string
  backgroundStyle: CanvasBackgroundStyle
  colorHistory: string[]
  // 样式吸管 (Eyedropper)
  // 按 Q 键激活，悬停在元素上复制其样式（颜色、大小、画笔类型）
  styleEyedropperActive: boolean
  styleEyedropperPreview: { color: string; size: number; brush: BrushType } | null
}

export interface ToolSettingsActions {
  setTool: (t: ToolType) => void
  setBrush: (b: BrushType) => void
  setColor: (c: string) => void
  setFillColor: (c: string) => void
  setSize: (s: number) => void
  setBgColor: (c: string) => void
  setBackgroundStyle: (style: CanvasBackgroundStyle) => void
  addColorToHistory: (c: string) => void
  toggleStyleEyedropper: () => void
  setStyleEyedropperPreview: (
    preview: { color: string; size: number; brush: BrushType } | null
  ) => void
  applyStyleFromElement: (elementId: string) => void
  // G 键循环切换几何工具
  cycleGeometryTool: () => void
}

export function createToolSettingsSlice(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _get: any
): ToolSettingsState & ToolSettingsActions {
  return {
    // State
    tool: 'pen',
    brush: 'pen',
    color: '#2c2416',
    fillColor: 'transparent',
    size: 4,
    bgColor: '#ffffff',
    backgroundStyle: 'plain',
    colorHistory: loadColorHistory(),
    // 样式吸管状态
    styleEyedropperActive: false,
    styleEyedropperPreview: null,

    // Actions
    setTool: (t) => set({ tool: t }),
    setBrush: (b) => set({ brush: b }),
    setColor: (c) => {
      set({ color: c })
      _get().addColorToHistory(c)
    },
    setFillColor: (c) => set({ fillColor: c }),
    setSize: (s) => set({ size: s }),
    setBgColor: (c) => {
      incrementSaveGeneration()
      set({ bgColor: c })
      scheduleSave()
    },
    setBackgroundStyle: (backgroundStyle) => {
      incrementSaveGeneration()
      set({ backgroundStyle })
      scheduleSave()
    },
    addColorToHistory: (c: string) => {
      const color = c.trim()
      if (!color) return

      const current = _get().colorHistory as string[]
      const filtered = current.filter((h) => h !== color)
      const next = [color, ...filtered].slice(0, MAX_COLOR_HISTORY)
      persistColorHistory(next)
      set({ colorHistory: next })
    },
    // 样式吸管动作
    toggleStyleEyedropper: () => {
      const current = _get().styleEyedropperActive
      set({
        styleEyedropperActive: !current,
        styleEyedropperPreview: null,
      })
    },
    setStyleEyedropperPreview: (preview) => set({ styleEyedropperPreview: preview }),
    applyStyleFromElement: (elementId: string) => {
      const state = _get()
      const element = state.idToElement?.get(elementId)
      if (!element) return

      if (element.type === 'stroke') {
        set({
          color: element.color,
          size: element.size,
          brush: element.brush,
          styleEyedropperActive: false,
          styleEyedropperPreview: null,
        })
        _get().addColorToHistory(element.color)
      } else if (element.type === 'shape') {
        set({
          color: element.color,
          size: element.size,
          fillColor: element.fillColor || 'transparent',
          styleEyedropperActive: false,
          styleEyedropperPreview: null,
        })
        _get().addColorToHistory(element.color)
      } else if (element.type === 'text') {
        set({
          color: element.color,
          size: Math.round(element.fontSize / 4),
          styleEyedropperActive: false,
          styleEyedropperPreview: null,
        })
        _get().addColorToHistory(element.color)
      }
    },
    // G 键循环切换几何工具
    // 设计参考: tldraw, Figma, Sketch - 专业设计工具标准快捷键
    // 循环顺序: rectangle → circle → line → arrow → rectangle
    // 用户价值: 专业用户无需移动鼠标到工具栏，一键切换几何工具，减少工具栏往返操作
    cycleGeometryTool: () => {
      const currentTool = _get().tool as ToolType
      const geometryTools: ToolType[] = ['rectangle', 'circle', 'line', 'arrow']
      const currentIndex = geometryTools.indexOf(currentTool)

      if (currentIndex === -1) {
        // 当前不在几何工具中，切换到第一个几何工具（矩形）
        set({ tool: 'rectangle' })
      } else {
        // 循环切换到下一个几何工具
        const nextIndex = (currentIndex + 1) % geometryTools.length
        set({ tool: geometryTools[nextIndex] })
      }
    },
  }
}
