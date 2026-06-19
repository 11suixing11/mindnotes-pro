/**
 * 物理擦除引擎模块
 * 
 * 实现压力感应、方向纹理、像素级擦除、分层处理
 * 
 * 使用示例:
 * ```typescript
 * import { PhysicsEraserEngine, useEraserStore } from './eraser'
 * 
 * // 核心引擎
 * const engine = new PhysicsEraserEngine()
 * engine.startErase(point)
 * const result = engine.addErasePoint(point, elements)
 * engine.endErase()
 * 
 * // Zustand集成
 * const { startErase, addErasePoint, endErase } = useEraserStore()
 * ```
 */

// 类型定义
export type {
  EraserMode,
  EraserShape,
  EraserPresetType,
  EraserConfig,
  EraserPoint,
  Bounds,
  StrokeErasure,
  Intersection,
  EraseResult,
  BoundsEntry,
} from './types'

export {
  DEFAULT_ERASER_CONFIG,
  ERASER_2B_CONFIG,
  ERASER_4B_CONFIG,
  ERASER_6B_CONFIG,
  ERASER_PRESET_CONFIGS,
  ERASER_PRESET_LABELS,
  ERASER_PRESET_DESCRIPTIONS,
} from './types'

// 键盘快捷键
export { useEraserKeyboardShortcuts, ERASER_SHORTCUTS_INFO } from './useEraserKeyboardShortcuts'

// 核心引擎
export { PhysicsEraserEngine } from './PhysicsEraserEngine'

// 音效引擎
export { EraserAudioEngine } from './EraserAudioEngine'

// 空间索引与性能监控
export { SpatialIndex, PerformanceMonitor } from './SpatialIndex'

// 渲染
export { drawEraserTrail, drawSimpleEraserCursor } from './eraserRendering'

// Zustand Store
export { useEraserStore, eraserEngine, eraserSpatialIndex, eraserPerformanceMonitor } from './eraserStore'
