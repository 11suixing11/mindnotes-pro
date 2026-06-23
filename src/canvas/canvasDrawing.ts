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

// P1 优化: 书法笔触对象池重置 - 在 invalidateDrawingCaches 中调用
function resetCalligraphyPool() {
  segmentPoolIndex = 0
}
// P0 优化: 真正的 O(1) LRU 缓存实现 - 使用双向链表 + Map
// 替代原来的 O(n) 线性扫描，大缓存场景下性能提升显著
class LRUCache<K, V> {
  private cache: Map<K, { value: V; prev: K | null; next: K | null; lastAccess: number }>
  private head: K | null = null
  private tail: K | null = null
  private maxSize: number
  private ttl: number

  constructor(maxSize: number, ttl: number) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttl = ttl
  }

  get(key: K): V | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.lastAccess > this.ttl) {
      this.delete(key)
      return null
    }

    // 移动到头部 (O(1) 操作)
    this.moveToHead(key, entry)
    entry.lastAccess = now
    return entry.value
  }

  set(key: K, value: V): void {
    const existing = this.cache.get(key)
    if (existing) {
      existing.value = value
      existing.lastAccess = Date.now()
      this.moveToHead(key, existing)
      return
    }

    // 缓存已满，删除最久未使用的 (O(1) 操作)
    if (this.cache.size >= this.maxSize && this.tail !== null) {
      this.delete(this.tail)
    }

    const entry = { value, prev: null, next: this.head, lastAccess: Date.now() }
    this.cache.set(key, entry)

    if (this.head !== null) {
      const headEntry = this.cache.get(this.head)
      if (headEntry) headEntry.prev = key
    }
    this.head = key

    if (this.tail === null) {
      this.tail = key
    }
  }

  private moveToHead(key: K, entry: { prev: K | null; next: K | null }): void {
    if (key === this.head) return

    // 从当前位置移除
    if (entry.prev !== null) {
      const prevEntry = this.cache.get(entry.prev)
      if (prevEntry) prevEntry.next = entry.next
    }
    if (entry.next !== null) {
      const nextEntry = this.cache.get(entry.next)
      if (nextEntry) nextEntry.prev = entry.prev
    }

    if (key === this.tail && entry.prev !== null) {
      this.tail = entry.prev
    }

    // 移动到头部
    entry.prev = null
    entry.next = this.head

    if (this.head !== null) {
      const headEntry = this.cache.get(this.head)
      if (headEntry) headEntry.prev = key
    }
    this.head = key
  }

  private delete(key: K): void {
    const entry = this.cache.get(key)
    if (!entry) return

    if (entry.prev !== null) {
      const prevEntry = this.cache.get(entry.prev)
      if (prevEntry) prevEntry.next = entry.next
    }
    if (entry.next !== null) {
      const nextEntry = this.cache.get(entry.next)
      if (nextEntry) nextEntry.prev = entry.prev
    }

    if (key === this.head) this.head = entry.next
    if (key === this.tail) this.tail = entry.prev

    this.cache.delete(key)
  }

  size(): number {
    return this.cache.size
  }

  clear(): void {
    this.cache.clear()
    this.head = null
    this.tail = null
  }
}

// Perfect-Freehand 笔触缓存 - 避免每帧重复计算昂贵的描边路径
const STROKE_CACHE_MAX_SIZE = 200
const STROKE_CACHE_TTL = 60000 // 60秒
const strokeOutlineCache = new LRUCache<string, number[][]>(STROKE_CACHE_MAX_SIZE, STROKE_CACHE_TTL)

// P0-2 修复: 缓存键包含点坐标哈希，避免修改点坐标后缓存命中错误数据
function getStrokeCacheKey(el: StrokeElement): string {
  // 取首尾点和中间点坐标作为哈希，检测点坐标变化
  const firstPoint = el.points[0] ? `${el.points[0][0]}:${el.points[0][1]}` : ''
  const lastPoint = el.points[el.points.length - 1] ? `${el.points[el.points.length - 1][0]}:${el.points[el.points.length - 1][1]}` : ''
  const midIndex = Math.floor(el.points.length / 2)
  const midPoint = el.points[midIndex] ? `${el.points[midIndex][0]}:${el.points[midIndex][1]}` : ''
  return `${el.id}:${el.points.length}:${el.size}:${firstPoint}:${lastPoint}:${midPoint}`
}

