import React, { useRef, useState } from 'react'
import { useDrawingStore } from '../store/useDrawingStore'
import { useViewStore } from '../store/useViewStore'
import { useThemeStore } from '../store/useThemeStore'
import type { ToolType } from '../store/types'

const TOOLS: { id: ToolType; label: string; shortcut: string }[] = [
  { id: 'select', label: '🔲 选择', shortcut: '0' },
  { id: 'pen', label: '✏️ 笔', shortcut: '1' },
  { id: 'eraser', label: '🧹 橡皮', shortcut: '2' },
  { id: 'text', label: '🔤 文字', shortcut: '6' },
  { id: 'pan', label: '✋ 平移', shortcut: '3' },
  { id: 'rectangle', label: '⬜ 矩形', shortcut: '4' },
  { id: 'circle', label: '⭕ 圆形', shortcut: '5' },
  { id: 'line', label: '📏 直线', shortcut: '7' },
  { id: 'arrow', label: '➡️ 箭头', shortcut: '8' },
]

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
const SIZES = [
  { label: '细', value: 2 },
  { label: '中', value: 4 },
  { label: '粗', value: 8 },
  { label: '特粗', value: 16 },
]

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
function ts() { return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-') }
function getCanvas() { return document.querySelector('canvas') }

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
  const undo = useDrawingStore((s) => s.undo)
  const redo = useDrawingStore((s) => s.redo)
  const undoLen = useDrawingStore((s) => s.undoStack.length)
  const redoLen = useDrawingStore((s) => s.redoStack.length)
  const zoomIn = useViewStore((s) => s.zoomIn)
  const zoomOut = useViewStore((s) => s.zoomOut)
  const resetView = useViewStore((s) => s.resetView)
  const { isDarkMode, toggleTheme } = useThemeStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const [showExport, setShowExport] = useState(false)

  const exportPNG = () => {
    const c = getCanvas(); if (!c) return
    const tmp = document.createElement('canvas'); tmp.width = c.width; tmp.height = c.height
    const ctx = tmp.getContext('2d')!
    ctx.fillStyle = isDarkMode ? '#1f2937' : '#ffffff'
    ctx.fillRect(0, 0, tmp.width, tmp.height); ctx.drawImage(c, 0, 0)
    tmp.toBlob((blob) => { if (blob) download(blob, `mindnotes-${ts()}.png`) }, 'image/png')
  }
  const exportJPG = () => {
    const c = getCanvas(); if (!c) return
    const tmp = document.createElement('canvas'); tmp.width = c.width; tmp.height = c.height
    const ctx = tmp.getContext('2d')!
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, tmp.width, tmp.height); ctx.drawImage(c, 0, 0)
    tmp.toBlob((blob) => { if (blob) download(blob, `mindnotes-${ts()}.jpg`) }, 'image/jpeg', 0.92)
  }
  const exportPDF = async () => {
    const c = getCanvas(); if (!c) return
    const { jsPDF } = await import('jspdf')
    const tmp = document.createElement('canvas'); tmp.width = c.width; tmp.height = c.height
    const ctx = tmp.getContext('2d')!
    ctx.fillStyle = isDarkMode ? '#1f2937' : '#ffffff'
    ctx.fillRect(0, 0, tmp.width, tmp.height); ctx.drawImage(c, 0, 0)
    const imgData = tmp.toDataURL('image/png')
    const landscape = c.width > c.height
    const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'px', format: [c.width, c.height] })
    pdf.addImage(imgData, 'PNG', 0, 0, c.width, c.height)
    pdf.save(`mindnotes-${ts()}.pdf`)
  }
  const exportSVG = () => {
    const c = getCanvas(); if (!c) return
    const bg = isDarkMode ? '#1f2937' : '#ffffff'
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${c.width}" height="${c.height}"><rect width="100%" height="100%" fill="${bg}"/>\n`
    for (const s of strokes) {
      if (s.name) { svg += `  <text x="${s.points[0][0]}" y="${s.points[0][1]}" fill="${s.color}" font-size="${s.size * 4}" font-family="sans-serif">${s.name}</text>\n`; continue }
      if (s.points.length < 2) continue
      let d = `M${s.points[0][0]} ${s.points[0][1]}`
      for (let i = 1; i < s.points.length; i++) d += ` L${s.points[i][0]} ${s.points[i][1]}`
      svg += `  <path d="${d}" stroke="${s.color}" stroke-width="${s.size}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n`
    }
    for (const sh of shapes) {
      const sx = sh.startX ?? sh.x, sy = sh.startY ?? sh.y
      const ex = sh.endX ?? sh.x + sh.width, ey = sh.endY ?? sh.y + sh.height
      if (sh.type === 'rectangle') svg += `  <rect x="${Math.min(sx,ex)}" y="${Math.min(sy,ey)}" width="${Math.abs(ex-sx)}" height="${Math.abs(ey-sy)}" stroke="${sh.color}" stroke-width="${sh.size}" fill="none"/>\n`
      else if (sh.type === 'circle') svg += `  <ellipse cx="${(sx+ex)/2}" cy="${(sy+ey)/2}" rx="${Math.abs(ex-sx)/2}" ry="${Math.abs(ey-sy)/2}" stroke="${sh.color}" stroke-width="${sh.size}" fill="none"/>\n`
      else if (sh.type === 'line' || sh.type === 'arrow') svg += `  <line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${sh.color}" stroke-width="${sh.size}"/>\n`
      else if (sh.type === 'triangle') svg += `  <polygon points="${(sx+ex)/2},${sy} ${sx},${ey} ${ex},${ey}" stroke="${sh.color}" stroke-width="${sh.size}" fill="none"/>\n`
    }
    svg += '</svg>'
    download(new Blob([svg], { type: 'image/svg+xml' }), `mindnotes-${ts()}.svg`)
  }
  const exportWord = () => {
    const c = getCanvas(); if (!c) return
    const tmp = document.createElement('canvas'); tmp.width = c.width; tmp.height = c.height
    const ctx = tmp.getContext('2d')!
    ctx.fillStyle = isDarkMode ? '#1f2937' : '#ffffff'
    ctx.fillRect(0, 0, tmp.width, tmp.height); ctx.drawImage(c, 0, 0)
    const imgData = tmp.toDataURL('image/png')
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset="utf-8"><style>body{font-family:sans-serif}img{max-width:100%}</style></head><body><h1>MindNotes Pro</h1><p>导出时间：${new Date().toLocaleString('zh-CN')}</p><p><img src="${imgData}" width="${c.width}" height="${c.height}"/></p></body></html>`
    download(new Blob([html], { type: 'application/msword' }), `mindnotes-${ts()}.doc`)
  }
  const exportJSON = () => {
    download(new Blob([JSON.stringify({ strokes, shapes, version: 1 }, null, 2)], { type: 'application/json' }), `mindnotes-${ts()}.json`)
  }
  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => { try { const d = JSON.parse(reader.result as string); loadData(d.strokes ?? [], d.shapes ?? []) } catch { alert('无法解析文件') } }
    reader.readAsText(file); e.target.value = ''
  }

  const EXPORTS = [
    { label: '📷 PNG 图片', action: exportPNG },
    { label: '🖼️ JPG 图片', action: exportJPG },
    { label: '📄 PDF 文档', action: exportPDF },
    { label: '🔷 SVG 矢量', action: exportSVG },
    { label: '📝 Word 文档', action: exportWord },
    { label: '💾 JSON 数据', action: exportJSON },
  ]

  return (
    <>
      <div className="fixed top-3 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 z-10 max-w-[98vw]">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {TOOLS.map((t) => (
            <button key={t.id} onClick={() => setTool(t.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tool === t.id ? 'bg-indigo-500 text-white shadow' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              title={`${t.label} (${t.shortcut})`}>{t.label}</button>
          ))}

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-0.5" />

          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-indigo-500 scale-110 ring-2 ring-indigo-300' : 'border-gray-300 dark:border-gray-600'}`}
                style={{ backgroundColor: c }} />
            ))}
            <button onClick={() => colorInputRef.current?.click()} className="w-6 h-6 rounded-full border-2 border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center text-xs hover:scale-110 transition-transform" title="自定义颜色">+</button>
            <input ref={colorInputRef} type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-0 h-0 opacity-0 absolute" />
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-0.5" />

          {SIZES.map((s) => (
            <button key={s.label} onClick={() => setSize(s.value)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${size === s.value ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              title={`${s.label} (${s.value}px)`}>{s.label}</button>
          ))}

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-0.5" />

          <button onClick={undo} disabled={undoLen === 0} className={`px-2 py-1 rounded text-sm ${undoLen > 0 ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : 'opacity-30 cursor-not-allowed'}`} title="撤销 (Ctrl+Z)">↩️</button>
          <button onClick={redo} disabled={redoLen === 0} className={`px-2 py-1 rounded text-sm ${redoLen > 0 ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : 'opacity-30 cursor-not-allowed'}`} title="重做 (Ctrl+Shift+Z)">↪️</button>
          <button onClick={() => { if (confirm('清空所有笔迹？')) clearAll() }} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" title="清空">🗑️</button>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-0.5" />

          <button onClick={zoomIn} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-bold" title="放大">+</button>
          <button onClick={zoomOut} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-bold" title="缩小">−</button>
          <button onClick={resetView} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" title="重置视图">⊙</button>
          <button onClick={toggleTheme} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" title="切换主题">{isDarkMode ? '☀️' : '🌙'}</button>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-0.5" />

          <div className="relative">
            <button onClick={() => setShowExport(!showExport)} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">导出 ▾</button>
            {showExport && (
              <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1 min-w-[180px] z-20">
                {EXPORTS.map((item) => (
                  <button key={item.label} onClick={() => { item.action(); setShowExport(false) }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">{item.label}</button>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <button onClick={() => { fileInputRef.current?.click(); setShowExport(false) }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">📂 导入 JSON</button>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".json" onChange={importJSON} className="hidden" />
        </div>
      </div>
      {showExport && <div className="fixed inset-0 z-5" onClick={() => setShowExport(false)} />}
    </>
  )
}

export default Toolbar
