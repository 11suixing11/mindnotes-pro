// 箭头绑定工具函数
// 专业白板标准功能：箭头端点吸附到形状边缘，移动形状时箭头自动跟随
import type { CanvasElement, ShapeElement, Binding } from './types'

/** 吸附距离阈值（像素） */
export const SNAP_DISTANCE = 25

/**
 * 检测点是否靠近形状边缘，如果是则返回绑定信息
 * @param point 检测点坐标 [x, y]
 * @param shapes 所有形状元素
 * @param excludeId 排除的元素ID（通常是箭头自身）
 * @returns 绑定信息或 null
 */
export function tryBindToShape(
  point: [number, number],
  elements: CanvasElement[],
  excludeId?: string
): Binding | null {
  let bestBinding: Binding | null = null
  let bestDistance = SNAP_DISTANCE

  const shapes = getBindableShapes(elements)
  for (const shape of shapes) {
    if (shape.id === excludeId) continue
    // 只对非线条/箭头的形状进行绑定
    if (shape.kind === 'line' || shape.kind === 'arrow') continue

    const { x, y, w, h } = shape
    const px = point[0]
    const py = point[1]

    // 计算点到矩形边缘的最近距离
    const left = x
    const right = x + w
    const top = y
    const bottom = y + h

    // 检查点是否在矩形附近
    if (px < left - SNAP_DISTANCE || px > right + SNAP_DISTANCE) continue
    if (py < top - SNAP_DISTANCE || py > bottom + SNAP_DISTANCE) continue

    // 计算到四条边的距离
    const distToLeft = Math.abs(px - left)
    const distToRight = Math.abs(px - right)
    const distToTop = Math.abs(py - top)
    const distToBottom = Math.abs(py - bottom)

    // 找到最近的边
    const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom)

    if (minDist < bestDistance) {
      bestDistance = minDist

      // 计算归一化锚点
      let anchorX: number
      let anchorY: number

      // 限制点在形状范围内
      const clampedX = Math.max(left, Math.min(right, px))
      const clampedY = Math.max(top, Math.min(bottom, py))

      if (minDist === distToLeft) {
        anchorX = 0
        anchorY = (clampedY - top) / h
      } else if (minDist === distToRight) {
        anchorX = 1
        anchorY = (clampedY - top) / h
      } else if (minDist === distToTop) {
        anchorX = (clampedX - left) / w
        anchorY = 0
      } else {
        anchorX = (clampedX - left) / w
        anchorY = 1
      }

      bestBinding = {
        targetId: shape.id,
        anchorX,
        anchorY,
      }
    }
  }

  return bestBinding
}

/**
 * 根据绑定信息计算实际坐标
 */
export function getBindingPosition(shape: ShapeElement, binding: Binding): [number, number] {
  const { x, y, w, h } = shape
  return [x + w * binding.anchorX, y + h * binding.anchorY]
}

/**
 * 获取形状的所有绑定箭头
 */
export function getArrowsBoundToShape(
  shapeId: string,
  elements: CanvasElement[]
): ShapeElement[] {
  return elements.filter((el) => {
    if (el.type !== 'shape') return false
    if (el.kind !== 'line' && el.kind !== 'arrow') return false
    return el.startBinding?.targetId === shapeId || el.endBinding?.targetId === shapeId
  }) as ShapeElement[]
}

/**
 * 更新形状移动后所有绑定箭头的位置
 * @param movedShapeId 移动的形状ID
 * @param elements 所有元素
 * @param idToElement ID到元素的映射
 * @returns 需要更新的箭头列表
 */
export function updateBoundArrows(
  movedShapeId: string,
  elements: CanvasElement[],
  idToElement: Map<string, CanvasElement>
): { id: string; newEl: ShapeElement }[] {
  const updates: { id: string; newEl: ShapeElement }[] = []
  const boundArrows = getArrowsBoundToShape(movedShapeId, elements)

  for (const arrow of boundArrows) {
    let newX = arrow.x
    let newY = arrow.y
    let newW = arrow.w
    let newH = arrow.h

    // 更新起点位置
    if (arrow.startBinding?.targetId === movedShapeId) {
      const targetShape = idToElement.get(arrow.startBinding.targetId) as ShapeElement
      if (targetShape) {
        const [newStartX, newStartY] = getBindingPosition(targetShape, arrow.startBinding)
        // 线条/箭头的起点是 (x, y)，终点是 (x+w, y+h)
        const dx = newStartX - arrow.x
        const dy = newStartY - arrow.y
        newX = newStartX
        newY = newStartY
        newW -= dx
        newH -= dy
      }
    }

    // 更新终点位置
    if (arrow.endBinding?.targetId === movedShapeId) {
      const targetShape = idToElement.get(arrow.endBinding.targetId) as ShapeElement
      if (targetShape) {
        const [newEndX, newEndY] = getBindingPosition(targetShape, arrow.endBinding)
        newW = newEndX - newX
        newH = newEndY - newY
      }
    }

    if (newX !== arrow.x || newY !== arrow.y || newW !== arrow.w || newH !== arrow.h) {
      updates.push({
        id: arrow.id,
        newEl: { ...arrow, x: newX, y: newY, w: newW, h: newH },
      })
    }
  }

  return updates
}

/**
 * 从元素列表中过滤出可绑定的形状
 */
export function getBindableShapes(elements: CanvasElement[]): ShapeElement[] {
  return elements.filter((el) => {
    if (el.type !== 'shape') return false
    return el.kind === 'rectangle' || el.kind === 'circle'
  }) as ShapeElement[]
}
