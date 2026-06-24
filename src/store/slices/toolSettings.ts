import type { ToolType, BrushType } from '../types'
import { scheduleSave } from '../saveManager'

const MAX_COLOR_HISTORY = 5

export interface ToolSettingsState {
  tool: ToolType
  brush: BrushType
  color: string
  fillColor: string
  size: number
  bgColor: string
  colorHistory: string[]
  // P5 新功能: 样式吸管 (Eyedropper) - 来源 tldraw v5.1.0 PR #8917
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
  addColorToHistory: (c: string) => void
  toggleStyleEyedropper: () => void
  setStyleEyedropperPreview: (preview: { color: string; size: number; brush: BrushType } | null) => void
  applyStyleFromElement: (elementId: string) => void
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
    colorHistory: [],
    // P5 新功能: 样式吸管状态
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
      set({ bgColor: c })
      scheduleSave()
    },
    addColorToHistory: (c: string) => {
      const current = _get().colorHistory as string[]
      const filtered = current.filter((h) => h !== c)
      const next = [c, ...filtered].slice(0, MAX_COLOR_HISTORY)
      set({ colorHistory: next })
    },
    // P5 新功能: 样式吸管动作
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
  }
}
