import { create } from 'zustand'
import type { EraserMode, EraserConfig, EraserPoint, EraseResult, EraserPresetType } from './types'
import type { EraserUserPreferences } from './userPreferences'
import { ERASER_PRESET_CONFIGS } from './types'
import { PhysicsEraserEngine } from './PhysicsEraserEngine'
import { SpatialIndex, PerformanceMonitor } from './SpatialIndex'
import type { CanvasElement } from '../store/types'
import {
  loadEraserPreferences,
  saveEraserPreferences,
  getEraserConfigFromPreferences,
} from './userPreferences'

interface EraserState {
  // 模式配置
  eraserMode: EraserMode
  eraserConfig: EraserConfig
  eraserPreset: EraserPresetType
  
  // 运行时状态
  isErasing: boolean
  currentTrail: EraserPoint[]
  
  // 引擎实例
  engine: PhysicsEraserEngine
  spatialIndex: SpatialIndex
  performanceMonitor: PerformanceMonitor
  
  // 统计
  lastEraseTime: number
  elementsErased: number
}

interface EraserActions {
  // 模式切换
  setEraserMode: (mode: EraserMode) => void
  setEraserPreset: (preset: EraserPresetType) => void
  updateEraserConfig: (config: Partial<EraserConfig>) => void
  
  // 擦除流程
  startErase: (point: EraserPoint, elements: CanvasElement[]) => void
  addErasePoint: (point: EraserPoint, elements: CanvasElement[]) => EraseResult | null
  endErase: () => void
  
  // 空间索引
  rebuildSpatialIndex: (elements: CanvasElement[]) => void
  
  // 性能
  shouldUsePhysics: () => boolean
  getPerformanceLevel: () => 'high' | 'medium' | 'low'
  
  // 磨损
  getWearLevel: () => number
  resetWear: () => void
  
  // 重置
  reset: () => void
}

// 加载用户保存的偏好
const savedPrefs = loadEraserPreferences()
const initialConfig = getEraserConfigFromPreferences(savedPrefs)

// 引擎实例（单例）
const globalEngine = new PhysicsEraserEngine(initialConfig)
const globalSpatialIndex = new SpatialIndex()
const globalPerformanceMonitor = new PerformanceMonitor()

export const useEraserStore = create<EraserState & EraserActions>()(
  (set, get) => ({
    // ===== 状态 =====
    eraserMode: 'physics',
    eraserConfig: initialConfig,
    eraserPreset: savedPrefs.preset,
    
    isErasing: false,
    currentTrail: [],
    
    engine: globalEngine,
    spatialIndex: globalSpatialIndex,
    performanceMonitor: globalPerformanceMonitor,
    
    lastEraseTime: 0,
    elementsErased: 0,
    
    // ===== Actions =====
    
    setEraserMode: (mode: EraserMode) => {
      set({ eraserMode: mode })
    },
    
    setEraserPreset: (preset: EraserPresetType) => {
      const config = ERASER_PRESET_CONFIGS[preset]
      set({
        eraserPreset: preset,
        eraserConfig: { ...config },
      })
      get().engine.updateConfig(config)
      saveEraserPreferences({ preset })
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
      const elementMap = new Map(elements.map(el => [el.id, el]))
      const candidates = candidateIds
        .map(id => elementMap.get(id))
        .filter((el): el is CanvasElement => el !== undefined)
      
      const result = engine.addErasePoint(point, candidates)
      
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
    
    reset: () => {
      globalPerformanceMonitor.reset()
      set({
        isErasing: false,
        currentTrail: [],
        lastEraseTime: 0,
        elementsErased: 0,
      })
    },
  })
)

// 导出单例引擎供外部使用
export { globalEngine as eraserEngine }
export { globalSpatialIndex as eraserSpatialIndex }
export { globalPerformanceMonitor as eraserPerformanceMonitor }
