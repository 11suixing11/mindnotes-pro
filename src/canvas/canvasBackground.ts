import type { CanvasBackgroundStyle } from '../store/types'

type ViewBox = { x: number; y: number; zoom: number }
type CanvasSize = { w: number; h: number }

let cachedMonetGridPath: Path2D | null = null
let cachedMonetGridParams: {
  startX: number
  startY: number
  endX: number
  endY: number
  gridSize: number
  dotSize: number
  zoom: number
} | null = null

let cachedGridPath: Path2D | null = null
let cachedGridParams: {
  startX: number
  startY: number
  endX: number
  endY: number
  step: number
} | null = null

export function drawMonetGrid(
  ctx: CanvasRenderingContext2D,
  viewBox: ViewBox,
  canvasSize: CanvasSize,
  isDarkMode: boolean
) {
  if (viewBox.zoom <= 0.3) return

  const gs = 40
  const sx = Math.floor(viewBox.x / gs) * gs
  const sy = Math.floor(viewBox.y / gs) * gs
  const ex = viewBox.x + canvasSize.w / viewBox.zoom
  const ey = viewBox.y + canvasSize.h / viewBox.zoom
  const dotSize = Math.max(0.8, 1.2 / viewBox.zoom)
  const alpha = Math.min(0.12, 0.06 + (viewBox.zoom - 0.3) * 0.03)

  ctx.save()
  ctx.fillStyle = isDarkMode ? `rgba(160,150,180,${alpha})` : `rgba(155,142,127,${alpha})`

  const currentParams = {
    startX: sx,
    startY: sy,
    endX: ex,
    endY: ey,
    gridSize: gs,
    dotSize,
    zoom: viewBox.zoom,
  }
  const paramsChanged =
    !cachedMonetGridParams ||
    cachedMonetGridParams.startX !== currentParams.startX ||
    cachedMonetGridParams.startY !== currentParams.startY ||
    cachedMonetGridParams.endX !== currentParams.endX ||
    cachedMonetGridParams.endY !== currentParams.endY ||
    cachedMonetGridParams.gridSize !== currentParams.gridSize ||
    cachedMonetGridParams.dotSize !== currentParams.dotSize ||
    cachedMonetGridParams.zoom !== currentParams.zoom

  if (paramsChanged || !cachedMonetGridPath) {
    const path = new Path2D()
    for (let x = sx; x <= ex; x += gs) {
      for (let y = sy; y <= ey; y += gs) {
        path.moveTo(x + dotSize, y)
        path.arc(x, y, dotSize, 0, Math.PI * 2)
      }
    }
    cachedMonetGridPath = path
    cachedMonetGridParams = currentParams
  }

  ctx.fill(cachedMonetGridPath)
  ctx.restore()
}

export function drawCanvasBackground(
  ctx: CanvasRenderingContext2D,
  canvasSize: CanvasSize,
  bgColor: string,
  isDarkMode: boolean,
  backgroundStyle: CanvasBackgroundStyle = 'plain',
  viewBox: ViewBox = { x: 0, y: 0, zoom: 1 }
) {
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)

  if (backgroundStyle === 'plain') return

  const zoom = Math.max(viewBox.zoom, 0.01)
  const lineColor = isDarkMode ? 'rgba(200, 190, 220, 0.16)' : 'rgba(86, 104, 128, 0.16)'
  const dotColor = isDarkMode ? 'rgba(210, 200, 225, 0.28)' : 'rgba(76, 92, 112, 0.28)'

  const screenOffset = (worldOffset: number, spacing: number) => {
    const raw = (worldOffset - viewBox.x) * zoom
    return ((raw % spacing) + spacing) % spacing
  }

  ctx.save()
  ctx.lineWidth = 1

  if (backgroundStyle === 'dots') {
    const spacing = Math.max(12, 24 * zoom)
    const startX = screenOffset(0, spacing)
    const startY = (((-viewBox.y * zoom) % spacing) + spacing) % spacing
    ctx.fillStyle = dotColor
    ctx.beginPath()
    for (let x = startX; x <= canvasSize.w; x += spacing) {
      for (let y = startY; y <= canvasSize.h; y += spacing) {
        ctx.moveTo(x + 1.25, y)
        ctx.arc(x, y, 1.25, 0, Math.PI * 2)
      }
    }
    ctx.fill()
    ctx.restore()
    return
  }

  const spacingWorld = backgroundStyle === 'grid' ? 24 : 28
  const spacing = Math.max(12, spacingWorld * zoom)
  const startY = (((-viewBox.y * zoom) % spacing) + spacing) % spacing
  ctx.strokeStyle = lineColor
  ctx.beginPath()

  if (backgroundStyle === 'grid') {
    const startX = screenOffset(0, spacing)
    for (let x = startX; x <= canvasSize.w; x += spacing) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvasSize.h)
    }
  }

  for (let y = startY; y <= canvasSize.h; y += spacing) {
    ctx.moveTo(0, y)
    ctx.lineTo(canvasSize.w, y)
  }
  ctx.stroke()

  if (backgroundStyle === 'notebook') {
    const marginX = (72 - viewBox.x) * zoom
    if (marginX >= 0 && marginX <= canvasSize.w) {
      ctx.strokeStyle = isDarkMode ? 'rgba(220, 140, 155, 0.34)' : 'rgba(205, 92, 92, 0.34)'
      ctx.beginPath()
      ctx.moveTo(marginX, 0)
      ctx.lineTo(marginX, canvasSize.h)
      ctx.stroke()
    }
  }

  ctx.restore()
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  viewBox: ViewBox,
  canvasSize: CanvasSize,
  isDarkMode: boolean,
  gridSize = 20
) {
  const step = gridSize
  const startX = Math.floor(viewBox.x / step) * step
  const startY = Math.floor(viewBox.y / step) * step
  const endX = viewBox.x + canvasSize.w / viewBox.zoom
  const endY = viewBox.y + canvasSize.h / viewBox.zoom

  const currentParams = { startX, startY, endX, endY, step }
  const paramsChanged =
    !cachedGridParams ||
    cachedGridParams.startX !== currentParams.startX ||
    cachedGridParams.startY !== currentParams.startY ||
    cachedGridParams.endX !== currentParams.endX ||
    cachedGridParams.endY !== currentParams.endY ||
    cachedGridParams.step !== currentParams.step

  if (paramsChanged || !cachedGridPath) {
    const path = new Path2D()
    for (let x = startX; x <= endX; x += step) {
      path.moveTo(x, startY)
      path.lineTo(x, endY)
    }
    for (let y = startY; y <= endY; y += step) {
      path.moveTo(startX, y)
      path.lineTo(endX, y)
    }
    cachedGridPath = path
    cachedGridParams = currentParams
  }

  ctx.save()
  ctx.strokeStyle = isDarkMode ? 'rgba(200,160,176,0.08)' : 'rgba(176,125,110,0.08)'
  ctx.lineWidth = 0.5 / viewBox.zoom
  ctx.stroke(cachedGridPath)
  ctx.restore()
}

export function resetCanvasBackgroundCaches() {
  cachedMonetGridPath = null
  cachedMonetGridParams = null
  cachedGridPath = null
  cachedGridParams = null
}
