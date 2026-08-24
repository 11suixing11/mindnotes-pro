import type { ImageElement, ShapeElement, TextElement } from '../store/types'
import { getImage } from './canvasUtils'
import { LRUCache } from './drawingCaches'
import {
  createTextWidthMeasurer,
  getOriginalTextContent,
  getTextAnchorX,
  getTextFont,
  getTextLineHeight,
  isVisibleTextBackground,
  normalizeTextFormat,
  wrapTextLines,
} from './textFormatting'

const TEXT_CACHE_MAX_SIZE = 100
const TEXT_CACHE_TTL = 30000
const textWrapCache = new LRUCache<string, string[]>(TEXT_CACHE_MAX_SIZE, TEXT_CACHE_TTL)

function getTextCacheKey(el: TextElement): string {
  const originalContent = getOriginalTextContent(el)
  return [
    el.id,
    originalContent,
    el.width,
    el.autoResize ? 'auto' : 'fixed',
    el.fontSize,
    el.fontWeight ?? '',
    el.fontStyle ?? '',
  ].join(':')
}

function getCachedTextWrap(el: TextElement, ctx: CanvasRenderingContext2D): string[] {
  const key = getTextCacheKey(el)
  const cached = textWrapCache.get(key)
  if (cached) return cached

  const format = normalizeTextFormat(el)
  ctx.font = getTextFont(format)
  const measureText = createTextWidthMeasurer(format, ctx)
  const wrappedLines = wrapTextLines(getOriginalTextContent(el), el.width, measureText)

  textWrapCache.set(key, wrappedLines)
  return wrappedLines
}

const shapePathCache = new LRUCache<string, Path2D>(150, 45000)

function getShapeCacheKey(el: ShapeElement): string {
  const rx = el.kind === 'rectangle' ? Math.min(6, Math.abs(el.w) * 0.05, Math.abs(el.h) * 0.05) : 0
  return [
    el.kind,
    el.x.toFixed(1),
    el.y.toFixed(1),
    el.w.toFixed(1),
    el.h.toFixed(1),
    rx.toFixed(2),
  ].join(':')
}

export function drawShapeEl(ctx: CanvasRenderingContext2D, el: ShapeElement) {
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const { x, y, w, h } = el
  const hasFill = el.fillColor && el.fillColor !== 'transparent'

  if (el.kind === 'rectangle' || el.kind === 'circle') {
    const key = getShapeCacheKey(el)
    let path = shapePathCache.get(key)
    if (!path) {
      path = new Path2D()
      if (el.kind === 'rectangle') {
        const rx = Math.min(6, Math.abs(w) * 0.05, Math.abs(h) * 0.05)
        path.moveTo(x + rx, y)
        path.lineTo(x + w - rx, y)
        path.quadraticCurveTo(x + w, y, x + w, y + rx)
        path.lineTo(x + w, y + h - rx)
        path.quadraticCurveTo(x + w, y + h, x + w - rx, y + h)
        path.lineTo(x + rx, y + h)
        path.quadraticCurveTo(x, y + h, x, y + h - rx)
        path.lineTo(x, y + rx)
        path.quadraticCurveTo(x, y, x + rx, y)
        path.closePath()
      } else {
        path.ellipse(x + w / 2, y + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2)
      }
      shapePathCache.set(key, path)
    }
    if (hasFill && el.fillColor) {
      ctx.fillStyle = el.fillColor
      ctx.fill(path)
    }
    ctx.stroke(path)
    return
  }

  switch (el.kind) {
    case 'line':
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + w, y + h)
      ctx.stroke()
      break
    case 'arrow': {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + w, y + h)
      ctx.stroke()
      const a = Math.atan2(h, w)
      const hl = Math.max(15, el.size * 3)
      ctx.beginPath()
      ctx.moveTo(x + w, y + h)
      ctx.lineTo(x + w - hl * Math.cos(a - Math.PI / 6), y + h - hl * Math.sin(a - Math.PI / 6))
      ctx.moveTo(x + w, y + h)
      ctx.lineTo(x + w - hl * Math.cos(a + Math.PI / 6), y + h - hl * Math.sin(a + Math.PI / 6))
      ctx.stroke()
      break
    }
  }
}

export function drawTextEl(ctx: CanvasRenderingContext2D, el: TextElement, editingTextId?: string) {
  if (el.id === editingTextId) return
  ctx.save()
  const format = normalizeTextFormat(el)
  ctx.font = getTextFont(format)
  ctx.fillStyle = el.color
  ctx.textBaseline = 'top'
  ctx.textAlign = format.textAlign
  const lineHeight = getTextLineHeight(format.fontSize)
  const textX = getTextAnchorX(el.x, el.width, format.textAlign)
  const wrappedLines = getCachedTextWrap(el, ctx)

  if (isVisibleTextBackground(format.backgroundColor)) {
    ctx.fillStyle = format.backgroundColor
    ctx.fillRect(el.x, el.y, el.width, Math.max(el.height, wrappedLines.length * lineHeight))
    ctx.fillStyle = el.color
  }

  for (let i = 0; i < wrappedLines.length; i++) {
    const y = el.y + i * lineHeight
    ctx.fillText(wrappedLines[i], textX, y)
    if (format.textDecoration === 'underline') {
      const metrics = ctx.measureText(wrappedLines[i])
      const textWidth = metrics.width
      const startX =
        format.textAlign === 'center'
          ? textX - textWidth / 2
          : format.textAlign === 'right'
            ? textX - textWidth
            : textX
      const underlineY = y + format.fontSize * 1.18
      ctx.beginPath()
      ctx.moveTo(startX, underlineY)
      ctx.lineTo(startX + textWidth, underlineY)
      ctx.strokeStyle = el.color
      ctx.lineWidth = Math.max(1, format.fontSize / 16)
      ctx.stroke()
    }
  }
  ctx.restore()
}

export function drawImageEl(ctx: CanvasRenderingContext2D, el: ImageElement) {
  const img = getImage(el.dataUrl)
  if (img?.complete) {
    ctx.save()
    ctx.globalAlpha = el.opacity ?? 1
    const r = 6
    ctx.beginPath()
    ctx.roundRect(el.x, el.y, el.width, el.height, r)
    ctx.clip()
    ctx.drawImage(img, el.x, el.y, el.width, el.height)
    ctx.restore()
  }
}

export function invalidateElementRendererCaches(): void {
  shapePathCache.clear()
}
