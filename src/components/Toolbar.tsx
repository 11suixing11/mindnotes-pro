import React from 'react'
import { useAppStore } from '../store/useAppStore'
import { useThemeStore } from '../store/useThemeStore'

const Toolbar: React.FC = () => {
  const { tool, color, size, setTool, setColor, setSize, clearStrokes, undo, zoomIn, zoomOut, resetView } = useAppStore()
  const { isDarkMode, toggleTheme } = useThemeStore()
  
  const colors = [
    '#000000', // 黑
    '#ef4444', // 红
    '#22c55e', // 绿
    '#3b82f6', // 蓝
    '#f59e0b', // 黄
    '#8b5cf6', // 紫
  ]
  
  const sizes = [2, 4, 6, 8, 10]
  
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-[var(--toolbar-bg)] backdrop-blur-sm rounded-2xl shadow-xl border border-[var(--border-color)] px-6 py-3 flex items-center gap-4 z-10">
      {/* 工具选择 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTool('pen')}
          className={`toolbar-btn ${tool === 'pen' ? 'active' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)]'}`}
        >
          ✏️ 笔
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`toolbar-btn ${tool === 'eraser' ? 'active' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)]'}`}
        >
          🧹 橡皮
        </button>
        <button
          onClick={() => setTool('pan')}
          className={`toolbar-btn ${tool === 'pan' ? 'active' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)]'}`}
        >
          ✋ 平移
        </button>
      </div>
      
      <div className="w-px h-8 bg-[var(--border-color)]" />
      
      {/* 颜色选择 */}
      <div className="flex items-center gap-2">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
              color === c ? 'border-primary scale-110' : 'border-[var(--border-color)]'
            }`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>
      
      <div className="w-px h-8 bg-[var(--border-color)]" />
      
      {/* 粗细选择 */}
      <div className="flex items-center gap-2">
        {sizes.map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              size === s 
                ? 'bg-primary text-white' 
                : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)]'
            }`}
          >
            <div 
              className="rounded-full bg-current"
              style={{ width: s * 2, height: s * 2 }}
            />
          </button>
        ))}
      </div>
      
      <div className="w-px h-8 bg-[var(--border-color)]" />
      
      {/* 缩放控制 */}
      <div className="flex items-center gap-2">
        <button
          onClick={zoomOut}
          className="toolbar-btn bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)]"
          title="缩小 (-)"
        >
          🔍-
        </button>
        <button
          onClick={resetView}
          className="toolbar-btn bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)]"
          title="重置视图 (0)"
        >
          🔍100%
        </button>
        <button
          onClick={zoomIn}
          className="toolbar-btn bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)]"
          title="放大 (+)"
        >
          🔍+
        </button>
      </div>
      
      <div className="w-px h-8 bg-[var(--border-color)]" />
      
      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          className="toolbar-btn bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)]"
        >
          ↩️ 撤销
        </button>
        <button
          onClick={clearStrokes}
          className="toolbar-btn bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400"
        >
          🗑️ 清空
        </button>
      </div>
      
      <div className="w-px h-8 bg-[var(--border-color)]" />
      
      {/* 主题切换 */}
      <button
        onClick={toggleTheme}
        className="toolbar-btn bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)]"
        title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
      >
        {isDarkMode ? '☀️ 浅色' : '🌙 深色'}
      </button>
    </div>
  )
}

export default Toolbar
