import type { CanvasElement, BrushType, StrokeElement } from '../store/types'
import { getBrushDashArray, getBrushDefaultOpacity, getCanvasStrokeWidth } from './brushPresets'
import { LRUCache } from './drawingCaches'
import { resetCanvasBackgroundCaches } from './canvasBackground'
import {
  drawImageEl,
  drawShapeEl,
  drawTextEl,
  invalidateElementRendererCaches,
} from './elementRenderers'
import getStroke from 'perfect-freehand'

export { drawImageEl, drawShapeEl, drawTextEl } from './elementRenderers'
export { drawSelBox, drawZoomLevel } from './canvasOverlays'
export { drawCanvasBackground, drawGrid, drawMonetGrid } from './canvasBackground'

// ==================== 性能缓存层 (P0 优化) ====================

// P1 性能优化: 书法笔触对象池 - 复用 buckets 和线段对象避免 GC
// 性能提升: 书法笔触渲染减少 90%+ 临时对象分配，GC 压力显著降低
const CALLIGRAPHY_WIDTH_BUCKETS = 8
const CALLIGRAPHY_MAX_SEGMENTS = 2000

interface Segment {
  x1: number
  y1: number
  x2: number
  y2: number
}

let calligraphyBuckets: Segment[][] | null = null
let calligraphyWfSums: number[] | null = null
let calligraphyCounts: number[] | null = null
let segmentPool: Segment[] | null = null
let segmentPoolIndex = 0

function getCalligraphyBuckets(): Segment[][] {
  if (!calligraphyBuckets) {
    calligraphyBuckets = Array.from({ length: CALLIGRAPHY_WIDTH_BUCKETS }, () => [])
  }
  return calligraphyBuckets
}

function getCalligraphyWfSums(): number[] {
  if (!calligraphyWfSums) {
    calligraphyWfSums = new Array(CALLIGRAPHY_WIDTH_BUCKETS).fill(0)
  }
  return calligraphyWfSums
}

function getCalligraphyCounts(): number[] {
  if (!calligraphyCounts) {
    calligraphyCounts = new Array(CALLIGRAPHY_WIDTH_BUCKETS).fill(0)
  }
  return calligraphyCounts
}

function getSegmentPool(): { next: () => Segment } {
  if (!segmentPool) {
    segmentPool = Array.from({ length: CALLIGRAPHY_MAX_SEGMENTS }, () => ({
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
    }))
  }
  if (segmentPoolIndex >= CALLIGRAPHY_MAX_SEGMENTS) {
    segmentPoolIndex = 0
  }
  return {
    next: () => {
      // segmentPool 已在 getSegmentPool 入口处懒初始化，此处必然非空
      // 添加运行时安全检查以防极端情况
      if (!segmentPool) {
        segmentPool = Array.from({ length: CALLIGRAPHY_MAX_SEGMENTS }, () => ({
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 0,
        }))
      }
      return segmentPool[segmentPoolIndex++]
    },
  }
}

// 书法笔触对象池重置 - 在 invalidateDrawingCaches 中调用
function resetCalligraphyPool() {
  segmentPoolIndex = 0
}

// Perfect-Freehand 笔触缓存 - 避免每帧重复计算昂贵的描边路径
const STROKE_CACHE_MAX_SIZE = 200
const STROKE_CACHE_TTL = 60000 // 60秒
const strokeOutlineCache = new LRUCache<string, number[][]>(STROKE_CACHE_MAX_SIZE, STROKE_CACHE_TTL)

