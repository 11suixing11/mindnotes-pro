export type BrushType = 'pen' | 'highlighter' | 'pencil' | 'calligraphy' | 'dashed' | 'glow'
export type ShapeKind = 'rectangle' | 'circle' | 'line' | 'arrow'
export type ToolType = 'select' | 'pen' | 'eraser' | 'pan' | 'text' | ShapeKind
export type CanvasBackgroundStyle = 'plain' | 'grid' | 'dots' | 'ruled' | 'notebook'

export interface StrokeElement {
  type: 'stroke'
  id: string
  points: number[][]
  color: string
  size: number
  brush: BrushType
  opacity?: number
  groupId?: string
  // 元素旋转
  // 专业白板标准功能：选中元素后拖拽旋转手柄自由旋转
  // 用户痛点："无法调整手写笔迹/形状的角度，画斜线很困难"
  rotation?: number
  // 元素锁定
  // 专业设计工具标配：锁定元素防止误操作
  // 用户痛点："背景元素经常被不小心移动/删除"
  locked?: boolean
}

// 箭头绑定
// 专业白板标准功能：箭头端点吸附到形状边缘，移动形状时箭头自动跟随
// 用户痛点："花了十分钟才让三条线都正确连接" - Excalidraw Issue #3412
export interface Binding {
  /** 绑定的目标形状 ID */
  targetId: string
  /** 归一化锚点 X (0-1, 相对于形状宽度) */
  anchorX: number
  /** 归一化锚点 Y (0-1, 相对于形状高度) */
  anchorY: number
}

export interface ShapeElement {
  type: 'shape'
  id: string
  kind: ShapeKind
  x: number
  y: number
  w: number
  h: number
  color: string
  size: number
  fillColor?: string
  groupId?: string
  // P12 箭头绑定：起点绑定（仅 line/arrow 类型）
  startBinding?: Binding
  // P12 箭头绑定：终点绑定（仅 line/arrow 类型）
  endBinding?: Binding
  // 元素旋转
  rotation?: number
  // 元素锁定
  locked?: boolean
}

export interface TextElement {
  type: 'text'
  id: string
  x: number
  y: number
  width: number
  height: number
  content: string
  fontSize: number
  color: string
  groupId?: string
  // 元素旋转
  rotation?: number
  // 元素锁定
  locked?: boolean
}

export interface ImageElement {
  type: 'image'
  id: string
  x: number
  y: number
  width: number
  height: number
  dataUrl: string
  opacity?: number
  groupId?: string
  // 元素旋转
  rotation?: number
  // 元素锁定
  locked?: boolean
}

export type CanvasElement = StrokeElement | ShapeElement | TextElement | ImageElement

export type UndoAction =
  | { type: 'add'; ids: string[]; els?: CanvasElement[] }
  | { type: 'remove'; items: { el: CanvasElement; index: number }[] }
  | { type: 'clear'; snapshot: CanvasElement[] }
  | { type: 'move'; deltas: { id: string; dx: number; dy: number }[] }
  | { type: 'erase'; before: CanvasElement[]; after: CanvasElement[] }
  | {
      type: 'group'
      groupId: string
      elementIds: string[]
      beforeGroup: { id: string; oldGroupId?: string }[]
    }
  | { type: 'ungroup'; groupIds: string[]; beforeUngroup: { id: string; oldGroupId?: string }[] }
  // 元素锁定 - 撤销支持
  | { type: 'lock'; elementIds: string[]; beforeLock: { id: string; wasLocked: boolean }[] }
  | { type: 'unlock'; elementIds: string[]; beforeUnlock: { id: string; wasLocked: boolean }[] }
export interface CanvasDoc {
  id: string
  title: string
  elements: CanvasElement[]
  bgColor: string
  backgroundStyle?: CanvasBackgroundStyle
  folderId: string | null
  createdAt: number
  updatedAt: number
  undoStack?: UndoAction[]
  redoStack?: UndoAction[]
}

export interface CanvasFolder {
  id: string
  name: string
  parentId: string | null
  order: number
  expanded: boolean
}

// P0 性能优化: 笔触边界缓存 - 避免每帧遍历所有点计算边界
const strokeBoundsCache = new WeakMap<
  StrokeElement,
  { x: number; y: number; w: number; h: number }
>()

/** 清除笔触边界缓存（用于元素更新后） */
export function invalidateStrokeBounds(el: StrokeElement): void {
  strokeBoundsCache.delete(el)
}

