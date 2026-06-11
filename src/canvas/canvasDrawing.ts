import type {
  CanvasElement,
  StrokeElement,
  ShapeElement,
  TextElement,
  ImageElement,
  BrushType,
} from '../store/types'
import { getImage } from './canvasUtils'
import getStroke from 'perfect-freehand'

// 缓存Path2D对象以减少垃圾回收压力
let cachedMonetGridPath: Path2D | null = null
let cachedMonetGridParams: {
  startX: number
  startY: number
  endX: number
  endY: number
  gridSize: number
} | null = null

export function drawElement(
  ctx: CanvasRenderingContext2D,
  el: CanvasElement,
  isDarkMode: boolean,
  editingTextId?: string
) {
  if (el.type === 'stroke') drawStrokeEl(ctx, el, isDarkMode)
  else if (el.type === 'shape') drawShapeEl(ctx, el)
  else if (el.type === 'text') drawTextEl(ctx, el, editingTextId)
  else if (el.type === 'image') drawImageEl(ctx, el)
}

export function drawStrokeEl(
  ctx: CanvasRenderingContext2D,
  el: StrokeElement,
  isDarkMode: boolean
) {
  if (el.points.length < 2) return
  const b = el.brush,
    pts = el.points
  if (b === 'pen') {
    if (pts.length < 2) return
    ctx.beginPath()
    ctx.strokeStyle = el.color
    ctx.lineWidth = el.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = 1
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1],
        c = pts[i]
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + c[0]) / 2, (p[1] + c[1]) / 2)
    }
    ctx.stroke()
    try {
      const outline = getStroke(pts, {
        size: el.size,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
      })
      if (outline.length > 2) {
        ctx.globalAlpha = 0.15
        ctx.fillStyle = el.color
        ctx.beginPath()
        ctx.moveTo(outline[0][0], outline[0][1])
        for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i][0], outline[i][1])
        ctx.closePath()
        ctx.fill()
      }
    } catch {
      /* perfect-freehand fallback - main stroke already drawn */
    }
    ctx.globalAlpha = 1
  } else if (b === 'highlighter') {
    ctx.save()
    ctx.globalAlpha = el.opacity ?? 0.3
    ctx.strokeStyle = el.color
    ctx.lineWidth = el.size * 4
    ctx.lineCap = 'square'
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
    ctx.stroke()
    ctx.restore()
  } else if (b === 'pencil') {
    ctx.save()
    ctx.globalAlpha = el.opacity ?? 0.65
    ctx.strokeStyle = el.color
    ctx.lineWidth = el.size * 0.6
    ctx.lineCap = 'round'
    for (let i = 1; i < pts.length; i++) {
      ctx.beginPath()
      const seed = ((i * 7919) % 100) / 100
      ctx.moveTo(
        pts[i - 1][0] + (seed - 0.5) * el.size * 0.3,
        pts[i - 1][1] + (((seed * 1.3) % 1) - 0.5) * el.size * 0.3
      )
      ctx.lineTo(pts[i][0], pts[i][1])
      ctx.stroke()
    }
    ctx.restore()
  } else if (b === 'calligraphy') {
    ctx.strokeStyle = el.color
    ctx.lineCap = 'round'
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1],
        c = pts[i]
      const wf = 0.3 + 0.7 * Math.abs(Math.sin(Math.atan2(c[1] - p[1], c[0] - p[0]) - Math.PI / 4))
      ctx.beginPath()
      ctx.lineWidth = el.size * wf
      ctx.moveTo(p[0], p[1])
      ctx.lineTo(c[0], c[1])
      ctx.stroke()
    }
  } else if (b === 'dashed') {
    ctx.beginPath()
    ctx.strokeStyle = el.color
    ctx.lineWidth = el.size
    ctx.lineCap = 'round'
    ctx.setLineDash([el.size * 2, el.size * 1.5])
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1],
        c = pts[i]
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + c[0]) / 2, (p[1] + c[1]) / 2)
    }
    ctx.stroke()
    ctx.setLineDash([])
  } else if (b === 'glow') {
    ctx.save()
    ctx.lineCap = 'round'
    const glowMultiplier = isDarkMode ? 4 : 6
    const alphaBoost = isDarkMode ? 0.85 : 1.0
    ctx.shadowColor = el.color
    ctx.shadowBlur = el.size * glowMultiplier
    ctx.strokeStyle = el.color
    ctx.lineWidth = el.size * 0.4
    ctx.globalAlpha = alphaBoost
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1],
        c = pts[i]
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + c[0]) / 2, (p[1] + c[1]) / 2)
    }
    ctx.stroke()
    ctx.shadowBlur = el.size * glowMultiplier * 0.5
    ctx.lineWidth = el.size * 0.7
    ctx.globalAlpha = alphaBoost * 0.6
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1],
        c = pts[i]
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + c[0]) / 2, (p[1] + c[1]) / 2)
    }
    ctx.stroke()
    ctx.restore()
  }
}

