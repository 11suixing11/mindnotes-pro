import type { CanvasElement } from '../store/types'
import { elementBounds } from '../store/types'

export const IMAGE_CACHE_MAX = 50
const imageCache = new Map<string, HTMLImageElement>()
const imageLoading = new Set<string>()

export function getImage(src: string): HTMLImageElement | null {
  if (imageCache.has(src)) {
    const img = imageCache.get(src)!
    imageCache.delete(src)
    imageCache.set(src, img)
    return img
  }
  if (imageLoading.has(src)) return null
  const img = new Image(); img.src = src
  if (img.complete) {
    if (imageCache.size >= IMAGE_CACHE_MAX) {
      const firstKey = imageCache.keys().next().value
      if (firstKey) imageCache.delete(firstKey)
    }
    imageCache.set(src, img); return img
  }
  imageLoading.add(src)
  img.onload = () => {
    imageLoading.delete(src)
    if (imageCache.size >= IMAGE_CACHE_MAX) {
      const firstKey = imageCache.keys().next().value
      if (firstKey) imageCache.delete(firstKey)
    }
    imageCache.set(src, img); window.dispatchEvent(new Event('image-loaded'))
  }
  img.onerror = () => { imageLoading.delete(src) }
  return null
}

export function simplifyPts(pts: number[][], t: number): number[][] {
  if (pts.length <= 2) return pts
  const r = [pts[0]]; let prev = pts[0]
  for (let i = 1; i < pts.length; i++) { const dx = pts[i][0] - prev[0], dy = pts[i][1] - prev[1]; if (dx * dx + dy * dy >= t * t) { r.push(pts[i]); prev = pts[i] } }
  if (r[r.length - 1] !== pts[pts.length - 1]) r.push(pts[pts.length - 1])
  return r
}

export function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, lenSq = dx * dx + dy * dy
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq; t = Math.max(0, Math.min(1, t))
  return Math.sqrt((ax + t * dx - px) ** 2 + (ay + t * dy - py) ** 2)
}

export function isVisibleInView(el: CanvasElement, vx: number, vy: number, vw: number, vh: number): boolean {
  const b = elementBounds(el)
  return b.x + b.w >= vx && b.x <= vx + vw && b.y + b.h >= vy && b.y <= vy + vh
}

export { elementBounds }
