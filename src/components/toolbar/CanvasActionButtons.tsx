import { memo, useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useShallow } from 'zustand/react/shallow'
import { sanitizeSvgDataUrl } from '../../canvas/svgSanitizer'
import { useAppStore } from '../../store/appStore'
import type { CanvasBackgroundStyle } from '../../store/types'
import { useToastStore } from '../../store/toastStore'
import { useConfirm } from '../confirm-modal'
import { getMainCanvas, getVisibleCanvasViewport } from '../canvas/viewport'
import { icons } from './icons'

const BACKGROUND_OPTIONS: {
  value: CanvasBackgroundStyle
  label: string
  description: string
  preview: React.CSSProperties
}[] = [
  { value: 'plain', label: '默认', description: '保留当前画布质感', preview: {} },
  {
    value: 'grid',
    label: '方格',
    description: '适合图表与布局',
    preview: {
      backgroundImage:
        'linear-gradient(rgba(86,104,128,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(86,104,128,.25) 1px, transparent 1px)',
      backgroundSize: '8px 8px',
    },
  },
  {
    value: 'dots',
    label: '点阵',
    description: '轻量的对齐参考',
    preview: {
      backgroundImage: 'radial-gradient(circle, rgba(76,92,112,.45) 1px, transparent 1.2px)',
      backgroundSize: '8px 8px',
    },
  },
  {
    value: 'ruled',
    label: '横线',
    description: '适合连续书写',
    preview: {
      backgroundImage: 'linear-gradient(rgba(86,104,128,.25) 1px, transparent 1px)',
      backgroundSize: '100% 8px',
    },
  },
  {
    value: 'notebook',
    label: '笔记本',
    description: '横线与页边距',
    preview: {
      backgroundImage:
        'linear-gradient(90deg, transparent 8px, rgba(205,92,92,.45) 8px, rgba(205,92,92,.45) 9px, transparent 9px), linear-gradient(rgba(86,104,128,.25) 1px, transparent 1px)',
      backgroundSize: '100% 100%, 100% 8px',
    },
  },
]

const CanvasActionButtons = memo(function CanvasActionButtons() {
  const toast = useToastStore((s) => s.show)
  const confirm = useConfirm()
  const [showBackground, setShowBackground] = useState(false)
  const [backgroundPos, setBackgroundPos] = useState({ top: 0, left: 0 })
  const { canvasBg, setCanvasBg, backgroundStyle, setBackgroundStyle, clearAll, addElement } =
    useAppStore(
      useShallow((s) => ({
        canvasBg: s.bgColor,
        setCanvasBg: s.setBgColor,
        backgroundStyle: s.backgroundStyle,
        setBackgroundStyle: s.setBackgroundStyle,
        clearAll: s.clearAll,
        addElement: s.addElement,
      }))
    )

  const imgRef = useRef<HTMLInputElement>(null)
  const bgRef = useRef<HTMLInputElement>(null)
  const backgroundBtnRef = useRef<HTMLButtonElement>(null)

  const toggleBackgroundMenu = useCallback(() => {
    if (!showBackground && backgroundBtnRef.current) {
      const rect = backgroundBtnRef.current.getBoundingClientRect()
      setBackgroundPos({ top: rect.bottom + 8, left: Math.max(8, rect.left - 8) })
    }
    setShowBackground((visible) => !visible)
  }, [showBackground])

  const importImage = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (!f) return
      const r = new FileReader()
      r.onload = () => {
        const dataUrl = r.result as string
        const safeDataUrl = sanitizeSvgDataUrl(dataUrl)
        const img = new Image()
        img.onload = () => {
          const c = getMainCanvas()
          if (!c) return
          const viewport = getVisibleCanvasViewport(c)
          const maxW = viewport.width * 0.6
          const maxH = viewport.height * 0.6
          const scale = Math.min(maxW / img.width, maxH / img.height, 1)
          const w = img.width * scale
          const h = img.height * scale
          addElement({
            type: 'image',
            id: `img-${Date.now()}`,
            x: viewport.centerX - w / 2,
            y: viewport.centerY - h / 2,
            width: w,
            height: h,
            dataUrl: safeDataUrl,
          })
        }
        img.onerror = () => {
          toast('图片加载失败', 'error')
        }
        img.src = safeDataUrl
      }
      r.readAsDataURL(f)
      e.target.value = ''
    },
    [addElement, toast]
  )

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen()
    else document.exitFullscreen()
  }, [])

  return (
    <>
      <button
        ref={backgroundBtnRef}
        onClick={toggleBackgroundMenu}
        className="abtn"
        data-tip="背景设置"
        aria-label="背景设置"
        aria-haspopup="menu"
        aria-expanded={showBackground}
      >
        <span
          className="inline-block w-[14px] h-[14px] rounded-[4px] border-[1.5px] border-[var(--border)]"
          style={{
            backgroundColor: canvasBg,
            ...BACKGROUND_OPTIONS.find((option) => option.value === backgroundStyle)?.preview,
          }}
        />
      </button>

      {showBackground &&
        createPortal(
          <>
            <div
              className="panel em-menu"
              role="menu"
              aria-label="背景样式"
              style={{ top: backgroundPos.top, left: backgroundPos.left }}
            >
              {BACKGROUND_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="ditem"
                  role="menuitemradio"
                  aria-checked={backgroundStyle === option.value}
                  onClick={() => {
                    setBackgroundStyle(option.value)
                    setShowBackground(false)
                  }}
                >
                  <span
                    className="di rounded-[3px] border border-[var(--border)]"
                    style={{ width: 28, height: 22, backgroundColor: canvasBg, ...option.preview }}
                  />
                  <span className="em-labels">
                    <span className="dl">{option.label}</span>
                    <span className="dd">{option.description}</span>
                  </span>
                </button>
              ))}
              <div className="dsep" />
              <button
                type="button"
                className="ditem"
                onClick={() => {
                  bgRef.current?.click()
                  setShowBackground(false)
                }}
              >
                <span
                  className="di rounded-full border border-[var(--border)]"
                  style={{ width: 18, height: 18, backgroundColor: canvasBg }}
                />
                <span className="dl">自定义背景色</span>
              </button>
            </div>
            <div className="em-overlay" onClick={() => setShowBackground(false)} />
          </>,
          document.body
        )}

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

      <input
        ref={imgRef}
        type="file"
        accept="image/*"
        onChange={importImage}
        aria-label="选择图片文件"
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
})

export default CanvasActionButtons
