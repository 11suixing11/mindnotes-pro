import { useAppStore, Stroke, Shape } from '../store/useAppStore'
import { useEffect } from 'react'
import { FadeIn, StaggerContainer } from './ui/Motion'

export default function LayersPanel() {
  const {
    strokes,
    shapes,
    selectedLayerId,
    showLayersPanel,
    setSelectedLayer,
    toggleLayersPanel,
    toggleLayerLock,
    toggleLayerHidden,
    deleteLayer,
    clearAllLayers,
  } = useAppStore()

  // 监听关闭事件
  useEffect(() => {
    const handleToggle = () => toggleLayersPanel()
    const handleClear = () => clearAllLayers()
    
    window.addEventListener('toggle-layers-panel', handleToggle)
    window.addEventListener('clear-all-layers', handleClear)
    
    return () => {
      window.removeEventListener('toggle-layers-panel', handleToggle)
      window.removeEventListener('clear-all-layers', handleClear)
    }
  }, [toggleLayersPanel, clearAllLayers])

  if (!showLayersPanel) return null

  // 合并所有图层（笔迹和形状）
  const allLayers = [
    ...strokes.map((s, idx) => ({ ...s, layerType: 'stroke' as const, index: idx })),
    ...shapes.map((s, idx) => ({ ...s, layerType: 'shape' as const, index: idx })),
  ]

  const getLayerName = (layer: Stroke | Shape) => {
    if (layer.name) return layer.name
    if ('type' in layer) {
      const typeMap: Record<string, string> = {
        rectangle: '矩形',
        circle: '圆形',
        triangle: '三角形',
        line: '直线',
        arrow: '箭头',
      }
      return `${typeMap[layer.type] || '形状'}`
    }
    return '笔迹'
  }

  return (
    <div className="fixed top-20 right-4 w-64 bg-[var(--toolbar-bg)] backdrop-blur-sm rounded-xl shadow-xl border border-[var(--border-color)] z-40 max-h-[60vh] overflow-y-auto">
      <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between sticky top-0 bg-[var(--toolbar-bg)]">
        <h3 className="font-semibold text-[var(--text-primary)]">📑 图层</h3>
        <button
          onClick={() => {
            const event = new CustomEvent('toggle-layers-panel')
            window.dispatchEvent(event)
          }}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          ✕
        </button>
      </div>

      <StaggerContainer staggerDelay={0.05}>
        <div className="divide-y divide-[var(--border-color)]">
          {allLayers.length === 0 ? (
            <FadeIn>
              <div className="p-4 text-center text-sm text-[var(--text-secondary)]">
                暂无图层
              </div>
            </FadeIn>
          ) : (
            allLayers.map((layer) => (
              <FadeIn key={layer.id}>
                <div
                  className={`p-2 flex items-center gap-2 hover:bg-[var(--bg-secondary)] cursor-pointer ${
                    selectedLayerId === layer.id ? 'bg-[var(--bg-tertiary)]' : ''
                  }`}
                  onClick={() => setSelectedLayer(layer.id)}
                >
              {/* 锁定/隐藏按钮 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleLayerHidden(layer.id)
                  }}
                  className={`w-5 h-5 flex items-center justify-center rounded text-xs ${
                    layer.hidden
                      ? 'bg-gray-200 text-gray-500'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                  title={layer.hidden ? '显示' : '隐藏'}
                >
                  {layer.hidden ? '👁️‍🗨️' : '👁️'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleLayerLock(layer.id)
                  }}
                  className={`w-5 h-5 flex items-center justify-center rounded text-xs ${
                    layer.locked
                      ? 'bg-gray-200 text-gray-500'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                  title={layer.locked ? '解锁' : '锁定'}
                >
                  🔒
                </button>
              </div>

              {/* 图层名称 */}
              <div className="flex-1 truncate text-sm text-[var(--text-primary)]">
                {getLayerName(layer)}
              </div>

              {/* 删除按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('确定要删除这个图层吗？')) {
                    deleteLayer(layer.id)
                  }
                }}
                className="w-6 h-6 flex items-center justify-center rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
                title="删除"
              >
                🗑️
                  </button>
                </div>
              </FadeIn>
            ))
          )}
        </div>
      </StaggerContainer>

      <div className="p-3 border-t border-[var(--border-color)]">
        <div className="text-xs text-[var(--text-secondary)] mb-2">
          共 {allLayers.length} 个图层
        </div>
        <button
          onClick={() => {
            if (confirm('确定要清空所有图层吗？此操作不可恢复！')) {
              // 清空所有图层
              const event = new CustomEvent('clear-all-layers')
              window.dispatchEvent(event)
            }
          }}
          className="w-full py-2 px-3 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium transition-colors"
        >
          🗑️ 清空所有图层
        </button>
      </div>
    </div>
  )
}
