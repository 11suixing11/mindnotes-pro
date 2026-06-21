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
  EraserParticle,
  ParticleSystemConfig,
  ParticleEmitParams,
} from './types'

// 常量与配置
export {
  DEFAULT_ERASER_CONFIG,
  ERASER_2B_CONFIG,
  ERASER_4B_CONFIG,
  ERASER_6B_CONFIG,
  ERASER_PRESET_CONFIGS,
  ERASER_PRESET_LABELS,
  ERASER_PRESET_DESCRIPTIONS,
  DEFAULT_PARTICLE_CONFIG,
  PARTICLE_COLORS,
} from './types'

// 性能优化工具
export {
  DirtyRectManager,
  ObjectPool,
  BatchRenderer,
  ResourceCleanupManager,
  pointPool,
  rectPool,
  globalDirtyRectManager,
  globalBatchRenderer,
  globalResourceCleanup,
  withClipping,
  unionRect,
  rectsIntersect,
} from './performanceOptimizer'

// 键盘快捷键
export { useEraserKeyboardShortcuts, getShortcutsInfo } from './useEraserKeyboardShortcuts'

// 用户偏好持久化
export {
  loadEraserPreferences,
  saveEraserPreferences,
  getEraserConfigFromPreferences,
  clearEraserPreferences,
} from './userPreferences'
export type { EraserUserPreferences } from './userPreferences'

// 核心引擎
export { PhysicsEraserEngine } from './PhysicsEraserEngine'

// 音效引擎
export { EraserAudioEngine } from './EraserAudioEngine'

// 空间索引与性能监控
export { SpatialIndex, PerformanceMonitor } from './SpatialIndex'
export type { RebuildStats } from './SpatialIndex'

// 渲染工具
export { drawEraserTrail, drawSimpleEraserCursor } from './eraserRendering'

// 粒子系统
export { EraserParticleSystem, getParticleSystem } from './EraserParticleSystem'

// Zustand状态管理与单例实例
export {
  useEraserStore,
  eraserEngine,
  eraserSpatialIndex,
  eraserPerformanceMonitor,
  eraserParticleSystem,
} from './eraserStore'
