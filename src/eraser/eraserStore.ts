import { create } from 'zustand'
import type {
  EraserMode,
  EraserConfig,
  EraserPoint,
  EraseResult,
  EraserPresetType,
  EraserBrandType,
  EraserBrandConfig,
  ShortcutMap,
} from './types'
import type { EraserUserPreferences } from './userPreferences'
import { ERASER_PRESET_CONFIGS, ERASER_BRAND_CONFIGS, DEFAULT_SHORTCUTS } from './types'
import { PhysicsEraserEngine } from './PhysicsEraserEngine'
import { SpatialIndex, PerformanceMonitor } from './SpatialIndex'
import type { EraserParticleSystem } from './EraserParticleSystem'
import { getParticleSystem } from './EraserParticleSystem'
import type { CanvasElement } from '../store/types'
import {
  loadEraserPreferences,
  saveEraserPreferences,
  getEraserConfigFromPreferences,
  getMergedShortcuts,
} from './userPreferences'

interface EraserState {
  // 模式配置
  eraserMode: EraserMode
  eraserConfig: EraserConfig
  eraserPreset: EraserPresetType
  eraserBrand: EraserBrandType
  eraserBrandConfig: EraserBrandConfig

  // 快捷键配置
  shortcuts: ShortcutMap

  // 运行时状态
  isErasing: boolean
  currentTrail: EraserPoint[]

  // 引擎实例
  engine: PhysicsEraserEngine
  spatialIndex: SpatialIndex
  performanceMonitor: PerformanceMonitor
  particleSystem: EraserParticleSystem

  // 粒子系统
  particlesEnabled: boolean

  // 统计
  lastEraseTime: number
  elementsErased: number
}

interface EraserActions {
  // 模式切换
  setEraserMode: (mode: EraserMode) => void
  setEraserPreset: (preset: EraserPresetType) => void
  setEraserBrand: (brand: EraserBrandType) => void
  updateEraserConfig: (config: Partial<EraserConfig>) => void

  // 快捷键
  setShortcut: (
    shortcutKey: keyof ShortcutMap,
    config: Partial<ShortcutMap[keyof ShortcutMap]>
  ) => void
  resetShortcutsToDefault: () => void

  // 擦除流程
  startErase: (point: EraserPoint, elements: CanvasElement[]) => void
  addErasePoint: (point: EraserPoint, elements: CanvasElement[]) => EraseResult | null
  endErase: () => void

  // 空间索引
  rebuildSpatialIndex: (elements: CanvasElement[]) => void
  setElementsProvider: (provider: () => CanvasElement[]) => void

  // 性能
  shouldUsePhysics: () => boolean
  getPerformanceLevel: () => 'high' | 'medium' | 'low'

  // 磨损
  getWearLevel: () => number
  resetWear: () => void

  // 磨损历史记录（撤销/重做）
  undoWear: () => boolean
  redoWear: () => boolean
  canUndoWear: () => boolean
  canRedoWear: () => boolean
  getWearHistoryStats: () => { historyCount: number; redoCount: number; maxHistory: number }

  // 粒子系统
  setParticlesEnabled: (enabled: boolean) => void
  emitParticles: (point: EraserPoint) => void
  updateParticles: (deltaTime: number) => void

  // 重置
  reset: () => void
}

// 加载用户保存的偏好
const savedPrefs = loadEraserPreferences()
const initialConfig = getEraserConfigFromPreferences(savedPrefs)
const initialBrand = savedPrefs.brand || 'default'
const initialBrandConfig = ERASER_BRAND_CONFIGS[initialBrand]

// 引擎实例（单例）
const globalEngine = new PhysicsEraserEngine(initialConfig)
const globalSpatialIndex = new SpatialIndex()
const globalPerformanceMonitor = new PerformanceMonitor()
const globalParticleSystem = getParticleSystem()

// 设置空间索引的元素提供者（用于自动重建）
// 注意：此引用会在 store 创建后被更新为实际的获取函数
let _elementsProvider: (() => CanvasElement[]) | null = null
globalSpatialIndex.setElementProvider(() => _elementsProvider?.() ?? [])

// 初始化粒子系统状态
globalParticleSystem.setEnabled(savedPrefs.particlesEnabled)

