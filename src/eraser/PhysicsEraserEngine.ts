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
 * 将值限制在 [min, max] 范围内
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * 生成唯一ID（用于分割后的新笔触）
 * P0修复: 使用 performance.now() 高分辨率时间戳 + 计数器
 * 避免 Date.now() 毫秒精度在快速操作时产生重复ID
 */
let _idCounter = 0
const _sessionId = Math.random().toString(36).slice(2, 8)
function generateStrokeId(): string {
  // P0修复: 高分辨率时间戳 + 会话ID + 自增计数器
  // 保证多帧快速操作时ID绝对唯一
  return `stroke-${_sessionId}-${Math.trunc(performance.now() * 100)}-${(++_idCounter).toString(36)}`
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
    point.pressure >= 0 &&
    point.pressure <= 1
  )
}

/**
 * 验证笔触参数合法性
 */
function validateStroke(stroke: StrokeElement): boolean {
  return stroke != null && Array.isArray(stroke.points) && stroke.points.length >= 2
}

// ============================================
// P1优化: 预分配的临时对象池
// ============================================

/**
 * Intersection 临时对象池
 * 避免在热循环中频繁创建 Intersection 对象
 */
const INTERSECTION_POOL_SIZE = 512 // P0: 2^9，确保位运算安全
const INTERSECTION_POOL_MASK = INTERSECTION_POOL_SIZE - 1
const _intersectionPool: Intersection[] = new Array(INTERSECTION_POOL_SIZE)
let _intersectionPoolIdx = 0

// P0修复: 模块加载时预初始化所有池对象，消除热路径分配
// P0类型修复: 使用类型断言确保 point 是 [number, number] 元组类型
for (let i = 0; i < INTERSECTION_POOL_SIZE; i++) {
  _intersectionPool[i] = {
    t: 0,
    point: [0, 0],
    strength: 0,
  }
}

function acquireIntersection(t: number, x: number, y: number, strength: number): Intersection {
  // P0修复: 消除条件分支，池溢出时循环复用
  const idx = _intersectionPoolIdx++ & INTERSECTION_POOL_MASK
  const obj = _intersectionPool[idx]
  obj.t = t
  obj.point[0] = x
  obj.point[1] = y
  obj.strength = strength
  return obj
}

/**
 * P0优化: 获取池中的 intersections 视图（零拷贝）
 * @returns [池引用, 有效长度] - 调用方只遍历前 length 个元素
 */
function getIntersectionsView(): readonly [Intersection[], number] {
  return [_intersectionPool, Math.min(_intersectionPoolIdx, INTERSECTION_POOL_SIZE)]
}

