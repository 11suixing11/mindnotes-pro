// 物理擦除引擎类型定义
import type { StrokeElement } from '../store/types'

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
    segments?: StrokeElement[]      // 分割后的新笔触
  }[]
  affectedElementIds: string[]
  trail: EraserPoint[]
}

/**
 * 笔触分割结果（判别联合类型）
 *
 * 消除原来空数组的语义歧义：
 * - 'split': 成功分割，segments 非空
 * - 'deleted': 所有子段被过滤（整笔被擦除），调用方应删除原笔触
 * - 'unchanged': 输入无效或无交点，调用方应保留原笔触
 */
export type SplitStrokeResult =
  | { status: 'split'; segments: StrokeElement[] }
  | { status: 'deleted' }
  | { status: 'unchanged' }

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

// 橡皮擦品牌皮肤类型
export type EraserBrandType = 'default' | 'sakura' | 'faber-castell' | 'staedtler' | 'uni'

// 橡皮擦品牌皮肤配置
export interface EraserBrandConfig {
  // 品牌信息
  name: string
  displayName: string
  description: string
  
  // 视觉外观
  primaryColor: string      // 主体颜色
  secondaryColor: string    // 辅助颜色
  borderColor: string       // 边框颜色
  cursorColor: string       // 光标颜色
  particleColors: string[]  // 橡皮屑颜色
  
  // 物理特性（叠加到预设上）
  hardnessModifier: number   // 硬度修正系数
  wearRateModifier: number   // 磨损速率修正系数
  frictionModifier: number   // 摩擦修正系数
  
  // 音效特性
  audioFrequencyBase: number // 基础频率
  audioWaveform: OscillatorType // 波形类型
  
  // 品牌风格
  texture: 'smooth' | 'matte' | 'glossy'
}

/**
 * 默认橡皮擦（经典白色）
 * - 中性风格，无品牌属性
 * - 标准参数
 */
export const ERASER_BRAND_DEFAULT: EraserBrandConfig = {
  name: 'default',
  displayName: '经典',
  description: '标准白色橡皮',
  primaryColor: '#FFFFFF',
  secondaryColor: '#F5F5F5',
  borderColor: '#E0E0E0',
  cursorColor: 'rgba(255, 255, 255, 0.7)',
  particleColors: PARTICLE_COLORS,
  hardnessModifier: 1.0,
  wearRateModifier: 1.0,
  frictionModifier: 1.0,
  audioFrequencyBase: 400,
  audioWaveform: 'sine',
  texture: 'smooth',
}

/**
 * 樱花 (Sakura) - 日本文具品牌
 * - 标志性粉色
 * - 高品质、顺滑
 * - 日本市场认知度极高
 */
export const ERASER_BRAND_SAKURA: EraserBrandConfig = {
  name: 'sakura',
  displayName: '樱花',
  description: 'Sakura 日本品质',
  primaryColor: '#FFB7C5',  // 樱花粉
  secondaryColor: '#FFD1DC',
  borderColor: '#FF91A4',
  cursorColor: 'rgba(255, 183, 197, 0.7)',
  particleColors: ['#FFE4E9', '#FFD1DC', '#FFB7C5', '#FFC0CB', '#FFEBEE'],
  hardnessModifier: 0.95,    // 樱花橡皮偏软一点
  wearRateModifier: 0.9,     // 更耐用
  frictionModifier: 0.95,    // 更顺滑
  audioFrequencyBase: 450,   // 更高音调
  audioWaveform: 'sine',
  texture: 'matte',
}

/**
 * 辉柏嘉 (Faber-Castell) - 德国文具品牌
 * - 标志性蓝色
 * - 专业级品质
 * - 全球知名美术品牌
 */
export const ERASER_BRAND_FABER_CASTELL: EraserBrandConfig = {
  name: 'faber-castell',
  displayName: '辉柏嘉',
  description: 'Faber-Castell 德国品质',
  primaryColor: '#1E88E5',  // 辉柏嘉蓝
  secondaryColor: '#64B5F6',
  borderColor: '#1565C0',
  cursorColor: 'rgba(30, 136, 229, 0.7)',
  particleColors: ['#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5', '#E3F2FD'],
  hardnessModifier: 1.1,     // 偏硬
  wearRateModifier: 0.85,    // 非常耐用
  frictionModifier: 1.05,    // 摩擦力略大
  audioFrequencyBase: 350,   // 更低沉
  audioWaveform: 'triangle',
  texture: 'glossy',
}

/**
 * 施德楼 (Staedtler) - 德国文具品牌
 * - 标志性黄色
 * - 专业绘图
 * - 工程/设计领域首选
 */
