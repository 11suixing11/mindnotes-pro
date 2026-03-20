import React from 'react'
import { useAppStore } from '../store/useAppStore'
import { useThemeStore } from '../store/useThemeStore'

const COLORS = [
  { hex: '#000000', label: '黑' },
  { hex: '#ef4444', label: '红' },
  { hex: '#22c55e', label: '绿' },
  { hex: '#3b82f6', label: '蓝' },
  { hex: '#f59e0b', label: '黄' },
  { hex: '#8b5cf6', label: '紫' },
]

const SIZES = [2, 4, 6, 8, 10]

const TOOL_GROUPS = [
  {
    label: '绘图',
    tools: [
      { id: 'pen' as const, icon: '✏️', label: '笔', key: '1' },
      { id: 'eraser' as const, icon: '🧹', label: '橡皮', key: '2' },
      { id: 'pan' as const, icon: '✋', label: '平移', key: '3' },
    ],
  },
  {
    label: '形状',
    tools: [
      { id: 'rectangle' as const, icon: '⬜', label: '矩形', key: '4' },
      { id: 'circle' as const, icon: '⭕', label: '圆形', key: '5' },
      { id: 'triangle' as const, icon: '🔺', label: '三角', key: '6' },
      { id: 'line' as const, icon: '📏', label: '直线', key: '7' },
      { id: 'arrow' as const, icon: '➡️', label: '箭头', key: '8' },
    ],
  },
]

export default function Toolbar() {
  const {
    tool,
    color,
    size,
    setTool,
    setColor,
    setSize,
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

  const handleSave = () => {
    window.dispatchEvent(new CustomEvent('mindnotes-save'))
  }

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5">
      {/* 主工具栏 */}
      <div className="bg-[var(--toolbar-bg)] backdrop-blur-md rounded-2xl shadow-lg border border-[var(--border-color)] px-3 py-2 flex items-center gap-1">
        {/* 工具组 */}
        {TOOL_GROUPS.map((group) => (
          <React.Fragment key={group.label}>
            <div className="flex items-center gap-0.5">
              {group.tools.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id)}
                  className={`relative w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all duration-150 ${
                    tool === t.id
                      ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                      : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                  }`}
                  title={`${t.label} (${t.key})`}
                >
                  {t.icon}
                </button>
              ))}
            </div>
            <div className="w-px h-6 bg-[var(--border-color)] mx-1" />
          </React.Fragment>
        ))}

        {/* 模板 */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-templates'))}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-base hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors"
          title="模板"
        >
          📋
        </button>

        <div className="w-px h-6 bg-[var(--border-color)] mx-1" />

        {/* 颜色选择 */}
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => setColor(c.hex)}
              className={`w-5 h-5 rounded-full border-2 transition-transform duration-150 hover:scale-125 ${
                color === c.hex
                  ? 'border-indigo-400 scale-125 shadow-sm'
                  : 'border-[var(--border-color)]'
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.label}
            />
          ))}
          {/* 自定义颜色 */}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-5 h-5 rounded-full cursor-pointer opacity-0 absolute"
            title="自定义颜色"
          />
        </div>

        <div className="w-px h-6 bg-[var(--border-color)] mx-1" />

        {/* 粗细 */}
        <div className="flex items-center gap-0.5">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 ${
                size === s
                  ? 'bg-indigo-500 text-white'
                  : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
              }`}
              title={`${s}px`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: Math.max(3, s), height: Math.max(3, s) }}
              />
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-[var(--border-color)] mx-1" />

        {/* 缩放 */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={zoomOut}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
            title="缩小 (-)"
          >
            🔍−
          </button>
          <button
            onClick={resetView}
            className="h-8 px-2 rounded-lg flex items-center justify-center text-xs font-mono hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
            title="重置 (0)"
          >
            100%
          </button>
          <button
            onClick={zoomIn}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
            title="放大 (+)"
          >
            🔍+
          </button>
        </div>

        <div className="w-px h-6 bg-[var(--border-color)] mx-1" />

        {/* 操作 */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${
              canUndo
                ? 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)]/30 cursor-not-allowed'
            }`}
            title="撤销 (Ctrl+Z)"
          >
            ↩️
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${
              canRedo
                ? 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)]/30 cursor-not-allowed'
            }`}
            title="重做 (Ctrl+Shift+Z)"
          >
            ↪️
          </button>
          <button
            onClick={() => {
              if (confirm('确定清空画布？')) clearStrokes()
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
            title="清空"
          >
            🗑️
          </button>
        </div>

        <div className="w-px h-6 bg-[var(--border-color)] mx-1" />

        {/* 保存 & 主题 */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleSave}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors"
            title="保存 (Ctrl+S)"
          >
            💾
          </button>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors"
            title={isDarkMode ? '浅色模式' : '深色模式'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-shortcuts'))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors"
            title="快捷键 (?)"
          >
            ⌨️
          </button>
        </div>
      </div>
    </div>
  )
}
