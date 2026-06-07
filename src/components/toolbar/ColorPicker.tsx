import { useRef } from 'react'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import { useToastStore } from '../../store/toastStore'
import { useConfirm } from '../ConfirmModal'
import { useShallow } from 'zustand/react/shallow'
import { icons } from './icons'

const COLORS = [
  '#3A2E22', '#C07856', '#B8A0D0', '#D49898',
  '#90B888', '#90B4D0', '#D0B888', '#A8CCE0',
]
const SIZES = [{ value: 2, dot: 4 }, { value: 4, dot: 6 }, { value: 8, dot: 9 }, { value: 16, dot: 13 }]

function getCanvas() { return document.querySelector('canvas') }

export default function ColorPicker() {
  const toast = useToastStore((s) => s.show)
  const {
    tool, color, setColor,
    fillColor, setFillColor,
    size, setSize,
    canvasBg, setCanvasBg,
    clearAll, addElement,
  } = useAppStore(useShallow((s) => ({
    tool: s.tool,
    color: s.color,
    setColor: s.setColor,
    fillColor: s.fillColor,
    setFillColor: s.setFillColor,
    size: s.size,
    setSize: s.setSize,
    canvasBg: s.bgColor,
    setCanvasBg: s.setBgColor,
    clearAll: s.clearAll,
    addElement: s.addElement,
  })))
  const confirm = useConfirm()

  const imgRef = useRef<HTMLInputElement>(null)
  const colorRef = useRef<HTMLInputElement>(null)
  const fillColorRef = useRef<HTMLInputElement>(null)
  const bgRef = useRef<HTMLInputElement>(null)

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

      <button onClick={() => imgRef.current?.click()} className="abtn" data-tip="插入图片">{icons.image}</button>

      <button onClick={async () => { if (await confirm('清空画布？')) clearAll() }} className="abtn" data-tip="清屏">{icons.clear}</button>

      <button onClick={toggleFullscreen} className="abtn" data-tip="全屏">{icons.fullscreen}</button>

      <div className="tb-sep" />

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