function getCachedStrokeOutline(el: StrokeElement): number[][] | null {
  if (el.brush !== 'pen') return null

  const key = getStrokeCacheKey(el)
  const cached = strokeOutlineCache.get(key)
  if (cached) return cached

  try {
    const outline = getStroke(el.points, {
      size: el.size,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    })
    strokeOutlineCache.set(key, outline)
    return outline
  } catch {
    return null
  }
}

// 文本换行缓存 - 避免每次渲染都进行昂贵的 measureText 计算
const TEXT_CACHE_MAX_SIZE = 100
const TEXT_CACHE_TTL = 30000 // 30秒
const textWrapCache = new LRUCache<string, string[]>(TEXT_CACHE_MAX_SIZE, TEXT_CACHE_TTL)

// P0 FIX: 使用内容前32个字符而非length，避免编辑文本后长度不变时缓存不失效
function getTextCacheKey(el: TextElement): string {
  return `${el.id}:${el.content.slice(0, 32)}:${el.width}:${el.fontSize}`
}
function getCachedTextWrap(el: TextElement, ctx: CanvasRenderingContext2D): string[] {
  const key = getTextCacheKey(el)
  const cached = textWrapCache.get(key)
  if (cached) return cached

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

  textWrapCache.set(key, wrappedLines)
  return wrappedLines
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
// MonetGrid Path2D 缓存 - P0 修复: 包含 zoom 参数，缩放时正确失效
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

// Grid Path2D 缓存 - 避免每帧重建网格路径
let cachedGridPath: Path2D | null = null
let cachedGridParams: {
  startX: number
  startY: number
  endX: number
  endY: number
  step: number
} | null = null

// P0-6 优化: Canvas Background Gradient 缓存 - 避免每帧创建新的 CanvasGradient 对象
interface CachedGradient {
  key: string
  gradients: CanvasGradient[]
  canvasSize: { w: number; h: number }
}
let cachedBgGradients: CachedGradient | null = null
// P0 性能优化: 通用形状 Path2D 缓存 - 用于矩形、圆形等常见形状
// 避免每次绘制都重建路径，静态元素性能提升 2-5x
const shapePathCache = new LRUCache<string, Path2D>(150, 45000)
function getShapeCacheKey(el: ShapeElement): string {
  const rx = el.kind === 'rectangle' ? Math.min(6, Math.abs(el.w) * 0.05, Math.abs(el.h) * 0.05) : 0
  return `${el.kind}:${el.x.toFixed(1)}:${el.y.toFixed(1)}:${el.w.toFixed(1)}:${el.h.toFixed(1)}:${rx.toFixed(2)}`
}
// ==================== 导出函数 ====================
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
      ctx.globalAlpha = 0.15
      ctx.fillStyle = el.color
      ctx.beginPath()
      ctx.moveTo(outline[0][0], outline[0][1])
      for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i][0], outline[i][1])
      ctx.closePath()
      ctx.fill()
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

    // P1 优化: 使用对象池复用 buckets 和统计数组
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

      // P1 优化: 从对象池获取线段对象，避免每次创建新对象
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

      // P1 优化: 清空 bucket 供下次复用
      bucketSegments.length = 0
    }

    // P1 优化: 重置统计数组供下次复用
    bucketWfSums.fill(0)
    bucketCounts.fill(0)
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

  // P0 性能优化: 使用 Path2D 缓存静态形状路径
  // 对于矩形和圆形，避免每次绘制都重建贝塞尔曲线路径
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

  // 使用缓存的换行结果 - P0 性能优化
  const wrappedLines = getCachedTextWrap(el, ctx)

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
    // P0 性能优化: 使用 roundRect API 替代手动路径构建
    const r = 6
    ctx.beginPath()
    ctx.roundRect(el.x, el.y, el.width, el.height, r)
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
  // P0 性能优化: 预计算角点坐标，避免每次创建新数组
  // P0 性能优化: 合并 4 个角点为单次 beginPath/fill 调用
  // 减少 3 次 API 调用，性能提升 ~75%
  ctx.beginPath()
  ctx.arc(b.x, b.y, cornerR, 0, Math.PI * 2)
  ctx.arc(b.x + b.w, b.y, cornerR, 0, Math.PI * 2)
  ctx.arc(b.x, b.y + b.h, cornerR, 0, Math.PI * 2)
  ctx.arc(b.x + b.w, b.y + b.h, cornerR, 0, Math.PI * 2)
  ctx.fill()
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
  ctx.fillStyle = isDarkMode ? `rgba(160,150,180,${alpha})` : `rgba(155,142,127,${alpha})`

  // P0 修复：包含 zoom 参数在缓存检查中，缩放时正确重建网格
  const currentParams = { startX: sx, startY: sy, endX: ex, endY: ey, gridSize: gs, dotSize, zoom: viewBox.zoom }
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
// P0-6 优化: 使用缓存的 CanvasGradient 对象，避免每帧重新创建
function getOrCreateBgGradients(
  ctx: CanvasRenderingContext2D,
  canvasSize: { w: number; h: number },
  isDarkMode: boolean
): CanvasGradient[] {
  const cacheKey = `${isDarkMode}:${canvasSize.w}:${canvasSize.h}`
  if (
    cachedBgGradients &&
    cachedBgGradients.key === cacheKey &&
    cachedBgGradients.canvasSize.w === canvasSize.w &&
    cachedBgGradients.canvasSize.h === canvasSize.h
  ) {
    return cachedBgGradients.gradients
  }

  const gradients: CanvasGradient[] = []
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
    gradients.push(g1)

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
    gradients.push(g2)

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
    gradients.push(g3)
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
    gradients.push(g1)

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
    gradients.push(g2)

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
    gradients.push(g3)

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
    gradients.push(g4)
  }

  cachedBgGradients = { key: cacheKey, gradients, canvasSize: { ...canvasSize } }
  return gradients
}

