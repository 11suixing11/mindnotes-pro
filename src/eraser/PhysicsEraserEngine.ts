import type { CanvasElement, StrokeElement } from '../store/types'
import type {
  EraserConfig,
  EraserPoint,
  EraseResult,
  Bounds,
  StrokeErasure,
  Intersection,
  BoundsEntry,
} from './types'
import { DEFAULT_ERASER_CONFIG } from './types'
import { elementBounds } from '../canvas/canvasUtils'
import { EraserAudioEngine } from './EraserAudioEngine'

/**
 * 物理擦除引擎核心类
 * 实现压力感应、方向纹理、像素级擦除、分层处理
 */
export class PhysicsEraserEngine {
  private config: EraserConfig
  private trail: EraserPoint[] = []
  private baseSize: number = 10
  private wearLevel: number = 0 // 磨损程度 0-1，0=全新，1=完全磨损
  private audioEngine: EraserAudioEngine

  constructor(config: Partial<EraserConfig> = {}) {
    this.config = {
      ...DEFAULT_ERASER_CONFIG,
      ...config,
    }
    this.audioEngine = new EraserAudioEngine(this.config)
  }

  updateConfig(config: Partial<EraserConfig>): void {
    this.config = { ...this.config, ...config }
    this.audioEngine.updateConfig(config)
  }

  setBaseSize(size: number): void {
    this.baseSize = size
  }

  /**
   * 开始擦除
   */
  startErase(point: EraserPoint): void {
    this.trail = [point]
    this.audioEngine.startErase(point, this.wearLevel)
  }

  /**
   * 添加擦除点并执行擦除计算
   */
  addErasePoint(
    point: EraserPoint,
    elements: CanvasElement[]
  ): EraseResult {
    this.trail.push(point)
    this.audioEngine.updateErase(point, this.wearLevel)

    // 计算磨损增量
    if (this.trail.length >= 2) {
      const prevPoint = this.trail[this.trail.length - 2]
      const dx = point.x - prevPoint.x
      const dy = point.y - prevPoint.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // 磨损速度与距离、压力成正比，与硬度成反比
      // 硬橡皮磨损慢，软橡皮磨损快
      const pressureFactor = 0.3 + point.pressure * 0.7
      const hardnessFactor = 1 - this.config.hardness * 0.6
      const wearIncrement = distance * pressureFactor * hardnessFactor * this.config.wearRate * 0.001
      
      this.wearLevel = Math.min(1, this.wearLevel + wearIncrement)
    }

    // 1. 计算当前擦除区域边界
    const eraseBounds = this.getEraseBounds(point)

    // 2. 筛选候选元素 (简单空间过滤)
    const candidates = elements.filter((el) =>
      this.boundsIntersect(eraseBounds, elementBounds(el))
    )

    // 3. 对每个候选元素计算擦除
    const results: EraseResult['modifiedStrokes'] = []
    const affectedIds: string[] = []

    for (const el of candidates) {
      if (el.type === 'stroke') {
        const erasure = this.computeStrokeErasure(
          el as StrokeElement,
          point
        )
        affectedIds.push(el.id)

        if (erasure.shouldDelete) {
          results.push({ id: el.id, action: 'delete' })
        } else if (erasure.shouldSplit && erasure.intersections.length > 0) {
          const segments = this.splitStroke(el as StrokeElement, erasure.intersections)
          if (segments.length > 0) {
            results.push({ id: el.id, action: 'split', segments })
          } else {
            results.push({ id: el.id, action: 'delete' })
          }
        } else {
          results.push({ id: el.id, action: 'keep' })
        }
      } else {
        // 非笔触元素：边界碰撞检测
        const b = elementBounds(el)
        const effectiveRadius = this.computeEffectiveRadius(point.pressure)
        if (
          point.x >= b.x - effectiveRadius &&
          point.x <= b.x + b.w + effectiveRadius &&
          point.y >= b.y - effectiveRadius &&
          point.y <= b.y + b.h + effectiveRadius
        ) {
          results.push({ id: el.id, action: 'delete' })
          affectedIds.push(el.id)
        }
      }
    }

    return {
      modifiedStrokes: results,
      affectedElementIds: affectedIds,
      trail: [...this.trail],
    }
  }

  /**
   * 结束擦除
   */
  endErase(): void {
    this.trail = []
    this.audioEngine.stopErase()
  }

  /**
   * 获取擦除轨迹
   */
  getTrail(): EraserPoint[] {
    return [...this.trail]
  }

  /**
   * 获取当前磨损程度
   * @returns 0-1，0=全新，1=完全磨损
   */
  getWearLevel(): number {
    return this.wearLevel
  }

  /**
   * 重置磨损（削橡皮/换橡皮）
   */
  resetWear(): void {
    this.wearLevel = 0
    this.audioEngine.playSharpenSound()
  }

