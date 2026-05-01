import React from 'react'
import { useDrawingStore } from '../store/useDrawingStore'
import { useViewStore } from '../store/useViewStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useThemeStore } from '../store/useThemeStore'

const TOOLS = [
  { id: 'pen' as const, label: '✏️ 笔', shortcut: '1' },
  { id: 'eraser' as const, label: '🧹 橡皮', shortcut: '2' },
  { id: 'pan' as const, label: '✋ 平移', shortcut: '3' },
  { id: 'rectangle' as const, label: '⬜ 矩形', shortcut: '4' },
  { id: 'circle' as const, label: '⭕ 圆形', shortcut: '5' },
]

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6']
const SIZES = [
  { id: 'thin', label: '细', value: 2 },
  { id: 'medium', label: '中', value: 4 },
  { id: 'thick', label: '粗', value: 8 },
]

const Toolbar: React.FC = () => {
  const tool = useDrawingStore((s) => s.tool)
  const setTool = useDrawingStore((s) => s.setTool)
  const color = useDrawingStore((s) => s.color)
  const setColor = useDrawingStore((s) => s.setColor)
  const size = useDrawingStore((s) => s.size)
  const setSize = useDrawingStore((s) => s.setSize)
  const clearStrokes = useDrawingStore((s) => s.clearStrokes)
  const undo = useHistoryStore((s) => s.undo)
  const zoomIn = useViewStore((s) => s.zoomIn)
  const zoomOut = useViewStore((s) => s.zoomOut)
  const resetView = useViewStore((s) => s.resetView)
  const { isDarkMode, toggleTheme } = useThemeStore()

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-3 z-10">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          onClick={() => setTool(t.id)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tool === t.id
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title={`${t.label} (${t.shortcut})`}
        >
          {t.label}
        </button>
      ))}

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />

      {COLORS.map((c) => (
        <button
          key={c}
          onClick={() => setColor(c)}
          className={`w-6 h-6 rounded-full border-2 transition-transform ${
            color === c ? 'border-indigo-500 scale-110' : 'border-gray-300 dark:border-gray-600'
          }`}
          style={{ backgroundColor: c }}
        />
      ))}

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />

      {SIZES.map((s) => (
        <button
          key={s.id}
          onClick={() => setSize(s.value)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            size === s.value
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          {s.label}
        </button>
      ))}

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />

      <button onClick={undo} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="撤销 (Ctrl+Z)">↩️</button>
      <button onClick={() => { if (confirm('确定清空？')) clearStrokes() }} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="清空">🗑️</button>
      <button onClick={zoomIn} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="放大">+</button>
      <button onClick={zoomOut} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="缩小">-</button>
      <button onClick={resetView} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="重置视图">📐</button>
      <button onClick={toggleTheme} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="切换主题">
        {isDarkMode ? '☀️' : '🌙'}
      </button>
    </div>
  )
}

export default Toolbar
