import React, { useRef, useState } from 'react'
import { useDrawingStore } from '../store/useDrawingStore'
import { useViewStore } from '../store/useViewStore'
import { useThemeStore } from '../store/useThemeStore'
import type { ToolType } from '../store/types'

const TOOLS: { id: ToolType; icon: string; tip: string; key: string }[] = [
  { id: 'select', icon: '⬚', tip: '选择 · 0', key: '0' },
  { id: 'pen', icon: '✎', tip: '画笔 · 1', key: '1' },
  { id: 'eraser', icon: '◻', tip: '橡皮 · 2', key: '2' },
  { id: 'pan', icon: '✥', tip: '平移 · 3', key: '3' },
  { id: 'rectangle', icon: '▭', tip: '矩形 · 4', key: '4' },
  { id: 'circle', icon: '◯', tip: '圆形 · 5', key: '5' },
  { id: 'text', icon: 'T', tip: '文字 · 6', key: '6' },
  { id: 'line', icon: '╲', tip: '直线 · 7', key: '7' },
  { id: 'arrow', icon: '→', tip: '箭头 · 8', key: '8' },
]

const COLORS = [
  '#1e293b', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
]

const SIZES = [
  { label: 'XS', value: 2 },
  { label: 'S', value: 4 },
  { label: 'M', value: 8 },
  { label: 'L', value: 16 },
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
    ctx.fillStyle = isDarkMode ? '#0f172a' : '#ffffff'
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
    ctx.fillStyle = isDarkMode ? '#0f172a' : '#ffffff'
    ctx.fillRect(0, 0, tmp.width, tmp.height); ctx.drawImage(c, 0, 0)
    const imgData = tmp.toDataURL('image/png')
    const landscape = c.width > c.height
    const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'px', format: [c.width, c.height] })
    pdf.addImage(imgData, 'PNG', 0, 0, c.width, c.height)
    pdf.save(`mindnotes-${ts()}.pdf`)
  }
  const exportSVG = () => {
    const c = getCanvas(); if (!c) return
    const bg = isDarkMode ? '#0f172a' : '#ffffff'
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
    ctx.fillStyle = isDarkMode ? '#0f172a' : '#ffffff'
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
    { icon: '📷', label: 'PNG 图片', desc: '透明背景', action: exportPNG },
    { icon: '🖼️', label: 'JPG 图片', desc: '白色背景', action: exportJPG },
    { icon: '📄', label: 'PDF 文档', desc: '自适应版式', action: exportPDF },
    { icon: '🔷', label: 'SVG 矢量', desc: '无损缩放', action: exportSVG },
    { icon: '📝', label: 'Word 文档', desc: '嵌入截图', action: exportWord },
    { icon: '💾', label: 'JSON 数据', desc: '完整备份', action: exportJSON },
  ]

  return (
    <>
      <div className="fixed top-3 left-1/2 -translate-x-1/2 glass-panel rounded-2xl px-3 py-2 z-10 max-w-[98vw]">
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {TOOLS.map((t) => (
            <button key={t.id} onClick={() => setTool(t.id)}
              className={`tool-btn ${tool === t.id ? 'active' : ''}`}
              data-tip={t.tip}>{t.icon}</button>
          ))}

          <div className="separator" />

          <div className="flex items-center gap-1.5 mx-1">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={`color-swatch ${color === c ? 'active' : ''}`}
                style={{ backgroundColor: c }} />
            ))}
            <button onClick={() => colorInputRef.current?.click()}
              className="color-swatch flex items-center justify-center text-xs font-bold"
              style={{ border: `2px dashed var(--border-color)`, color: 'var(--text-secondary)', fontSize: '14px' }}
              data-tip="自定义颜色">+</button>
            <input ref={colorInputRef} type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-0 h-0 opacity-0 absolute" />
          </div>

          <div className="separator" />

          {SIZES.map((s) => (
            <button key={s.label} onClick={() => setSize(s.value)}
              className={`size-btn ${size === s.value ? 'active' : ''}`}
              data-tip={`${s.value}px`}>{s.label}</button>
          ))}

          <div className="separator" />

          <button onClick={undo} disabled={undoLen === 0} className="action-btn" data-tip="撤销 · Ctrl+Z">↩</button>
          <button onClick={redo} disabled={redoLen === 0} className="action-btn" data-tip="重做 · Ctrl+Shift+Z">↪</button>
          <button onClick={() => { if (confirm('清空所有笔迹？')) clearAll() }} className="action-btn" data-tip="清空">🗑</button>

          <div className="separator" />

          <button onClick={zoomIn} className="action-btn" data-tip="放大">+</button>
          <button onClick={zoomOut} className="action-btn" data-tip="缩小">−</button>
          <button onClick={resetView} className="action-btn" data-tip="重置视图">⊙</button>
          <button onClick={toggleTheme} className="action-btn" data-tip="切换主题">{isDarkMode ? '☀' : '☽'}</button>

          <div className="separator" />

          <div className="relative">
            <button onClick={() => setShowExport(!showExport)} className="export-btn">
              <span>导出</span>
              <span style={{ fontSize: '10px', opacity: 0.8 }}>▾</span>
            </button>
            {showExport && (
              <div className="export-dropdown glass-panel">
                {EXPORTS.map((item) => (
                  <button key={item.label} onClick={() => { item.action(); setShowExport(false) }}
                    className="export-item">
                    <span className="icon">{item.icon}</span>
                    <div className="flex flex-col items-start">
                      <span>{item.label}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 400 }}>{item.desc}</span>
                    </div>
                  </button>
                ))}
                <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 8px' }} />
                <button onClick={() => { fileInputRef.current?.click(); setShowExport(false) }}
                  className="export-item">
                  <span className="icon">📂</span>
                  <span>导入 JSON</span>
                </button>
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
