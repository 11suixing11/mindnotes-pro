import type { CanvasElement } from '../store/types'
import { resetCanvasBackgroundCaches } from './canvasBackground'
import { drawStrokeEl, resetStrokeRendererPools } from './strokeRenderer'
import {
  drawImageEl,
  drawShapeEl,
  drawTextEl,
  invalidateElementRendererCaches,
} from './elementRenderers'

export { drawImageEl, drawShapeEl, drawTextEl } from './elementRenderers'
export { drawSelBox, drawZoomLevel } from './canvasOverlays'
export { drawCanvasBackground, drawGrid, drawMonetGrid } from './canvasBackground'
export { drawStrokeEl, drawStrokeRaw } from './strokeRenderer'

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

export function invalidateDrawingCaches() {
  resetCanvasBackgroundCaches()
  // 清除形状 Path2D 缓存 - 元素移动/调整大小时需要重建
  invalidateElementRendererCaches()
  // 重置书法笔触对象池索引
  resetStrokeRendererPools()
}
