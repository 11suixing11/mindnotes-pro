import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Download,
  ImagePlus,
  Maximize2,
  Minimize2,
  Moon,
  MoreHorizontal,
  Sun,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { sanitizeImageDataUrl } from '../../canvas/svgSanitizer'
import { useAppStore } from '../../store/appStore'
import { createRuntimeId } from '../../store/runtimeId'
import { useThemeStore } from '../../store/useThemeStore'
import type { CanvasBackgroundStyle } from '../../store/types'
import { useViewStore } from '../../store/useViewStore'
import { useToastStore } from '../../store/toastStore'
import { getMainCanvas, getVisibleCanvasViewport } from '../canvas/viewport'
import { useDialogFocus } from '../useDialogFocus'

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

interface CanvasActionButtonsProps {
  canInstall?: boolean
  onInstall?: () => void
}

const CanvasActionButtons = memo(function CanvasActionButtons({
  canInstall = false,
  onInstall,
}: CanvasActionButtonsProps) {
  const toast = useToastStore((state) => state.show)
  const [showMore, setShowMore] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 8 })
  const { canvasBg, setCanvasBg, backgroundStyle, setBackgroundStyle, addElement } = useAppStore(
    useShallow((state) => ({
      canvasBg: state.bgColor,
      setCanvasBg: state.setBgColor,
      backgroundStyle: state.backgroundStyle,
      setBackgroundStyle: state.setBackgroundStyle,
      addElement: state.addElement,
    }))
  )
  const {
    zoomIn,
    zoomOut,
    resetView,
    zoom,
    showGrid,
    toggleGrid,
    snapToGrid,
    toggleSnapToGrid,
    gridSize,
    setGridSize,
  } = useViewStore(
    useShallow((state) => ({
      zoomIn: state.zoomIn,
      zoomOut: state.zoomOut,
      resetView: state.resetView,
      zoom: state.viewBox.zoom,
      showGrid: state.showGrid,
      toggleGrid: state.toggleGrid,
      snapToGrid: state.snapToGrid,
      toggleSnapToGrid: state.toggleSnapToGrid,
      gridSize: state.gridSize,
      setGridSize: state.setGridSize,
    }))
  )
  const { isDarkMode, toggleTheme } = useThemeStore()

  const imgRef = useRef<HTMLInputElement>(null)
  const bgRef = useRef<HTMLInputElement>(null)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const closeMoreMenu = useCallback(() => setShowMore(false), [])
  const moreMenuRef = useDialogFocus<HTMLDivElement>({ open: showMore, onClose: closeMoreMenu })

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement))
    syncFullscreen()
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  const toggleMoreMenu = useCallback(() => {
    if (!showMore && moreBtnRef.current) {
      const rect = moreBtnRef.current.getBoundingClientRect()
      setMenuPos({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      })
    }
    setShowMore((visible) => !visible)
  }, [showMore])

  const importImage = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const safeDataUrl = sanitizeImageDataUrl(reader.result as string)
        if (!safeDataUrl) {
          toast('图片格式不受支持', 'error')
          return
        }
        const image = new Image()
        image.onload = () => {
          const canvas = getMainCanvas()
          if (!canvas) return
          const viewport = getVisibleCanvasViewport(canvas)
          const scale = Math.min(
            (viewport.width * 0.6) / image.width,
            (viewport.height * 0.6) / image.height,
            1
          )
          const width = image.width * scale
          const height = image.height * scale
          addElement({
            type: 'image',
            id: createRuntimeId('img'),
            x: viewport.centerX - width / 2,
            y: viewport.centerY - height / 2,
            width,
            height,
            dataUrl: safeDataUrl,
          })
        }
        image.onerror = () => toast('图片加载失败', 'error')
        image.src = safeDataUrl
      }
      reader.onerror = () => toast('图片读取失败，请重试', 'error')
      reader.readAsDataURL(file)
      event.target.value = ''
    },
    [addElement, toast]
  )

  const toggleFullscreen = useCallback(() => {
    const request = async () => {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
        else await document.exitFullscreen()
      } catch {
        toast('全屏切换失败，请检查浏览器权限', 'error')
      }
    }
    void request()
    closeMoreMenu()
  }, [closeMoreMenu, toast])

  return (
    <>
      <button
        type="button"
        onClick={() => imgRef.current?.click()}
        className="abtn toolbar-tail-button"
        title="插入图片"
        aria-label="插入图片"
      >
        <ImagePlus size={16} aria-hidden="true" />
      </button>

      <button
        ref={moreBtnRef}
        type="button"
        onClick={toggleMoreMenu}
        className="abtn toolbar-tail-button"
        title="画布更多"
        aria-label="画布更多"
        aria-haspopup="menu"
        aria-expanded={showMore}
      >
        <MoreHorizontal size={17} aria-hidden="true" />
      </button>

      {showMore &&
        createPortal(
          <>
            <div
              ref={moreMenuRef}
              className="panel toolbar-menu canvas-more-menu"
              role="menu"
              aria-label="画布更多"
              tabIndex={-1}
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              <div className="toolbar-menu-label">缩放</div>
              <div className="canvas-more-zoom" role="group" aria-label="缩放">
                <button type="button" role="menuitem" onClick={zoomOut} aria-label="缩小">
                  <ZoomOut size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={resetView}
                  aria-label={`重置缩放，当前 ${Math.round(zoom * 100)}%`}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button type="button" role="menuitem" onClick={zoomIn} aria-label="放大">
                  <ZoomIn size={16} aria-hidden="true" />
                </button>
              </div>

              <div className="toolbar-menu-separator" role="separator" />
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={showGrid}
                className="toolbar-menu-item"
                onClick={toggleGrid}
              >
                显示网格
              </button>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={snapToGrid}
                className="toolbar-menu-item"
                onClick={toggleSnapToGrid}
              >
                网格吸附
              </button>
              <div className="toolbar-menu-label">网格大小</div>
              <div className="canvas-more-grid-sizes" role="group" aria-label="网格大小">
                {([10, 20, 40] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={gridSize === value}
                    onClick={() => setGridSize(value)}
                  >
                    {value}px
                  </button>
                ))}
              </div>

              <div className="toolbar-menu-separator" role="separator" />
              <div className="toolbar-menu-label">背景</div>
              {BACKGROUND_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="toolbar-menu-item toolbar-background-item"
                  role="menuitemradio"
                  aria-checked={backgroundStyle === option.value}
                  onClick={() => setBackgroundStyle(option.value)}
                >
                  <span
                    className="toolbar-background-preview"
                    style={{ backgroundColor: canvasBg, ...option.preview }}
                  />
                  <span>
                    <span>{option.label}</span>
                    <small>{option.description}</small>
                  </span>
                </button>
              ))}
              <button
                type="button"
                className="toolbar-menu-item"
                role="menuitem"
                onClick={() => bgRef.current?.click()}
              >
                自定义背景色
              </button>

              <div className="toolbar-menu-separator" role="separator" />
              <button
                type="button"
                className="toolbar-menu-item toolbar-menu-item-with-icon"
                role="menuitemcheckbox"
                aria-checked={isDarkMode}
                onClick={toggleTheme}
              >
                {isDarkMode ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
                {isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
              </button>
              <button
                type="button"
                className="toolbar-menu-item toolbar-menu-item-with-icon"
                role="menuitem"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 size={15} aria-hidden="true" />
                ) : (
                  <Maximize2 size={15} aria-hidden="true" />
                )}
                {isFullscreen ? '退出全屏' : '进入全屏'}
              </button>
              {canInstall && onInstall && (
                <button
                  type="button"
                  className="toolbar-menu-item toolbar-menu-item-with-icon"
                  role="menuitem"
                  onClick={() => {
                    onInstall()
                    closeMoreMenu()
                  }}
                >
                  <Download size={15} aria-hidden="true" />
                  安装 MindNotes Pro
                </button>
              )}
            </div>
            <div className="em-overlay" aria-hidden="true" onClick={closeMoreMenu} />
          </>,
          document.body
        )}

      <input
        ref={imgRef}
        type="file"
        tabIndex={-1}
        aria-hidden="true"
        aria-label="选择图片文件"
        accept="image/*"
        onChange={importImage}
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
      />
      <input
        ref={bgRef}
        type="color"
        tabIndex={-1}
        aria-hidden="true"
        aria-label="选择背景颜色"
        value={canvasBg}
        onChange={(event) => setCanvasBg(event.target.value)}
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
      />
    </>
  )
})

export default CanvasActionButtons