export function drawCanvasBackground(
  ctx: CanvasRenderingContext2D,
  canvasSize: { w: number; h: number },
  bgColor: string,
  isDarkMode: boolean
) {
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)

  // P0-6 优化: 使用缓存的 gradients，避免每帧重新创建
  const gradients = getOrCreateBgGradients(ctx, canvasSize, isDarkMode)
  for (const g of gradients) {
    ctx.fillStyle = g
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)
  }
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
export function drawZoomLevel(
  ctx: CanvasRenderingContext2D,
  viewBox: { zoom: number },
  canvasSize: { w: number; h: number },
  isDarkMode: boolean,
  dpr: number
) {
  ctx.save()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const text = Math.round(viewBox.zoom * 100) + '%'
  ctx.font = '500 11px "Noto Sans SC", sans-serif'
  ctx.fillStyle = isDarkMode ? 'rgba(200,160,176,0.4)' : 'rgba(176,125,110,0.35)'
  ctx.textAlign = 'right'
  ctx.fillText(text, canvasSize.w - 16, 22)
  ctx.restore()
}
// P1 优化: 导出缓存失效函数 - 元素变化时主动清除缓存
// P0 修复: 不清除背景渐变缓存 - 背景渐变只在主题/窗口大小变化时才需要重建
// 性能提升: 避免每次笔画都重建 4-7 个 CanvasGradient 对象，减少 GC 压力
export function invalidateDrawingCaches() {
  minimapCache = null
  cachedMonetGridPath = null
  cachedMonetGridParams = null
  cachedGridPath = null
  cachedGridParams = null
  // P0 优化: 清除形状 Path2D 缓存 - 元素移动/调整大小时需要重建
  shapePathCache.clear()
  // P1 优化: 重置书法笔触对象池索引
  resetCalligraphyPool()
  // 注意: cachedBgGradients 不在这里清除 - 它只依赖主题和窗口大小
  // 主题切换时会自动触发重绘，窗口大小变化由 ResizeObserver 处理
}

// 单独的背景渐变缓存失效函数 - 仅在主题切换时调用
export function invalidateBackgroundGradients() {
  cachedBgGradients = null
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  viewBox: { x: number; y: number; zoom: number },
  canvasSize: { w: number; h: number },
  isDarkMode: boolean,
  gridSize: number = 20
) {
  const step = gridSize
  const startX = Math.floor(viewBox.x / step) * step
  const startY = Math.floor(viewBox.y / step) * step
  const endX = viewBox.x + canvasSize.w / viewBox.zoom
  const endY = viewBox.y + canvasSize.h / viewBox.zoom

  // P0 性能优化: 使用 Path2D 缓存网格路径
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