export function drawStrokeRaw(
  ctx: CanvasRenderingContext2D,
  pts: number[][],
  c: string,
  s: number,
  b: BrushType,
  isDarkMode: boolean
) {
  drawStrokeEl(
    ctx,
    { type: 'stroke', id: '', points: pts, color: c, size: s, brush: b },
    isDarkMode
  )
}

export function drawShapeEl(ctx: CanvasRenderingContext2D, el: ShapeElement) {
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const { x, y, w, h } = el
  const hasFill = el.fillColor && el.fillColor !== 'transparent'
  switch (el.kind) {
    case 'rectangle': {
      const rx = Math.min(6, Math.abs(w) * 0.05, Math.abs(h) * 0.05)
      ctx.beginPath()
      ctx.moveTo(x + rx, y)
      ctx.lineTo(x + w - rx, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + rx)
      ctx.lineTo(x + w, y + h - rx)
      ctx.quadraticCurveTo(x + w, y + h, x + w - rx, y + h)
      ctx.lineTo(x + rx, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - rx)
      ctx.lineTo(x, y + rx)
      ctx.quadraticCurveTo(x, y, x + rx, y)
      ctx.closePath()
      if (hasFill) {
        ctx.fillStyle = el.fillColor!
        ctx.fill()
      }
      ctx.stroke()
      break
    }
    case 'circle':
      ctx.beginPath()
      ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2)
      if (hasFill) {
        ctx.fillStyle = el.fillColor!
        ctx.fill()
      }
      ctx.stroke()
      break
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
      const a = Math.atan2(h, w),
        hl = Math.max(15, el.size * 3)
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
  ctx.font = `${el.fontSize}px 'Noto Sans SC', 'PingFang SC', sans-serif`
  ctx.fillStyle = el.color
  ctx.textBaseline = 'top'
  const lineHeight = el.fontSize * 1.6
  const rawLines = el.content.split('\n')
  const wrappedLines: string[] = []
  for (const line of rawLines) {
    if (line === '') {
      wrappedLines.push('')
      continue
    }
    let current = ''
    for (const char of line) {
      const test = current + char
      if (ctx.measureText(test).width > el.width && current.length > 0) {
        wrappedLines.push(current)
        current = char
      } else {
        current = test
      }
    }
    wrappedLines.push(current)
  }
  for (let i = 0; i < wrappedLines.length; i++) {
    ctx.fillText(wrappedLines[i], el.x, el.y + i * lineHeight)
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
    ctx.moveTo(el.x + r, el.y)
    ctx.lineTo(el.x + el.width - r, el.y)
    ctx.quadraticCurveTo(el.x + el.width, el.y, el.x + el.width, el.y + r)
    ctx.lineTo(el.x + el.width, el.y + el.height - r)
    ctx.quadraticCurveTo(el.x + el.width, el.y + el.height, el.x + el.width - r, el.y + el.height)
    ctx.lineTo(el.x + r, el.y + el.height)
    ctx.quadraticCurveTo(el.x, el.y + el.height, el.x, el.y + el.height - r)
    ctx.lineTo(el.x, el.y + r)
    ctx.quadraticCurveTo(el.x, el.y, el.x + r, el.y)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(img, el.x, el.y, el.width, el.height)
    ctx.restore()
  }
}