export const useEraserStore = create<EraserState & EraserActions>()((set, get) => ({
  // ===== 状态 =====
  eraserMode: 'physics',
  eraserConfig: initialConfig,
  eraserPreset: savedPrefs.preset,
  eraserBrand: initialBrand,
  eraserBrandConfig: initialBrandConfig,

  shortcuts: getMergedShortcuts(savedPrefs),

  isErasing: false,
  currentTrail: [],

  engine: globalEngine,
  spatialIndex: globalSpatialIndex,
  performanceMonitor: globalPerformanceMonitor,
  particleSystem: globalParticleSystem,

  particlesEnabled: savedPrefs.particlesEnabled,

  lastEraseTime: 0,
  elementsErased: 0,

  // ===== Actions =====

  setEraserMode: (mode: EraserMode) => {
    set({ eraserMode: mode })
  },

  setEraserPreset: (preset: EraserPresetType) => {
    const brandConfig = get().eraserBrandConfig
    const baseConfig = ERASER_PRESET_CONFIGS[preset]

    // 应用品牌修正系数
    const config: EraserConfig = {
      ...baseConfig,
      hardness: baseConfig.hardness * brandConfig.hardnessModifier,
      wearRate: baseConfig.wearRate * brandConfig.wearRateModifier,
      friction: baseConfig.friction * brandConfig.frictionModifier,
    }

    set({
      eraserPreset: preset,
      eraserConfig: { ...config },
    })
    get().engine.updateConfig(config)
    saveEraserPreferences({ preset })
  },

  setEraserBrand: (brand: EraserBrandType) => {
    const brandConfig = ERASER_BRAND_CONFIGS[brand]
    const currentPreset = get().eraserPreset
    const baseConfig = ERASER_PRESET_CONFIGS[currentPreset]

    // 应用品牌修正系数
    const config: EraserConfig = {
      ...baseConfig,
      hardness: baseConfig.hardness * brandConfig.hardnessModifier,
      wearRate: baseConfig.wearRate * brandConfig.wearRateModifier,
      friction: baseConfig.friction * brandConfig.frictionModifier,
    }

    set({
      eraserBrand: brand,
      eraserBrandConfig: brandConfig,
      eraserConfig: { ...config },
    })
    get().engine.updateConfig(config)
    saveEraserPreferences({ brand })
  },

  updateEraserConfig: (config: Partial<EraserConfig>) => {
    set((state) => ({
      eraserConfig: { ...state.eraserConfig, ...config },
    }))
    get().engine.updateConfig(config)
    // 保存可持久化的配置项
    const prefsToSave: Partial<EraserUserPreferences> = {}
    if (config.shape !== undefined) prefsToSave.shape = config.shape
    if (config.baseRadius !== undefined) prefsToSave.baseRadius = config.baseRadius
    if (config.audioEnabled !== undefined) prefsToSave.audioEnabled = config.audioEnabled
    if (config.rotation !== undefined) prefsToSave.rotation = config.rotation
    saveEraserPreferences(prefsToSave)
  },

  // ===== 快捷键管理 =====
  setShortcut: (
    shortcutKey: keyof ShortcutMap,
    config: Partial<ShortcutMap[keyof ShortcutMap]>
  ) => {
    set((state) => {
      const newShortcuts = {
        ...state.shortcuts,
        [shortcutKey]: {
          ...state.shortcuts[shortcutKey],
          ...config,
        },
      }
      // 保存到用户偏好
      saveEraserPreferences({ shortcuts: newShortcuts })
      return { shortcuts: newShortcuts }
    })
  },

  resetShortcutsToDefault: () => {
    set({ shortcuts: { ...DEFAULT_SHORTCUTS } })
    saveEraserPreferences({ shortcuts: {} })
  },

  startErase: (point: EraserPoint, elements: CanvasElement[]) => {
    const { engine, spatialIndex } = get()

    // 重建空间索引（如果元素变化大）
    spatialIndex.bulkLoad(elements)

    // 开始擦除
    engine.startErase(point)

    set({
      isErasing: true,
      currentTrail: [point],
    })
  },

  addErasePoint: (point: EraserPoint, elements: CanvasElement[]) => {
    const { engine, eraserMode, performanceMonitor, spatialIndex } = get()

    // 记录性能
    performanceMonitor.recordFrame()

    // 检查是否应该使用物理模式
    if (eraserMode === 'simple' || !performanceMonitor.shouldUsePhysics()) {
      // 降级为简单模式，返回null让上层使用原有逻辑
      return null
    }

    // 先用空间索引快速筛选候选元素（O(log n)）
    const effectiveRadius = engine.computeEffectiveRadius(point.pressure)
    const candidateIds = spatialIndex.search({
      x: point.x - effectiveRadius,
      y: point.y - effectiveRadius,
      w: effectiveRadius * 2,
      h: effectiveRadius * 2,
    })

    // 根据ID筛选出候选元素，只对这些元素做精确计算
    // P0优化: 使用 for 循环构建 Map，避免 .map()/.filter() 产生临时数组
    const elementMap = new Map<string, CanvasElement>()
    for (let j = 0; j < elements.length; j++) {
      elementMap.set(elements[j].id, elements[j])
    }
    const candidates: CanvasElement[] = []
    for (let i = 0; i < candidateIds.length; i++) {
      const el = elementMap.get(candidateIds[i])
      if (el) candidates.push(el)
    }

    const result = engine.addErasePoint(point, candidates, true)

    set((state) => ({
      currentTrail: [...state.currentTrail, point],
      lastEraseTime: performance.now(),
      elementsErased: state.elementsErased + result.affectedElementIds.length,
    }))

    return result
  },

  endErase: () => {
    get().engine.endErase()
    set({
      isErasing: false,
      currentTrail: [],
    })
  },

  rebuildSpatialIndex: (elements: CanvasElement[]) => {
    get().spatialIndex.bulkLoad(elements)
  },

  setElementsProvider: (provider: () => CanvasElement[]) => {
    _elementsProvider = provider
  },

  shouldUsePhysics: () => {
    const { eraserMode, performanceMonitor } = get()
    return eraserMode === 'physics' && performanceMonitor.shouldUsePhysics()
  },

  getPerformanceLevel: () => {
    return get().performanceMonitor.getPerformanceLevel()
  },

  getWearLevel: () => {
    return get().engine.getWearLevel()
  },

  resetWear: () => {
    get().engine.resetWear()
  },

  // ===== 磨损历史记录（撤销/重做） =====

  undoWear: () => {
    return get().engine.undoWear()
  },

  redoWear: () => {
    return get().engine.redoWear()
  },

  canUndoWear: () => {
    return get().engine.canUndoWear()
  },

  canRedoWear: () => {
    return get().engine.canRedoWear()
  },

  getWearHistoryStats: () => {
    return get().engine.getWearHistoryStats()
  },

  // ===== 粒子系统 =====

  setParticlesEnabled: (enabled: boolean) => {
    const { particleSystem } = get()
    particleSystem.setEnabled(enabled)
    set({ particlesEnabled: enabled })
    saveEraserPreferences({ particlesEnabled: enabled })
  },

  emitParticles: (point: EraserPoint) => {
    const { particlesEnabled, particleSystem, eraserBrandConfig } = get()
    if (!particlesEnabled) return

    const config = particleSystem.getConfig()
    const particleCount = Math.floor(config.particlesPerErase * (0.5 + point.pressure * 1.5))

    // 使用品牌特定的粒子颜色
    const brandColors = eraserBrandConfig.particleColors
    particleSystem.emit({
      x: point.x,
      y: point.y,
      direction: point.direction,
      pressure: point.pressure,
      velocity: Math.min(point.velocity, 1),
      count: particleCount,
      spread: Math.PI * 0.5, // 90度扩散
      customColors: brandColors,
    } as any)
  },

  updateParticles: (deltaTime: number) => {
    const { particleSystem } = get()
    particleSystem.update(deltaTime)
  },

  reset: () => {
    globalPerformanceMonitor.reset()
    globalParticleSystem.clear()
    set({
      isErasing: false,
      currentTrail: [],
      lastEraseTime: 0,
      elementsErased: 0,
    })
  },
}))

// 导出单例引擎供外部使用
export { globalEngine as eraserEngine }
export { globalSpatialIndex as eraserSpatialIndex }
export { globalPerformanceMonitor as eraserPerformanceMonitor }
export { globalParticleSystem as eraserParticleSystem }
