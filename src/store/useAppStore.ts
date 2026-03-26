/**
 * useAppStore - 向后兼容的聚合 Store
 * 
 * 注意：新代码应该直接使用各个独立的 store：
 * - useDrawingStore - 笔迹和形状
 * - useViewStore - 视图和画布
 * - useGuideStore - 智能吸附
 * - useLayerStore - 图层管理
 * - useHistoryStore - 撤销重做
 */

export { useDrawingStore } from './useDrawingStore'
export { useViewStore } from './useViewStore'
export { useGuideStore } from './useGuideStore'
export { useLayerStore } from './useLayerStore'
export { useHistoryStore } from './useHistoryStore'

// 兼容旧代码的默认导出（不推荐使用）
import { useDrawingStore } from './useDrawingStore'
import { useViewStore } from './useViewStore'
import { useGuideStore } from './useGuideStore'
import { useLayerStore } from './useLayerStore'
import { useHistoryStore } from './useHistoryStore'

// 创建一个聚合对象供旧代码使用
export const useAppStore = () => ({
  ...useDrawingStore(),
  ...useViewStore(),
  ...useGuideStore(),
  ...useLayerStore(),
  ...useHistoryStore(),
})

export default useAppStore
