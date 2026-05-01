import React, { useRef, useState } from 'react'
import { useDrawingStore } from '../store/useDrawingStore'
import { useViewStore } from '../store/useViewStore'
import { useThemeStore } from '../store/useThemeStore'
import type { ToolType } from '../store/types'

const I = {
  select: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>,
  pen: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>,
  eraser: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16l9-9 8 8-4 4z"/><path d="M6 11l4-4"/></svg>,
  pan: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>,
  rect: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>,
  circle: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>,
  text: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
  line: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="19" x2="19" y2="5"/></svg>,
  arrow: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="13 5 19 5 19 11"/></svg>,
  undo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
  redo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>,
  trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  sun: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  zoomIn: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
  zoomOut: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
  reset: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>,
  download: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
}

const TOOLS: { id: ToolType; icon: React.ReactNode; tip: string; key: string }[] = [
  { id: 'select', icon: I.select, tip: '选择', key: '0' },
  { id: 'pen', icon: I.pen, tip: '画笔', key: '1' },
  { id: 'eraser', icon: I.eraser, tip: '橡皮', key: '2' },
  { id: 'pan', icon: I.pan, tip: '平移', key: '3' },
  { id: 'rectangle', icon: I.rect, tip: '矩形', key: '4' },
  { id: 'circle', icon: I.circle, tip: '圆形', key: '5' },
  { id: 'text', icon: I.text, tip: '文字', key: '6' },
  { id: 'line', icon: I.line, tip: '直线', key: '7' },
  { id: 'arrow', icon: I.arrow, tip: '箭头', key: '8' },
]

