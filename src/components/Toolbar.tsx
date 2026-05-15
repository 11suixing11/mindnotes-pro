import React, { useRef, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { useViewStore } from '../store/useViewStore'
import { useThemeStore } from '../store/useThemeStore'
import { useToastStore } from '../store/toastStore'
import ExportMenu from './ExportMenu'
import type { ToolType, BrushType } from '../store/types'

const I = {
  select: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>,
  pen: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>,
  eraser: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16l9-9 8 8-4 4z"/><path d="M6 11l4-4"/></svg>,
  pan: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>,
  rect: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>,
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

const COLORS = [
  '#3A2E22', '#C07856', '#B8A0D0', '#D49898',
  '#90B888', '#90B4D0', '#D0B888', '#A8CCE0',
]
const SIZES = [{ value: 2, dot: 4 }, { value: 4, dot: 6 }, { value: 8, dot: 9 }, { value: 16, dot: 13 }]

function getCanvas() { return document.querySelector('canvas') }

export default function Toolbar() {
  const toast = useToastStore((s) => s.show)
  const tool = useAppStore((s) => s.tool)
  const setTool = useAppStore((s) => s.setTool)
  const brush = useAppStore((s) => s.brush)
  const setBrush = useAppStore((s) => s.setBrush)
  const color = useAppStore((s) => s.color)
  const setColor = useAppStore((s) => s.setColor)
  const fillColor = useAppStore((s) => s.fillColor)
  const setFillColor = useAppStore((s) => s.setFillColor)
  const size = useAppStore((s) => s.size)
  const setSize = useAppStore((s) => s.setSize)
  const canvasBg = useAppStore((s) => s.bgColor)
  const setCanvasBg = useAppStore((s) => s.setBgColor)
  const clearAll = useAppStore((s) => s.clearAll)
  const addElement = useAppStore((s) => s.addElement)
  const undo = useAppStore((s) => s.undo)
  const redo = useAppStore((s) => s.redo)
  const undoLen = useAppStore((s) => s.undoStack.length)
  const redoLen = useAppStore((s) => s.redoStack.length)
  const zoomIn = useViewStore((s) => s.zoomIn)
  const zoomOut = useViewStore((s) => s.zoomOut)
  const resetView = useViewStore((s) => s.resetView)
  const zoom = useViewStore((s) => s.viewBox.zoom)
  const { isDarkMode, toggleTheme } = useThemeStore()
  const imgRef = useRef<HTMLInputElement>(null)
  const colorRef = useRef<HTMLInputElement>(null)
  const fillColorRef = useRef<HTMLInputElement>(null)
  const bgRef = useRef<HTMLInputElement>(null)
  const [showBrush, setShowBrush] = useState(false)
  const [brushPos, setBrushPos] = useState({ top: 0, left: 0 })
  const brushBtnRef = useRef<HTMLButtonElement>(null)

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
        const vb = useViewStore.getState().viewBox
        const x = (c.width / 2 - w / 2) / vb.zoom + vb.x
        const y = (c.height / 2 - h / 2) / vb.zoom + vb.y
        addElement({ type: 'image', id: `img-${Date.now()}`, x, y, width: w, height: h, dataUrl })
      }
      img.onerror = () => { toast('图片加载失败', 'error') }
      img.src = dataUrl
    }
    r.readAsDataURL(f); e.target.value = ''
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen()
    else document.exitFullscreen()
  }

  return (
    <>
      <div className="brand">
        <div className="brand-icon">M</div>
        <span className="brand-text">MindNotes</span>
        <span className="brand-ver">v2.1</span>
      </div>

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
          <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 4, background: canvasBg, border: '1.5px solid var(--border)' }} />
        </button>

        {(tool === 'rectangle' || tool === 'circle') && (
          <>
            <button onClick={() => {
              const next = fillColor === 'transparent' ? color : 'transparent'
              setFillColor(next)
            }} className="abtn" data-tip={fillColor === 'transparent' ? '无填充' : '有填充'}>
              <span style={{
                display: 'inline-block', width: 14, height: 14, borderRadius: 4,
                background: fillColor === 'transparent' ? 'transparent' : fillColor,
                border: '1.5px solid var(--border)',
                position: 'relative', overflow: 'hidden',
              }}>
                {fillColor === 'transparent' && (
                  <span style={{
                    position: 'absolute', top: '50%', left: -2, right: -2, height: 1.5,
                    background: 'var(--danger)', transform: 'rotate(-45deg)',
                  }} />
                )}
              </span>
            </button>
            <button onClick={() => fillColorRef.current?.click()} className="abtn" data-tip="填充色">
              <span style={{ fontSize: '10px', color: 'var(--text-4)' }}>填</span>
            </button>
          </>
        )}

        <div className="tb-sep" />

        <button onClick={() => imgRef.current?.click()} className="abtn" data-tip="插入图片">{I.image}</button>

        <button onClick={() => { if (confirm('清空画布？')) clearAll() }} className="abtn" data-tip="清屏">{I.clear}</button>

        <button onClick={toggleFullscreen} className="abtn" data-tip="全屏">{I.fullscreen}</button>

        <div className="tb-sep" />

        <ExportMenu />
      </div>

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

      {showBrush && <div className="fixed inset-0" style={{ zIndex: 5 }} onClick={() => setShowBrush(false)} />}

      <input ref={imgRef} type="file" accept="image/*" onChange={importImage}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />
      <input ref={colorRef} type="color" value={color} onChange={(e) => setColor(e.target.value)}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />
      <input ref={fillColorRef} type="color" value={fillColor === 'transparent' ? '#ffffff' : fillColor} onChange={(e) => setFillColor(e.target.value)}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />
      <input ref={bgRef} type="color" value={canvasBg} onChange={(e) => setCanvasBg(e.target.value)}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />
    </>
  )
}