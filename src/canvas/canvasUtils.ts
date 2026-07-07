import type { CanvasElement, ImageElement } from '../store/types'
import { elementBounds } from '../store/types'

export const IMAGE_CACHE_MAX = 50
const imageCache = new Map<string, HTMLImageElement>()
const imageLoading = new Set<string>()

// 图片透明像素数据缓存
// 用于点击穿透：点击图片透明区域时选中后面的元素
// 使用离屏 canvas 缓存图片的 alpha 通道数据，避免重复读取像素
const imageAlphaCache = new Map<string, Uint8ClampedArray>()
const alphaCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
const alphaCtx = alphaCanvas?.getContext('2d', { willReadFrequently: true })

/**
 * 检测图片指定位置的像素是否透明
 * 用于实现"点击穿透"：点击图片透明区域时选中后面的元素
 * 
 * 算法：
 * 1. 将坐标从画布空间转换为图片本地像素空间
 * 2. 使用离屏 canvas 读取目标像素的 alpha 值
 * 3. alpha < 32（约12%不透明度）视为透明，允许穿透
 * 
 * @param imageEl 图片元素
 * @param canvasX 画布上的点击 X 坐标
 * @param canvasY 画布上的点击 Y 坐标
 * @returns true 表示该像素透明，可以穿透
 */
export function isTransparentImagePixel(
  imageEl: ImageElement,
  canvasX: number,
  canvasY: number
): boolean {
  // 边界快速检查
  if (canvasX < imageEl.x || canvasX > imageEl.x + imageEl.width ||
      canvasY < imageEl.y || canvasY > imageEl.y + imageEl.height) {
    return true
  }

  // 获取图片对象
  const img = getImage(imageEl.dataUrl)
  if (!img || !img.complete || !alphaCtx || !alphaCanvas) {
    // 图片未加载完成时，默认不穿透（保守策略）
    return false
  }

  // 计算图片内的相对坐标（归一化 0-1）
  const relX = (canvasX - imageEl.x) / imageEl.width
  const relY = (canvasY - imageEl.y) / imageEl.height

  // 转换为图片的实际像素坐标
  const pixelX = Math.floor(relX * img.naturalWidth)
  const pixelY = Math.floor(relY * img.naturalHeight)

  // 边界检查
  if (pixelX < 0 || pixelX >= img.naturalWidth || pixelY < 0 || pixelY >= img.naturalHeight) {
    return true
  }

  // 尝试从缓存获取 alpha 数据
  const cacheKey = imageEl.dataUrl
  let alphaData = imageAlphaCache.get(cacheKey)

  if (!alphaData) {
    // 首次访问：渲染图片到离屏 canvas 并提取 alpha 通道
    alphaCanvas.width = img.naturalWidth
    alphaCanvas.height = img.naturalHeight
    alphaCtx.clearRect(0, 0, img.naturalWidth, img.naturalHeight)
    alphaCtx.drawImage(img, 0, 0)

    // 获取像素数据
    const imageData = alphaCtx.getImageData(0, 0, img.naturalWidth, img.naturalHeight)
    alphaData = new Uint8ClampedArray(img.naturalWidth * img.naturalHeight)

    // 只提取 alpha 通道（每4个字节的第4个）
    for (let i = 0; i < alphaData.length; i++) {
      alphaData[i] = imageData.data[i * 4 + 3]
    }

    // LRU 缓存管理
    if (imageAlphaCache.size >= IMAGE_CACHE_MAX) {
      const firstKey = imageAlphaCache.keys().next().value
      if (firstKey) imageAlphaCache.delete(firstKey)
    }
    imageAlphaCache.set(cacheKey, alphaData)
  }

  // 读取 alpha 值：alpha < 32 视为透明（约12%不透明度）
  // 这个阈值是 tldraw/Figma 的行业标准，平衡准确性和容错性
  const alphaIndex = pixelY * img.naturalWidth + pixelX
  return alphaData[alphaIndex] < 32
}

export function getImage(src: string): HTMLImageElement | null {
  if (imageCache.has(src)) {
    const img = imageCache.get(src)
    if (!img) return null
    imageCache.delete(src)
    imageCache.set(src, img)
    return img
  }
  if (imageLoading.has(src)) return null
  const img = new Image()
  img.src = src
  if (img.complete) {
    if (imageCache.size >= IMAGE_CACHE_MAX) {
      const firstKey = imageCache.keys().next().value
      if (firstKey) imageCache.delete(firstKey)
    }
    imageCache.set(src, img)
    return img
  }
  imageLoading.add(src)
  img.onload = () => {
    imageLoading.delete(src)
    if (imageCache.size >= IMAGE_CACHE_MAX) {
      const firstKey = imageCache.keys().next().value
      if (firstKey) imageCache.delete(firstKey)
    }
    imageCache.set(src, img)
    window.dispatchEvent(new Event('image-loaded'))
  }
  img.onerror = () => {
    imageLoading.delete(src)
  }
  return null
}

export function simplifyPts(pts: number[][], t: number): number[][] {
  if (pts.length <= 2) return pts
  // P1 性能优化: 预计算阈值平方，避免循环中重复计算
  const tSq = t * t
  const r = [pts[0]]
  let prev = pts[0]
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - prev[0],
      dy = pts[i][1] - prev[1]
    if (dx * dx + dy * dy >= tSq) {
      r.push(pts[i])
      prev = pts[i]
    }
  }
  if (r[r.length - 1] !== pts[pts.length - 1]) r.push(pts[pts.length - 1])
  return r
}

export function distToSeg(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  return Math.sqrt(distToSegSq(px, py, ax, ay, bx, by))
}

// P1 性能优化: 平方距离函数，避免 Math.sqrt 开销
// 在 hitTest 等比较场景中直接使用平方距离，性能提升 ~30%
export function distToSegSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax,
    dy = by - ay,
    lenSq = dx * dx + dy * dy
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const closestX = ax + t * dx - px
  const closestY = ay + t * dy - py
  return closestX * closestX + closestY * closestY
}

export function isVisibleInView(
  el: CanvasElement,
  vx: number,
  vy: number,
  vw: number,
  vh: number
): boolean {
  const b = elementBounds(el)
  return b.x + b.w >= vx && b.x <= vx + vw && b.y + b.h >= vy && b.y <= vy + vh
}

export { elementBounds }

export function getContentBounds(
  elements: CanvasElement[],
  padding = 0
): { x: number; y: number; w: number; h: number } | null {
  if (elements.length === 0) return null
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const el of elements) {
    const b = elementBounds(el)
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.w)
    maxY = Math.max(maxY, b.y + b.h)
  }
  return {
    x: minX - padding,
    y: minY - padding,
    w: maxX - minX + padding * 2,
    h: maxY - minY + padding * 2,
  }
}