const COLORS = ['#1d2129', '#f53f3f', '#ff7d00', '#ffb400', '#00b42a', '#165dff', '#722ed1', '#f5319d']
const SIZES = [
  { value: 2, dot: 4 },
  { value: 4, dot: 7 },
  { value: 8, dot: 11 },
  { value: 16, dot: 16 },
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
    const ctx = t.getContext('2d')!; ctx.fillStyle = bg; ctx.fillRect(0, 0, t.width, t.height); ctx.drawImage(c, 0, 0); return t
  }
  const exportPNG = () => { const c = getCanvas(); if (!c) return; withBg(c, isDarkMode ? '#17171a' : '#fff').toBlob(b => { if (b) download(b, `mindnotes-${ts()}.png`) }, 'image/png') }
  const exportJPG = () => { const c = getCanvas(); if (!c) return; withBg(c, '#fff').toBlob(b => { if (b) download(b, `mindnotes-${ts()}.jpg`) }, 'image/jpeg', 0.92) }
  const exportPDF = async () => {
    const c = getCanvas(); if (!c) return; const { jsPDF } = await import('jspdf')
    const d = withBg(c, isDarkMode ? '#17171a' : '#fff').toDataURL('image/png')
    const p = new jsPDF({ orientation: c.width > c.height ? 'landscape' : 'portrait', unit: 'px', format: [c.width, c.height] })
    p.addImage(d, 'PNG', 0, 0, c.width, c.height); p.save(`mindnotes-${ts()}.pdf`)
  }
  const exportSVG = () => {
    const c = getCanvas(); if (!c) return; const bg = isDarkMode ? '#17171a' : '#fff'
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${c.width}" height="${c.height}"><rect width="100%" height="100%" fill="${bg}"/>\n`
    for (const st of strokes) {
      if (st.name) { s += `<text x="${st.points[0][0]}" y="${st.points[0][1]}" fill="${st.color}" font-size="${st.size * 4}" font-family="sans-serif">${st.name}</text>\n`; continue }
      if (st.points.length < 2) continue; let d = `M${st.points[0][0]} ${st.points[0][1]}`; for (let i = 1; i < st.points.length; i++) d += `L${st.points[i][0]} ${st.points[i][1]}`
      s += `<path d="${d}" stroke="${st.color}" stroke-width="${st.size}" fill="none" stroke-linecap="round"/>\n`
    }
    for (const sh of shapes) {
      const sx = sh.startX ?? sh.x, sy = sh.startY ?? sh.y, ex = sh.endX ?? sh.x + sh.width, ey = sh.endY ?? sh.y + sh.height
      if (sh.type === 'rectangle') s += `<rect x="${Math.min(sx, ex)}" y="${Math.min(sy, ey)}" width="${Math.abs(ex - sx)}" height="${Math.abs(ey - sy)}" stroke="${sh.color}" stroke-width="${sh.size}" fill="none"/>\n`
      else if (sh.type === 'circle') s += `<ellipse cx="${(sx + ex) / 2}" cy="${(sy + ey) / 2}" rx="${Math.abs(ex - sx) / 2}" ry="${Math.abs(ey - sy) / 2}" stroke="${sh.color}" stroke-width="${sh.size}" fill="none"/>\n`
      else if (sh.type === 'line' || sh.type === 'arrow') s += `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${sh.color}" stroke-width="${sh.size}"/>\n`
      else if (sh.type === 'triangle') s += `<polygon points="${(sx + ex) / 2},${sy} ${sx},${ey} ${ex},${ey}" stroke="${sh.color}" stroke-width="${sh.size}" fill="none"/>\n`
    }
    s += '</svg>'; download(new Blob([s], { type: 'image/svg+xml' }), `mindnotes-${ts()}.svg`)
  }
  const exportWord = () => {
    const c = getCanvas(); if (!c) return; const d = withBg(c, isDarkMode ? '#17171a' : '#fff').toDataURL('image/png')
    const h = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset="utf-8"><style>body{font-family:sans-serif}img{max-width:100%}</style></head><body><h1>MindNotes Pro</h1><p>导出时间：${new Date().toLocaleString('zh-CN')}</p><p><img src="${d}" width="${c.width}" height="${c.height}"/></p></body></html>`
    download(new Blob([h], { type: 'application/msword' }), `mindnotes-${ts()}.doc`)
  }
  const exportJSON = () => download(new Blob([JSON.stringify({ strokes, shapes, version: 1 }, null, 2)], { type: 'application/json' }), `mindnotes-${ts()}.json`)
  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return; const r = new FileReader()
    r.onload = () => { try { const d = JSON.parse(r.result as string); loadData(d.strokes ?? [], d.shapes ?? []) } catch { alert('无法解析文件') } }
    r.readAsText(f); e.target.value = ''
  }

  const EXPORTS = [
    { icon: '🖼️', label: 'PNG 图片', desc: '透明背景', action: exportPNG },
    { icon: '📷', label: 'JPG 图片', desc: '白色背景', action: exportJPG },
    { icon: '📄', label: 'PDF 文档', desc: '自适应版式', action: exportPDF },
    { icon: '🔷', label: 'SVG 矢量', desc: '无损缩放', action: exportSVG },
    { icon: '📝', label: 'Word 文档', desc: '嵌入截图', action: exportWord },
    { icon: '💾', label: 'JSON 数据', desc: '完整备份', action: exportJSON },
  ]

  return (
    <>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 card toolbar-wrap z-10">
        {/* 工具 */}
        <div className="tb-group">
          {TOOLS.map((t) => (
            <button key={t.id} onClick={() => setTool(t.id)}
              className={`tbtn ${tool === t.id ? 'on' : ''}`}
              data-tip={`${t.tip} (${t.key})`}>
              {t.icon}
              <span className="k">{t.key}</span>
            </button>
          ))}
        </div>

        <div className="tb-sep" />

        {/* 颜色 */}
        <div className="tb-group">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)}
              className={`cdot ${color === c ? 'on' : ''}`}
              style={{ backgroundColor: c }} />
          ))}
          <button onClick={() => colorInputRef.current?.click()}
            className="cdot"
            style={{ border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: 'var(--text-4)' }}
            data-tip="自定义颜色">+</button>
          <input ref={colorInputRef} type="color" value={color} onChange={(e) => setColor(e.target.value)} className="hidden" />
        </div>

        <div className="tb-sep" />

        {/* 线宽 */}
        <div className="tb-group">
          {SIZES.map((s) => (
            <button key={s.value} onClick={() => setSize(s.value)}
              className={`szbtn ${size === s.value ? 'on' : ''}`}
              data-tip={`${s.value}px`}>
              <span className="dot" style={{ width: s.dot, height: s.dot }} />
            </button>
          ))}
        </div>

        <div className="tb-sep" />

        {/* 操作 */}
        <div className="tb-group">
          <button onClick={undo} disabled={undoLen === 0} className="tbtn" data-tip="撤销">{I.undo}</button>
          <button onClick={redo} disabled={redoLen === 0} className="tbtn" data-tip="重做">{I.redo}</button>
          <button onClick={() => { if (confirm('清空所有？')) clearAll() }} className="tbtn" data-tip="清空">{I.trash}</button>
        </div>

        <div className="tb-sep" />

        {/* 缩放 */}
        <div className="tb-group">
          <button onClick={zoomIn} className="tbtn" data-tip="放大">{I.zoomIn}</button>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', minWidth: '42px', textAlign: 'center', userSelect: 'none' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={zoomOut} className="tbtn" data-tip="缩小">{I.zoomOut}</button>
          <button onClick={resetView} className="tbtn" data-tip="重置">{I.reset}</button>
          <button onClick={toggleTheme} className="tbtn" data-tip={isDarkMode ? '浅色' : '深色'}>{isDarkMode ? I.sun : I.moon}</button>
        </div>

        <div className="tb-sep" />

        {/* 导出 */}
        <div className="relative">
          <button onClick={() => setShowExport(!showExport)} className="exbtn">
            {I.download}
            <span>导出</span>
          </button>
          {showExport && (
            <div className="dmenu card">
              {EXPORTS.map((item) => (
                <button key={item.label} onClick={() => { item.action(); setShowExport(false) }} className="ditem">
                  <span className="di">{item.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="dl">{item.label}</span>
                    <span className="dd">{item.desc}</span>
                  </div>
                </button>
              ))}
              <div className="dsep" />
              <button onClick={() => { fileInputRef.current?.click(); setShowExport(false) }} className="ditem">
                <span className="di">📂</span>
                <span className="dl">导入 JSON</span>
              </button>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept=".json" onChange={importJSON} className="hidden" />
      </div>
      {showExport && <div className="fixed inset-0" style={{ zIndex: 5 }} onClick={() => setShowExport(false)} />}
    </>
  )
}

export default Toolbar