export const ERASER_BRAND_STAEDTLER: EraserBrandConfig = {
  name: 'staedtler',
  displayName: '施德楼',
  description: 'Staedtler 德国专业',
  primaryColor: '#FFC107',  // 施德楼黄
  secondaryColor: '#FFD54F',
  borderColor: '#FF8F00',
  cursorColor: 'rgba(255, 193, 7, 0.7)',
  particleColors: ['#FFF8E1', '#FFECB3', '#FFE082', '#FFD54F', '#FFF3E0'],
  hardnessModifier: 1.05,    // 适中偏硬
  wearRateModifier: 0.95,    // 耐用
  frictionModifier: 1.0,     // 标准
  audioFrequencyBase: 380,
  audioWaveform: 'square',
  texture: 'matte',
}

/**
 * 三菱 (Uni) - 日本文具品牌
 * - 标志性绿色
 * - 高品质美术橡皮
 * - 专业画师首选
 */
export const ERASER_BRAND_UNI: EraserBrandConfig = {
  name: 'uni',
  displayName: '三菱',
  description: 'Uni 日本专业',
  primaryColor: '#4CAF50',  // 三菱绿
  secondaryColor: '#81C784',
  borderColor: '#2E7D32',
  cursorColor: 'rgba(76, 175, 80, 0.7)',
  particleColors: ['#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784', '#E0F2F1'],
  hardnessModifier: 0.9,     // 偏软
  wearRateModifier: 1.1,     // 磨损略快
  frictionModifier: 0.9,     // 非常顺滑
  audioFrequencyBase: 420,
  audioWaveform: 'sine',
  texture: 'smooth',
}

// 品牌配置映射
export const ERASER_BRAND_CONFIGS: Record<EraserBrandType, EraserBrandConfig> = {
  'default': ERASER_BRAND_DEFAULT,
  'sakura': ERASER_BRAND_SAKURA,
  'faber-castell': ERASER_BRAND_FABER_CASTELL,
  'staedtler': ERASER_BRAND_STAEDTLER,
  'uni': ERASER_BRAND_UNI,
}

// 品牌显示名称
export const ERASER_BRAND_LABELS: Record<EraserBrandType, string> = {
  'default': '经典',
  'sakura': '樱花',
  'faber-castell': '辉柏嘉',
  'staedtler': '施德楼',
  'uni': '三菱',
}

// 品牌图标（emoji）
export const ERASER_BRAND_ICONS: Record<EraserBrandType, string> = {
  'default': '⚪',
  'sakura': '🌸',
  'faber-castell': '🔵',
  'staedtler': '🟡',
  'uni': '🟢',
}

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
  '6b': '大面积柔和擦除',
}

// ==================== 快捷键配置类型 ====================
export interface ShortcutConfig {
  key: string           // 快捷键按键
  enabled: boolean      // 是否启用
  description: string   // 功能描述
  category: 'shape' | 'preset' | 'action' | 'size'  // 分类
}

export interface ShortcutMap {
  // 形状切换
  shapeCircle: ShortcutConfig
  shapeSquare: ShortcutConfig
  shapeChisel: ShortcutConfig
  
  // 预设切换
  preset2b: ShortcutConfig
  preset4b: ShortcutConfig
  preset6b: ShortcutConfig
  
  // 操作
  resetWear: ShortcutConfig
  toggleAudio: ShortcutConfig
  undoWear: ShortcutConfig
  redoWear: ShortcutConfig
  
  // 大小调整
  sizeIncrease: ShortcutConfig
  sizeDecrease: ShortcutConfig
}

// 默认快捷键配置
export const DEFAULT_SHORTCUTS: ShortcutMap = {
  // 形状切换
  shapeCircle: { key: '1', enabled: true, description: '圆形橡皮擦', category: 'shape' },
  shapeSquare: { key: '2', enabled: true, description: '方形橡皮擦', category: 'shape' },
  shapeChisel: { key: '3', enabled: true, description: '凿形橡皮擦', category: 'shape' },
  
  // 预设切换
  preset2b: { key: 'q', enabled: true, description: '2B硬橡皮', category: 'preset' },
  preset4b: { key: 'w', enabled: true, description: '4B中性', category: 'preset' },
  preset6b: { key: 'e', enabled: true, description: '6B软橡皮', category: 'preset' },
  
  // 操作
  resetWear: { key: 'r', enabled: true, description: '削橡皮（重置磨损）', category: 'action' },
  toggleAudio: { key: 'm', enabled: true, description: '开关音效', category: 'action' },
  undoWear: { key: 'z', enabled: true, description: '撤销磨损', category: 'action' },
  redoWear: { key: 'y', enabled: true, description: '重做磨损', category: 'action' },
  
  // 大小调整
  sizeIncrease: { key: ']', enabled: true, description: '增大橡皮擦', category: 'size' },
  sizeDecrease: { key: '[', enabled: true, description: '减小橡皮擦', category: 'size' },
}

// 快捷键分类标签
export const SHORTCUT_CATEGORY_LABELS: Record<ShortcutConfig['category'], string> = {
  shape: '形状切换',
  preset: '预设切换',
  action: '操作',
  size: '大小调整',
}
