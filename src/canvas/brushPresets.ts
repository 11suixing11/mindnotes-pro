import type { BrushType } from '../store/types'

export interface BrushPreset {
  id: BrushType
  label: string
  description: string
  defaultOpacity?: number
  canvasStrokeWidthMultiplier?: number
  svgStrokeWidthMultiplier?: number
  svgOpacity?: number
  svgFilterId?: string
  dashPattern?: {
    dashMultiplier: number
    gapMultiplier: number
  }
}

export interface SvgBrushStyle {
  strokeWidth: number
  opacity?: number
  dashArray?: [number, number]
  filterId?: string
}

export const BRUSH_PRESETS = [
  { id: 'pen', label: '钢笔', description: '平滑流畅' },
  {
    id: 'highlighter',
    label: '荧光笔',
    description: '半透明宽笔',
    defaultOpacity: 0.3,
    canvasStrokeWidthMultiplier: 4,
    svgStrokeWidthMultiplier: 4,
  },
  {
    id: 'pencil',
    label: '铅笔',
    description: '粗糙质感',
    defaultOpacity: 0.65,
    canvasStrokeWidthMultiplier: 0.6,
    svgStrokeWidthMultiplier: 0.6,
  },
  { id: 'calligraphy', label: '书法笔', description: '粗细变化' },
  {
    id: 'marker',
    label: '马克笔',
    description: '稳定粗线',
    defaultOpacity: 0.9,
    canvasStrokeWidthMultiplier: 2.2,
    svgStrokeWidthMultiplier: 2.2,
  },
  {
    id: 'watercolor',
    label: '水彩笔',
    description: '半透明叠色',
    defaultOpacity: 0.22,
    canvasStrokeWidthMultiplier: 3.2,
    svgStrokeWidthMultiplier: 2.6,
    svgOpacity: 0.28,
  },
  {
    id: 'crayon',
    label: '蜡笔',
    description: '粗糙边缘',
    defaultOpacity: 0.78,
    canvasStrokeWidthMultiplier: 1.15,
    svgStrokeWidthMultiplier: 1.15,
  },
  {
    id: 'dashed',
    label: '虚线笔',
    description: '虚线笔迹',
    dashPattern: { dashMultiplier: 2, gapMultiplier: 1.5 },
  },
  {
    id: 'glow',
    label: '彩虹笔',
    description: '发光效果',
    svgStrokeWidthMultiplier: 0.7,
    svgOpacity: 0.9,
    svgFilterId: 'glow',
  },
] as const satisfies readonly BrushPreset[]

const BRUSH_PRESET_BY_ID = BRUSH_PRESETS.reduce(
  (acc, preset) => {
    acc[preset.id] = preset
    return acc
  },
  {} as Record<BrushType, BrushPreset>
)

export function getBrushPreset(brush: BrushType): BrushPreset {
  return BRUSH_PRESET_BY_ID[brush]
}

export function getBrushDefaultOpacity(brush: BrushType): number | undefined {
  return getBrushPreset(brush).defaultOpacity
}

export function getCanvasStrokeWidth(brush: BrushType, size: number): number {
  return size * (getBrushPreset(brush).canvasStrokeWidthMultiplier ?? 1)
}

export function getBrushDashArray(brush: BrushType, size: number): [number, number] | undefined {
  const dashPattern = getBrushPreset(brush).dashPattern
  if (!dashPattern) return undefined

  return [size * dashPattern.dashMultiplier, size * dashPattern.gapMultiplier]
}

export function getSvgBrushStyle(
  brush: BrushType,
  size: number,
  opacityOverride?: number
): SvgBrushStyle {
  const preset = getBrushPreset(brush)
  const opacity = opacityOverride ?? preset.svgOpacity ?? preset.defaultOpacity
  const dashArray = getBrushDashArray(brush, size)

  return {
    strokeWidth: size * (preset.svgStrokeWidthMultiplier ?? 1),
    ...(opacity === undefined ? {} : { opacity }),
    ...(dashArray === undefined ? {} : { dashArray }),
    ...(preset.svgFilterId === undefined ? {} : { filterId: preset.svgFilterId }),
  }
}
