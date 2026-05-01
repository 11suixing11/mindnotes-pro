import React, { useRef, useState } from 'react'
import { useDrawingStore } from '../store/useDrawingStore'
import { useViewStore } from '../store/useViewStore'
import { useThemeStore } from '../store/useThemeStore'
import type { ToolType } from '../store/types'

const TOOLS: { id: ToolType; icon: string; tip: string; key: string }[] = [
  { id: 'select', icon: '↖', tip: '选择', key: '0' },
  { id: 'pen',     icon: '✏', tip: '画笔', key: '1' },
  { id: 'eraser',  icon: '⌫', tip: '橡皮', key: '2' },
  { id: 'pan',     icon: '✋', tip: '平移', key: '3' },
  { id: 'rectangle', icon: '□', tip: '矩形', key: '4' },
  { id: 'circle',  icon: '○', tip: '圆形', key: '5' },
  { id: 'text',    icon: 'T',  tip: '文字', key: '6' },
  { id: 'line',    icon: '⁄',  tip: '直线', key: '7' },
  { id: 'arrow',   icon: '→',  tip: '箭头', key: '8' },
]

const COLORS = [
  '#1a1a2e', '#e03131', '#e8590c', '#f08c00',
  '#2f9e44', '#1971c2', '#7048e8', '#c2255c',
]

