import React, { useRef, useState } from 'react'
import { useDrawingStore } from '../store/useDrawingStore'
import { useViewStore } from '../store/useViewStore'
import { useThemeStore } from '../store/useThemeStore'
import type { ToolType, BrushType } from '../store/types'

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
  undo: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
  redo: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>,
  trash: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  sun: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  zoomIn: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
  zoomOut: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
  reset: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>,
  download: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  bg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>,
  image: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  clear: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
  file: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  fullscreen: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
}

const TOOLS: { id: ToolType; icon: React.ReactNode; tip: string; key: string }[] = [
  { id: 'select', icon: I.select, tip: '选择', key: '0' },
  { id: 'pen', icon: I.pen, tip: '画笔', key: '1' },
  { id: 'eraser', icon: I.eraser, tip: '橡皮', key: '2' },
  { id: 'pan', icon: I.pan, tip: '平移', key: '3' },
  { id: 'text', icon: I.text, tip: '文字', key: '6' },
]

const SHAPES: { id: ToolType; icon: React.ReactNode; tip: string; key: string }[] = [
  { id: 'rectangle', icon: I.rect, tip: '矩形', key: '4' },
  { id: 'circle', icon: I.circle, tip: '圆形', key: '5' },
  { id: 'line', icon: I.line, tip: '直线', key: '7' },
  { id: 'arrow', icon: I.arrow, tip: '箭头', key: '8' },
]

const BRUSHES: { id: BrushType; label: string; desc: string }[] = [
  { id: 'pen', label: '钢笔', desc: '平滑流畅' },
  { id: 'highlighter', label: '荧光笔', desc: '半透明宽笔' },
  { id: 'pencil', label: '铅笔', desc: '粗糙质感' },
  { id: 'calligraphy', label: '书法笔', desc: '粗细变化' },
  { id: 'dashed', label: '虚线笔', desc: '虚线笔迹' },
  { id: 'glow', label: '霓虹笔', desc: '发光效果' },
]