export function elementBounds(el: CanvasElement): { x: number; y: number; w: number; h: number } {
  if (el.type === 'stroke') {
    // 检查缓存
    const cached = strokeBoundsCache.get(el)
    if (cached) return cached

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (let i = 0; i < el.points.length; i++) {
      const p = el.points[i]
      if (p[0] < minX) minX = p[0]
      if (p[1] < minY) minY = p[1]
      if (p[0] > maxX) maxX = p[0]
      if (p[1] > maxY) maxY = p[1]
    }
    const bounds = { x: minX - 5, y: minY - 5, w: maxX - minX + 10, h: maxY - minY + 10 }
    strokeBoundsCache.set(el, bounds)
    return bounds
  }
  if (el.type === 'shape') {
    return {
      x: Math.min(el.x, el.x + el.w) - 5,
      y: Math.min(el.y, el.y + el.h) - 5,
      w: Math.abs(el.w) + 10,
      h: Math.abs(el.h) + 10,
    }
  }
  return { x: el.x - 5, y: el.y - 5, w: el.width + 10, h: el.height + 10 }
}

export function moveElement(el: CanvasElement, dx: number, dy: number): CanvasElement {
  if (el.type === 'stroke') {
    const pts = el.points
    const len = pts.length
    const newPts = new Array<number[]>(len)
    // P0 FIX: 创建新点数组，不修改原数组，避免undo数据污染
    // 原原地修改会导致undo/redo时旧数据被污染
    for (let i = 0; i < len; i++) {
      const p = pts[i]
      newPts[i] = [p[0] + dx, p[1] + dy]
    }
    return { ...el, points: newPts }
  }
  if (el.type === 'shape') return { ...el, x: el.x + dx, y: el.y + dy }
  return { ...el, x: el.x + dx, y: el.y + dy } as CanvasElement
}

export function resizeElement(
  el: CanvasElement,
  ax: number,
  ay: number,
  sx: number,
  sy: number
): CanvasElement {
  if (el.type === 'stroke') {
    // P1 性能优化: 使用预分配数组替代 .map()
    const pts = el.points
    const len = pts.length
    const newPts = new Array<number[]>(len)
    for (let i = 0; i < len; i++) {
      newPts[i] = [ax + (pts[i][0] - ax) * sx, ay + (pts[i][1] - ay) * sy]
    }
    return { ...el, points: newPts }
  }
  if (el.type === 'shape') {
    const nx = ax + (el.x - ax) * sx,
      ny = ay + (el.y - ay) * sy
    return { ...el, x: nx, y: ny, w: el.w * sx, h: el.h * sy }
  }
  return {
    ...el,
    x: ax + (el.x - ax) * sx,
    y: ay + (el.y - ay) * sy,
    width: el.width * sx,
    height: el.height * sy,
  }
}

// 元素旋转
// 专业白板标准功能：绕中心点旋转元素
/**
 * 绕中心点旋转元素
 * @param el 要旋转的元素
 * @param angle 旋转角度（弧度）
 * @param cx 旋转中心 X（可选，默认元素中心）
 * @param cy 旋转中心 Y（可选，默认元素中心）
 */
export function rotateElement(
  el: CanvasElement,
  angle: number,
  cx?: number,
  cy?: number
): CanvasElement {
  const bounds = elementBounds(el)
  const centerX = cx ?? bounds.x + bounds.w / 2
  const centerY = cy ?? bounds.y + bounds.h / 2

  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  function rotatePoint(px: number, py: number): [number, number] {
    const dx = px - centerX
    const dy = py - centerY
    return [centerX + dx * cos - dy * sin, centerY + dx * sin + dy * cos]
  }

  if (el.type === 'stroke') {
    const newPts = el.points.map((p) => rotatePoint(p[0], p[1]))
    return { ...el, points: newPts, rotation: ((el.rotation || 0) + angle) % (Math.PI * 2) }
  }

  if (el.type === 'shape') {
    // 对于形状，更新 rotation 属性
    return { ...el, rotation: ((el.rotation || 0) + angle) % (Math.PI * 2) }
  }

  // text 和 image 元素
  return { ...el, rotation: ((el.rotation || 0) + angle) % (Math.PI * 2) } as CanvasElement
}

// 元素对齐
// 专业白板/设计工具标配：选中多个元素后一键对齐
// 用户痛点："手动对齐5个矩形花了3分钟，还不齐" - 社区高频反馈
export type AlignmentType =
  | 'alignLeft'
  | 'alignCenterH'
  | 'alignRight'
  | 'alignTop'
  | 'alignCenterV'
  | 'alignBottom'

// 元素分布
// 专业设计工具标配：选中多个元素后一键等间距分布
// 用户痛点："手动调整3个按钮间距，调了10次还是不均匀" - 社区高频反馈
export type DistributionType = 'distributeH' | 'distributeV'

