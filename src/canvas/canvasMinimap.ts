import type { CanvasElement } from '../store/types'

interface MinimapCacheValue {
  minX: number
  minY: number
  maxX: number
  maxY: number
  elementCount: number
  lastAccess: number
}

type Bounds = { x: number; y: number; w: number; h: number }
type ViewBox = { x: number; y: number; zoom: number }
type CanvasSize = { w: number; h: number }

let minimapCache: MinimapCacheValue | null = null
const MINIMAP_CACHE_TTL = 5000

function getCachedMinimapBounds(
  elements: CanvasElement[],
  cachedBounds: (el: CanvasElement) => Bounds
): Bounds {
  const now = Date.now()
  const elementCount = elements.length

  if (
    minimapCache &&
    minimapCache.elementCount === elementCount &&
    now - minimapCache.lastAccess < MINIMAP_CACHE_TTL
  ) {
    minimapCache.lastAccess = now
    return {
      x: minimapCache.minX,
      y: minimapCache.minY,
      w: minimapCache.maxX - minimapCache.minX,
      h: minimapCache.maxY - minimapCache.minY,
    }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const el of elements) {
    const bounds = cachedBounds(el)
    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.w)
    maxY = Math.max(maxY, bounds.y + bounds.h)
  }

  minimapCache = { minX, minY, maxX, maxY, elementCount, lastAccess: now }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export function drawElementMinimap(
  ctx: CanvasRenderingContext2D,
  _el: CanvasElement,
  isDarkMode: boolean,
  bounds: Bounds
) {
  const color = isDarkMode ? 'rgba(200,160,176,0.6)' : 'rgba(176,125,110,0.5)'
  ctx.fillStyle = color
  ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h)
}

export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  elements: CanvasElement[],
  cachedBounds: (el: CanvasElement) => Bounds,
  viewBox: ViewBox,
  canvasSize: CanvasSize,
  isDarkMode: boolean,
  bgColor?: string
) {
  const mmW = 140
  const mmH = 90
  const pad = 12
  const mmX = canvasSize.w - mmW - pad
  const mmY = canvasSize.h - mmH - pad

  ctx.save()
  ctx.globalAlpha = 0.8
  ctx.fillStyle = 'transparent'
  ctx.beginPath()
  ctx.roundRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4, 8)
  ctx.fill()

  if (elements.length === 0) {
    ctx.restore()
    return
  }

  const bounds = getCachedMinimapBounds(elements, cachedBounds)
  if (!isFinite(bounds.x)) {
    ctx.restore()
    return
  }

  const contentW = bounds.w || 1
  const contentH = bounds.h || 1
  const padding = 20
  const availW = mmW - padding * 2
  const availH = mmH - padding * 2
  const scale = Math.min(availW / contentW, availH / contentH)
  const offX = mmX + (mmW - contentW * scale) / 2 - bounds.x * scale
  const offY = mmY + (mmH - contentH * scale) / 2 - bounds.y * scale

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(mmX, mmY, mmW, mmH, 6)
  ctx.clip()
  ctx.fillStyle = bgColor || (isDarkMode ? '#1C1A24' : '#ffffff')
  ctx.fillRect(mmX, mmY, mmW, mmH)
  ctx.translate(offX, offY)
  ctx.scale(scale, scale)

  for (const el of elements) {
    drawElementMinimap(ctx, el, isDarkMode, cachedBounds(el))
  }

  ctx.restore()

  const vpX = offX + viewBox.x * scale
  const vpY = offY + viewBox.y * scale
  const vpW = (canvasSize.w / viewBox.zoom) * scale
  const vpH = (canvasSize.h / viewBox.zoom) * scale
  const vpColor = isDarkMode ? '#C8A0B0' : '#B07D6E'
  ctx.strokeStyle = vpColor
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(vpX, vpY, vpW, vpH, 2)
  ctx.stroke()
  ctx.restore()
}

export function resetCanvasMinimapCaches() {
  minimapCache = null
}
