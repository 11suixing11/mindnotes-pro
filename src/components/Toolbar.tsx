import { useAppStore } from '../store/useAppStore'
import { useThemeStore } from '../store/useThemeStore'

const COLORS = [
  { hex: '#1a1a2e', label: '黑' },
  { hex: '#ef4444', label: '红' },
  { hex: '#22c55e', label: '绿' },
  { hex: '#6366f1', label: '蓝' },
  { hex: '#f59e0b', label: '黄' },
  { hex: '#a855f7', label: '紫' },
]

const SIZES = [2, 4, 6, 8, 10]

const TOOLS = [
  { id: 'select' as const, icon: '👆', label: '选择', key: 'v' },
  { id: 'pen' as const, icon: '✏️', label: '笔', key: '1' },
  { id: 'eraser' as const, icon: '🧹', label: '橡皮', key: '2' },
  { id: 'pan' as const, icon: '✋', label: '平移', key: '3' },
  { id: 'text' as const, icon: '🔤', label: '文字', key: 't' },
  { id: 'rectangle' as const, icon: '⬜', label: '矩形', key: '4' },
  { id: 'circle' as const, icon: '⭕', label: '圆形', key: '5' },
  { id: 'triangle' as const, icon: '🔺', label: '三角', key: '6' },
  { id: 'line' as const, icon: '📏', label: '直线', key: '7' },
  { id: 'arrow' as const, icon: '➡️', label: '箭头', key: '8' },
]

export default function Toolbar() {
  const {
    tool,
    color,
    size,
    fillColor,
    setTool,
    setColor,
    setSize,
    setFillColor,
    clearStrokes,
    undo,
    redo,
    canUndo,
    canRedo,
    zoomIn,
    zoomOut,
    resetView,
  } = useAppStore()
  const { isDarkMode, toggleTheme } = useThemeStore()

  const isShapeTool = ['rectangle', 'circle', 'triangle', 'line', 'arrow'].includes(tool)

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-10">
      <div className="glass-toolbar rounded-2xl px-3 py-2 flex items-center gap-1">
        {/* 绘图工具 */}
        {TOOLS.slice(0, 5).map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`toolbar-btn ${tool === t.id ? 'active' : ''}`}
            title={`${t.label} (${t.key})`}
          >
            {t.icon}
          </button>
        ))}

        <div className="toolbar-divider" />

        {/* 形状工具 */}
        {TOOLS.slice(5).map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`toolbar-btn ${tool === t.id ? 'active' : ''}`}
            title={`${t.label} (${t.key})`}
          >
            {t.icon}
          </button>
        ))}

        <div className="toolbar-divider" />

        {/* 模板 */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-templates'))}
          className="toolbar-btn"
          title="模板"
        >
          📋
        </button>

        <div className="toolbar-divider" />

        {/* 颜色 - 选择工具时隐藏 */}
        {tool !== 'select' && (
          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => setColor(c.hex)}
                className={`color-dot ${color === c.hex ? 'active' : ''}`}
                style={{ backgroundColor: c.hex }}
                title={c.label}
              />
            ))}
          </div>
        )}

        {tool !== 'select' && <div className="toolbar-divider" />}

        {/* 填充色 - 只在形状工具时显示 */}
        {isShapeTool && (
          <>
            <button
              onClick={() => setFillColor(fillColor ? null : color)}
              className={`toolbar-btn ${fillColor ? 'active' : ''}`}
              title={fillColor ? '关闭填充' : '开启填充'}
              style={fillColor ? { backgroundColor: fillColor + '33', borderColor: fillColor } : {}}
            >
              🪣
            </button>
            {fillColor && (
              <div className="flex items-center gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setFillColor(c.hex)}
                    className={`color-dot ${fillColor === c.hex ? 'active' : ''}`}
                    style={{ backgroundColor: c.hex + '33', border: `2px solid ${c.hex}` }}
                    title={`填充: ${c.label}`}
                  />
                ))}
              </div>
            )}
            <div className="toolbar-divider" />
          </>
        )}

        {/* 粗细 */}
        <div className="flex items-center gap-0.5">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`size-indicator ${size === s ? 'active' : ''}`}
              title={tool === 'select' ? `文字大小 ${s * 4}px` : `${s}px`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: Math.max(3, s), height: Math.max(3, s) }}
              />
            </button>
          ))}
        </div>

        <div className="toolbar-divider" />

        {/* 缩放 */}
        <button onClick={zoomOut} className="toolbar-btn" title="缩小 (-)">
          <span className="text-sm">−</span>
        </button>
        <button
          onClick={resetView}
          className="h-9 px-2 rounded-xl flex items-center justify-center text-xs font-mono hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-all duration-200"
          title="重置 (0)"
        >
          100%
        </button>
        <button onClick={zoomIn} className="toolbar-btn" title="放大 (+)">
          <span className="text-sm">+</span>
        </button>

        <div className="toolbar-divider" />

        {/* 操作 */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`toolbar-btn ${!canUndo ? 'opacity-30 cursor-not-allowed' : ''}`}
          title="撤销 (Ctrl+Z)"
        >
          ↩️
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`toolbar-btn ${!canRedo ? 'opacity-30 cursor-not-allowed' : ''}`}
          title="重做 (Ctrl+Shift+Z)"
        >
          ↪️
        </button>
        <button
          onClick={() => { if (confirm('确定清空画布？')) clearStrokes() }}
          className="toolbar-btn hover:!bg-red-100 dark:hover:!bg-red-900/30 hover:!text-red-500"
          title="清空"
        >
          🗑️
        </button>

        <div className="toolbar-divider" />

        {/* 保存 & 主题 */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('mindnotes-save'))}
          className="toolbar-btn"
          title="保存 (Ctrl+S)"
        >
          💾
        </button>
        <button
          onClick={toggleTheme}
          className="toolbar-btn"
          title={isDarkMode ? '浅色模式' : '深色模式'}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-shortcuts'))}
          className="toolbar-btn"
          title="快捷键 (?)"
        >
          ⌨️
        </button>
      </div>
    </div>
  )
}
