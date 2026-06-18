// 物理擦除引擎类型定义

export type EraserMode = 'simple' | 'physics'

export type EraserShape = 'circle' | 'square' | 'chisel'

export interface EraserConfig {
  // 物理参数
  hardness: number        // 橡皮硬度 0-1 (0=软, 1=硬)
  friction: number        // 摩擦系数 0-1
  wearRate: number        // 磨损速率 0-1
  shape: EraserShape
  rotation: number        // 橡皮旋转角度 (凿形有效)
  
  // 行为参数
  pressureSensitivity: number  // 压感灵敏度 0-1
  directionInfluence: number   // 方向影响 0-1
  overlapMode: 'topmost' | 'all' | 'layered'
}

export interface EraserPoint {
  x: number
  y: number
  pressure: number      // 0-1 压力
  velocity: number      // 移动速度 px/ms
  direction: number     // 运动方向弧度
  timestamp: number
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

// 默认配置
export const DEFAULT_ERASER_CONFIG: EraserConfig = {
  hardness: 0.5,
  friction: 0.7,
  wearRate: 0.0,
  shape: 'circle',
  rotation: 0,
  pressureSensitivity: 0.8,
  directionInfluence: 0.3,
  overlapMode: 'layered',
}

// 硬橡皮配置 - 擦得干净
export const HARD_ERASER_CONFIG: EraserConfig = {
  ...DEFAULT_ERASER_CONFIG,
  hardness: 0.9,
  friction: 0.5,
  pressureSensitivity: 0.5,
}

// 软橡皮配置 - 擦得淡
export const SOFT_ERASER_CONFIG: EraserConfig = {
  ...DEFAULT_ERASER_CONFIG,
  hardness: 0.2,
  friction: 0.9,
  pressureSensitivity: 1.0,
}
