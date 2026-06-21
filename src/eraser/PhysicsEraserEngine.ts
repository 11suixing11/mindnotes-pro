import type { CanvasElement, StrokeElement } from '../store/types'
import type {
  EraserConfig,
  EraserPoint,
  EraseResult,
  Bounds,
  StrokeErasure,
  Intersection,
  BoundsEntry,
  SplitStrokeResult,
} from './types'
import { DEFAULT_ERASER_CONFIG } from './types'
import { elementBounds } from '../canvas/canvasUtils'
import { EraserAudioEngine } from './EraserAudioEngine'
import { globalDirtyRectManager } from './performanceOptimizer'

// ============================================
// 物理常量定义（提取魔法数字）
// ============================================

/** 磨损计算常量 */
const WEAR_CONSTANTS = {
  /** 压力对磨损的影响系数 */
  PRESSURE_BASE: 0.3,
  PRESSURE_MULTIPLIER: 0.7,
  /** 硬度对磨损的影响系数（硬橡皮磨损慢） */
  HARDNESS_FACTOR: 0.6,
  /** 磨损速率缩放系数 */
  RATE_SCALE: 0.001,
  /** 最大磨损程度 */
  MAX_WEAR: 1,
} as const

/** 擦除半径计算常量 */
const RADIUS_CONSTANTS = {
  /** 压力基础系数 */
  PRESSURE_BASE: 0.4,
  PRESSURE_MULTIPLIER: 0.6,
  /** 硬度影响系数 */
  HARDNESS_FACTOR: 0.3,
  /** 磨损对半径的最大增幅（50%） */
  WEAR_MAX_INCREASE: 0.5,
  /** 最小擦除半径 */
  MIN_RADIUS: 1,
} as const

/** 擦除强度计算常量 */
const STRENGTH_CONSTANTS = {
  /** 压力非线性指数（重压快速饱和） */
  PRESSURE_EXPONENT: 0.7,
  /** 最优擦除速度 px/ms */
  OPTIMAL_VELOCITY: 2,
  /** 速度高斯分布方差 */
  VELOCITY_VARIANCE: 2,
  /** 硬度基础系数 */
  HARDNESS_BASE: 0.7,
  HARDNESS_MULTIPLIER: 0.3,
  /** 最大强度 */
  MAX_STRENGTH: 1,
  /** 最小速度贡献值 */
  MIN_VELOCITY_CONTRIB: 0.05,
} as const

/** 凿形橡皮擦比例常量 */
const CHISEL_CONSTANTS = {
  /** 凿形高度占宽度的比例 */
  HEIGHT_RATIO: 0.4,
  /** 倾斜时的最大宽度放大倍数 */
  TILT_MAX_WIDTH_MULTIPLIER: 3.0,
  /** 完全倾斜的角度阈值（度） */
  FULL_TILT_ANGLE: 60,
} as const

/** 压感笔倾斜计算常量 */
const TILT_CONSTANTS = {
  /** 垂直角度（90度） */
  VERTICAL_ANGLE: 90,
  /** 角度转弧度系数 */
  DEG_TO_RAD: Math.PI / 180,
  /** 最小倾斜角度（低于此视为垂直） */
  MIN_TILT_THRESHOLD: 5,
} as const

/** 笔触分割常量 */
const SPLIT_CONSTANTS = {
  /** 最小段长度阈值（避免过短的碎片） */
  MIN_SEGMENT_THRESHOLD: 0.05,
  /** 最小不透明度 */
  MIN_OPACITY: 0.1,
  /** 强度对不透明度的影响系数 */
  OPACITY_STRENGTH_FACTOR: 0.3,
} as const