/**
 * 计算多个元素的公共边界
 * 用于确定对齐的参考基准线
 */
export function getCommonBounds(elements: CanvasElement[]): {
  minX: number
  minY: number
  maxX: number
  maxY: number
  centerX: number
  centerY: number
} {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity

  for (const el of elements) {
    const bounds = elementBounds(el)
    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.w)
    maxY = Math.max(maxY, bounds.y + bounds.h)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  }
}

/**
 * 对齐多个选中元素
 * 支持 6 种对齐方式：左对齐、水平居中、右对齐、顶对齐、垂直居中、底对齐
 * 完全对齐 Figma / Excalidraw / tldraw 的专业行为
 */
export function alignElements(
  elements: CanvasElement[],
  selectedIds: string[],
  alignment: AlignmentType
): CanvasElement[] {
  if (selectedIds.length < 2) return elements

  const selectedSet = new Set(selectedIds)
  const selectedElements = elements.filter((el) => selectedSet.has(el.id))
  const bounds = getCommonBounds(selectedElements)

  return elements.map((el) => {
    if (!selectedSet.has(el.id)) return el

    const elBounds = elementBounds(el)
    let dx = 0,
      dy = 0

    switch (alignment) {
      case 'alignLeft':
        dx = bounds.minX - elBounds.x
        break
      case 'alignCenterH':
        dx = bounds.centerX - (elBounds.x + elBounds.w / 2)
        break
      case 'alignRight':
        dx = bounds.maxX - (elBounds.x + elBounds.w)
        break
      case 'alignTop':
        dy = bounds.minY - elBounds.y
        break
      case 'alignCenterV':
        dy = bounds.centerY - (elBounds.y + elBounds.h / 2)
        break
      case 'alignBottom':
        dy = bounds.maxY - (elBounds.y + elBounds.h)
        break
    }

    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return el
    return moveElement(el, dx, dy)
  })
}

/**
 * 分布多个选中元素（等间距分布）
 * 支持 2 种分布方式：水平分布、垂直分布
 * 完全对齐 Figma / tldraw 的专业行为
 * 
 * 算法：
 * 1. 计算所有元素的总宽度/高度（最左到最右/最上到最下）
 * 2. 计算所有元素的宽度/高度之和
 * 3. 计算可用空白空间 = 总空间 - 元素空间
 * 4. 计算间距 = 空白空间 / (元素数 - 1)
 * 5. 按原始顺序重新排列元素，每个元素之间保持相等间距
 */
export function distributeElements(
  elements: CanvasElement[],
  selectedIds: string[],
  distribution: DistributionType
): CanvasElement[] {
  if (selectedIds.length < 3) return elements

  const selectedSet = new Set(selectedIds)
  const selectedElements = elements.filter((el) => selectedSet.has(el.id))
  const bounds = getCommonBounds(selectedElements)

  // 按当前位置排序元素（水平按 x，垂直按 y）
  const sorted = [...selectedElements].sort((a, b) => {
    const aBounds = elementBounds(a)
    const bBounds = elementBounds(b)
    if (distribution === 'distributeH') {
      return aBounds.x - bBounds.x
    } else {
      return aBounds.y - bBounds.y
    }
  })

  // 计算所有元素的总宽度/高度
  const totalElementSpace = sorted.reduce((sum, el) => {
    const b = elementBounds(el)
    return sum + (distribution === 'distributeH' ? b.w : b.h)
  }, 0)

  // 计算总可用空间
  const totalSpace =
    distribution === 'distributeH' ? bounds.maxX - bounds.minX : bounds.maxY - bounds.minY

  // 计算每个间隙的大小
  const gapCount = sorted.length - 1
  const gapSize = (totalSpace - totalElementSpace) / gapCount

  // 构建新位置映射
  const newPositions = new Map<string, { dx: number; dy: number }>()
  let currentPos = distribution === 'distributeH' ? bounds.minX : bounds.minY

  for (const el of sorted) {
    const elBounds = elementBounds(el)
    
    if (distribution === 'distributeH') {
      const dx = currentPos - elBounds.x
      newPositions.set(el.id, { dx, dy: 0 })
      currentPos += elBounds.w + gapSize
    } else {
      const dy = currentPos - elBounds.y
      newPositions.set(el.id, { dx: 0, dy })
      currentPos += elBounds.h + gapSize
    }
  }

  return elements.map((el) => {
    const pos = newPositions.get(el.id)
    if (!pos || (Math.abs(pos.dx) < 0.01 && Math.abs(pos.dy) < 0.01)) return el
    return moveElement(el, pos.dx, pos.dy)
  })
}
