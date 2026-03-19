import { Shape } from '../store/useAppStore'

export interface GuideLine {
  type: 'horizontal' | 'vertical'
  position: number
}

export interface SnapResult {
  x?: number
  y?: number
  guides: GuideLine[]
}

const SNAP_THRESHOLD = 5 // 吸附阈值（像素）

/**
 * 计算智能吸附和对齐辅助线
 */
export function calculateSnap(
  currentX: number,
  currentY: number,
  currentWidth: number,
  currentHeight: number,
  allShapes: Shape[]
): SnapResult {
  const guides: GuideLine[] = []
  let snapX: number | undefined
  let snapY: number | undefined

  // 当前形状的关键位置
  const currentEdges = {
    left: currentX,
    center: currentX + currentWidth / 2,
    right: currentX + currentWidth,
    top: currentY,
    middle: currentY + currentHeight / 2,
    bottom: currentY + currentHeight,
  }

  // 遍历所有其他形状
  for (const shape of allShapes) {
    // 跳过自己
    if (shape.x === currentX && shape.y === currentY) continue

    const shapeEdges = {
      left: shape.x,
      center: shape.x + (shape.width || 0) / 2,
      right: shape.x + (shape.width || 0),
      top: shape.y,
      middle: shape.y + (shape.height || 0) / 2,
      bottom: shape.y + (shape.height || 0),
    }

    // 检测水平对齐（X 轴）
    const xSnap = detectSnapEdge(
      currentEdges.left,
      currentEdges.center,
      currentEdges.right,
      shapeEdges.left,
      shapeEdges.center,
      shapeEdges.right
    )

    if (xSnap) {
      snapX = xSnap.snapPosition
      guides.push({ type: 'vertical', position: xSnap.referencePosition })
    }

    // 检测垂直对齐（Y 轴）
    const ySnap = detectSnapEdge(
      currentEdges.top,
      currentEdges.middle,
      currentEdges.bottom,
      shapeEdges.top,
      shapeEdges.middle,
      shapeEdges.bottom
    )

    if (ySnap) {
      snapY = ySnap.snapPosition
      guides.push({ type: 'horizontal', position: ySnap.referencePosition })
    }
  }

  return {
    x: snapX,
    y: snapY,
    guides,
  }
}

/**
 * 检测两个边缘集合之间的吸附
 */
function detectSnapEdge(
  currentLeft: number,
  currentCenter: number,
  currentRight: number,
  referenceLeft: number,
  referenceCenter: number,
  referenceRight: number
): { snapPosition: number; referencePosition: number } | null {
  const positions = [
    { current: currentLeft, reference: referenceLeft },
    { current: currentCenter, reference: referenceCenter },
    { current: currentRight, reference: referenceRight },
  ]

  for (const pos of positions) {
    const diff = Math.abs(pos.current - pos.reference)
    if (diff <= SNAP_THRESHOLD) {
      return {
        snapPosition: pos.reference,
        referencePosition: pos.reference,
      }
    }
  }

  return null
}

/**
 * 网格吸附
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}
