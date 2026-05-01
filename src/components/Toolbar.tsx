import React, { useRef } from 'react'
import { useDrawingStore } from '../store/useDrawingStore'
import { useViewStore } from '../store/useViewStore'
import { useThemeStore } from '../store/useThemeStore'
import type { Stroke, Shape, ToolType } from '../store/types'

const TOOLS: { id: ToolType; label: string; shortcut: string }[] = [
  { id: 'pen', label: '✏️ 笔', shortcut: '1' },
  { id: 'eraser', label: '🧹 橡皮', shortcut: '2' },
  { id: 'pan', label: '✋ 平移', shortcut: '3' },
  { id: 'rectangle', label: '⬜ 矩形', shortcut: '4' },
  { id: 'circle', label: '⭕ 圆形', shortcut: '5' },
]

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
const SIZES = [
  { label: '细', value: 2 },
  { label: '中', value: 4 },
  { label: '粗', value: 8 },
  { label: '特粗', value: 16 },
]

const Toolbar: React.FC = () => {
  const tool = useDrawingStore((s) => s.tool)
  const setTool = useDrawingStore((s) => s.setTool)
  const color = useDrawingStore((s) => s.color)
  const setColor = useDrawingStore((s) => s.setColor)
  const size = useDrawingStore((s) => s.size)
  const setSize = useDrawingStore((s) => s.setSize)
  const clearAll = useDrawingStore((s) => s.clearAll)
  const strokes = useDrawingStore((s) => s.strokes)
  const shapes = useDrawingStore((s) => s.shapes)
  const loadData = useDrawingStore((s) => s.loadData)
  const zoomIn = useViewStore((s) => s.zoomIn)
  const zoomOut = useViewStore((s) => s.zoomOut)
  const resetView = useViewStore((s) => s.resetView)
  const { isDarkMode, toggleTheme } = useThemeStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const exportPNG = () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `mindnotes-${new Date().toISOString().slice(0, 10)}.png`
    a.click()
  }

  const exportJSON = () => {
    const data = JSON.stringify({ strokes, shapes, version: 1 }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mindnotes-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        const importedStrokes: Stroke[] = data.strokes ?? []
        const importedShapes: Shape[] = data.shapes ?? []
        loadData(importedStrokes, importedShapes)
      } catch {
        alert('无法解析文件，请确认是 MindNotes 导出的 JSON 文件')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center gap-2 z-10">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          onClick={() => setTool(t.id)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tool === t.id
              ? 'bg-indigo-500 text-white shadow'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title={`${t.label} (${t.shortcut})`}
        >
          {t.label}
        </button>
      ))}

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

      {COLORS.map((c) => (
        <button
          key={c}
          onClick={() => setColor(c)}
          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
            color === c ? 'border-indigo-500 scale-110 ring-2 ring-indigo-300' : 'border-gray-300 dark:border-gray-600'
          }`}
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

      {SIZES.map((s) => (
        <button
          key={s.label}
          onClick={() => setSize(s.value)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            size === s.value
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title={`${s.label} (${s.value}px)`}
        >
          {s.label}
        </button>
      ))}

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

      <button onClick={() => { if (confirm('清空所有笔迹？')) clearAll() }} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" title="清空">🗑️</button>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

      <button onClick={zoomIn} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-bold" title="放大">+</button>
      <button onClick={zoomOut} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-bold" title="缩小">−</button>
      <button onClick={resetView} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" title="重置视图">⊙</button>
      <button onClick={toggleTheme} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" title="切换主题">
        {isDarkMode ? '☀️' : '🌙'}
      </button>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

      <button onClick={exportPNG} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" title="导出 PNG">📷</button>
      <button onClick={exportJSON} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" title="保存到本地 JSON">💾</button>
      <button onClick={() => fileInputRef.current?.click()} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" title="从 JSON 导入">📂</button>
      <input ref={fileInputRef} type="file" accept=".json" onChange={importJSON} className="hidden" />
    </div>
  )
}

export default Toolbar
