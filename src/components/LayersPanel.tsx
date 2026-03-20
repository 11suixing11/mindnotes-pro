import { useAppStore, Stroke, Shape } from '../store/useAppStore'
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
    moveLayerUp,
    moveLayerDown,
  } = useAppStore()

  if (!showLayersPanel) return null

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
      return typeMap[layer.type] || '形状'
    }
    return '笔迹'
  }

  return (
    <div className="fixed top-20 right-4 w-64 bg-[var(--toolbar-bg)] backdrop-blur-sm rounded-xl shadow-xl border border-[var(--border-color)] z-40 max-h-[60vh] overflow-y-auto">
      <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between sticky top-0 bg-[var(--toolbar-bg)]">
        <h3 className="font-semibold text-[var(--text-primary)] text-sm">📑 图层 ({allLayers.length})</h3>
        <button
          onClick={toggleLayersPanel}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-lg leading-none"
        >
          ✕
        </button>
      </div>

      {allLayers.length === 0 ? (
        <div className="p-6 text-center text-sm text-[var(--text-secondary)]">
          <span className="text-2xl block mb-2">🎨</span>
          画点什么吧
        </div>
      ) : (
        <StaggerContainer staggerDelay={0.03}>
          <div className="divide-y divide-[var(--border-color)]">
            {allLayers.map((layer) => (
              <FadeIn key={layer.id}>
                <div
                  className={`p-2 flex items-center gap-1.5 hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors ${
                    selectedLayerId === layer.id ? 'bg-[var(--bg-tertiary)]' : ''
                  }`}
                  onClick={() => setSelectedLayer(layer.id)}
                >
                  {/* 可见性 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleLayerHidden(layer.id)
                    }}
                    className={`w-6 h-6 flex items-center justify-center rounded text-xs transition-colors ${
                      layer.hidden ? 'opacity-40' : 'hover:bg-[var(--bg-tertiary)]'
                    }`}
                    title={layer.hidden ? '显示' : '隐藏'}
                  >
                    {layer.hidden ? '🚫' : '👁️'}
                  </button>

                  {/* 锁定 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleLayerLock(layer.id)
                    }}
                    className={`w-6 h-6 flex items-center justify-center rounded text-xs transition-colors ${
                      layer.locked ? 'text-amber-500' : 'hover:bg-[var(--bg-tertiary)] opacity-40'
                    }`}
                    title={layer.locked ? '解锁' : '锁定'}
                  >
                    {layer.locked ? '🔒' : '🔓'}
                  </button>

                  {/* 名称 */}
                  <div className="flex-1 truncate text-sm text-[var(--text-primary)]">
                    {getLayerName(layer)}
                  </div>

                  {/* 上下移动 */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        moveLayerUp(layer.id)
                      }}
                      className="w-5 h-5 flex items-center justify-center rounded text-xs hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                      title="上移"
                    >
                      ▲
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        moveLayerDown(layer.id)
                      }}
                      className="w-5 h-5 flex items-center justify-center rounded text-xs hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                      title="下移"
                    >
                      ▼
                    </button>
                  </div>

                  {/* 删除 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteLayer(layer.id)
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded text-xs text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    title="删除"
                  >
                    ✕
                  </button>
                </div>
              </FadeIn>
            ))}
          </div>
        </StaggerContainer>
      )}

      {allLayers.length > 0 && (
        <div className="p-2 border-t border-[var(--border-color)]">
          <button
            onClick={() => {
              if (confirm('确定清空所有图层？')) clearAllLayers()
            }}
            className="w-full py-2 px-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 dark:text-red-400 rounded-lg text-xs font-medium transition-colors"
          >
            🗑️ 清空全部
          </button>
        </div>
      )}
    </div>
  )
}
