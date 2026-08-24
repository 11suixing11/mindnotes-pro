import type { Bounds } from '../core/geometry'
import type { CanvasElement } from '../core/model'
import { getGridSnapDelta, type SnappedTarget } from './coordinates'
import { lockResizeScalesToAspectRatio, shouldPreserveResizeAspectRatio } from './resizeRules'

export interface SelectionPoint {
  x: number
  y: number
}

export interface ResizeTransform {
  ax: number
  ay: number
  sx: number
  sy: number
  linesX: number[]
  linesY: number[]
}

export interface ResizeTransformOptions {
  handle: number
  bounds: Bounds
  totalDelta: SelectionPoint
  elementType?: CanvasElement['type']
  shiftPressed: boolean
  snapTarget: (target: { x?: number; y?: number }) => SnappedTarget
}

export interface DragSnapResult {
  dx: number
  dy: number
  linesX: number[]
  linesY: number[]
}

export interface DragTransform extends DragSnapResult {
  snapDx: number
  snapDy: number
}

const MIN_RESIZE_SCALE = 0.1
const MAX_RESIZE_SCALE = 10

function clampResizeScale(scale: number): number {
  return Math.max(MIN_RESIZE_SCALE, Math.min(MAX_RESIZE_SCALE, scale))
}

/** Calculate the anchor and scale for one selection resize handle. */
export function calculateResizeTransform(options: ResizeTransformOptions): ResizeTransform | null {
  const { handle, bounds, totalDelta, elementType, shiftPressed, snapTarget } = options
  const { x, y, w, h } = bounds
  if (w < 1 || h < 1) return null

  const cornerAnchors: [number, number][] = [
    [x + w, y + h],
    [x, y + h],
    [x + w, y],
    [x, y],
  ]
  const cornerOrigins: [number, number][] = [
    [x, y],
    [x + w, y],
    [x, y + h],
    [x + w, y + h],
  ]

  let ax: number
  let ay: number
  let sx = 1
  let sy = 1
  let linesX: number[] = []
  let linesY: number[] = []

  if (handle >= 0 && handle <= 3) {
    ax = cornerAnchors[handle][0]
    ay = cornerAnchors[handle][1]
    const origin = cornerOrigins[handle]
    const snappedTarget = snapTarget({
      x: origin[0] + totalDelta.x,
      y: origin[1] + totalDelta.y,
    })
    const targetX = snappedTarget.x ?? origin[0] + totalDelta.x
    const targetY = snappedTarget.y ?? origin[1] + totalDelta.y
    linesX = snappedTarget.linesX
    linesY = snappedTarget.linesY

    sx = clampResizeScale(
      handle === 0 || handle === 2
        ? (targetX - ax) / (origin[0] - ax || 1)
        : (ax - targetX) / (ax - origin[0] || 1)
    )
    sy = clampResizeScale(
      handle === 0 || handle === 1
        ? (targetY - ay) / (origin[1] - ay || 1)
        : (ay - targetY) / (ay - origin[1] || 1)
    )

    if (shouldPreserveResizeAspectRatio(elementType, handle, shiftPressed)) {
      const locked = lockResizeScalesToAspectRatio(sx, sy)
      sx = locked.sx
      sy = locked.sy
    }
  } else if (handle === 4) {
    ax = x + w / 2
    ay = y + h
    const snappedTarget = snapTarget({ y: y + totalDelta.y })
    const targetY = snappedTarget.y ?? y + totalDelta.y
    linesY = snappedTarget.linesY
    sy = clampResizeScale((ay - targetY) / h)
  } else if (handle === 5) {
    ax = x + w / 2
    ay = y
    const snappedTarget = snapTarget({ y: y + h + totalDelta.y })
    const targetY = snappedTarget.y ?? y + h + totalDelta.y
    linesY = snappedTarget.linesY
    sy = clampResizeScale((targetY - ay) / h)
  } else if (handle === 6) {
    ax = x + w
    ay = y + h / 2
    const snappedTarget = snapTarget({ x: x + totalDelta.x })
    const targetX = snappedTarget.x ?? x + totalDelta.x
    linesX = snappedTarget.linesX
    sx = clampResizeScale((ax - targetX) / w)
  } else if (handle === 7) {
    ax = x
    ay = y + h / 2
    const snappedTarget = snapTarget({ x: x + w + totalDelta.x })
    const targetX = snappedTarget.x ?? x + w + totalDelta.x
    linesX = snappedTarget.linesX
    sx = clampResizeScale((targetX - ax) / w)
  } else {
    return null
  }

  return { ax, ay, sx, sy, linesX, linesY }
}

/** Calculate alignment/grid snapping for one incremental selection drag. */
export function calculateDragTransform(options: {
  bounds: Bounds
  delta: SelectionPoint
  findSnaps: (movingBounds: Bounds) => DragSnapResult
  snapToGrid: boolean
  gridSize: number
}): DragTransform {
  const { bounds, delta, findSnaps, snapToGrid, gridSize } = options
  const movingBounds = {
    ...bounds,
    x: bounds.x + delta.x,
    y: bounds.y + delta.y,
  }
  const snap = findSnaps(movingBounds)
  let snapDx = snap.dx
  let snapDy = snap.dy
  let linesX = snap.linesX
  let linesY = snap.linesY

  if (snapToGrid) {
    const gridSnap = getGridSnapDelta(
      {
        ...movingBounds,
        x: movingBounds.x + snapDx,
        y: movingBounds.y + snapDy,
      },
      gridSize
    )
    if (snap.dx === 0) {
      snapDx += gridSnap.dx
      linesX = gridSnap.linesX
    }
    if (snap.dy === 0) {
      snapDy += gridSnap.dy
      linesY = gridSnap.linesY
    }
  }

  return {
    dx: delta.x + snapDx,
    dy: delta.y + snapDy,
    snapDx,
    snapDy,
    linesX,
    linesY,
  }
}

export interface RotationDeltaOptions {
  start: SelectionPoint
  current: SelectionPoint
  center: SelectionPoint
  referenceRotation?: number
  shiftPressed?: boolean
}

/** Calculate a rotation delta, optionally snapping the resulting angle. */
export function calculateRotationDelta(options: RotationDeltaOptions): number {
  const { start, current, center, referenceRotation = 0, shiftPressed = false } = options
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x)
  const currentAngle = Math.atan2(current.y - center.y, current.x - center.x)
  let angleDelta = currentAngle - startAngle

  if (shiftPressed) {
    const snapStep = Math.PI / 12
    const snappedAngle = Math.round((referenceRotation + angleDelta) / snapStep) * snapStep
    angleDelta = snappedAngle - referenceRotation
  }

  return angleDelta
}

export function radiansToNormalizedDegrees(radians: number): number {
  return ((((radians * 180) / Math.PI) % 360) + 360) % 360
}

/** Return the first movable coordinate for an element, used by drag snapshots. */
export function getElementAnchorPosition(element: CanvasElement): SelectionPoint {
  if (element.type === 'stroke') {
    return {
      x: element.points[0]?.[0] ?? 0,
      y: element.points[0]?.[1] ?? 0,
    }
  }
  return { x: element.x, y: element.y }
}

export function collectElementAnchorPositions(
  ids: readonly string[],
  getElement: (id: string) => CanvasElement | undefined
): Map<string, SelectionPoint> {
  const positions = new Map<string, SelectionPoint>()
  for (const id of ids) {
    const element = getElement(id)
    if (element) positions.set(id, getElementAnchorPosition(element))
  }
  return positions
}
