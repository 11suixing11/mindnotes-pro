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
}

export interface ToolSettingsActions {
  setTool: (t: ToolType) => void
  setBrush: (b: BrushType) => void
  setColor: (c: string) => void
  setFillColor: (c: string) => void
  setSize: (s: number) => void
  setBgColor: (c: string) => void
  addColorToHistory: (c: string) => void
}

export function createToolSettingsSlice(
  set: any,
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
  }
}