const SIZES = [
  { label: 'XS', value: 2, dot: 4 },
  { label: 'S',  value: 4, dot: 7 },
  { label: 'M',  value: 8, dot: 11 },
  { label: 'L',  value: 16, dot: 16 },
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
  const zoom = useViewStore((s) => s.viewBox.zoom)
  const { isDarkMode, toggleTheme } = useThemeStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const [showExport, setShowExport] = useState(false)

  const withBg = (c: HTMLCanvasElement, bg: string) => {
    const t = document.createElement('canvas'); t.width = c.width; t.height = c.height
    const ctx = t.getContext('2d')!; ctx.fillStyle = bg; ctx.fillRect(0, 0, t.width, t.height); ctx.drawImage(c, 0, 0)
    return t
  }

  const exportPNG = () => { const c = getCanvas(); if (!c) return; withBg(c, isDarkMode ? '#1a1b1e' : '#fff').toBlob(b => { if (b) download(b, `mindnotes-${ts()}.png`) }, 'image/png') }
  const exportJPG = () => { const c = getCanvas(); if (!c) return; withBg(c, '#fff').toBlob(b => { if (b) download(b, `mindnotes-${ts()}.jpg`) }, 'image/jpeg', 0.92) }
  const exportPDF = async () => {
    const c = getCanvas(); if (!c) return; const { jsPDF } = await import('jspdf')
    const d = withBg(c, isDarkMode ? '#1a1b1e' : '#fff').toDataURL('image/png')
    const p = new jsPDF({ orientation: c.width > c.height ? 'landscape' : 'portrait', unit: 'px', format: [c.width, c.height] })
    p.addImage(d, 'PNG', 0, 0, c.width, c.height); p.save(`mindnotes-${ts()}.pdf`)
  }
  const exportSVG = () => {
    const c = getCanvas(); if (!c) return; const bg = isDarkMode ? '#1a1b1e' : '#fff'
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${c.width}" height="${c.height}"><rect width="100%" height="100%" fill="${bg}"/>\n`
    for (const st of strokes) {
      if (st.name) { s += `<text x="${st.points[0][0]}" y="${st.points[0][1]}" fill="${st.color}" font-size="${st.size*4}" font-family="sans-serif">${st.name}</text>\n`; continue }
      if (st.points.length < 2) continue; let d = `M${st.points[0][0]} ${st.points[0][1]}`; for (let i=1;i<st.points.length;i++) d+=`L${st.points[i][0]} ${st.points[i][1]}`
      s += `<path d="${d}" stroke="${st.color}" stroke-width="${st.size}" fill="none" stroke-linecap="round"/>\n`
    }
    for (const sh of shapes) {
      const sx=sh.startX??sh.x,sy=sh.startY??sh.y,ex=sh.endX??sh.x+sh.width,ey=sh.endY??sh.y+sh.height
      if(sh.type==='rectangle') s+=`<rect x="${Math.min(sx,ex)}" y="${Math.min(sy,ey)}" width="${Math.abs(ex-sx)}" height="${Math.abs(ey-sy)}" stroke="${sh.color}" stroke-width="${sh.size}" fill="none"/>\n`
      else if(sh.type==='circle') s+=`<ellipse cx="${(sx+ex)/2}" cy="${(sy+ey)/2}" rx="${Math.abs(ex-sx)/2}" ry="${Math.abs(ey-sy)/2}" stroke="${sh.color}" stroke-width="${sh.size}" fill="none"/>\n`
      else if(sh.type==='line'||sh.type==='arrow') s+=`<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${sh.color}" stroke-width="${sh.size}"/>\n`
      else if(sh.type==='triangle') s+=`<polygon points="${(sx+ex)/2},${sy} ${sx},${ey} ${ex},${ey}" stroke="${sh.color}" stroke-width="${sh.size}" fill="none"/>\n`
    }
    s+='</svg>'; download(new Blob([s],{type:'image/svg+xml'}),`mindnotes-${ts()}.svg`)
  }
  const exportWord = () => {
    const c = getCanvas(); if (!c) return; const d = withBg(c, isDarkMode ? '#1a1b1e' : '#fff').toDataURL('image/png')
    const h = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset="utf-8"><style>body{font-family:sans-serif}img{max-width:100%}</style></head><body><h1>MindNotes Pro</h1><p>导出时间：${new Date().toLocaleString('zh-CN')}</p><p><img src="${d}" width="${c.width}" height="${c.height}"/></p></body></html>`
    download(new Blob([h],{type:'application/msword'}),`mindnotes-${ts()}.doc`)
  }
  const exportJSON = () => download(new Blob([JSON.stringify({strokes,shapes,version:1},null,2)],{type:'application/json'}),`mindnotes-${ts()}.json`)
  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return; const r = new FileReader()
    r.onload = () => { try { const d = JSON.parse(r.result as string); loadData(d.strokes??[], d.shapes??[]) } catch { alert('无法解析文件') } }
    r.readAsText(f); e.target.value = ''
  }

  const EXPORTS = [
    { icon: '🖼', label: 'PNG', desc: '透明背景', action: exportPNG },
    { icon: '📷', label: 'JPG', desc: '白色背景', action: exportJPG },
    { icon: '📄', label: 'PDF', desc: '自适应版式', action: exportPDF },
    { icon: '◇',  label: 'SVG', desc: '矢量无损', action: exportSVG },
    { icon: '📝', label: 'Word', desc: '嵌入截图', action: exportWord },
    { icon: '💾', label: 'JSON', desc: '数据备份', action: exportJSON },
  ]

  return (
    <>
      {/* Top toolbar */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 island toolbar z-10">
        {/* Tools */}
        <div className="toolbar-group">
          {TOOLS.map((t) => (
            <button key={t.id} onClick={() => setTool(t.id)}
              className={`tool-icon ${tool === t.id ? 'active' : ''}`}
              data-tooltip={`${t.tip} (${t.key})`}>
              {t.icon}
              <span className="key">{t.key}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-sep" />

        {/* Colors */}
        <div className="toolbar-group">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)}
              className={`color-swatch ${color === c ? 'active' : ''}`}
              style={{ backgroundColor: c }} />
          ))}
          <button onClick={() => colorInputRef.current?.click()}
            className="color-swatch"
            style={{ border: `2px dashed var(--border)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'var(--text-muted)' }}
            data-tooltip="自定义颜色">+</button>
          <input ref={colorInputRef} type="color" value={color} onChange={(e) => setColor(e.target.value)} className="hidden" />
        </div>

        <div className="toolbar-sep" />

        {/* Sizes */}
        <div className="toolbar-group">
          {SIZES.map((s) => (
            <button key={s.label} onClick={() => setSize(s.value)}
              className={`size-btn ${size === s.value ? 'active' : ''}`}
              data-tooltip={`${s.value}px`}>
              <span style={{ display: 'inline-block', width: s.dot, height: s.dot, borderRadius: '50%', background: size === s.value ? '#fff' : 'currentColor' }} />
            </button>
          ))}
        </div>

        <div className="toolbar-sep" />

        {/* Actions */}
        <div className="toolbar-group">
          <button onClick={undo} disabled={undoLen === 0} className="tool-icon" data-tooltip="撤销 (Ctrl+Z)">↩</button>
          <button onClick={redo} disabled={redoLen === 0} className="tool-icon" data-tooltip="重做 (Ctrl+Shift+Z)">↪</button>
          <button onClick={() => { if (confirm('清空所有？')) clearAll() }} className="tool-icon" data-tooltip="清空">🗑</button>
        </div>

        <div className="toolbar-sep" />

        {/* View */}
        <div className="toolbar-group">
          <button onClick={zoomIn} className="tool-icon" data-tooltip="放大">+</button>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '36px', textAlign: 'center', userSelect: 'none' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={zoomOut} className="tool-icon" data-tooltip="缩小">−</button>
          <button onClick={resetView} className="tool-icon" data-tooltip="重置视图">⊙</button>
          <button onClick={toggleTheme} className="tool-icon" data-tooltip={isDarkMode ? '浅色模式' : '深色模式'}>{isDarkMode ? '☀' : '☽'}</button>
        </div>

        <div className="toolbar-sep" />

        {/* Export */}
        <div className="relative">
          <button onClick={() => setShowExport(!showExport)} className="export-trigger">
            导出 ▾
          </button>
          {showExport && (
            <div className="dropdown island">
              {EXPORTS.map((item) => (
                <button key={item.label} onClick={() => { item.action(); setShowExport(false) }} className="dropdown-item">
                  <span className="di-icon">{item.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="di-label">{item.label}</span>
                    <span className="di-desc">{item.desc}</span>
                  </div>
                </button>
              ))}
              <div className="dropdown-sep" />
              <button onClick={() => { fileInputRef.current?.click(); setShowExport(false) }} className="dropdown-item">
                <span className="di-icon">📂</span>
                <span className="di-label">导入 JSON</span>
              </button>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept=".json" onChange={importJSON} className="hidden" />
      </div>
      {showExport && <div className="fixed inset-0 z-5" onClick={() => setShowExport(false)} />}
    </>
  )
}

export default Toolbar
