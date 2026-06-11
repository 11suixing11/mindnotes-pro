import type { ToolType, BrushType } from '../types'
import { scheduleSave } from '../saveManager'

export interface ToolSettingsState {
  tool: ToolType
  brush: BrushType
  color: string
  fillColor: string
  size: number
  bgColor: string
}

export interface ToolSettingsActions {
  setTool: (t: ToolType) => void
  setBrush: (b: BrushType) => void
  setColor: (c: string) => void
  setFillColor: (c: string) => void
  setSize: (s: number) => void
  setBgColor: (c: string) => void
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

    // Actions
    setTool: (t) => set({ tool: t }),
    setBrush: (b) => set({ brush: b }),
    setColor: (c) => set({ color: c }),
    setFillColor: (c) => set({ fillColor: c }),
    setSize: (s) => set({ size: s }),
    setBgColor: (c) => {
      set({ bgColor: c })
      scheduleSave()
    },
  }
}
