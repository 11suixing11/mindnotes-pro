// 元素命中测试工具

import type { Stroke, Shape, TextElement } from '../store/useAppStore'

// 点到线段距离
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - x1, py - y1)
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

// 判断点是否在笔迹附近
export function hitTestStroke(x: number, y: number, stroke: Stroke, tolerance = 12): boolean {
  if (stroke.hidden) return false
  const pts = stroke.points
  for (let i = 0; i < pts.length - 1; i++) {
    if (distToSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) < tolerance + stroke.size) {
      return true
    }
  }
  return false
}

// 判断点是否在形状内/附近
export function hitTestShape(x: number, y: number, shape: Shape, tolerance = 10): boolean {
  if (shape.hidden) return false
  const t = tolerance + shape.size

  if (shape.type === 'rectangle') {
    return x >= shape.x - t && x <= shape.x + shape.width + t &&
           y >= shape.y - t && y <= shape.y + shape.height + t
  }

  if (shape.type === 'circle') {
    const cx = shape.x + shape.width / 2
    const cy = shape.y + shape.height / 2
    const rx = Math.abs(shape.width) / 2 + t
    const ry = Math.abs(shape.height) / 2 + t
    // 简化为椭圆外框检测
    const dx = (x - cx) / rx, dy = (y - cy) / ry
    return dx * dx + dy * dy <= 1
  }

  if (shape.type === 'triangle') {
    const pts = [
      [shape.x + shape.width / 2, shape.y],
      [shape.x + shape.width, shape.y + shape.height],
      [shape.x, shape.y + shape.height],
    ]
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3
      if (distToSegment(x, y, pts[i][0], pts[i][1], pts[j][0], pts[j][1]) < t) return true
    }
    return false
  }

  if ((shape.type === 'line' || shape.type === 'arrow') && shape.startX !== undefined) {
    return distToSegment(x, y, shape.startX, shape.startY!, shape.endX!, shape.endY!) < t
  }

  return false
}

// 判断点是否在文字元素内
export function hitTestText(x: number, y: number, el: TextElement, tolerance = 10): boolean {
  if (el.hidden || !el.text) return false
  const lines = el.text.split('\n')
  const lineHeight = el.fontSize * 1.4
  const maxLineLen = Math.max(...lines.map((l) => l.length))
  const w = maxLineLen * el.fontSize * 0.6 + tolerance * 2
  const h = lines.length * lineHeight + tolerance * 2
  return x >= el.x - tolerance && x <= el.x + w &&
         y >= el.y - tolerance && y <= el.y + h
}

// 命中测试所有元素，返回命中的 id
export function hitTestAll(
  x: number, y: number,
  strokes: Stroke[], shapes: Shape[], textElements: TextElement[]
): string | null {
  // 反向遍历（后绘制的在上层）
  for (let i = textElements.length - 1; i >= 0; i--) {
    if (hitTestText(x, y, textElements[i])) return textElements[i].id
  }
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (hitTestShape(x, y, shapes[i])) return shapes[i].id
  }
  for (let i = strokes.length - 1; i >= 0; i--) {
    if (hitTestStroke(x, y, strokes[i])) return strokes[i].id
  }
  return null
}