  /**
   * 计算单条笔触的擦除情况
   */
  private computeStrokeErasure(
    stroke: StrokeElement,
    erasePoint: EraserPoint
  ): StrokeErasure {
    // 防御性检查：空笔触或单点笔触
    if (!stroke.points || stroke.points.length < 2) {
      return {
        strokeId: stroke.id,
        intersections: [],
        eraseStrength: 0,
        shouldDelete: false,
        shouldSplit: false,
        opacityDelta: 0,
      }
    }

    const effectiveRadius = this.computeEffectiveRadius(erasePoint.pressure)
    const eraseStrength = this.computeEraseStrength(erasePoint)
    const intersections: Intersection[] = []

    // 检测笔触每一段与擦除区域的相交
    for (let i = 1; i < stroke.points.length; i++) {
      const p1 = stroke.points[i - 1]
      const p2 = stroke.points[i]

      // 找到线段上离擦除点最近的点
      const t = this.findIntersectionT(p1, p2, erasePoint)
      const closestX = p1[0] + (p2[0] - p1[0]) * t
      const closestY = p1[1] + (p2[1] - p1[1]) * t

      // 根据橡皮擦形状计算距离
      const dist = this.pointToEraserDistance(
        erasePoint,
        closestX,
        closestY
      )

      // 有效距离阈值（考虑笔触粗细）
      const effectiveDist = dist - stroke.size / 2

      if (effectiveDist < 0) {
        // 在橡皮擦内部：强度根据深度计算
        const depthFactor = Math.min(1, -effectiveDist / (effectiveRadius * 0.5))
        const strength = Math.max(0, Math.min(1, depthFactor * eraseStrength))

        intersections.push({
          t: (i - 1 + t) / stroke.points.length,
          point: [closestX, closestY],
          strength,
        })
      } else if (dist < effectiveRadius + stroke.size / 2) {
        // 在边缘区域：渐变衰减
        const strength = Math.max(
          0,
          Math.min(1, 1 - effectiveDist / effectiveRadius) * eraseStrength
        )

        intersections.push({
          t: (i - 1 + t) / stroke.points.length,
          point: [closestX, closestY],
          strength,
        })
      }
    }

    // 判断是否应该删除或分割
    const maxStrength = intersections.length > 0 
      ? Math.max(...intersections.map((i) => i.strength))
      : 0

    return {
      strokeId: stroke.id,
      intersections,
      eraseStrength: maxStrength,
      shouldDelete: maxStrength > 0.9 && intersections.length >= stroke.points.length * 0.3,
      shouldSplit: intersections.length > 0 && maxStrength > 0.3,
      opacityDelta: maxStrength * 0.1,
    }
  }

  /**
   * 物理公式: 有效擦除半径
   * 压力越大，擦除范围越大
   * 硬度越高，擦除范围越小（硬橡皮更精确）
   * 磨损越大，擦除范围越大（橡皮变钝，接触面积变大）
   */
  computeEffectiveRadius(pressure: number): number {
    const clampedPressure = Math.max(0, Math.min(1, pressure))
    const pressureFactor = 0.4 + clampedPressure * 0.6 * this.config.pressureSensitivity
    const hardnessFactor = 1 - this.config.hardness * 0.3
    // 磨损影响：磨损越大，半径越大（最多增加50%）
    const wearFactor = 1 + this.wearLevel * 0.5
    return Math.max(1, this.baseSize * pressureFactor * hardnessFactor * wearFactor)
  }

  /**
   * 获取凿形橡皮擦的尺寸（宽、高）
   * 凿形是扁长的，宽度约等于圆形直径，高度约为宽度的40%
   */
  getChiselDimensions(pressure: number): { width: number; height: number } {
    const effectiveSize = this.computeEffectiveRadius(pressure) * 2
    return {
      width: effectiveSize,
      height: effectiveSize * 0.4,
    }
  }

  /**
   * 计算点到橡皮擦的距离
   * 根据橡皮擦形状选择不同的距离计算方法
   */
  pointToEraserDistance(
    erasePoint: EraserPoint,
    x: number,
    y: number
  ): number {
    const dx = x - erasePoint.x
    const dy = y - erasePoint.y

    switch (this.config.shape) {
      case 'circle':
        return Math.sqrt(dx * dx + dy * dy)

      case 'square': {
        const halfSize = this.computeEffectiveRadius(erasePoint.pressure)
        const rot = this.config.rotation
        const cos = Math.cos(-rot)
        const sin = Math.sin(-rot)
        const localX = dx * cos - dy * sin
        const localY = dx * sin + dy * cos
        return this.pointToRectDistance(localX, localY, halfSize, halfSize)
      }

      case 'chisel': {
        const dims = this.getChiselDimensions(erasePoint.pressure)
        const halfW = dims.width / 2
        const halfH = dims.height / 2
        // 结合配置旋转和运动方向
        const rot = this.config.rotation + erasePoint.direction * this.config.directionInfluence
        const cos = Math.cos(-rot)
        const sin = Math.sin(-rot)
        const localX = dx * cos - dy * sin
        const localY = dx * sin + dy * cos
        return this.pointToRectDistance(localX, localY, halfW, halfH)
      }

      default:
        return Math.sqrt(dx * dx + dy * dy)
    }
  }