export function drawSelBox(
  ctx: CanvasRenderingContext2D,
  b: { x: number; y: number; w: number; h: number },
  isDarkMode: boolean,
  zoom: number
) {
  const primary = isDarkMode ? '#C8A0B0' : '#B07D6E'
  const primaryLight = isDarkMode ? 'rgba(200,160,176,0.12)' : 'rgba(176,125,110,0.1)'

  ctx.save()
  ctx.strokeStyle = primary
  ctx.lineWidth = 1.5 / zoom
  ctx.setLineDash([5 / zoom, 5 / zoom])
  ctx.strokeRect(b.x, b.y, b.w, b.h)
  ctx.setLineDash([])

  ctx.fillStyle = primaryLight
  ctx.fillRect(b.x, b.y, b.w, b.h)

  const cornerR = 4 / zoom
  ctx.fillStyle = primary
  ctx.shadowColor = isDarkMode ? 'rgba(200,160,176,0.3)' : 'rgba(176,125,110,0.3)'
  ctx.shadowBlur = 4 / zoom
  for (const [cx, cy] of [
    [b.x, b.y],
    [b.x + b.w, b.y],
    [b.x, b.y + b.h],
    [b.x + b.w, b.y + b.h],
  ]) {
    ctx.beginPath()
    ctx.arc(cx, cy, cornerR, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function drawMonetGrid(
  ctx: CanvasRenderingContext2D,
  viewBox: { x: number; y: number; zoom: number },
  canvasSize: { w: number; h: number },
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
  if (isDarkMode) {
    ctx.fillStyle = `rgba(160,150,180,${alpha})`
  } else {
    ctx.fillStyle = `rgba(155,142,127,${alpha})`
  }

  // 检查参数是否变化，决定是否重新创建Path2D对象
  const currentParams = { startX: sx, startY: sy, endX: ex, endY: ey, gridSize: gs }
  const paramsChanged =
    !cachedMonetGridParams ||
    cachedMonetGridParams.startX !== currentParams.startX ||
    cachedMonetGridParams.startY !== currentParams.startY ||
    cachedMonetGridParams.endX !== currentParams.endX ||
    cachedMonetGridParams.endY !== currentParams.endY ||
    cachedMonetGridParams.gridSize !== currentParams.gridSize

  if (paramsChanged || !cachedMonetGridPath) {
    // 参数变化时创建新的Path2D对象
    const path = new Path2D()
    for (let x = sx; x <= ex; x += gs) {
      for (let y = sy; y <= ey; y += gs) {
        path.moveTo(x + dotSize, y)
        path.arc(x, y, dotSize, 0, Math.PI * 2)
      }
    }

    // 更新缓存
    cachedMonetGridPath = path
    cachedMonetGridParams = currentParams
  }

  // 使用缓存的Path2D对象绘制
  ctx.fill(cachedMonetGridPath)
  ctx.restore()
}

export function drawCanvasBackground(
  ctx: CanvasRenderingContext2D,
  canvasSize: { w: number; h: number },
  bgColor: string,
  isDarkMode: boolean
) {
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)

  if (isDarkMode) {
    const g1 = ctx.createRadialGradient(
      canvasSize.w * 0.12,
      canvasSize.h * 0.18,
      0,
      canvasSize.w * 0.12,
      canvasSize.h * 0.18,
      canvasSize.w * 0.55
    )
    g1.addColorStop(0, 'rgba(122,104,144,0.10)')
    g1.addColorStop(0.6, 'rgba(122,104,144,0.03)')
    g1.addColorStop(1, 'transparent')
    ctx.fillStyle = g1
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)

    const g2 = ctx.createRadialGradient(
      canvasSize.w * 0.82,
      canvasSize.h * 0.72,
      0,
      canvasSize.w * 0.82,
      canvasSize.h * 0.72,
      canvasSize.w * 0.45
    )
    g2.addColorStop(0, 'rgba(88,112,128,0.08)')
    g2.addColorStop(0.6, 'rgba(88,112,128,0.02)')
    g2.addColorStop(1, 'transparent')
    ctx.fillStyle = g2
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)

    const g3 = ctx.createRadialGradient(
      canvasSize.w * 0.5,
      canvasSize.h * 0.45,
      0,
      canvasSize.w * 0.5,
      canvasSize.h * 0.45,
      canvasSize.w * 0.5
    )
    g3.addColorStop(0, 'rgba(152,128,88,0.06)')
    g3.addColorStop(1, 'transparent')
    ctx.fillStyle = g3
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)
  } else {
    const g1 = ctx.createRadialGradient(
      canvasSize.w * 0.12,
      canvasSize.h * 0.18,
      0,
      canvasSize.w * 0.12,
      canvasSize.h * 0.18,
      canvasSize.w * 0.55
    )
    g1.addColorStop(0, 'rgba(184,160,208,0.16)')
    g1.addColorStop(0.5, 'rgba(184,160,208,0.05)')
    g1.addColorStop(1, 'transparent')
    ctx.fillStyle = g1
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)

    const g2 = ctx.createRadialGradient(
      canvasSize.w * 0.82,
      canvasSize.h * 0.72,
      0,
      canvasSize.w * 0.82,
      canvasSize.h * 0.72,
      canvasSize.w * 0.45
    )
    g2.addColorStop(0, 'rgba(144,180,208,0.14)')
    g2.addColorStop(0.5, 'rgba(144,180,208,0.04)')
    g2.addColorStop(1, 'transparent')
    ctx.fillStyle = g2
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)

    const g3 = ctx.createRadialGradient(
      canvasSize.w * 0.55,
      canvasSize.h * 0.4,
      0,
      canvasSize.w * 0.55,
      canvasSize.h * 0.4,
      canvasSize.w * 0.4
    )
    g3.addColorStop(0, 'rgba(208,184,136,0.10)')
    g3.addColorStop(0.5, 'rgba(208,184,136,0.03)')
    g3.addColorStop(1, 'transparent')
    ctx.fillStyle = g3
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)

    const g4 = ctx.createRadialGradient(
      canvasSize.w * 0.7,
      canvasSize.h * 0.2,
      0,
      canvasSize.w * 0.7,
      canvasSize.h * 0.2,
      canvasSize.w * 0.35
    )
    g4.addColorStop(0, 'rgba(212,152,152,0.10)')
    g4.addColorStop(0.5, 'rgba(212,152,152,0.03)')
    g4.addColorStop(1, 'transparent')
    ctx.fillStyle = g4
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)
  }
}