function resetIntersectionPool(): void {
  _intersectionPoolIdx = 0
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
 * 2. 性能优先：O(log n) 空间索引 + 增量更新 + 对象池复用
 * 3. 向后兼容：双模式切换，不破坏现有功能
 *
 * 性能优化历史：
 * - v1: 基础实现
 * - v2: 空间索引集成
 * - v3: P0 擦除循环缓存 + P1 对象池 + P2 early exit + 批量处理
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
  // P0优化: 缓存的物理计算结果（避免重复计算）
  // ==========================================

  /** 缓存: 上次计算的有效半径 */
  private _cachedRadius: number = -1
  /** 缓存: 上次计算半径时的压力值 */
  private _cachedPressure: number = -1

  /** 缓存: 硬度因子（配置变化时更新） */
  private _hardnessFactor: number = 0
  /** 缓存: 磨损因子（磨损变化时更新） */
  private _wearFactor: number = 1
  /** 缓存: 基础半径 */
  private _baseRadius: number = 12
  /** 缓存: 是否需要更新因子 */
  private _factorsDirty: boolean = true

  // ==========================================
  // P2优化: 预计算的 sin/cos 缓存
  // ==========================================

  /** 缓存: 上次 transformAndDistanceToRect 使用的旋转角 */
  private _cachedRotation: number = NaN
  /** 缓存: 对应的 cos 值 */
  private _cachedCos: number = 1
  /** 缓存: 对应的 sin 值 */
  private _cachedSin: number = 0

  // ==========================================
  // 构造与配置
  // ==========================================

  constructor(config: Partial<EraserConfig> = {}) {
    this.config = Object.freeze({
      ...DEFAULT_ERASER_CONFIG,
      ...config,
    })
    this.audioEngine = new EraserAudioEngine(this.config)
    this._updateCachedFactors()
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
    this._factorsDirty = true
    // 配置变化时清除半径缓存
    this._cachedPressure = -1
  }

  /**
   * 设置基础擦除尺寸（兼容旧API）
   * @param size 基础半径尺寸
   */
  setBaseSize(size: number): void {
    this.baseSize = clamp(size, 1, 100)
    this._factorsDirty = true
    this._cachedPressure = -1
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
   * @param elements 画布所有元素（或已预筛选的候选元素）
   * @param preFiltered 如果为 true，跳过内部空间过滤（调用方已通过空间索引预筛选）
   * @returns 擦除结果（修改的笔触列表）
   */
  addErasePoint(
    point: EraserPoint,
    elements: CanvasElement[],
    preFiltered: boolean = false
  ): EraseResult {
    // 参数校验
    if (!validateErasePoint(point)) {
      console.warn('[PhysicsEraserEngine] Invalid erase point:', point)
      return {
        modifiedStrokes: [],
        affectedElementIds: [],
        trail: this.trail, // P0优化: 不再拷贝 trail，直接返回引用
      }
    }

    if (!Array.isArray(elements)) {
      console.warn('[PhysicsEraserEngine] Invalid elements array')
      return {
        modifiedStrokes: [],
        affectedElementIds: [],
        trail: this.trail, // P0优化: 不再拷贝 trail
      }
    }

    this.trail.push(point)
    this.audioEngine.updateErase(point, this.wearLevel)

    // 1. 更新橡皮磨损
    this.updateWearLevel(point)

    // 2. 计算擦除区域边界（使用缓存半径）
    const effectiveRadius = this.computeEffectiveRadius(point.pressure)
    const eraseBounds: Bounds = {
      x: point.x - effectiveRadius,
      y: point.y - effectiveRadius,
      w: effectiveRadius * 2,
      h: effectiveRadius * 2,
    }

    // 3. 性能优化：标记脏区域
    globalDirtyRectManager.addDirtyRect({
      x: eraseBounds.x,
      y: eraseBounds.y,
      width: eraseBounds.w,
      height: eraseBounds.h,
    })

    // 4. 空间过滤：如果元素已预筛选则直接使用，否则内部过滤
    const candidates = preFiltered ? elements : this.filterCandidateElements(elements, eraseBounds)

    // 5. 预计算擦除强度（P1修复: 只计算一次，避免每笔触重复计算）
    const eraseStrength = this.computeEraseStrength(point)

    // 6. 精确计算每个候选元素的擦除结果
    const { modifiedStrokes, affectedElementIds } = this.computeErasureResults(
      candidates,
      point,
      effectiveRadius,
      eraseStrength
    )

    return {
      modifiedStrokes,
      affectedElementIds,
      trail: this.trail, // P0优化: 不再拷贝 trail
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
    return this.trail // P0优化: 返回直接引用而非拷贝
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
    this._factorsDirty = true
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
    this._factorsDirty = true
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
    this._factorsDirty = true
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
   * P0优化: 更新缓存的物理因子
   * 仅在配置/磨损变化时调用，避免每次半径计算都做乘法
   */
  private _updateCachedFactors(): void {
    if (!this._factorsDirty) return
    this._hardnessFactor = 1 - this.config.hardness * RADIUS_CONSTANTS.HARDNESS_FACTOR
    this._wearFactor = 1 + this.wearLevel * RADIUS_CONSTANTS.WEAR_MAX_INCREASE
    this._baseRadius = this.config.baseRadius ?? this.baseSize
    this._factorsDirty = false
  }

  /**
   * 物理公式: 有效擦除半径
   *
   * 基于真实橡皮物理特性：
   * - 压力越大，橡皮形变越大，接触面积越大
   * - 硬度越高，形变越小，接触面积越小
   * - 磨损越大，橡皮变钝，接触面积越大
   *
   * P0优化: 压力缓存 - 相同压力值直接返回缓存结果
   * P0优化: 因子缓存 - 硬度/磨损因子预计算
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

    // P0优化: 压力缓存命中检查（擦除同一帧内压力通常不变）
    if (clampedPressure === this._cachedPressure && !this._factorsDirty) {
      return this._cachedRadius
    }

    this._updateCachedFactors()

    // 压力影响：非线性，重压快速饱和
    const pressureFactor =
      RADIUS_CONSTANTS.PRESSURE_BASE +
      clampedPressure * RADIUS_CONSTANTS.PRESSURE_MULTIPLIER * this.config.pressureSensitivity

    const result = Math.max(
      RADIUS_CONSTANTS.MIN_RADIUS,
      this._baseRadius * pressureFactor * this._hardnessFactor * this._wearFactor
    )

    // 更新缓存
    this._cachedPressure = clampedPressure
    this._cachedRadius = result

    return result
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
    const tiltWidthMultiplier = 1 + tiltMagnitude * (CHISEL_CONSTANTS.TILT_MAX_WIDTH_MULTIPLIER - 1)

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
    if (tiltMagnitudeDeg < TILT_CONSTANTS.MIN_TILT_THRESHOLD) {
      return { tiltMagnitude: 0, tiltDirection: 0 }
    }

    // 映射到 0-1 范围
    const normalizedMagnitude = clamp(tiltMagnitudeDeg / CHISEL_CONSTANTS.FULL_TILT_ANGLE, 0, 1)

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
   * P0优化: 对于圆形形状，避免函数调用开销，内联计算
   * P2优化: 对于旋转形状，缓存 cos/sin 值
   *
   * @param erasePoint 橡皮擦位置和状态
   * @param x 目标点X
   * @param y 目标点Y
   * @returns 距离（内部为负，外部为正）
   */
  pointToEraserDistance(erasePoint: EraserPoint, x: number, y: number): number {
    const dx = x - erasePoint.x
    const dy = y - erasePoint.y
    const shape = this.config.shape

    if (shape === 'circle') {
      // P0优化: 圆形直接内联计算，避免 switch + 函数调用开销
      return Math.sqrt(dx * dx + dy * dy)
    }

    if (shape === 'square') {
      const halfSize = this.computeEffectiveRadius(erasePoint.pressure)
      return this.transformAndDistanceToRect(dx, dy, this.config.rotation, halfSize, halfSize)
    }

    // chisel
    const dims = this.getChiselDimensions(erasePoint.pressure, erasePoint.tiltX, erasePoint.tiltY)
    const halfW = dims.width / 2
    const halfH = dims.height / 2
    // 结合配置旋转、运动方向和笔倾斜方向
    const totalRotation = dims.rotation + erasePoint.direction * this.config.directionInfluence
    return this.transformAndDistanceToRect(dx, dy, totalRotation, halfW, halfH)
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
      Math.pow(pressure, STRENGTH_CONSTANTS.PRESSURE_EXPONENT) * this.config.pressureSensitivity

    // 速度贡献: 高斯分布，最优速度约 2px/ms
    const velocityDiff = velocity - STRENGTH_CONSTANTS.OPTIMAL_VELOCITY
    const velocityContrib = Math.max(
      STRENGTH_CONSTANTS.MIN_VELOCITY_CONTRIB,
      Math.exp(-Math.pow(velocityDiff, 2) / STRENGTH_CONSTANTS.VELOCITY_VARIANCE)
    )

    // 摩擦系数
    const frictionContrib = this.config.friction

    // 硬度: 硬橡皮擦得干净但费力
    const hardnessContrib =
      STRENGTH_CONSTANTS.HARDNESS_BASE +
      this.config.hardness * STRENGTH_CONSTANTS.HARDNESS_MULTIPLIER

    return clamp(pressureContrib * velocityContrib * frictionContrib * hardnessContrib, 0, 1)
  }

  // ==========================================
  // 笔触分割算法
  // ==========================================

  /**
   * 笔触分割算法
   * 根据相交点将笔触分割为多段
   *
   * P0优化: 原地排序避免数组拷贝
   * P1优化: 预分配 segments 数组
   *
   * @param stroke 原始笔触
   * @param intersections 相交点列表
   * @returns 分割结果
   */
  splitStroke(stroke: StrokeElement, intersections: Intersection[]): SplitStrokeResult {
    if (!validateStroke(stroke) || intersections.length === 0) {
      return { status: 'unchanged' }
    }

    // P0优化: 原地排序，避免 [...intersections] 创建新数组
    // 注意：调用方传入的 intersections 来自对象池，排序安全
    const sorted =
      intersections.length <= 1 ? intersections : intersections.sort((a, b) => a.t - b.t)

    // P1优化: 预分配 segments 数组（最多 intersections.length + 1 个段）
    const segments: StrokeElement[] = []
    const points = stroke.points
    const opacity = stroke.opacity ?? 1

    let lastT = 0
    for (let i = 0; i < sorted.length; i++) {
      const inter = sorted[i]
      if (inter.t - lastT > SPLIT_CONSTANTS.MIN_SEGMENT_THRESHOLD) {
        const segmentPoints = this.extractSegment(points, lastT, inter.t)
        if (segmentPoints.length >= 2) {
          segments.push({
            ...stroke,
            id: generateStrokeId(),
            points: segmentPoints,
            opacity: Math.max(
              SPLIT_CONSTANTS.MIN_OPACITY,
              opacity * (1 - inter.strength * SPLIT_CONSTANTS.OPACITY_STRENGTH_FACTOR)
            ),
          })
        }
      }
      lastT = inter.t
    }

    // 提取最后一段
    if (1 - lastT > SPLIT_CONSTANTS.MIN_SEGMENT_THRESHOLD) {
      const segmentPoints = this.extractSegment(points, lastT, 1)
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
   * P1修复: 只在磨损实际变化时标记缓存脏，避免缓存永不命中
   * P1优化: 先判断距离平方，避免不必要的 sqrt 开销
   */
  private updateWearLevel(point: EraserPoint): void {
    if (this.trail.length < 2) return

    const prevPoint = this.trail[this.trail.length - 2]
    // P1优化: 先计算距离平方做快速拒绝，避免不必要的 sqrt 开销
    const dx = point.x - prevPoint.x
    const dy = point.y - prevPoint.y
    const distSq = dx * dx + dy * dy

    // 距离平方小于阈值，直接返回（避免 sqrt）
    if (distSq < 0.000001) return

    const dist = Math.sqrt(distSq)

    // 压力越大磨损越快
    const pressureFactor =
      WEAR_CONSTANTS.PRESSURE_BASE + point.pressure * WEAR_CONSTANTS.PRESSURE_MULTIPLIER

    // 硬度越高磨损越慢
    const hardnessFactor = 1 - this.config.hardness * WEAR_CONSTANTS.HARDNESS_FACTOR

    // 计算磨损增量
    const wearIncrement =
      dist * pressureFactor * hardnessFactor * this.config.wearRate * WEAR_CONSTANTS.RATE_SCALE

    const newWearLevel = Math.min(WEAR_CONSTANTS.MAX_WEAR, this.wearLevel + wearIncrement)

    // P1修复: 只在磨损实际变化时标记缓存脏
    // 避免每帧都标记 dirty 导致半径缓存永不命中
    if (Math.abs(newWearLevel - this.wearLevel) > 0.0001) {
      this.wearLevel = newWearLevel
      this._factorsDirty = true
    }
  }

  /**
   * 空间过滤：快速筛选候选元素
   * P1优化: 使用 for 循环替代 .filter()，避免闭包和临时数组
   */
  private filterCandidateElements(elements: CanvasElement[], eraseBounds: Bounds): CanvasElement[] {
    const result: CanvasElement[] = []
    const ax = eraseBounds.x
    const ay = eraseBounds.y
    const aw = eraseBounds.w
    const ah = eraseBounds.h
    const axw = ax + aw
    const ayh = ay + ah

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]
      try {
        const b = elementBounds(el)
        // P1优化: 内联 AABB 相交检测，避免函数调用
        if (ax < b.x + b.w && axw > b.x && ay < b.y + b.h && ayh > b.y) {
          result.push(el)
        }
      } catch {
        // 跳过无效元素
      }
    }
    return result
  }

  /**
   * 计算所有候选元素的擦除结果
   * 优化点:
   * - 接受预计算的 effectiveRadius，避免重复计算
   * - 接受预计算的 eraseStrength，避免每笔触重复计算
   * - 使用 for 循环替代 for-of
   */
  private computeErasureResults(
    candidates: CanvasElement[],
    point: EraserPoint,
    effectiveRadius: number,
    eraseStrength: number
  ): Pick<EraseResult, 'modifiedStrokes' | 'affectedElementIds'> {
    const modifiedStrokes: EraseResult['modifiedStrokes'] = []
    const affectedElementIds: string[] = []

    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i]
      try {
        if (el.type === 'stroke') {
          const result = this.processStrokeElement(
            el as StrokeElement,
            point,
            effectiveRadius,
            eraseStrength
          )
          if (result) {
            modifiedStrokes.push(result)
            affectedElementIds.push(el.id)
          }
        } else {
          const shouldDelete = this.checkNonStrokeElement(el, point, effectiveRadius)
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
   * P0修复: 未修改时返回 null，避免产生不必要的脏标记
   */
  private processStrokeElement(
    stroke: StrokeElement,
    point: EraserPoint,
    effectiveRadius: number,
    eraseStrength: number
  ): EraseResult['modifiedStrokes'][0] | null {
    const erasure = this.computeStrokeErasure(stroke, point, effectiveRadius, eraseStrength)

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
    }

    // P0修复: 未修改则返回 null，调用方会过滤
    return null
  }

  /**
   * 检测非笔触元素（矩形、圆形等）是否被擦除
   * 使用简单的边界碰撞检测
   * P0优化: 接受预计算的 effectiveRadius
   */
  private checkNonStrokeElement(
    el: CanvasElement,
    point: EraserPoint,
    effectiveRadius: number
  ): boolean {
    try {
      const b = elementBounds(el)
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
   *
   * P0优化:
   * - effectiveRadius 从外部传入，避免重复计算
   * - eraseStrength 预计算
   * - findIntersectionT + pointToEraserDistance 内联优化
   *
   * P2优化:
   * - Early exit: 快速跳过明显不在擦除范围的笔触
   * - 使用对象池复用 Intersection 对象
   */
  private computeStrokeErasure(
    stroke: StrokeElement,
    erasePoint: EraserPoint,
    effectiveRadius: number,
    eraseStrength: number
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

    const points = stroke.points
    const pointsLen = points.length
    const halfStrokeSize = stroke.size / 2
    const effectiveDistThreshold = effectiveRadius + halfStrokeSize
    const depthThreshold = effectiveRadius * ERASE_THRESHOLDS.DEPTH_FACTOR

    // 重置对象池
    resetIntersectionPool()

    // P0修复: 使用已缓存的 elementBounds 做 Early exit
    // 避免手动 AABB 采样导致的漏检问题
    const strokeBounds = elementBounds(stroke)
    const eraseLeft = erasePoint.x - effectiveRadius
    const eraseRight = erasePoint.x + effectiveRadius
    const eraseTop = erasePoint.y - effectiveRadius
    const eraseBottom = erasePoint.y + effectiveRadius

    // 快速拒绝: 擦除区域与笔触边界不相交
    if (
      strokeBounds.x + strokeBounds.w < eraseLeft ||
      strokeBounds.x > eraseRight ||
      strokeBounds.y + strokeBounds.h < eraseTop ||
      strokeBounds.y > eraseBottom
    ) {
      return {
        strokeId: stroke.id,
        intersections: [],
        eraseStrength: 0,
        shouldDelete: false,
        shouldSplit: false,
        opacityDelta: 0,
      }
    }

    // 检测笔触每一段与擦除区域的相交
    // P0优化: 缓存擦除点坐标，避免重复属性访问
    const eraseX = erasePoint.x
    const eraseY = erasePoint.y

    for (let i = 1; i < pointsLen; i++) {
      const p1 = points[i - 1]
      const p2 = points[i]
      const p1x = p1[0]
      const p1y = p1[1]
      const p2x = p2[0]
      const p2y = p2[1]

      // P0优化: 内联 findIntersectionT，减少函数调用开销
      const segDx = p2x - p1x
      const segDy = p2y - p1y
      const lenSq = segDx * segDx + segDy * segDy

      let t: number
      if (lenSq === 0) {
        t = 0.5
      } else {
        t = clamp(((eraseX - p1x) * segDx + (eraseY - p1y) * segDy) / lenSq, 0, 1)
      }

      const closestX = p1x + segDx * t
      const closestY = p1y + segDy * t

      // P0优化: 对圆形内联距离计算，避免函数调用
      let dist: number
      const shape = this.config.shape
      if (shape === 'circle') {
        const cdx = closestX - eraseX
        const cdy = closestY - eraseY
        dist = Math.sqrt(cdx * cdx + cdy * cdy)
      } else {
        dist = this.pointToEraserDistance(erasePoint, closestX, closestY)
      }

      // 有效距离阈值（考虑笔触粗细）
      const effectiveDist = dist - halfStrokeSize

      if (effectiveDist < 0) {
        // 在橡皮擦内部：强度根据深度计算
        const depthFactor = Math.min(1, -effectiveDist / depthThreshold)
        const strength = clamp(depthFactor * eraseStrength, 0, 1)

        // P1优化: 使用对象池
        acquireIntersection((i - 1 + t) / pointsLen, closestX, closestY, strength)
      } else if (dist < effectiveDistThreshold) {
        // 在边缘区域：渐变衰减
        const strength = clamp((1 - effectiveDist / effectiveRadius) * eraseStrength, 0, 1)

        // P1优化: 使用对象池
        acquireIntersection((i - 1 + t) / pointsLen, closestX, closestY, strength)
      }
    }

    // P0优化: 获取池视图（真正零拷贝，无 slice 无数组创建）
    const [pool, intersectionCount] = getIntersectionsView()

    // P0优化: 单循环同时计算 maxStrength，避免两次遍历
    let maxStrength = 0
    // P0性能优化: 直接使用池引用，完全零拷贝
    // 注意: 调用方必须在当前帧处理完前 intersectionCount 个元素，下一次擦除会重置池
    const resultIntersections = pool

    if (intersectionCount > 0) {
      for (let i = 0; i < intersectionCount; i++) {
        const s = resultIntersections[i].strength
        if (s > maxStrength) maxStrength = s
      }
    }

    const deleteThreshold = pointsLen * ERASE_THRESHOLDS.DELETE_COVERAGE_RATIO

    return {
      strokeId: stroke.id,
      // P0修复: 使用 slice 创建实际大小的数组，避免传递整个 512 元素池
      // 修复对象池排序污染问题 + 过期数据问题
      intersections: resultIntersections.slice(0, intersectionCount),
      eraseStrength: maxStrength,
      // 删除条件：强度足够且覆盖足够比例
      shouldDelete:
        maxStrength > ERASE_THRESHOLDS.DELETE_STRENGTH && intersectionCount >= deleteThreshold,
      // 分割条件：有相交且强度足够
      shouldSplit: intersectionCount > 0 && maxStrength > ERASE_THRESHOLDS.SPLIT_STRENGTH,
      opacityDelta: maxStrength * ERASE_THRESHOLDS.OPACITY_DELTA_FACTOR,
    }
  }

  /**
   * 坐标变换并计算到矩形的距离
   * P2优化: 缓存 cos/sin 计算结果
   */
  private transformAndDistanceToRect(
    dx: number,
    dy: number,
    rotation: number,
    halfW: number,
    halfH: number
  ): number {
    // P2优化: 缓存 cos/sin，相同旋转角不重复计算
    if (rotation !== this._cachedRotation) {
      this._cachedRotation = rotation
      this._cachedCos = Math.cos(-rotation)
      this._cachedSin = Math.sin(-rotation)
    }
    const localX = dx * this._cachedCos - dy * this._cachedSin
    const localY = dx * this._cachedSin + dy * this._cachedCos
    return this.pointToRectDistance(localX, localY, halfW, halfH)
  }

  /**
   * 计算点到轴对齐矩形的距离
   * 点在矩形内返回负数（表示深度），在外部返回正数
   */
  private pointToRectDistance(px: number, py: number, halfW: number, halfH: number): number {
    const absPx = px < 0 ? -px : px
    const absPy = py < 0 ? -py : py
    const dx = absPx > halfW ? absPx - halfW : 0
    const dy = absPy > halfH ? absPy - halfH : 0

    // 在矩形内部时返回负距离（用于强度计算）
    if (dx === 0 && dy === 0) {
      // 内部：计算到最近边缘的距离（负值表示深度）
      const distToEdge = halfW - absPx < halfH - absPy ? halfW - absPx : halfH - absPy
      return -distToEdge
    }

    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 提取笔触的子段
   * P1性能优化: 直接计算索引，避免额外函数调用和临时变量
   * @param points 原始点数组
   * @param startT 起始参数化位置 0-1
   * @param endT 结束参数化位置 0-1
   */
  private extractSegment(points: number[][], startT: number, endT: number): number[][] {
    const len = points.length
    return points.slice(
      (startT * len) | 0,
      Math.min(((endT * len + 0.999999) | 0) + 1, len)
    )
  }
}