// 缓存键包含点坐标哈希，避免修改点坐标后缓存命中错误数据
function getStrokeCacheKey(el: StrokeElement): string {
  // 取首尾点和中间点坐标作为哈希，检测点坐标变化
  const firstPoint = el.points[0] ? `${el.points[0][0]}:${el.points[0][1]}` : ''
  const lastPoint = el.points[el.points.length - 1]
    ? `${el.points[el.points.length - 1][0]}:${el.points[el.points.length - 1][1]}`
    : ''
  const midIndex = Math.floor(el.points.length / 2)
  const midPoint = el.points[midIndex] ? `${el.points[midIndex][0]}:${el.points[midIndex][1]}` : ''
  const pressures = el.pressures
  const pressureKey =
    pressures && pressures.length === el.points.length
      ? `${pressures.length}:${pressures[0]}:${pressures[midIndex]}:${pressures[pressures.length - 1]}`
      : 'no-pressure'
  return `${el.id}:${el.points.length}:${el.size}:${firstPoint}:${lastPoint}:${midPoint}:${pressureKey}`
}

function hasPressureData(el: StrokeElement): el is StrokeElement & { pressures: number[] } {
  return !!el.pressures && el.pressures.length === el.points.length
}

function getFreehandPoints(el: StrokeElement): number[][] {
  if (!hasPressureData(el)) return el.points
  return el.points.map((point, index) => [point[0], point[1], el.pressures[index]])
}

function getCachedStrokeOutline(el: StrokeElement): number[][] | null {
  if (el.brush !== 'pen') return null

  const key = getStrokeCacheKey(el)
  const cached = strokeOutlineCache.get(key)
  if (cached) return cached

  try {
    const outline = getStroke(getFreehandPoints(el), {
      size: el.size,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: !hasPressureData(el),
    })
    strokeOutlineCache.set(key, outline)
    return outline
  } catch {
    return null
  }
}

function fillStrokeOutline(
  ctx: CanvasRenderingContext2D,
  outline: number[][],
  color: string,
  alpha: number
) {
  if (outline.length <= 2) return
  const previousAlpha = ctx.globalAlpha
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(outline[0][0], outline[0][1])
  for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i][0], outline[i][1])
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = previousAlpha
}

// 小地图边界缓存 - 避免每次渲染都遍历所有元素计算边界
interface MinimapCacheValue {
  minX: number
  minY: number
  maxX: number
  maxY: number
  elementCount: number
  lastAccess: number
}
let minimapCache: MinimapCacheValue | null = null
const MINIMAP_CACHE_TTL = 5000 // 5秒
function getCachedMinimapBounds(
  elements: CanvasElement[],
  cachedBounds: (el: CanvasElement) => { x: number; y: number; w: number; h: number }
): { minX: number; minY: number; maxX: number; maxY: number } {
  const now = Date.now()
  const elementCount = elements.length

  if (
    minimapCache &&
    minimapCache.elementCount === elementCount &&
    now - minimapCache.lastAccess < MINIMAP_CACHE_TTL
  ) {
    minimapCache.lastAccess = now
    return {
      minX: minimapCache.minX,
      minY: minimapCache.minY,
      maxX: minimapCache.maxX,
      maxY: minimapCache.maxY,
    }
  }

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

  minimapCache = { minX, minY, maxX, maxY, elementCount, lastAccess: now }
  return { minX, minY, maxX, maxY }
}
// Shape, text, and image rotation remains centralized in the shared dispatcher.
function applyRotationTransform(
  ctx: CanvasRenderingContext2D,
  el: CanvasElement,
  bounds: { x: number; y: number; w: number; h: number }
): boolean {
  const rotation = el.rotation
  if (!rotation || Math.abs(rotation) < 0.001) return false

  const centerX = bounds.x + bounds.w / 2
  const centerY = bounds.y + bounds.h / 2

  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(rotation)
  ctx.translate(-centerX, -centerY)

  return true
}