export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  elements: CanvasElement[],
  cachedBounds: (el: CanvasElement) => { x: number; y: number; w: number; h: number },
  viewBox: { x: number; y: number; zoom: number },
  canvasSize: { w: number; h: number },
  isDarkMode: boolean
) {
  if (elements.length === 0) return
  const mmW = 120,
    mmH = 80,
    pad = 12
  const mmX = canvasSize.w - mmW - pad,
    mmY = canvasSize.h - mmH - pad - 40
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const el of elements) {
    const b = cachedBounds(el)
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.w)
    maxY = Math.max(maxY, b.y + b.h)
  }
  if (!isFinite(minX)) return
  const rangeX = maxX - minX || 1,
    rangeY = maxY - minY || 1
  const scale = Math.min(mmW / rangeX, mmH / rangeY) * 0.8
  ctx.save()
  ctx.globalAlpha = 0.6

  ctx.fillStyle = isDarkMode ? 'rgba(34,32,44,0.85)' : 'rgba(251,246,238,0.85)'
  ctx.strokeStyle = isDarkMode ? 'rgba(160,150,180,0.15)' : 'rgba(155,142,127,0.15)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4, 10)
  ctx.fill()
  ctx.stroke()

  const minimapColors = isDarkMode
    ? [
        'rgba(200,160,176,0.5)',
        'rgba(106,90,128,0.5)',
        'rgba(80,104,120,0.5)',
        'rgba(138,120,80,0.5)',
      ]
    : [
        'rgba(176,125,110,0.5)',
        'rgba(196,181,216,0.5)',
        'rgba(160,188,212,0.5)',
        'rgba(212,192,152,0.5)',
      ]
  let ci = 0
  for (const el of elements) {
    const b = cachedBounds(el)
    ctx.fillStyle = minimapColors[ci % minimapColors.length]
    ci++
    ctx.fillRect(
      mmX + (b.x - minX) * scale + (mmW - rangeX * scale) / 2,
      mmY + (b.y - minY) * scale + (mmH - rangeY * scale) / 2,
      Math.max(1, b.w * scale),
      Math.max(1, b.h * scale)
    )
  }
  const vx = (viewBox.x - minX) * scale + (mmW - rangeX * scale) / 2,
    vy = (viewBox.y - minY) * scale + (mmH - rangeY * scale) / 2
  const vpColor = isDarkMode ? '#C8A0B0' : '#B07D6E'
  ctx.strokeStyle = vpColor
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(
    mmX + vx,
    mmY + vy,
    (canvasSize.w / viewBox.zoom) * scale,
    (canvasSize.h / viewBox.zoom) * scale,
    3
  )
  ctx.stroke()
  ctx.restore()
}

export function drawZoomLevel(
  ctx: CanvasRenderingContext2D,
  viewBox: { zoom: number },
  canvasSize: { w: number; h: number },
  isDarkMode: boolean,
  dpr: number
) {
  ctx.save()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.font = '500 11px "Noto Sans SC", sans-serif'
  ctx.fillStyle = isDarkMode ? 'rgba(200,160,176,0.5)' : 'rgba(176,125,110,0.4)'
  ctx.textAlign = 'right'
  ctx.fillText(`${Math.round(viewBox.zoom * 100)}%`, canvasSize.w - 145, canvasSize.h - 50)
  ctx.restore()
}
