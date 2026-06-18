import { create } from 'zustand'
import type { EraserMode, EraserConfig, EraserPoint, EraseResult } from './types'
import { DEFAULT_ERASER_CONFIG, HARD_ERASER_CONFIG, SOFT_ERASER_CONFIG } from './types'
import { PhysicsEraserEngine } from './PhysicsEraserEngine'
import { SpatialIndex, PerformanceMonitor } from './SpatialIndex'
import type { CanvasElement } from '../store/types'

interface EraserState {
  // 模式配置
  eraserMode: EraserMode
  eraserConfig: EraserConfig
  eraserPreset: 'default' | 'hard' | 'soft'
  
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
  setEraserPreset: (preset: 'default' | 'hard' | 'soft') => void
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
  
  // 重置
  reset: () => void
}

// 引擎实例（单例）
const globalEngine = new PhysicsEraserEngine()
const globalSpatialIndex = new SpatialIndex()
const globalPerformanceMonitor = new PerformanceMonitor()

export const useEraserStore = create<EraserState & EraserActions>()(
  (set, get) => ({
    // ===== 状态 =====
    eraserMode: 'physics',
    eraserConfig: { ...DEFAULT_ERASER_CONFIG },
    eraserPreset: 'default',
    
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
    
    setEraserPreset: (preset: 'default' | 'hard' | 'soft') => {
      const configMap = {
        default: DEFAULT_ERASER_CONFIG,
        hard: HARD_ERASER_CONFIG,
        soft: SOFT_ERASER_CONFIG,
      }
      set({
        eraserPreset: preset,
        eraserConfig: { ...configMap[preset] },
      })
      get().engine.updateConfig(configMap[preset])
    },
    
    updateEraserConfig: (config: Partial<EraserConfig>) => {
      set((state) => ({
        eraserConfig: { ...state.eraserConfig, ...config },
      }))
      get().engine.updateConfig(config)
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
      const { engine, eraserMode, performanceMonitor } = get()
      
      // 记录性能
      performanceMonitor.recordFrame()
      
      // 检查是否应该使用物理模式
      if (eraserMode === 'simple' || !performanceMonitor.shouldUsePhysics()) {
        // 降级为简单模式，返回null让上层使用原有逻辑
        return null
      }
      
      const result = engine.addErasePoint(point, elements)
      
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