const COLORS = ['#2c2416', '#c45a5a', '#c47a3a', '#b8963a', '#6a9c5a', '#5a8a9c', '#8a6a9c', '#9c5a7a']
const SIZES = [{ value: 2, dot: 4 }, { value: 4, dot: 6 }, { value: 8, dot: 9 }, { value: 16, dot: 13 }]

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 200)
}
function ts() { return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-') }
function getCanvas() { return document.querySelector('canvas') }

export default function Toolbar() {
  const tool = useDrawingStore((s) => s.tool)
  const setTool = useDrawingStore((s) => s.setTool)
  const brush = useDrawingStore((s) => s.brush)
  const setBrush = useDrawingStore((s) => s.setBrush)
  const color = useDrawingStore((s) => s.color)
  const setColor = useDrawingStore((s) => s.setColor)
  const size = useDrawingStore((s) => s.size)
  const setSize = useDrawingStore((s) => s.setSize)
  const canvasBg = useDrawingStore((s) => s.canvasBg)
  const setCanvasBg = useDrawingStore((s) => s.setCanvasBg)
  const clearAll = useDrawingStore((s) => s.clearAll)
  const addStroke = useDrawingStore((s) => s.addStroke)
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
  const fileRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLInputElement>(null)
  const colorRef = useRef<HTMLInputElement>(null)
  const bgRef = useRef<HTMLInputElement>(null)
  const [showExport, setShowExport] = useState(false)
  const [showBrush, setShowBrush] = useState(false)
  const [brushPos, setBrushPos] = useState({ top: 0, left: 0 })
  const [exportPos, setExportPos] = useState({ top: 0, right: 0 })
  const brushBtnRef = useRef<HTMLButtonElement>(null)
  const exportBtnRef = useRef<HTMLButtonElement>(null)

  const withBg = (c: HTMLCanvasElement, bg: string) => {
    const dpr = window.devicePixelRatio || 1
    const w = Math.round(c.width / dpr), h = Math.round(c.height / dpr)
    const t = document.createElement('canvas'); t.width = w; t.height = h
    const ctx = t.getContext('2d')!; ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); ctx.drawImage(c, 0, 0, c.width, c.height, 0, 0, w, h); return t
  }
  const exportBlob = (c: HTMLCanvasElement, bg: string, mime: string, quality?: number): Promise<Blob | null> => {
    return new Promise((resolve) => {
      try { withBg(c, bg).toBlob(b => resolve(b), mime, quality) } catch { resolve(null) }
    })
  }
  const exportPNG = async () => {
    const c = getCanvas(); if (!c) return alert('画布未就绪')
    const b = await exportBlob(c, isDarkMode ? '#1a1610' : '#fff', 'image/png')
    if (b) download(b, `mindnotes-${ts()}.png`); else alert('PNG 导出失败')
  }
  const exportJPG = async () => {
    const c = getCanvas(); if (!c) return alert('画布未就绪')
    const b = await exportBlob(c, '#fff', 'image/jpeg', 0.92)
    if (b) download(b, `mindnotes-${ts()}.jpg`); else alert('JPG 导出失败')
  }
  const exportPDF = async () => {
    const c = getCanvas(); if (!c) return alert('画布未就绪')
    const t = withBg(c, isDarkMode ? '#1a1610' : '#fff')
    const { jsPDF } = await import('jspdf')
    const p = new jsPDF({ orientation: t.width > t.height ? 'landscape' : 'portrait', unit: 'px', format: [t.width, t.height] })
    p.addImage(t.toDataURL('image/png'), 'PNG', 0, 0, t.width, t.height); p.save(`mindnotes-${ts()}.pdf`)
  }
  const exportSVG = () => {
    const c = getCanvas(); if (!c) return alert('画布未就绪')
    const dpr = window.devicePixelRatio || 1; const lw = Math.round(c.width / dpr), lh = Math.round(c.height / dpr); const bg = isDarkMode ? '#1a1610' : '#fff'
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${lw}" height="${lh}"><rect width="100%" height="100%" fill="${bg}"/>\n`
    for (const st of strokes) { if (st.name) { s += `<text x="${st.points[0][0]}" y="${st.points[0][1]}" fill="${st.color}" font-size="${st.size * 4}" font-family="sans-serif">${st.name}</text>\n`; continue } if (st.points.length < 2) continue; let d = `M${st.points[0][0]} ${st.points[0][1]}`; for (let i = 1; i < st.points.length; i++) d += `L${st.points[i][0]} ${st.points[i][1]}`; s += `<path d="${d}" stroke="${st.color}" stroke-width="${st.size}" fill="none" stroke-linecap="round"/>\n` }
    for (const sh of shapes) { const sx = sh.startX ?? sh.x, sy = sh.startY ?? sh.y, ex = sh.endX ?? sh.x + sh.width, ey = sh.endY ?? sh.y + sh.height; if (sh.type === 'rectangle') s += `<rect x="${Math.min(sx, ex)}" y="${Math.min(sy, ey)}" width="${Math.abs(ex - sx)}" height="${Math.abs(ey - sy)}" stroke="${sh.color}" stroke-width="${sh.size}" fill="none"/>\n`; else if (sh.type === 'circle') s += `<ellipse cx="${(sx + ex) / 2}" cy="${(sy + ey) / 2}" rx="${Math.abs(ex - sx) / 2}" ry="${Math.abs(ey - sy) / 2}" stroke="${sh.color}" stroke-width="${sh.size}" fill="none"/>\n`; else if (sh.type === 'line' || sh.type === 'arrow') s += `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${sh.color}" stroke-width="${sh.size}"/>\n`; else if (sh.type === 'triangle') s += `<polygon points="${(sx + ex) / 2},${sy} ${sx},${ey} ${ex},${ey}" stroke="${sh.color}" stroke-width="${sh.size}" fill="none"/>\n` }
    s += '</svg>'; download(new Blob([s], { type: 'image/svg+xml' }), `mindnotes-${ts()}.svg`)
  }
  const exportWord = async () => {
    const c = getCanvas(); if (!c) return alert('画布未就绪')
    const t = withBg(c, isDarkMode ? '#1a1610' : '#fff')
    const d = t.toDataURL('image/png')
    const h = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset="utf-8"><style>body{font-family:sans-serif}img{max-width:100%}</style></head><body><h1>MindNotes Pro</h1><p>导出时间：${new Date().toLocaleString('zh-CN')}</p><p><img src="${d}" width="${t.width}" height="${t.height}"/></p></body></html>`
    download(new Blob([h], { type: 'application/msword' }), `mindnotes-${ts()}.doc`)
  }
  const exportJSON = () => download(new Blob([JSON.stringify({ strokes, shapes, version: 1 }, null, 2)], { type: 'application/json' }), `mindnotes-${ts()}.json`)
  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = () => {
      try {
        const d = JSON.parse(r.result as string)
        if (!d.strokes && !d.shapes) { alert('文件格式不正确'); return }
        loadData(d.strokes ?? [], d.shapes ?? [])
      } catch { alert('无法解析文件') }
    }
    r.readAsText(f)
    e.target.value = ''
  }

  const importImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = () => {
      const dataUrl = r.result as string
      const img = new Image()
      img.onload = () => {
        const c = getCanvas(); if (!c) return
        const maxW = c.width * 0.6, maxH = c.height * 0.6
        const scale = Math.min(maxW / img.width, maxH / img.height, 1)
        const w = img.width * scale, h = img.height * scale
        const viewBox = useViewStore.getState().viewBox
        const x = (c.width / 2 - w / 2) / viewBox.zoom + viewBox.x
        const y = (c.height / 2 - h / 2) / viewBox.zoom + viewBox.y
        addStroke({
          id: `img-${Date.now()}`,
          points: [[x, y]],
          color: '#000000',
          size: 0,
          tool: 'pen',
          name: '',
          imageData: dataUrl,
          imageWidth: w,
          imageHeight: h,
        } as any)
      }
      img.onerror = () => { alert('图片加载失败') }
      img.src = dataUrl
    }
    r.readAsDataURL(f)
    e.target.value = ''
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen()
    else document.exitFullscreen()
  }

  const EXPORTS = [
    { icon: I.image, label: 'PNG 图片', desc: '透明背景', action: exportPNG },
    { icon: I.image, label: 'JPG 图片', desc: '白色背景', action: exportJPG },
    { icon: I.file, label: 'PDF 文档', desc: '自适应版式', action: exportPDF },
    { icon: I.image, label: 'SVG 矢量', desc: '无损缩放', action: exportSVG },
    { icon: I.file, label: 'Word 文档', desc: '嵌入截图', action: exportWord },
    { icon: I.download, label: 'JSON 数据', desc: '完整备份', action: exportJSON },
  ]

  return (
    <>
      {/* 品牌 */}
      <div className="brand">
        <div className="brand-icon">M</div>
        <span className="brand-text">MindNotes</span>
        <span className="brand-ver">v2.1</span>
      </div>

      {/* 左侧工具栏: 工具 + 形状 + 操作 */}
      <div className="sidebar panel">
        <div className="sb-group">
          {TOOLS.map((t) => (
            <button key={t.id} onClick={() => setTool(t.id)}
              className={`tbtn ${tool === t.id ? 'on' : ''}`}
              data-tip={`${t.tip} (${t.key})`}>
              {t.icon}
              <span className="k">{t.key}</span>
            </button>
          ))}
        </div>
        <div className="sb-sep" />
        <div className="sb-group">
          {SHAPES.map((t) => (
            <button key={t.id} onClick={() => setTool(t.id)}
              className={`tbtn ${tool === t.id ? 'on' : ''}`}
              data-tip={`${t.tip} (${t.key})`}>
              {t.icon}
              <span className="k">{t.key}</span>
            </button>
          ))}
        </div>
        <div className="sb-sep" />
        <div className="sb-group">
          <button onClick={undo} disabled={undoLen === 0} className="abtn" data-tip="撤销 Ctrl+Z">{I.undo}</button>
          <button onClick={redo} disabled={redoLen === 0} className="abtn" data-tip="重做 Ctrl+Shift+Z">{I.redo}</button>
          <button onClick={() => { if (confirm('清空所有？')) clearAll() }} className="abtn" data-tip="清空">{I.trash}</button>
        </div>
        <div className="sb-sep" />
        <div className="sb-group">
          <button onClick={zoomIn} className="abtn" data-tip="放大">{I.zoomIn}</button>
          <button onClick={resetView} className="abtn" data-tip={`${Math.round(zoom * 100)}%`}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)' }}>{Math.round(zoom * 100)}</span>
          </button>
          <button onClick={zoomOut} className="abtn" data-tip="缩小">{I.zoomOut}</button>
          <button onClick={toggleTheme} className="abtn" data-tip={isDarkMode ? '浅色' : '深色'}>{isDarkMode ? I.sun : I.moon}</button>
        </div>
      </div>

      {/* 顶部属性栏: 笔型 + 颜色 + 线宽 + 背景 + 导出 */}
      <div className="topbar panel">
        {tool === 'pen' && (
          <>
            <button ref={brushBtnRef} onClick={() => {
              if (!showBrush && brushBtnRef.current) { const r = brushBtnRef.current.getBoundingClientRect(); setBrushPos({ top: r.bottom + 8, left: r.left }) }
              setShowBrush(!showBrush)
            }} className="pill-btn ghost">
              <span>{BRUSHES.find(b => b.id === brush)?.label}</span>
              <span style={{ fontSize: '9px', opacity: 0.5 }}>▾</span>
            </button>
            <div className="tb-sep" />
          </>
        )}

        <div className="tb-group">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)}
              className={`cdot ${color === c ? 'on' : ''}`}
              style={{ backgroundColor: c }} />
          ))}
          <button onClick={() => colorRef.current?.click()} className="cdot"
            style={{ border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--text-4)' }}>+</button>
        </div>

        <div className="tb-sep" />

        <div className="tb-group">
          {SIZES.map((s) => (
            <button key={s.value} onClick={() => setSize(s.value)}
              className={`szbtn ${size === s.value ? 'on' : ''}`}>
              <span className="dot" style={{ width: s.dot, height: s.dot }} />
            </button>
          ))}
        </div>

        <div className="tb-sep" />

        <button onClick={() => bgRef.current?.click()} className="abtn" data-tip="背景色">
          <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: canvasBg, border: '1.5px solid var(--border)' }} />
        </button>

        <div className="tb-sep" />

        <button onClick={() => imgRef.current?.click()} className="abtn" data-tip="插入图片">{I.image}</button>

        <button onClick={() => { if (confirm('清空画布？')) clearAll() }} className="abtn" data-tip="清屏">{I.clear}</button>

        <button onClick={toggleFullscreen} className="abtn" data-tip="全屏">{I.fullscreen}</button>

        <div className="tb-sep" />

        <div className="relative">
          <button ref={exportBtnRef} onClick={() => {
            if (!showExport && exportBtnRef.current) { const r = exportBtnRef.current.getBoundingClientRect(); setExportPos({ top: r.bottom + 8, right: window.innerWidth - r.right }) }
            setShowExport(!showExport)
          }} className="pill-btn primary">
            {I.download}
            <span>导出</span>
          </button>
          {showExport && (
            <div className="panel" style={{ position: 'fixed', top: exportPos.top, right: exportPos.right, minWidth: '200px', padding: '5px', zIndex: 100, animation: 'popIn 0.18s cubic-bezier(0.16,1,0.3,1)' }}>
              {EXPORTS.map((item) => (
                <button key={item.label} onClick={() => { item.action(); setShowExport(false) }} className="ditem">
                  <span className="di" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="dl">{item.label}</span>
                    <span className="dd">{item.desc}</span>
                  </div>
                </button>
              ))}
              <div className="dsep" />
              <button onClick={() => { fileRef.current?.click(); setShowExport(false) }} className="ditem">
                <span className="di" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{I.file}</span>
                <span className="dl">导入 JSON</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 笔型下拉 */}
      {showBrush && (
        <div className="panel" style={{ position: 'fixed', top: brushPos.top, left: brushPos.left, minWidth: '200px', padding: '5px', zIndex: 100, animation: 'popIn 0.18s cubic-bezier(0.16,1,0.3,1)' }}>
          {BRUSHES.map((b) => (
            <button key={b.id} onClick={() => { setBrush(b.id); setShowBrush(false) }}
              className="ditem" style={{ background: brush === b.id ? 'var(--primary-bg)' : undefined }}>
              <span className="di">{b.label.split(' ')[0]}</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="dl">{b.label.split(' ').slice(1).join(' ')}</span>
                <span className="dd">{b.desc}</span>
              </div>
              {brush === b.id && <span style={{ marginLeft: 'auto', color: 'var(--primary)', fontWeight: 700, fontSize: '14px' }}>✓</span>}
            </button>
          ))}
        </div>
      )}

      {showExport && <div className="fixed inset-0" style={{ zIndex: 5 }} onClick={() => setShowExport(false)} />}
      {showBrush && <div className="fixed inset-0" style={{ zIndex: 5 }} onClick={() => setShowBrush(false)} />}

      {/* 文件输入 (全局, 不受 overflow 裁剪) */}
      <input ref={fileRef} type="file" accept=".json" onChange={importJSON}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />
      <input ref={imgRef} type="file" accept="image/*" onChange={importImage}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />
      <input ref={colorRef} type="color" value={color} onChange={(e) => setColor(e.target.value)}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />
      <input ref={bgRef} type="color" value={canvasBg} onChange={(e) => setCanvasBg(e.target.value)}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />
    </>
  )
}
