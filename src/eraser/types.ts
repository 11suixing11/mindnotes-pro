// 物理擦除引擎类型定义

export type EraserMode = 'simple' | 'physics'
export type EraserShape = 'circle' | 'square' | 'chisel'

// 橡皮擦预设类型 - 参考美术铅笔分级
export type EraserPresetType = '2b' | '4b' | '6b'

export interface EraserConfig {
  // 物理参数
  hardness: number        // 橡皮硬度 0-1 (0=软, 1=硬)
  friction: number        // 摩擦系数 0-1
  wearRate: number        // 磨损速率 0-1
  shape: EraserShape
  rotation: number        // 橡皮旋转角度 (凿形有效)
  baseRadius: number      // 基础擦除半径
  
  // 行为参数
  pressureSensitivity: number  // 压感灵敏度 0-1
  directionInfluence: number   // 方向影响 0-1
  overlapMode: 'topmost' | 'all' | 'layered'
  
  // 音效
  audioEnabled: boolean  // 音效开关
}

export interface EraserPoint {
  x: number
  y: number
  pressure: number      // 0-1 压力
  velocity: number      // 移动速度 px/ms
  direction: number     // 运动方向弧度
  timestamp: number
  tiltX?: number        // 笔倾斜X角度 -90~90度 (Apple Pencil)
  tiltY?: number        // 笔倾斜Y角度 -90~90度 (Apple Pencil)
}

export interface Bounds {
  x: number
  y: number
  w: number
  h: number
}

export interface StrokeErasure {
  strokeId: string
  intersections: Intersection[]
  eraseStrength: number
  shouldDelete: boolean
  shouldSplit: boolean
  opacityDelta: number
}

export interface Intersection {
  t: number              // 沿笔触的参数化位置 0-1
  point: [number, number]
  strength: number       // 擦除强度 0-1
}

export interface EraseResult {
  modifiedStrokes: {
    id: string
    action: 'keep' | 'split' | 'delete'
    segments?: any[]      // 分割后的新笔触
  }[]
  affectedElementIds: string[]
  trail: EraserPoint[]
}

export interface BoundsEntry {
  minX: number
  minY: number
  maxX: number
  maxY: number
  id: string
}

// ==================== 橡皮屑粒子系统类型 ====================

export interface EraserParticle {
  id: string
  x: number              // 当前位置X
  y: number              // 当前位置Y
  vx: number             // 速度X
  vy: number             // 速度Y
  size: number           // 粒子大小
  rotation: number       // 旋转角度
  rotationSpeed: number  // 旋转速度
  color: string          // 粒子颜色
  opacity: number        // 透明度
  life: number           // 剩余生命值 0-1
  maxLife: number        // 最大生命值
  mass: number           // 质量（影响重力）
}

export interface ParticleSystemConfig {
  enabled: boolean              // 粒子系统开关
  maxParticles: number          // 最大粒子数量
  particlesPerErase: number     // 每次擦除产生的粒子数
  baseSize: number              // 基础粒子大小
  sizeVariance: number          // 大小随机变化范围
  speedMin: number              // 最小初速度
  speedMax: number              // 最大初速度
  gravity: number               // 重力加速度
  friction: number              // 空气阻力
  lifeMin: number               // 最小生命周期（秒）
  lifeMax: number               // 最大生命周期（秒）
  fadeOutStart: number          // 开始淡出的生命比例
  rotationSpeedMax: number      // 最大旋转速度
}

export interface ParticleEmitParams {
  x: number              // 发射中心X
  y: number              // 发射中心Y
  direction: number      // 擦除方向（弧度）
  pressure: number       // 擦除压力 0-1
  velocity: number       // 擦除速度
  count: number          // 发射粒子数量
  spread: number         // 扩散角度（弧度）
}

// 默认粒子系统配置
export const DEFAULT_PARTICLE_CONFIG: ParticleSystemConfig = {
  enabled: true,
  maxParticles: 200,
  particlesPerErase: 3,
  baseSize: 3,
  sizeVariance: 2,
  speedMin: 20,
  speedMax: 80,
  gravity: 150,
  friction: 0.98,
  lifeMin: 0.8,
  lifeMax: 2.5,
  fadeOutStart: 0.6,
  rotationSpeedMax: 5,
}

// 橡皮屑颜色调色板（Monet风格）
export const PARTICLE_COLORS = [
  '#E8DFD8',  // 浅米色
  '#D4C4B5',  // 米色
  '#C9B8A8',  // 深米色
  '#F5EFEA',  // 极浅米
  '#E0D5CD',  // 灰米色
]

/**
 * 2B 硬橡皮预设
 * - 高硬度：擦得干净，边缘锐利
 * - 低磨损：耐用，不需要经常削
 * - 小半径：适合精确擦除
 * - 用途：细节修改、线条修整
 */
export const ERASER_2B_CONFIG: EraserConfig = {
  hardness: 0.85,
  friction: 0.5,
  wearRate: 0.2,
  shape: 'circle',
  rotation: 0,
  baseRadius: 8,
  pressureSensitivity: 0.6,
  directionInfluence: 0.2,
  overlapMode: 'layered',
  audioEnabled: true,
}

/**
 * 4B 中性橡皮预设（默认推荐）
 * - 中等硬度：平衡型
 * - 中等磨损：正常使用
 * - 标准半径：通用场景
 * - 用途：日常擦除、大部分场景
 */
export const ERASER_4B_CONFIG: EraserConfig = {
  hardness: 0.5,
  friction: 0.7,
  wearRate: 0.5,
  shape: 'circle',
  rotation: 0,
  baseRadius: 12,
  pressureSensitivity: 0.8,
  directionInfluence: 0.3,
  overlapMode: 'layered',
  audioEnabled: true,
}

/**
 * 6B 软橡皮预设
 * - 低硬度：擦得柔和，过渡自然
 * - 高磨损：消耗快，需要经常削
 * - 大半径：适合大面积擦除
 * - 用途：大面积修改、淡化、晕染效果
 */
export const ERASER_6B_CONFIG: EraserConfig = {
  hardness: 0.2,
  friction: 0.9,
  wearRate: 0.8,
  shape: 'circle',
  rotation: 0,
  baseRadius: 18,
  pressureSensitivity: 1.0,
  directionInfluence: 0.5,
  overlapMode: 'layered',
  audioEnabled: true,
}

// 默认配置 = 4B
export const DEFAULT_ERASER_CONFIG: EraserConfig = {
  ...ERASER_4B_CONFIG,
}

// 预设配置映射
export const ERASER_PRESET_CONFIGS: Record<EraserPresetType, EraserConfig> = {
  '2b': ERASER_2B_CONFIG,
  '4b': ERASER_4B_CONFIG,
  '6b': ERASER_6B_CONFIG,
}

// 预设显示名称
export const ERASER_PRESET_LABELS: Record<EraserPresetType, string> = {
  '2b': '2B 硬橡皮',
  '4b': '4B 中性',
  '6b': '6B 软橡皮',
}

// 预设描述
export const ERASER_PRESET_DESCRIPTIONS: Record<EraserPresetType, string> = {
  '2b': '精确擦除',
  '4b': '日常通用',
  '6b': '大面积',
}