export function drawElement(
  ctx: CanvasRenderingContext2D,
  el: CanvasElement,
  isDarkMode: boolean,
  editingTextId?: string
) {
  // stroke 元素已在 rotateElement 中物理旋转了点坐标，无需额外变换
  if (el.type === 'stroke') {
    drawStrokeEl(ctx, el, isDarkMode)
    return
  }

  // 为 shape/text/image 应用旋转变换
  const bounds = {
    x: el.type === 'shape' ? Math.min(el.x, el.x + el.w) : el.x,
    y: el.type === 'shape' ? Math.min(el.y, el.y + el.h) : el.y,
    w: el.type === 'shape' ? Math.abs(el.w) : el.width,
    h: el.type === 'shape' ? Math.abs(el.h) : el.height,
  }

  const hasRotation = applyRotationTransform(ctx, el, bounds)

  if (el.type === 'shape') drawShapeEl(ctx, el)
  else if (el.type === 'text') drawTextEl(ctx, el, editingTextId)
  else if (el.type === 'image') drawImageEl(ctx, el)

  if (hasRotation) {
    ctx.restore()
  }
}

// P0 性能优化：小地图专用简化绘制函数 - 只画边界矩形，不渲染完整笔触细节
export function drawElementMinimap(
  ctx: CanvasRenderingContext2D,
  _el: CanvasElement,
  isDarkMode: boolean,
  bounds: { x: number; y: number; w: number; h: number }
) {
  const color = isDarkMode ? 'rgba(200,160,176,0.6)' : 'rgba(176,125,110,0.5)'
  ctx.fillStyle = color
  ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h)
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
    if (hasPressureData(el)) {
      const outline = getCachedStrokeOutline(el)
      if (outline && outline.length > 2) {
        fillStrokeOutline(ctx, outline, el.color, 1)
        ctx.globalAlpha = 1
        return
      }
    }

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

    // P1 性能优化：使用缓存的笔触结果，避免每帧重复计算
    const outline = getCachedStrokeOutline(el)
    if (outline && outline.length > 2) {
      fillStrokeOutline(ctx, outline, el.color, 0.15)
    }

    ctx.globalAlpha = 1
  } else if (b === 'highlighter') {
    ctx.save()
    ctx.globalAlpha = el.opacity ?? getBrushDefaultOpacity(b) ?? 1
    ctx.strokeStyle = el.color
    ctx.lineWidth = getCanvasStrokeWidth(b, el.size)
    ctx.lineCap = 'square'
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
    ctx.stroke()
    ctx.restore()
  } else if (b === 'pencil') {
    ctx.save()
    ctx.globalAlpha = el.opacity ?? getBrushDefaultOpacity(b) ?? 1
    ctx.strokeStyle = el.color
    ctx.lineWidth = getCanvasStrokeWidth(b, el.size)
    ctx.lineCap = 'round'
    // P0 性能优化: 批量绘制所有线段为单次 beginPath/stroke，减少 O(n) → O(1) 绘制调用
    ctx.beginPath()
    for (let i = 1; i < pts.length; i++) {
      const seed = ((i * 7919) % 100) / 100
      ctx.moveTo(
        pts[i - 1][0] + (seed - 0.5) * el.size * 0.3,
        pts[i - 1][1] + (((seed * 1.3) % 1) - 0.5) * el.size * 0.3
      )
      ctx.lineTo(pts[i][0], pts[i][1])
    }
    ctx.stroke()
    ctx.restore()
  } else if (b === 'calligraphy') {
    ctx.strokeStyle = el.color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // P1 性能优化: 书法笔触对象池 - 复用 buckets 和线段对象
    // 性能提升: 减少 90%+ 临时对象分配，GC 压力显著降低
    const GROUP_SIZE = 12
    const WIDTH_BUCKETS = CALLIGRAPHY_WIDTH_BUCKETS

    // 使用对象池复用 buckets 和统计数组
    const buckets = getCalligraphyBuckets()
    const bucketWfSums = getCalligraphyWfSums()
    const bucketCounts = getCalligraphyCounts()
    const segPool = getSegmentPool()

    // 单遍遍历: 计算 + 分类同时完成，零临时对象分配
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1],
        c = pts[i]
      const angle = Math.atan2(c[1] - p[1], c[0] - p[0]) - Math.PI / 4
      const wf = 0.3 + 0.7 * Math.abs(Math.sin(angle))
      const bucketIndex = Math.min(Math.floor(wf * WIDTH_BUCKETS), WIDTH_BUCKETS - 1)

      // 从对象池获取线段对象，避免每次创建新对象
      const seg = segPool.next()
      seg.x1 = p[0]
      seg.y1 = p[1]
      seg.x2 = c[0]
      seg.y2 = c[1]
      buckets[bucketIndex].push(seg)
      bucketWfSums[bucketIndex] += wf
      bucketCounts[bucketIndex]++
    }

    // 按桶批量绘制
    for (let bucket = 0; bucket < WIDTH_BUCKETS; bucket++) {
      const bucketSegments = buckets[bucket]
      if (bucketSegments.length === 0) continue

      const avgWf = bucketWfSums[bucket] / bucketCounts[bucket]
      ctx.lineWidth = el.size * (0.3 + 0.7 * avgWf)

      for (let g = 0; g < bucketSegments.length; g += GROUP_SIZE) {
        ctx.beginPath()
        const end = Math.min(g + GROUP_SIZE, bucketSegments.length)
        for (let i = g; i < end; i++) {
          const s = bucketSegments[i]
          ctx.moveTo(s.x1, s.y1)
          ctx.lineTo(s.x2, s.y2)
        }
        ctx.stroke()
      }

      // 清空 bucket 供下次复用
      bucketSegments.length = 0
    }

    // 重置统计数组供下次复用
    bucketWfSums.fill(0)
    bucketCounts.fill(0)
  } else if (b === 'marker') {
    ctx.save()
    ctx.globalAlpha = el.opacity ?? getBrushDefaultOpacity(b) ?? 1
    ctx.strokeStyle = el.color
    ctx.lineWidth = getCanvasStrokeWidth(b, el.size)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1],
        c = pts[i]
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + c[0]) / 2, (p[1] + c[1]) / 2)
    }
    ctx.stroke()
    ctx.restore()
  } else if (b === 'watercolor') {
    ctx.save()
    ctx.globalCompositeOperation = isDarkMode ? 'screen' : 'multiply'
    ctx.strokeStyle = el.color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const drawWatercolorPass = (lineWidth: number, alpha: number, offset = 0) => {
      ctx.globalAlpha = alpha
      ctx.lineWidth = lineWidth
      ctx.beginPath()
      ctx.moveTo(pts[0][0] + offset, pts[0][1] - offset)
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1],
          c = pts[i]
        ctx.quadraticCurveTo(
          p[0] + offset,
          p[1] - offset,
          (p[0] + c[0]) / 2 + offset,
          (p[1] + c[1]) / 2 - offset
        )
      }
      ctx.stroke()
    }

    drawWatercolorPass(
      getCanvasStrokeWidth(b, el.size),
      el.opacity ?? getBrushDefaultOpacity(b) ?? 1
    )
    drawWatercolorPass(el.size * 2.1, 0.18, el.size * 0.18)
    drawWatercolorPass(el.size * 1.4, 0.14, -el.size * 0.16)
    ctx.restore()
  } else if (b === 'crayon') {
    ctx.save()
    ctx.strokeStyle = el.color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (let pass = 0; pass < 4; pass++) {
      const passOffset = (pass - 1.5) * el.size * 0.18
      ctx.globalAlpha = pass === 0 ? (el.opacity ?? getBrushDefaultOpacity(b) ?? 1) : 0.34
      ctx.lineWidth = pass === 0 ? getCanvasStrokeWidth(b, el.size) : el.size * 0.42
      ctx.beginPath()
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1],
          c = pts[i]
        const seed = (((i + pass * 17) * 7919) % 100) / 100
        const jitterX = (seed - 0.5) * el.size * 0.9 + passOffset
        const jitterY = (((seed * 1.7) % 1) - 0.5) * el.size * 0.9 - passOffset
        ctx.moveTo(p[0] + jitterX, p[1] + jitterY)
        ctx.lineTo(c[0] + jitterX, c[1] + jitterY)
      }
      ctx.stroke()
    }
    ctx.restore()
  } else if (b === 'dashed') {
    ctx.beginPath()
    ctx.strokeStyle = el.color
    ctx.lineWidth = el.size
    ctx.lineCap = 'round'
    ctx.setLineDash(getBrushDashArray(b, el.size) ?? [])
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
    // P0 性能优化: 预构建路径 Path2D，两遍绘制复用同一路径对象
    const glowPath = new Path2D()
    glowPath.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1],
        c = pts[i]
      glowPath.quadraticCurveTo(p[0], p[1], (p[0] + c[0]) / 2, (p[1] + c[1]) / 2)
    }
    // 第一遍: 强光晕
    ctx.shadowColor = el.color
    ctx.shadowBlur = el.size * glowMultiplier
    ctx.strokeStyle = el.color
    ctx.lineWidth = el.size * 0.4
    ctx.globalAlpha = alphaBoost
    ctx.stroke(glowPath)
    // 第二遍: 弱光晕
    ctx.shadowBlur = el.size * glowMultiplier * 0.5
    ctx.lineWidth = el.size * 0.7
    ctx.globalAlpha = alphaBoost * 0.6
    ctx.stroke(glowPath)
    ctx.restore()
  }
}
export function drawStrokeRaw(
  ctx: CanvasRenderingContext2D,
  pts: number[][],
  c: string,
  s: number,
  b: BrushType,
  isDarkMode: boolean,
  pressures?: number[]
) {
  drawStrokeEl(
    ctx,
    { type: 'stroke', id: '', points: pts, color: c, size: s, brush: b, pressures },
    isDarkMode
  )
}
export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  elements: CanvasElement[],
  cachedBounds: (el: CanvasElement) => { x: number; y: number; w: number; h: number },
  viewBox: { x: number; y: number; zoom: number },
  canvasSize: { w: number; h: number },
  isDarkMode: boolean,
  bgColor?: string
) {
  const mmW = 140,
    mmH = 90,
    pad = 12
  const mmX = canvasSize.w - mmW - pad,
    mmY = canvasSize.h - mmH - pad

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

  // 使用缓存的边界计算 - P0 性能优化
  const { minX, minY, maxX, maxY } = getCachedMinimapBounds(elements, cachedBounds)

  if (!isFinite(minX)) {
    ctx.restore()
    return
  }

  const contentW = maxX - minX || 1
  const contentH = maxY - minY || 1
  const padding = 20
  const availW = mmW - padding * 2
  const availH = mmH - padding * 2
  const scale = Math.min(availW / contentW, availH / contentH)
  const offX = mmX + (mmW - contentW * scale) / 2 - minX * scale
  const offY = mmY + (mmH - contentH * scale) / 2 - minY * scale

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(mmX, mmY, mmW, mmH, 6)
  ctx.clip()
  ctx.fillStyle = bgColor || (isDarkMode ? '#1C1A24' : '#ffffff')
  ctx.fillRect(mmX, mmY, mmW, mmH)
  ctx.translate(offX, offY)
  ctx.scale(scale, scale)

  // P0 性能优化：小地图只绘制边界矩形，不完整渲染每个元素
  // 避免调用 drawElement 进行复杂的笔触渲染
  for (const el of elements) {
    drawElementMinimap(ctx, el, isDarkMode, cachedBounds(el))
  }

  ctx.restore()
  // Draw viewport rectangle
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
export function invalidateDrawingCaches() {
  minimapCache = null
  resetCanvasBackgroundCaches()
  // 清除形状 Path2D 缓存 - 元素移动/调整大小时需要重建
  invalidateElementRendererCaches()
  // 重置书法笔触对象池索引
  resetCalligraphyPool()
}
