export interface CanvasPoint {
  x: number
  y: number
}

export interface CanvasViewBox {
  x: number
  y: number
  zoom: number
}

export interface CanvasRectLike {
  left: number
  top: number
}

export interface SnapTarget {
  x?: number
  y?: number
}

export interface SnappedTarget extends SnapTarget {
  linesX: number[]
  linesY: number[]
}

export function snapValueToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return value
  return Math.round(value / gridSize) * gridSize
}

export function snapPointToGrid(point: CanvasPoint, gridSize: number): CanvasPoint {
  return {
    x: snapValueToGrid(point.x, gridSize),
    y: snapValueToGrid(point.y, gridSize),
  }
}

export function getGridSnapDelta(
  bounds: { x: number; y: number; w: number; h: number },
  gridSize: number
): { dx: number; dy: number; linesX: number[]; linesY: number[] } {
  if (gridSize <= 0) return { dx: 0, dy: 0, linesX: [], linesY: [] }

  const snappedX = snapValueToGrid(bounds.x, gridSize)
  const snappedY = snapValueToGrid(bounds.y, gridSize)
  const dx = snappedX - bounds.x
  const dy = snappedY - bounds.y

  return {
    dx,
    dy,
    linesX: dx === 0 ? [] : [snappedX],
    linesY: dy === 0 ? [] : [snappedY],
  }
}

/** Convert a canvas-local screen point into world coordinates. */
export function screenToWorld(screenPoint: CanvasPoint, viewBox: CanvasViewBox): CanvasPoint {
  return {
    x: screenPoint.x / viewBox.zoom + viewBox.x,
    y: screenPoint.y / viewBox.zoom + viewBox.y,
  }
}

/** Convert a browser client point into world coordinates. */
export function clientToWorld(
  clientPoint: CanvasPoint,
  canvasRect: CanvasRectLike,
  viewBox: CanvasViewBox
): CanvasPoint {
  return screenToWorld(
    {
      x: clientPoint.x - canvasRect.left,
      y: clientPoint.y - canvasRect.top,
    },
    viewBox
  )
}

/** Convert world coordinates into a browser client point. */
export function worldToClient(
  worldPoint: CanvasPoint,
  canvasRect: CanvasRectLike,
  viewBox: CanvasViewBox
): CanvasPoint {
  return {
    x: (worldPoint.x - viewBox.x) * viewBox.zoom + canvasRect.left,
    y: (worldPoint.y - viewBox.y) * viewBox.zoom + canvasRect.top,
  }
}

/** Keep the world point under a canvas-local anchor fixed while zooming. */
export function zoomViewBoxAtScreenPoint(
  viewBox: CanvasViewBox,
  screenPoint: CanvasPoint,
  nextZoom: number
): CanvasViewBox {
  const worldPoint = screenToWorld(screenPoint, viewBox)
  return {
    x: worldPoint.x - screenPoint.x / nextZoom,
    y: worldPoint.y - screenPoint.y / nextZoom,
    zoom: nextZoom,
  }
}

export function snapPointIfEnabled(
  point: CanvasPoint,
  snapToGrid: boolean,
  gridSize: number
): CanvasPoint {
  return snapToGrid ? snapPointToGrid(point, gridSize) : point
}

export function snapTargetIfEnabled(
  target: SnapTarget,
  snapToGrid: boolean,
  gridSize: number
): SnappedTarget {
  if (!snapToGrid) return { ...target, linesX: [], linesY: [] }

  const x = target.x === undefined ? undefined : snapValueToGrid(target.x, gridSize)
  const y = target.y === undefined ? undefined : snapValueToGrid(target.y, gridSize)

  return {
    x,
    y,
    linesX: x === undefined || x === target.x ? [] : [x],
    linesY: y === undefined || y === target.y ? [] : [y],
  }
}
