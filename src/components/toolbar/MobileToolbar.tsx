import { useCallback, useRef, useState, type ReactNode } from 'react'
import {
  ArrowUpRight,
  Eraser,
  FileText,
  Grid3X3,
  Layers3,
  Magnet,
  Move,
  Moon,
  MoreHorizontal,
  MousePointer2,
  PenLine,
  RotateCcw,
  RotateCw,
  Sun,
  Trash2,
  Type,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../store/appStore'
import type { CanvasBackgroundStyle, ToolType } from '../../store/types'
import { useThemeStore } from '../../store/useThemeStore'
import { useViewStore } from '../../store/useViewStore'
import { createOpenFileEvent } from '../../appEvents'
import { useConfirm } from '../confirm-modal'
import { requestClearCanvas } from '../confirm-modal/requestClearCanvas'
import { useDialogFocus } from '../useDialogFocus'

interface MobileToolButtonProps {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

function MobileToolButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: MobileToolButtonProps) {
  return (
    <button
      type="button"
      className={`mobile-tool-button${active ? ' is-active' : ''}`}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      title={label}
    >
      {children}
      <span className="mobile-tool-label">{label}</span>
    </button>
  )
}

const MOBILE_SHAPES: Array<{ id: ToolType; label: string; icon: ReactNode }> = [
  {
    id: 'rectangle',
    label: '矩形',
    icon: <span className="mobile-shape-icon mobile-shape-rect" />,
  },
  { id: 'circle', label: '圆形', icon: <span className="mobile-shape-icon mobile-shape-circle" /> },
  { id: 'line', label: '直线', icon: <span className="mobile-shape-icon mobile-shape-line" /> },
  { id: 'arrow', label: '箭头', icon: <ArrowUpRight size={20} aria-hidden="true" /> },
]

const MOBILE_BACKGROUNDS: Array<{
  value: CanvasBackgroundStyle
  label: string
}> = [
  { value: 'plain', label: '默认' },
  { value: 'grid', label: '方格' },
  { value: 'dots', label: '点阵' },
  { value: 'ruled', label: '横线' },
  { value: 'notebook', label: '笔记本' },
]

interface MobileMorePanelProps {
  open: boolean
  onClose: () => void
}

function MobileMorePanel({ open, onClose }: MobileMorePanelProps) {
  const panelRef = useDialogFocus<HTMLDivElement>({ open, onClose })
  const backgroundColorRef = useRef<HTMLInputElement>(null)
  const confirm = useConfirm()
  const {
    tool,
    setTool,
    clearAll,
    elementCount,
    bgColor,
    setBgColor,
    backgroundStyle,
    setBackgroundStyle,
  } = useAppStore(
    useShallow((state) => ({
      tool: state.tool,
      setTool: state.setTool,
      clearAll: state.clearAll,
      elementCount: state.elements.length,
      bgColor: state.bgColor,
      setBgColor: state.setBgColor,
      backgroundStyle: state.backgroundStyle,
      setBackgroundStyle: state.setBackgroundStyle,
    }))
  )
  const { isDarkMode, toggleTheme } = useThemeStore()
  const {
    zoom,
    zoomIn,
    zoomOut,
    resetView,
    showGrid,
    toggleGrid,
    snapToGrid,
    toggleSnapToGrid,
    gridSize,
    cycleGridSize,
  } = useViewStore(
    useShallow((state) => ({
      zoom: state.viewBox.zoom,
      zoomIn: state.zoomIn,
      zoomOut: state.zoomOut,
      resetView: state.resetView,
      showGrid: state.showGrid,
      toggleGrid: state.toggleGrid,
      snapToGrid: state.snapToGrid,
      toggleSnapToGrid: state.toggleSnapToGrid,
      gridSize: state.gridSize,
      cycleGridSize: state.cycleGridSize,
    }))
  )

  if (!open) return null

  const requestClear = async () => {
    const cleared = await requestClearCanvas(elementCount, confirm, clearAll)
    if (cleared) onClose()
  }

  return (
    <>
      <div className="mobile-sheet-overlay" aria-hidden="true" onClick={onClose} />
      <section
        ref={panelRef}
        className="mobile-more-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-more-title"
        tabIndex={-1}
      >
        <header className="mobile-sheet-header">
          <h2 id="mobile-more-title">更多工具</h2>
          <button
            type="button"
            className="mobile-sheet-close"
            onClick={onClose}
            aria-label="关闭更多工具"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <div className="mobile-more-content">
          <section className="mobile-more-section" aria-labelledby="mobile-shapes-title">
            <h3 id="mobile-shapes-title">形状</h3>
            <div className="mobile-more-grid mobile-shape-grid">
              <MobileToolButton label="平移" active={tool === 'pan'} onClick={() => setTool('pan')}>
                <Move size={20} aria-hidden="true" />
              </MobileToolButton>
              {MOBILE_SHAPES.map((shape) => (
                <MobileToolButton
                  key={shape.id}
                  label={shape.label}
                  active={tool === shape.id}
                  onClick={() => setTool(shape.id)}
                >
                  {shape.icon}
                </MobileToolButton>
              ))}
            </div>
          </section>

          <section className="mobile-more-section" aria-labelledby="mobile-view-title">
            <h3 id="mobile-view-title">视图</h3>
            <div className="mobile-more-grid mobile-view-grid">
              <MobileToolButton
                label={showGrid ? '隐藏网格' : '显示网格'}
                active={showGrid}
                onClick={toggleGrid}
              >
                <Grid3X3 size={20} aria-hidden="true" />
              </MobileToolButton>
              <MobileToolButton
                label={snapToGrid ? '关闭网格吸附' : '开启网格吸附'}
                active={snapToGrid}
                onClick={toggleSnapToGrid}
              >
                <Magnet size={20} aria-hidden="true" />
              </MobileToolButton>
              <MobileToolButton label={`网格大小 ${gridSize} px`} onClick={cycleGridSize}>
                <span className="mobile-grid-size">{gridSize}</span>
              </MobileToolButton>
              <MobileToolButton label="缩小" onClick={zoomOut}>
                <ZoomOut size={20} aria-hidden="true" />
              </MobileToolButton>
              <MobileToolButton label="放大" onClick={zoomIn}>
                <ZoomIn size={20} aria-hidden="true" />
              </MobileToolButton>
              <MobileToolButton
                label={`重置缩放（当前 ${Math.round(zoom * 100)}%）`}
                onClick={resetView}
              >
                <span className="mobile-zoom-value">{Math.round(zoom * 100)}%</span>
              </MobileToolButton>
            </div>
          </section>

          <section className="mobile-more-section" aria-labelledby="mobile-background-title">
            <h3 id="mobile-background-title">背景</h3>
            <div className="mobile-background-options" role="group" aria-label="背景设置">
              <div
                className="mobile-background-style-options"
                role="radiogroup"
                aria-label="背景样式"
              >
                {MOBILE_BACKGROUNDS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={`mobile-background-option${backgroundStyle === option.value ? ' is-active' : ''}`}
                    role="radio"
                    aria-checked={backgroundStyle === option.value}
                    onClick={() => setBackgroundStyle(option.value)}
                  >
                    <span
                      className={`mobile-background-preview mobile-background-${option.value}`}
                      aria-hidden="true"
                    />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mobile-background-option mobile-background-color-option"
                aria-label="自定义背景色"
                onClick={() => backgroundColorRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  // Prevent the browser's follow-up button click so one key
                  // press opens the native picker exactly once.
                  event.preventDefault()
                  backgroundColorRef.current?.click()
                }}
              >
                <span
                  className="mobile-background-preview"
                  style={{ backgroundColor: bgColor }}
                  aria-hidden="true"
                />
                <span>颜色</span>
              </button>
              <input
                ref={backgroundColorRef}
                type="color"
                tabIndex={-1}
                value={bgColor}
                onChange={(event) => setBgColor(event.target.value)}
                aria-label="自定义背景色输入"
                className="mobile-background-color-input"
              />
            </div>
          </section>

          <section className="mobile-more-section" aria-labelledby="mobile-app-title">
            <h3 id="mobile-app-title">画板</h3>
            <div className="mobile-more-grid mobile-view-grid">
              <MobileToolButton
                label="图层"
                onClick={() => {
                  onClose()
                  requestAnimationFrame(() => {
                    document.querySelector<HTMLButtonElement>('.layers-toggle')?.click()
                  })
                }}
              >
                <Layers3 size={20} aria-hidden="true" />
              </MobileToolButton>
              <MobileToolButton
                label={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
                onClick={toggleTheme}
              >
                {isDarkMode ? (
                  <Sun size={20} aria-hidden="true" />
                ) : (
                  <Moon size={20} aria-hidden="true" />
                )}
              </MobileToolButton>
              <MobileToolButton
                label="清空画布"
                disabled={elementCount === 0}
                onClick={() => void requestClear()}
              >
                <Trash2 size={20} aria-hidden="true" />
              </MobileToolButton>
            </div>
          </section>
        </div>
      </section>
    </>
  )
}

export default function MobileToolbar() {
  const [moreOpen, setMoreOpen] = useState(false)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const { tool, setTool, undo, redo, undoLen, redoLen } = useAppStore(
    useShallow((state) => ({
      tool: state.tool,
      setTool: state.setTool,
      undo: state.undo,
      redo: state.redo,
      undoLen: state.undoStack.length,
      redoLen: state.redoStack.length,
    }))
  )
  const closeMore = useCallback(() => setMoreOpen(false), [])

  return (
    <>
      <nav className="mobile-toolbar" aria-label="移动绘图工具">
        <MobileToolButton label="选择" active={tool === 'select'} onClick={() => setTool('select')}>
          <MousePointer2 size={20} aria-hidden="true" />
        </MobileToolButton>
        <MobileToolButton label="画笔" active={tool === 'pen'} onClick={() => setTool('pen')}>
          <PenLine size={20} aria-hidden="true" />
        </MobileToolButton>
        <MobileToolButton
          label="橡皮擦"
          active={tool === 'eraser'}
          onClick={() => setTool('eraser')}
        >
          <Eraser size={20} aria-hidden="true" />
        </MobileToolButton>
        <MobileToolButton label="文字" active={tool === 'text'} onClick={() => setTool('text')}>
          <Type size={20} aria-hidden="true" />
        </MobileToolButton>
        <MobileToolButton label="撤销" disabled={undoLen === 0} onClick={undo}>
          <RotateCcw size={20} aria-hidden="true" />
        </MobileToolButton>
        <MobileToolButton label="重做" disabled={redoLen === 0} onClick={redo}>
          <RotateCw size={20} aria-hidden="true" />
        </MobileToolButton>
        <button
          type="button"
          className="mobile-tool-button"
          aria-label="文件"
          title="文件"
          onClick={() => window.dispatchEvent(createOpenFileEvent('menu'))}
        >
          <FileText size={20} aria-hidden="true" />
          <span className="mobile-tool-label">文件</span>
        </button>
        <button
          ref={moreButtonRef}
          type="button"
          className={`mobile-tool-button${moreOpen ? ' is-active' : ''}`}
          aria-label="更多工具"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
          title="更多工具"
        >
          <MoreHorizontal size={20} aria-hidden="true" />
          <span className="mobile-tool-label">更多</span>
        </button>
      </nav>
      <MobileMorePanel open={moreOpen} onClose={closeMore} />
    </>
  )
}
