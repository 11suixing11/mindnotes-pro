import type { BrushType, StrokeElement } from '../store/types'
import { getBrushDefaultOpacity } from './brushPresets'
import { simplifyPts } from './canvasUtils'

export interface CreateStrokeElementInput {
  id: string
  points: number[][]
  color: string
  size: number
  brush: BrushType
  pressures?: number[]
  simplifyTolerance?: number
}

function clampPressure(pressure: number | undefined): number {
  if (pressure === undefined || !Number.isFinite(pressure)) return 0.5
  return Math.max(0, Math.min(1, pressure))
}

function normalizePressures(points: number[][], pressures?: number[]): number[] | undefined {
  if (!pressures || pressures.length === 0) return undefined
  return points.map((_, index) => clampPressure(pressures[index]))
}

function hasPressureVariation(pressures: number[] | undefined): pressures is number[] {
  return !!pressures?.some((pressure) => Math.abs(pressure - 0.5) > 0.01)
}

function simplifyStrokeSamples(
  points: number[][],
  pressures: number[] | undefined,
  tolerance: number
): { points: number[][]; pressures?: number[] } {
  if (!pressures || points.length <= 2) {
    return { points: simplifyPts(points, tolerance), pressures }
  }

  const toleranceSq = tolerance * tolerance
  const simplifiedPoints: number[][] = [points[0]]
  const simplifiedPressures: number[] = [pressures[0]]
  let previous = points[0]

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index]
    const dx = point[0] - previous[0]
    const dy = point[1] - previous[1]
    if (dx * dx + dy * dy >= toleranceSq) {
      simplifiedPoints.push(point)
      simplifiedPressures.push(pressures[index])
      previous = point
    }
  }

  if (simplifiedPoints[simplifiedPoints.length - 1] !== points[points.length - 1]) {
    simplifiedPoints.push(points[points.length - 1])
    simplifiedPressures.push(pressures[pressures.length - 1])
  }

  return {
    points: simplifiedPoints,
    pressures: hasPressureVariation(simplifiedPressures) ? simplifiedPressures : undefined,
  }
}

export function createStrokeElement(input: CreateStrokeElementInput): StrokeElement | null {
  const { id, points, color, size, brush, pressures, simplifyTolerance = 1 } = input

  if (points.length < 1) return null

  const inputPressures = normalizePressures(points, pressures)
  const drawablePoints =
    points.length === 1 ? [points[0], [points[0][0] + 0.1, points[0][1] + 0.1]] : points
  const drawablePressures =
    points.length === 1 && inputPressures
      ? [inputPressures[0], inputPressures[0]]
      : hasPressureVariation(inputPressures)
        ? inputPressures
        : undefined
  const simplified = simplifyStrokeSamples(drawablePoints, drawablePressures, simplifyTolerance)

  const stroke: StrokeElement = {
    type: 'stroke',
    id,
    points: simplified.points,
    color,
    size,
    brush,
  }
  if (simplified.pressures) stroke.pressures = simplified.pressures

  const defaultOpacity = getBrushDefaultOpacity(brush)
  if (defaultOpacity !== undefined) stroke.opacity = defaultOpacity

  return stroke
}