  /**
   * 计算点到轴对齐矩形的距离
   * 点在矩形内返回负数，在外部返回正数
   */
  private pointToRectDistance(
    px: number,
    py: number,
    halfW: number,
    halfH: number
  ): number {
    const dx = Math.max(0, Math.abs(px) - halfW)
    const dy = Math.max(0, Math.abs(py) - halfH)
    // 在矩形内部时返回负距离（用于强度计算）
    if (dx === 0 && dy === 0) {
      // 内部：距离边缘的最近距离（负值）
      const distToEdge = Math.min(halfW - Math.abs(px), halfH - Math.abs(py))
      return -distToEdge
    }
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 物理公式: 擦除强度
   * 综合压力、速度、摩擦、硬度计算
   */
  computeEraseStrength(point: EraserPoint): number {
    // 压力贡献: 非线性，重压快速饱和
    const pressureContrib = Math.pow(point.pressure, 0.7) * this.config.pressureSensitivity

    // 速度贡献: 太快擦不干净，太慢也擦不干净
    // 最优速度约 2px/ms
    const optimalVelocity = 2
    const velocityContrib = Math.exp(
      -Math.pow(point.velocity - optimalVelocity, 2) / 2
    )

    // 摩擦系数
    const frictionContrib = this.config.friction

    // 硬度: 硬橡皮擦得干净但费力
    const hardnessContrib = 0.7 + this.config.hardness * 0.3

    return Math.min(
      1,
      pressureContrib * velocityContrib * frictionContrib * hardnessContrib
    )
  }

  /**
   * 笔触分割算法
   * 根据相交点将笔触分割为多段
   */
  splitStroke(
    stroke: StrokeElement,
    intersections: Intersection[]
  ): StrokeElement[] {
    if (intersections.length === 0) return []

    // 按t排序
    const sorted = [...intersections].sort((a, b) => a.t - b.t)
    const segments: StrokeElement[] = []

    let lastT = 0
    for (const inter of sorted) {
      if (inter.t - lastT > 0.05) {
        const segmentPoints = this.extractSegment(
          stroke.points,
          lastT,
          inter.t
        )
        if (segmentPoints.length >= 2) {
          segments.push({
            ...stroke,
            id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            points: segmentPoints,
            opacity: Math.max(0.1, (stroke.opacity ?? 1) * (1 - inter.strength * 0.3)),
          })
        }
      }
      lastT = inter.t
    }

    // 最后一段
    if (1 - lastT > 0.05) {
      const segmentPoints = this.extractSegment(stroke.points, lastT, 1)
      if (segmentPoints.length >= 2) {
        segments.push({
          ...stroke,
          id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          points: segmentPoints,
        })
      }
    }

    return segments
  }

  /**
   * 提取笔触的子段
   */
  private extractSegment(
    points: number[][],
    startT: number,
    endT: number
  ): number[][] {
    const startIdx = Math.floor(startT * points.length)
    const endIdx = Math.ceil(endT * points.length)
    return points.slice(startIdx, Math.min(endIdx + 1, points.length))
  }

  /**
   * 计算擦除区域边界
   */
  private getEraseBounds(point: EraserPoint): Bounds {
    const radius = this.computeEffectiveRadius(point.pressure)
    return {
      x: point.x - radius,
      y: point.y - radius,
      w: radius * 2,
      h: radius * 2,
    }
  }

  /**
   * 边界相交检测
   */
  private boundsIntersect(a: Bounds, b: Bounds): boolean {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    )
  }

  /**
   * 计算线段相交的参数化位置
   */
  private findIntersectionT(
    p1: number[],
    p2: number[],
    erasePoint: EraserPoint
  ): number {
    const dx = p2[0] - p1[0]
    const dy = p2[1] - p1[1]
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len === 0) return 0.5

    const t = Math.max(
      0,
      Math.min(
        1,
        ((erasePoint.x - p1[0]) * dx + (erasePoint.y - p1[1]) * dy) /
          (len * len)
      )
    )
    return t
  }

  /**
   * 将元素转换为空间索引条目
   */
  static toBoundsEntry(el: CanvasElement): BoundsEntry {
    const b = elementBounds(el)
    return {
      minX: b.x,
      minY: b.y,
      maxX: b.x + b.w,
      maxY: b.y + b.h,
      id: el.id,
    }
  }
}
