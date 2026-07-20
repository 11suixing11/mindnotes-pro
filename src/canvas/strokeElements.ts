import type { BrushType, StrokeElement } from '../store/types'
import { getBrushDefaultOpacity } from './brushPresets'
import { simplifyPts } from './canvasUtils'

export interface CreateStrokeElementInput {
  id: string
  points: number[][]
  color: string
  size: number
  brush: BrushType
  simplifyTolerance?: number
}

export function createStrokeElement(input: CreateStrokeElementInput): StrokeElement | null {
  const { id, points, color, size, brush, simplifyTolerance = 1 } = input

  if (points.length < 1) return null

  const drawablePoints =
    points.length === 1 ? [points[0], [points[0][0] + 0.1, points[0][1] + 0.1]] : points

  const stroke: StrokeElement = {
    type: 'stroke',
    id,
    points: simplifyPts(drawablePoints, simplifyTolerance),
    color,
    size,
    brush,
  }

  const defaultOpacity = getBrushDefaultOpacity(brush)
  if (defaultOpacity !== undefined) stroke.opacity = defaultOpacity

  return stroke
}