/** 擦除决策阈值 */
const ERASE_THRESHOLDS = {
  /** 删除阈值（超过此强度且覆盖足够比例则删除） */
  DELETE_STRENGTH: 0.9,
  /** 删除所需的点覆盖比例 */
  DELETE_COVERAGE_RATIO: 0.3,
  /** 分割阈值 */
  SPLIT_STRENGTH: 0.3,
  /** 内部深度系数 */
  DEPTH_FACTOR: 0.5,
  /** 不透明度增量系数 */
  OPACITY_DELTA_FACTOR: 0.1,
} as const

// ============================================
// 工具函数（提取公共逻辑）
// ============================================

/**
 * 计算两点之间的欧氏距离
 */
function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 将值限制在 [min, max] 范围内
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * 生成唯一ID（用于分割后的新笔触）
 */
function generateStrokeId(): string {
  // 使用8位随机字符（约43亿种组合），大幅降低碰撞概率
  return `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * 验证擦除点参数合法性
 * 修复 P0-1: 完整校验所有数值字段的 NaN/Finite
 */
function validateErasePoint(point: EraserPoint): boolean {
  return (
    typeof point.x === 'number' &&
    typeof point.y === 'number' &&
    typeof point.pressure === 'number' &&
    typeof point.velocity === 'number' &&
    typeof point.direction === 'number' &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    Number.isFinite(point.pressure) &&
    Number.isFinite(point.velocity) &&
    Number.isFinite(point.direction) &&
    point.pressure >= 0 && point.pressure <= 1
  )
}

/**
 * 验证笔触参数合法性
 */
function validateStroke(stroke: StrokeElement): boolean {
  return (
    stroke != null &&
    Array.isArray(stroke.points) &&
    stroke.points.length >= 2
  )
}

// ============================================
// 物理擦除引擎核心类
// ============================================

/**
 * 物理擦除引擎核心类
 * 
 * 实现业界领先的物理模拟擦除系统：
 * - 压力感应擦除强度（重压擦净/轻压擦淡）
 * - 方向纹理模拟（橡皮擦角度影响擦除效果）
 * - 像素级部分擦除（笔触分段算法）
 * - Z-order分层处理（按图层顺序擦除）
 * - 橡皮磨损模拟（越用越钝，可削橡皮）
 * - 三种橡皮擦形状（圆形/方形/凿形）
 * - 实时参数化音效反馈
 * 
 * 设计原则：
 * 1. 物理真实：所有公式基于真实橡皮物理特性
 * 2. 性能优先：O(log n) 空间索引 + 增量更新
 * 3. 向后兼容：双模式切换，不破坏现有功能
 */
export class PhysicsEraserEngine {
  // ==========================================
  // 私有状态
  // ==========================================

  /** 橡皮擦配置 */
  private config: Readonly<EraserConfig>

  /** 擦除轨迹点序列 */
  private trail: EraserPoint[] = []

  /** 基础擦除尺寸（兼容旧API） */
  private baseSize: number = 10

  /** 磨损程度 0-1，0=全新，1=完全磨损 */
  private wearLevel: number = 0

  /** 磨损历史记录栈（用于撤销） */
  private wearHistory: number[] = []

  /** 磨损重做栈（用于重做） */
  private wearRedoStack: number[] = []

  /** 最大历史记录步数 */
  private readonly MAX_WEAR_HISTORY = 20

  /** 音效引擎 */
  private readonly audioEngine: EraserAudioEngine

  // ==========================================
  // 构造与配置
  // ==========================================

  constructor(config: Partial<EraserConfig> = {}) {
    this.config = Object.freeze({
      ...DEFAULT_ERASER_CONFIG,
      ...config,
    })
    this.audioEngine = new EraserAudioEngine(this.config)
  }

  /**
   * 更新橡皮擦配置
   * @param config 部分配置更新
   */
  updateConfig(config: Partial<EraserConfig>): void {
    this.config = Object.freeze({
      ...this.config,
      ...config,
    })
    this.audioEngine.updateConfig(config)
  }

  /**
   * 设置基础擦除尺寸（兼容旧API）
   * @param size 基础半径尺寸
   */
  setBaseSize(size: number): void {
    this.baseSize = clamp(size, 1, 100)
  }

  // ==========================================
  // 擦除生命周期
  // ==========================================

  /**
   * 开始擦除操作
   * @param point 起始擦除点
   */
  startErase(point: EraserPoint): void {
    // 参数校验
    if (!validateErasePoint(point)) {
      console.warn('[PhysicsEraserEngine] Invalid erase point:', point)
      return
    }

    this.trail = [point]
    this.audioEngine.startErase(point, this.wearLevel)
  }

  /**
   * 添加擦除点并执行擦除计算
   * 这是核心入口方法，每帧调用一次
   * 
   * @param point 当前擦除点（含压力、速度、方向信息）
   * @param elements 画布所有元素
   * @returns 擦除结果（修改的笔触列表）
   */
  addErasePoint(
    point: EraserPoint,
    elements: CanvasElement[]
  ): EraseResult {
    // 参数校验
    if (!validateErasePoint(point)) {
      console.warn('[PhysicsEraserEngine] Invalid erase point:', point)
      return {
        modifiedStrokes: [],
        affectedElementIds: [],
        trail: [...this.trail],
      }
    }

    if (!Array.isArray(elements)) {
      console.warn('[PhysicsEraserEngine] Invalid elements array')
      return {
        modifiedStrokes: [],
        affectedElementIds: [],
        trail: [...this.trail],
      }
    }

    this.trail.push(point)
    this.audioEngine.updateErase(point, this.wearLevel)

    // 1. 更新橡皮磨损
    this.updateWearLevel(point)

    // 2. 计算擦除区域边界
    const eraseBounds = this.getEraseBounds(point)

    // 3. 性能优化：标记脏区域
    globalDirtyRectManager.addDirtyRect({
      x: eraseBounds.x,
      y: eraseBounds.y,
      width: eraseBounds.w,
      height: eraseBounds.h,
    })

    // 4. 空间过滤：快速筛选候选元素
    const candidates = this.filterCandidateElements(elements, eraseBounds)

    // 5. 精确计算每个候选元素的擦除结果
    const { modifiedStrokes, affectedElementIds } = this.computeErasureResults(
      candidates,
      point
    )

    return {
      modifiedStrokes,
      affectedElementIds,
      trail: [...this.trail],
    }
  }

  /**
   * 结束擦除操作
   */
  endErase(): void {
    this.trail = []
    this.audioEngine.stopErase()
    // 注意：不重置磨损，磨损是持久状态
  }

  // ==========================================
  // 状态查询
  // ==========================================

  /**
   * 获取当前擦除轨迹（用于渲染预览）
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
   * 触发削橡皮音效
   * 保存历史记录支持撤销
   */
  resetWear(): void {
    this.saveWearHistory()
    this.wearLevel = 0
    this.audioEngine.playSharpenSound()
  }

  // ==========================================
  // 磨损历史记录（撤销/重做）
  // ==========================================

  /**
   * 保存当前磨损状态到历史记录
   * 限制最大历史步数，防止内存泄漏
   */
  private saveWearHistory(): void {
    this.wearHistory.push(this.wearLevel)
    // 限制历史记录上限
    if (this.wearHistory.length > this.MAX_WEAR_HISTORY) {
      this.wearHistory.shift()
    }
    // 新操作清空重做栈
    this.wearRedoStack = []
  }

  /**
   * 撤销上一次磨损操作
   * @returns 是否成功撤销
   */
  undoWear(): boolean {
    if (this.wearHistory.length === 0) {
      return false
    }
    const previousWear = this.wearHistory.pop()!
    this.wearRedoStack.push(this.wearLevel)
    this.wearLevel = previousWear
    return true
  }

  /**
   * 重做磨损操作
   * @returns 是否成功重做
   */
  redoWear(): boolean {
    if (this.wearRedoStack.length === 0) {
      return false
    }
    const nextWear = this.wearRedoStack.pop()!
    this.wearHistory.push(this.wearLevel)
    this.wearLevel = nextWear
    return true
  }

  /**
   * 检查是否可以撤销磨损
   */
  canUndoWear(): boolean {
    return this.wearHistory.length > 0
  }

  /**
   * 检查是否可以重做磨损
   */
  canRedoWear(): boolean {
    return this.wearRedoStack.length > 0
  }

  /**
   * 获取历史记录统计
   */
  getWearHistoryStats(): { historyCount: number; redoCount: number; maxHistory: number } {
    return {
      historyCount: this.wearHistory.length,
      redoCount: this.wearRedoStack.length,
      maxHistory: this.MAX_WEAR_HISTORY,
    }
  }

  // ==========================================
  // 核心物理计算
  // ==========================================

  /**
   * 物理公式: 有效擦除半径
   * 
   * 基于真实橡皮物理特性：
   * - 压力越大，橡皮形变越大，接触面积越大
   * - 硬度越高，形变越小，接触面积越小
   * - 磨损越大，橡皮变钝，接触面积越大
   * 
   * @param pressure 笔触压力 0-1
   * @returns 有效擦除半径（像素）
   */
  computeEffectiveRadius(pressure: number): number {
    // 处理非法输入
    if (!Number.isFinite(pressure)) {
      pressure = 0.5
    }
    const clampedPressure = clamp(pressure, 0, 1)

    // 压力影响：非线性，重压快速饱和
    const pressureFactor =
      RADIUS_CONSTANTS.PRESSURE_BASE +
      clampedPressure *
        RADIUS_CONSTANTS.PRESSURE_MULTIPLIER *
        this.config.pressureSensitivity

    // 硬度影响：硬橡皮接触面积小，更精确
    const hardnessFactor = 1 - this.config.hardness * RADIUS_CONSTANTS.HARDNESS_FACTOR

    // 磨损影响：磨损越大，半径越大（最多增加50%）
    const wearFactor = 1 + this.wearLevel * RADIUS_CONSTANTS.WEAR_MAX_INCREASE

    // 使用配置中的 baseRadius，兼容旧代码
    const baseRadius = this.config.baseRadius ?? this.baseSize

    return Math.max(
      RADIUS_CONSTANTS.MIN_RADIUS,
      baseRadius * pressureFactor * hardnessFactor * wearFactor
    )
  }

  /**
   * 获取凿形橡皮擦的尺寸（宽、高）
   * 凿形是扁长的，模拟真实美术橡皮的形状
   * 支持压感笔倾斜：倾斜越大，宽度越宽（侧擦效果）
   */
  getChiselDimensions(
    pressure: number,
    tiltX?: number,
    tiltY?: number
  ): { width: number; height: number; rotation: number } {
    const effectiveSize = this.computeEffectiveRadius(pressure) * 2

    // 计算倾斜角度和方向
    const { tiltMagnitude, tiltDirection } = this.computeTiltAngle(tiltX, tiltY)

    // 根据倾斜角度计算宽度放大倍数
    // 垂直时（tiltMagnitude=0）：1倍宽度
    // 完全倾斜时（tiltMagnitude=1）：最大3倍宽度
    const tiltWidthMultiplier =
      1 + tiltMagnitude * (CHISEL_CONSTANTS.TILT_MAX_WIDTH_MULTIPLIER - 1)

    const baseWidth = effectiveSize * tiltWidthMultiplier
    const baseHeight = effectiveSize * CHISEL_CONSTANTS.HEIGHT_RATIO

    // 结合倾斜方向和配置的旋转角度
    const finalRotation = this.config.rotation + tiltDirection

    return {
      width: baseWidth,
      height: baseHeight,
      rotation: finalRotation,
    }
  }

  /**
   * 计算压感笔的倾斜程度和方向
   * 
   * @param tiltX PointerEvent.tiltX (-90~90度)
   * @param tiltY PointerEvent.tiltY (-90~90度)
   * @returns tiltMagnitude 0-1（0=垂直，1=完全倾斜）
   *          tiltDirection 倾斜方向（弧度）
   */
  computeTiltAngle(
    tiltX?: number,
    tiltY?: number
  ): { tiltMagnitude: number; tiltDirection: number } {
    // 不支持倾斜的设备，返回默认值
    if (tiltX == null || tiltY == null) {
      return { tiltMagnitude: 0, tiltDirection: 0 }
    }

    // 计算倾斜幅度（与垂直方向的夹角）
    const tiltXRad = tiltX * TILT_CONSTANTS.DEG_TO_RAD
    const tiltYRad = tiltY * TILT_CONSTANTS.DEG_TO_RAD

    // 计算总倾斜角度（球面几何）
    const tiltMagnitudeRad = Math.sqrt(tiltXRad * tiltXRad + tiltYRad * tiltYRad)
    const tiltMagnitudeDeg = tiltMagnitudeRad / TILT_CONSTANTS.DEG_TO_RAD

    // 归一化到 0-1
    // 小于阈值视为垂直
    if (tiltMagnitudeDeg < TILT_CONSTANTS.MIN_TILT_THRESHOLD) {
      return { tiltMagnitude: 0, tiltDirection: 0 }
    }

    // 映射到 0-1 范围
    const normalizedMagnitude = clamp(
      tiltMagnitudeDeg / CHISEL_CONSTANTS.FULL_TILT_ANGLE,
      0,
      1
    )

    // 计算倾斜方向
    const tiltDirection = Math.atan2(tiltYRad, tiltXRad)

    return {
      tiltMagnitude: normalizedMagnitude,
      tiltDirection,
    }
  }

  /**
   * 计算点到橡皮擦的距离
   * 根据橡皮擦形状选择不同的距离计算方法
   * 
   * @param erasePoint 橡皮擦位置和状态
   * @param x 目标点X
   * @param y 目标点Y
   * @returns 距离（内部为负，外部为正）
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
        return this.transformAndDistanceToRect(
          dx,
          dy,
          this.config.rotation,
          halfSize,
          halfSize
        )
      }

      case 'chisel': {
        const dims = this.getChiselDimensions(
          erasePoint.pressure,
          erasePoint.tiltX,
          erasePoint.tiltY
        )
        const halfW = dims.width / 2
        const halfH = dims.height / 2
        // 结合配置旋转、运动方向和笔倾斜方向
        const totalRotation =
          dims.rotation + erasePoint.direction * this.config.directionInfluence
        return this.transformAndDistanceToRect(dx, dy, totalRotation, halfW, halfH)
      }

      default:
        return Math.sqrt(dx * dx + dy * dy)
    }
  }

  /**
   * 物理公式: 擦除强度
   * 
   * 综合四个维度计算：
   * 1. 压力：重压擦得干净（非线性）
   * 2. 速度：太快擦不干净，太慢也擦不干净（高斯分布）
   * 3. 摩擦：摩擦系数直接影响
   * 4. 硬度：硬橡皮擦得干净但费力
   * 
   * @param point 擦除点状态
   * @returns 擦除强度 0-1
   */
  computeEraseStrength(point: EraserPoint): number {
    // 边界参数clamp
    const pressure = clamp(point.pressure, 0, 1)
    const velocity = Math.max(0, point.velocity)

    // 压力贡献: 非线性，重压快速饱和
    const pressureContrib =
      Math.pow(pressure, STRENGTH_CONSTANTS.PRESSURE_EXPONENT) *
      this.config.pressureSensitivity

    // 速度贡献: 高斯分布，最优速度约 2px/ms
    const velocityDiff = velocity - STRENGTH_CONSTANTS.OPTIMAL_VELOCITY
    const velocityContrib = Math.max(
      STRENGTH_CONSTANTS.MIN_VELOCITY_CONTRIB,
      Math.exp(
        -Math.pow(velocityDiff, 2) / STRENGTH_CONSTANTS.VELOCITY_VARIANCE
      )
    )

    // 摩擦系数
    const frictionContrib = this.config.friction

    // 硬度: 硬橡皮擦得干净但费力
    const hardnessContrib =
      STRENGTH_CONSTANTS.HARDNESS_BASE +
      this.config.hardness * STRENGTH_CONSTANTS.HARDNESS_MULTIPLIER

    return clamp(
      pressureContrib * velocityContrib * frictionContrib * hardnessContrib,
      0,
      1
    )
  }

  // ==========================================
  // 笔触分割算法
  // ==========================================

  /**
   * 笔触分割算法
   * 根据相交点将笔触分割为多段
   *
   * 算法原理：
   * 1. 按参数化位置 t 排序所有相交点
   * 2. 在每两个相交点之间提取子段
   * 3. 过短的段直接丢弃（避免碎片）
   *
   * @param stroke 原始笔触
   * @param intersections 相交点列表
   * @returns 分割结果（判别联合）：
   *   - 'split': 成功分割，segments 非空
   *   - 'deleted': 所有子段被过滤（整笔被擦除）
   *   - 'unchanged': 输入无效或无交点，保留原笔触
   */
  splitStroke(
    stroke: StrokeElement,
    intersections: Intersection[]
  ): SplitStrokeResult {
    if (!validateStroke(stroke) || intersections.length === 0) {
      return { status: 'unchanged' }
    }

    // 按参数化位置 t 排序
    const sorted = [...intersections].sort((a, b) => a.t - b.t)
    const segments: StrokeElement[] = []

    let lastT = 0
    for (const inter of sorted) {
      if (inter.t - lastT > SPLIT_CONSTANTS.MIN_SEGMENT_THRESHOLD) {
        const segmentPoints = this.extractSegment(
          stroke.points,
          lastT,
          inter.t
        )
        if (segmentPoints.length >= 2) {
          segments.push({
            ...stroke,
            id: generateStrokeId(),
            points: segmentPoints,
            opacity: Math.max(
              SPLIT_CONSTANTS.MIN_OPACITY,
              (stroke.opacity ?? 1) *
                (1 - inter.strength * SPLIT_CONSTANTS.OPACITY_STRENGTH_FACTOR)
            ),
          })
        }
      }
      lastT = inter.t
    }

    // 提取最后一段
    if (1 - lastT > SPLIT_CONSTANTS.MIN_SEGMENT_THRESHOLD) {
      const segmentPoints = this.extractSegment(stroke.points, lastT, 1)
      if (segmentPoints.length >= 2) {
        segments.push({
          ...stroke,
          id: generateStrokeId(),
          points: segmentPoints,
        })
      }
    }

    if (segments.length > 0) {
      return { status: 'split', segments }
    }

    // 所有子段均被过滤 — 整笔被擦除，调用方应删除原笔触
    return { status: 'deleted' }
  }

  // ==========================================
  // 空间索引辅助
  // ==========================================

  /**
   * 将元素转换为空间索引条目
   * 用于 RBush R树索引
   */
  static toBoundsEntry(el: CanvasElement | null | undefined): BoundsEntry | null {
    if (el == null) return null
    try {
      const b = elementBounds(el)
      return {
        minX: b.x,
        minY: b.y,
        maxX: b.x + b.w,
        maxY: b.y + b.h,
        id: el.id,
      }
    } catch {
      return null
    }
  }

  // ==========================================
  // 私有辅助方法
  // ==========================================

  /**
   * 更新橡皮磨损程度
   * 磨损与移动距离、压力成正比，与硬度成反比
   */
  private updateWearLevel(point: EraserPoint): void {
    if (this.trail.length < 2) return

    const prevPoint = this.trail[this.trail.length - 2]
    const dist = distance(point.x, point.y, prevPoint.x, prevPoint.y)

    // 压力越大磨损越快
    const pressureFactor =
      WEAR_CONSTANTS.PRESSURE_BASE +
      point.pressure * WEAR_CONSTANTS.PRESSURE_MULTIPLIER

    // 硬度越高磨损越慢
    const hardnessFactor = 1 - this.config.hardness * WEAR_CONSTANTS.HARDNESS_FACTOR

    // 计算磨损增量
    const wearIncrement =
      dist *
      pressureFactor *
      hardnessFactor *
      this.config.wearRate *
      WEAR_CONSTANTS.RATE_SCALE

    this.wearLevel = Math.min(
      WEAR_CONSTANTS.MAX_WEAR,
      this.wearLevel + wearIncrement
    )
  }

  /**
   * 空间过滤：快速筛选候选元素
   */
  private filterCandidateElements(
    elements: CanvasElement[],
    eraseBounds: Bounds
  ): CanvasElement[] {
    return elements.filter((el) => {
      try {
        return this.boundsIntersect(eraseBounds, elementBounds(el))
      } catch {
        return false
      }
    })
  }

  /**
   * 计算所有候选元素的擦除结果
   */
  private computeErasureResults(
    candidates: CanvasElement[],
    point: EraserPoint
  ): Pick<EraseResult, 'modifiedStrokes' | 'affectedElementIds'> {
    const modifiedStrokes: EraseResult['modifiedStrokes'] = []
    const affectedElementIds: string[] = []

    for (const el of candidates) {
      try {
        if (el.type === 'stroke') {
          const result = this.processStrokeElement(el as StrokeElement, point)
          if (result) {
            modifiedStrokes.push(result)
            affectedElementIds.push(el.id)
          }
        } else {
          const shouldDelete = this.checkNonStrokeElement(el, point)
          if (shouldDelete) {
            modifiedStrokes.push({ id: el.id, action: 'delete' })
            affectedElementIds.push(el.id)
          }
        }
      } catch (error) {
        console.error('[PhysicsEraserEngine] Error processing element:', error)
      }
    }

    return { modifiedStrokes, affectedElementIds }
  }

  /**
   * 处理笔触元素擦除
   */
  private processStrokeElement(
    stroke: StrokeElement,
    point: EraserPoint
  ): EraseResult['modifiedStrokes'][0] | null {
    const erasure = this.computeStrokeErasure(stroke, point)

    if (erasure.shouldDelete) {
      return { id: stroke.id, action: 'delete' }
    }

    if (erasure.shouldSplit && erasure.intersections.length > 0) {
      const result = this.splitStroke(stroke, erasure.intersections)
      if (result.status === 'split') {
        return { id: stroke.id, action: 'split', segments: result.segments }
      }
      if (result.status === 'deleted') {
        return { id: stroke.id, action: 'delete' }
      }
      // unchanged - 保留原笔触
    }

    return { id: stroke.id, action: 'keep' }
  }

  /**
   * 检测非笔触元素（矩形、圆形等）是否被擦除
   * 使用简单的边界碰撞检测
   */
  private checkNonStrokeElement(el: CanvasElement, point: EraserPoint): boolean {
    try {
      const b = elementBounds(el)
      const effectiveRadius = this.computeEffectiveRadius(point.pressure)
      return (
        point.x >= b.x - effectiveRadius &&
        point.x <= b.x + b.w + effectiveRadius &&
        point.y >= b.y - effectiveRadius &&
        point.y <= b.y + b.h + effectiveRadius
      )
    } catch {
      return false
    }
  }

  /**
   * 计算单条笔触的擦除情况
   */
  private computeStrokeErasure(
    stroke: StrokeElement,
    erasePoint: EraserPoint
  ): StrokeErasure {
    // 防御性检查
    if (!validateStroke(stroke)) {
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

      // 找到线段上离擦除点最近的点（参数化位置 t）
      const t = this.findIntersectionT(p1, p2, erasePoint)
      const closestX = p1[0] + (p2[0] - p1[0]) * t
      const closestY = p1[1] + (p2[1] - p1[1]) * t

      // 根据橡皮擦形状计算距离
      const dist = this.pointToEraserDistance(erasePoint, closestX, closestY)

      // 有效距离阈值（考虑笔触粗细）
      const effectiveDist = dist - stroke.size / 2

      if (effectiveDist < 0) {
        // 在橡皮擦内部：强度根据深度计算
        const depthFactor = Math.min(
          1,
          -effectiveDist / (effectiveRadius * ERASE_THRESHOLDS.DEPTH_FACTOR)
        )
        const strength = clamp(depthFactor * eraseStrength, 0, 1)

        intersections.push({
          t: (i - 1 + t) / stroke.points.length,
          point: [closestX, closestY],
          strength,
        })
      } else if (dist < effectiveRadius + stroke.size / 2) {
        // 在边缘区域：渐变衰减
        const strength = clamp(
          (1 - effectiveDist / effectiveRadius) * eraseStrength,
          0,
          1
        )

        intersections.push({
          t: (i - 1 + t) / stroke.points.length,
          point: [closestX, closestY],
          strength,
        })
      }
    }

    // 找到最大擦除强度
    // 修复 P1-4: 使用 for 循环替代 Math.max(...spread) 避免栈溢出
    let maxStrength = 0
    for (const inter of intersections) {
      if (inter.strength > maxStrength) {
        maxStrength = inter.strength
      }
    }

    return {
      strokeId: stroke.id,
      intersections,
      eraseStrength: maxStrength,
      // 删除条件：强度足够且覆盖足够比例
      shouldDelete:
        maxStrength > ERASE_THRESHOLDS.DELETE_STRENGTH &&
        intersections.length >= stroke.points.length * ERASE_THRESHOLDS.DELETE_COVERAGE_RATIO,
      // 分割条件：有相交且强度足够
      shouldSplit:
        intersections.length > 0 && maxStrength > ERASE_THRESHOLDS.SPLIT_STRENGTH,
      opacityDelta: maxStrength * ERASE_THRESHOLDS.OPACITY_DELTA_FACTOR,
    }
  }

  /**
   * 坐标变换并计算到矩形的距离
   */
  private transformAndDistanceToRect(
    dx: number,
    dy: number,
    rotation: number,
    halfW: number,
    halfH: number
  ): number {
    const cos = Math.cos(-rotation)
    const sin = Math.sin(-rotation)
    const localX = dx * cos - dy * sin
    const localY = dx * sin + dy * cos
    return this.pointToRectDistance(localX, localY, halfW, halfH)
  }

  /**
   * 计算点到轴对齐矩形的距离
   * 点在矩形内返回负数（表示深度），在外部返回正数
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
      // 内部：计算到最近边缘的距离（负值表示深度）
      const distToEdge = Math.min(halfW - Math.abs(px), halfH - Math.abs(py))
      return -distToEdge
    }

    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 提取笔触的子段
   * @param points 原始点数组
   * @param startT 起始参数化位置 0-1
   * @param endT 结束参数化位置 0-1
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
   * 计算擦除区域边界框
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
   * AABB 边界相交检测
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
   * 计算线段上最近点的参数化位置 t
   * 使用点到线段的投影公式
   */
  private findIntersectionT(
    p1: number[],
    p2: number[],
    erasePoint: EraserPoint
  ): number {
    const dx = p2[0] - p1[0]
    const dy = p2[1] - p1[1]
    const lenSq = dx * dx + dy * dy

    // 退化线段（两点重合）
    if (lenSq === 0) return 0.5

    // 点到线段的投影
    const t =
      ((erasePoint.x - p1[0]) * dx + (erasePoint.y - p1[1]) * dy) / lenSq

    return clamp(t, 0, 1)
  }
}
