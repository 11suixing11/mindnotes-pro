import { describe, expect, it } from 'vitest'
import type { BrushType } from '../store/types'
import {
  BRUSH_PRESETS,
  getBrushDashArray,
  getBrushDefaultOpacity,
  getBrushPreset,
  getCanvasStrokeWidth,
  getSvgBrushStyle,
} from './brushPresets'

describe('brushPresets', () => {
  const brushTypes: BrushType[] = [
    'pen',
    'highlighter',
    'pencil',
    'calligraphy',
    'marker',
    'watercolor',
    'crayon',
    'dashed',
    'glow',
  ]

  it('defines one preset for every brush type in toolbar order', () => {
    expect(BRUSH_PRESETS.map((preset) => preset.id)).toEqual(brushTypes)
    expect(new Set(BRUSH_PRESETS.map((preset) => preset.id)).size).toBe(BRUSH_PRESETS.length)
  })

  it('keeps UI labels and descriptions in the shared presets', () => {
    expect(getBrushPreset('marker')).toMatchObject({
      label: '马克笔',
      description: '稳定粗线',
    })
    expect(getBrushPreset('watercolor')).toMatchObject({
      label: '水彩笔',
      description: '半透明叠色',
    })
  })

  it('returns default opacity for translucent texture brushes', () => {
    expect(getBrushDefaultOpacity('highlighter')).toBe(0.3)
    expect(getBrushDefaultOpacity('pencil')).toBe(0.65)
    expect(getBrushDefaultOpacity('marker')).toBe(0.9)
    expect(getBrushDefaultOpacity('watercolor')).toBe(0.22)
    expect(getBrushDefaultOpacity('crayon')).toBe(0.78)
    expect(getBrushDefaultOpacity('pen')).toBeUndefined()
  })

  it('returns canvas stroke widths from shared multipliers', () => {
    expect(getCanvasStrokeWidth('highlighter', 5)).toBe(20)
    expect(getCanvasStrokeWidth('pencil', 5)).toBe(3)
    expect(getCanvasStrokeWidth('marker', 5)).toBe(11)
    expect(getCanvasStrokeWidth('watercolor', 5)).toBe(16)
    expect(getCanvasStrokeWidth('crayon', 5)).toBe(5.75)
    expect(getCanvasStrokeWidth('pen', 5)).toBe(5)
  })

  it('returns dash arrays from shared dash patterns', () => {
    expect(getBrushDashArray('dashed', 4)).toEqual([8, 6])
    expect(getBrushDashArray('pen', 4)).toBeUndefined()
  })

  it('returns SVG brush styles without changing export behavior', () => {
    expect(getSvgBrushStyle('marker', 5)).toMatchObject({ strokeWidth: 11, opacity: 0.9 })
    expect(getSvgBrushStyle('watercolor', 5)).toMatchObject({ strokeWidth: 13, opacity: 0.28 })
    expect(getSvgBrushStyle('watercolor', 5, 0.22)).toMatchObject({
      strokeWidth: 13,
      opacity: 0.22,
    })
    expect(getSvgBrushStyle('dashed', 4)).toMatchObject({ strokeWidth: 4, dashArray: [8, 6] })
    expect(getSvgBrushStyle('glow', 4)).toMatchObject({
      strokeWidth: 2.8,
      opacity: 0.9,
      filterId: 'glow',
    })
  })
})
