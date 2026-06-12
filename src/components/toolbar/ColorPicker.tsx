import { useRef } from 'react'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import { useToastStore } from '../../store/toastStore'
import { useConfirm } from '../confirm-modal'
import { useShallow } from 'zustand/react/shallow'
import { icons } from './icons'

const COLORS = [
  '#3A2E22',
  '#C07856',
  '#B8A0D0',
  '#D49898',
  '#90B888',
  '#90B4D0',
  '#D0B888',
  '#A8CCE0',
]
const SIZES = [
  { value: 2, dot: 4 },
  { value: 4, dot: 6 },
  { value: 8, dot: 9 },
  { value: 16, dot: 13 },
]

function getCanvas() {
  return document.getElementById('main-canvas') as HTMLCanvasElement | null
}

export default function ColorPicker() {
  const toast = useToastStore((s) => s.show)
  const {
    tool,
    color,
    setColor,
    fillColor,
    setFillColor,
    size,
    setSize,
    canvasBg,
    setCanvasBg,
    clearAll,
    addElement,
    colorHistory,
  } = useAppStore(
    useShallow((s) => ({
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
      colorHistory: s.colorHistory,
    }))
  )
  const confirm = useConfirm()

  const imgRef = useRef<HTMLInputElement>(null)
  const colorRef = useRef<HTMLInputElement>(null)
  const fillColorRef = useRef<HTMLInputElement>(null)
  const bgRef = useRef<HTMLInputElement>(null)

  const importImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => {
      const dataUrl = r.result as string
      const img = new Image()
      img.onload = () => {
        const c = getCanvas()
        if (!c) return
        const dpr = window.devicePixelRatio || 1
        const cssW = c.width / dpr
        const cssH = c.height / dpr
        const maxW = cssW * 0.6,
          maxH = cssH * 0.6
        const scale = Math.min(maxW / img.width, maxH / img.height, 1)
        const w = img.width * scale,
          h = img.height * scale
        const vb = useViewStore.getState().viewBox
        const x = (cssW / 2 - w / 2) / vb.zoom + vb.x
        const y = (cssH / 2 - h / 2) / vb.zoom + vb.y
        addElement({ type: 'image', id: `img-${Date.now()}`, x, y, width: w, height: h, dataUrl })
      }
      img.onerror = () => {
        toast('图片加载失败', 'error')
      }
      img.src = dataUrl
    }
    r.readAsDataURL(f)
    e.target.value = ''
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen()
    else document.exitFullscreen()
  }

  const COLOR_NAMES: Record<string, string> = {
    '#3A2E22': '黑色',
    '#C07856': '棕色',
    '#B8A0D0': '紫色',
    '#D49898': '粉色',
    '#90B888': '绿色',
    '#90B4D0': '蓝色',
    '#D0B888': '米色',
    '#A8CCE0': '浅蓝',
  }
  const SIZE_LABELS: Record<number, string> = { 2: '极细', 4: '细', 8: '中等', 16: '粗' }

  return (
    <>
      <div className="tb-group">
        {COLORS.map((hex) => (
          <button
            key={hex}
            onClick={() => setColor(hex)}
            className={`cdot ${color === hex ? 'on' : ''}`}
            style={{ backgroundColor: hex }}
            aria-label={COLOR_NAMES[hex] ?? hex}
          />
        ))}
        <button
          onClick={() => colorRef.current?.click()}
          className="cdot border-2 border-dashed border-[var(--border)] flex items-center justify-center text-[12px] text-[var(--text-4)]"
          aria-label="自定义颜色"
        >
          +
        </button>
      </div>

      {colorHistory.length > 0 && (
        <>
          <div className="tb-sep" role="separator" />
          <div className="tb-group" aria-label="最近使用的颜色">
            {colorHistory.map((hex) => (
              <button
                key={`history-${hex}`}
                onClick={() => setColor(hex)}
                className={`cdot ${color === hex ? 'on' : ''}`}
                style={{ backgroundColor: hex }}
                aria-label={`最近颜色 ${hex}`}
              />
            ))}
          </div>
        </>
      )}

      <div className="tb-sep" role="separator" />

      <div className="tb-group">
        {SIZES.map((s) => (
          <button
            key={s.value}
            onClick={() => setSize(s.value)}
            className={`szbtn ${size === s.value ? 'on' : ''}`}
            aria-label={`${SIZE_LABELS[s.value] ?? ''} ${s.value}像素`}
          >
            <span className="dot" style={{ width: s.dot, height: s.dot }} />
          </button>
        ))}
      </div>

      <div className="tb-sep" role="separator" />

      <button
        onClick={() => bgRef.current?.click()}
        className="abtn"
        data-tip="背景色"
        aria-label="背景色"
      >
        <span
          className="inline-block w-[14px] h-[14px] rounded-[4px] border-[1.5px] border-[var(--border)]"
          style={{ background: canvasBg }}
        />
      </button>

      {(tool === 'rectangle' || tool === 'circle') && (
        <>
          <button
            onClick={() => {
              const next = fillColor === 'transparent' ? color : 'transparent'
              setFillColor(next)
            }}
            className="abtn"
            data-tip={fillColor === 'transparent' ? '无填充' : '有填充'}
            aria-label={fillColor === 'transparent' ? '无填充' : '有填充'}
          >
            <span
              className="inline-block w-[14px] h-[14px] rounded-[4px] border-[1.5px] border-[var(--border)] relative overflow-hidden"
              style={{ background: fillColor === 'transparent' ? 'transparent' : fillColor }}
            >
              {fillColor === 'transparent' && (
                <span className="absolute top-1/2 -left-[2px] -right-[2px] h-[1.5px] bg-[var(--danger)] -rotate-45" />
              )}
            </span>
          </button>
          <button
            onClick={() => fillColorRef.current?.click()}
            className="abtn"
            data-tip="填充色"
            aria-label="填充色"
          >
            <span className="text-[10px] text-[var(--text-4)]">填</span>
          </button>
        </>
      )}

      <div className="tb-sep" role="separator" />

      <button
        onClick={() => imgRef.current?.click()}
        className="abtn"
        data-tip="插入图片"
        aria-label="插入图片"
      >
        {icons.image}
      </button>

      <button
        onClick={async () => {
          if (await confirm('清空画布？')) clearAll()
        }}
        className="abtn"
        data-tip="清屏"
        aria-label="清屏"
      >
        {icons.clear}
      </button>

      <button onClick={toggleFullscreen} className="abtn" data-tip="全屏" aria-label="全屏">
        {icons.fullscreen}
      </button>

      <div className="tb-sep" role="separator" />

      <input
        ref={imgRef}
        type="file"
        accept="image/*"
        onChange={importImage}
        aria-label="选择图片文件"
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
      />
      <input
        ref={colorRef}
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        aria-label="选择颜色"
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
      />
      <input
        ref={fillColorRef}
        type="color"
        value={fillColor === 'transparent' ? '#ffffff' : fillColor}
        onChange={(e) => setFillColor(e.target.value)}
        aria-label="选择填充颜色"
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
      />
      <input
        ref={bgRef}
        type="color"
        value={canvasBg}
        onChange={(e) => setCanvasBg(e.target.value)}
        aria-label="选择背景颜色"
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
      />
    </>
  )
}
