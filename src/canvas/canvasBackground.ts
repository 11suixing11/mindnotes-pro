import type { CanvasBackgroundImage, CanvasBackgroundStyle } from '../store/types'
import { getImage } from './canvasUtils'

type ViewBox = { x: number; y: number; zoom: number }
type CanvasSize = { w: number; h: number }

export interface BackgroundViewport {
  /** 可视区域宽度（屏幕像素） */
  width: number
  /** 可视区域高度（屏幕像素） */
  height: number
  /** 可视区域中心（世界坐标） */
  centerX: number
  centerY: number
}

/**
 * 计算铺满当前可视区域的等比背景图矩形（世界坐标）。
 * 视口宽高先换算成世界尺寸，再按“覆盖”取较大缩放比。
 */
export function computeBackgroundCoverRect(
  viewport: BackgroundViewport,
  imageWidth: number,
  imageHeight: number,
  zoom: number
): { x: number; y: number; width: number; height: number } {
  const safeZoom = Math.max(zoom, 0.01)
  const worldWidth = Math.max(1, viewport.width) / safeZoom
  const worldHeight = Math.max(1, viewport.height) / safeZoom
  const scale = Math.max(worldWidth / imageWidth, worldHeight / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale
  return {
    x: viewport.centerX - width / 2,
    y: viewport.centerY - height / 2,
    width,
    height,
  }
}

/**
 * 在背景色之上、元素之下绘制导入的背景图。
 * fit='cover'：按导入时记录的世界矩形绘制；fit='tile'：以图片为单元平铺可视区域。
 * 图片未就绪时返回，加载完成由现有 'image-loaded' 事件触发重绘。
 */
export function drawCanvasBackgroundImage(
  ctx: CanvasRenderingContext2D,
  canvasSize: CanvasSize,
  backgroundImage: CanvasBackgroundImage | undefined,
  viewBox: ViewBox = { x: 0, y: 0, zoom: 1 }
) {
  if (!backgroundImage) return
  const img = getImage(backgroundImage.dataUrl)
  if (!img?.complete || !img.naturalWidth) return

  const zoom = Math.max(viewBox.zoom, 0.01)
  ctx.save()
  ctx.scale(zoom, zoom)
  ctx.translate(-viewBox.x, -viewBox.y)

  if (backgroundImage.fit === 'tile') {
    const pattern = ctx.createPattern(img, 'repeat')
    if (pattern) {
      ctx.fillStyle = pattern
      ctx.fillRect(viewBox.x, viewBox.y, canvasSize.w / zoom, canvasSize.h / zoom)
    }
  } else {
    const { x = 0, y = 0, width, height } = backgroundImage
    ctx.drawImage(img, x, y, width, height)
  }

  ctx.restore()
}

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

/**
 * The paper color is user content: a dark custom background needs light
 * ink/dots regardless of the chrome theme. Judges relative luminance of a
 * hex color (#rgb / #rrggbb); unparseable values count as light.
 */
export function isDarkPaperColor(color: string): boolean {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())
  if (!match) return false
  const hex = match[1].length === 3
    ? match[1].split('').map((c) => c + c).join('')
    : match[1]
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.4
}

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
  const alpha = Math.min(0.2, 0.1 + (viewBox.zoom - 0.3) * 0.05)

  ctx.save()
  ctx.fillStyle = isDarkMode ? `rgba(190,170,150,${alpha})` : `rgba(155,142,127,${alpha})`

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
  const darkPaper = isDarkMode || isDarkPaperColor(bgColor)
  const lineColor = darkPaper ? 'rgba(214, 200, 182, 0.16)' : 'rgba(122, 105, 88, 0.16)'
  const dotColor = darkPaper ? 'rgba(222, 208, 190, 0.3)' : 'rgba(122, 105, 88, 0.3)'

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
