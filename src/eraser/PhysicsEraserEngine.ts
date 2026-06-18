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
import { elementBounds, distToSeg } from '../canvas/canvasUtils'

/**
 * 物理擦除引擎核心类
 * 实现压力感应、方向纹理、像素级擦除、分层处理
 */
export class PhysicsEraserEngine {
  private config: EraserConfig
  private trail: EraserPoint[] = []
  private baseSize: number = 10

  constructor(config: Partial<EraserConfig> = {}) {
    this.config = {
      ...DEFAULT_ERASER_CONFIG,
      ...config,
    }
  }

  updateConfig(config: Partial<EraserConfig>): void {
    this.config = { ...this.config, ...config }
  }

  setBaseSize(size: number): void {
    this.baseSize = size
  }

  /**
   * 开始擦除
   */
  startErase(point: EraserPoint): void {
    this.trail = [point]
  }

  /**
   * 添加擦除点并执行擦除计算
   */
  addErasePoint(
    point: EraserPoint,
    elements: CanvasElement[]
  ): EraseResult {
    this.trail.push(point)

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
          point,
          this.trail.slice(-5)
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
  }

  /**
   * 获取擦除轨迹
   */
  getTrail(): EraserPoint[] {
    return [...this.trail]
  }

  /**
   * 计算单条笔触的擦除情况
   */
  private computeStrokeErasure(
    stroke: StrokeElement,
    erasePoint: EraserPoint,
    recentTrail: EraserPoint[]
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

      const dist = distToSeg(
        erasePoint.x,
        erasePoint.y,
        p1[0],
        p1[1],
        p2[0],
        p2[1]
      )

      if (dist < effectiveRadius + stroke.size / 2) {
        // 计算相交点在笔触上的位置
        const t = this.findIntersectionT(p1, p2, erasePoint, effectiveRadius)
        const strength = Math.max(
          0,
          Math.min(1, 1 - dist / (effectiveRadius + stroke.size / 2)) * eraseStrength
        )

        intersections.push({
          t: (i - 1 + t) / stroke.points.length,
          point: [erasePoint.x, erasePoint.y],
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
   */
  computeEffectiveRadius(pressure: number): number {
    const pressureFactor = 0.4 + pressure * 0.6 * this.config.pressureSensitivity
    const hardnessFactor = 1 - this.config.hardness * 0.3
    return this.baseSize * pressureFactor * hardnessFactor
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
    erasePoint: EraserPoint,
    radius: number
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
