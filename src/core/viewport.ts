export interface ViewBox {
  x: number
  y: number
  zoom: number
}

export interface ViewportPoint {
  x: number
  y: number
}

/** Apply a screen-space pan to a view box while preserving zoom. */
export function panViewBox(
  viewBox: ViewBox,
  previousScreenPoint: ViewportPoint,
  nextScreenPoint: ViewportPoint
): ViewBox {
  const dx = (nextScreenPoint.x - previousScreenPoint.x) / viewBox.zoom
  const dy = (nextScreenPoint.y - previousScreenPoint.y) / viewBox.zoom
  return {
    ...viewBox,
    x: viewBox.x - dx,
    y: viewBox.y - dy,
  }
}
