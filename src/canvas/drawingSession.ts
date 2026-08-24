import type { Binding, CanvasElement, ShapeElement, UndoAction } from '../core/model'

export interface ShapeEndpointPair {
  start: [number, number]
  end: [number, number]
}

export function getShapeEndpoints(shape: ShapeElement): ShapeEndpointPair {
  return {
    start: [shape.x, shape.y],
    end: [shape.x + shape.w, shape.y + shape.h],
  }
}

export type BindShapeEndpoint = (
  point: [number, number],
  elements: CanvasElement[],
  excludeId?: string
) => Binding | null

/** Apply optional endpoint bindings when a line or arrow drawing is completed. */
export function resolveShapeBindings(
  shape: ShapeElement,
  visibleElements: CanvasElement[],
  bindEndpoint: BindShapeEndpoint
): ShapeElement {
  if (shape.kind !== 'arrow' && shape.kind !== 'line') return shape

  const { start, end } = getShapeEndpoints(shape)
  const startBinding = bindEndpoint(start, visibleElements, shape.id)
  const endBinding = bindEndpoint(end, visibleElements, shape.id)
  if (!startBinding && !endBinding) return shape

  return {
    ...shape,
    ...(startBinding ? { startBinding } : {}),
    ...(endBinding ? { endBinding } : {}),
  }
}

/** Decide whether an eraser gesture produced one history entry worth committing. */
export function shouldCommitEraseSession(
  before: CanvasElement[] | null,
  after: CanvasElement[],
  baseUndoStack: UndoAction[] | null,
  currentUndoStack: UndoAction[]
): boolean {
  if (!before || !baseUndoStack) return false

  const elementsChanged =
    after.length !== before.length ||
    after.some((element, index) => element.id !== before[index]?.id)

  return elementsChanged || currentUndoStack !== baseUndoStack
}

export interface PenSampleUpdate {
  velocity: number
  hasPressure: boolean
  pressure: number
  pressurePrefixLength: number
}

/** Resolve the incremental state update for a pen sample without mutating refs. */
export function getPenSampleUpdate(
  points: readonly number[][],
  pressures: readonly number[],
  point: { x: number; y: number },
  pressure: number | undefined,
  defaultPressure: number
): PenSampleUpdate {
  const last = points[points.length - 1]
  const velocity = last ? Math.sqrt((point.x - last[0]) ** 2 + (point.y - last[1]) ** 2) : 0
  const hasPressure = pressures.length > 0 || pressure !== undefined

  return {
    velocity,
    hasPressure,
    pressure: pressure ?? defaultPressure,
    pressurePrefixLength: hasPressure && pressures.length === 0 ? points.length : 0,
  }
}
