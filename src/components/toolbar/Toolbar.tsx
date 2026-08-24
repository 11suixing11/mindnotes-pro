import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import { useThemeStore } from '../../store/useThemeStore'
import { formatShortcutBinding, type ShortcutActionId } from '../../keyboard/shortcuts'
import { useShortcutStore } from '../../store/useShortcutStore'
import { useShallow } from 'zustand/react/shallow'
import { useConfirm } from '../confirm-modal'
import { ExportMenu } from '../export-menu'
import ToolButtons from './ToolButtons'
import BrushSelector from './BrushSelector'
import ColorPicker from './ColorPicker'
import CanvasActionButtons from './CanvasActionButtons'
import TemplateMenu from '../templates/TemplateMenu'
import { icons } from './icons'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'

interface ToolbarProps {
  canInstall?: boolean
  onInstall?: () => void
}

type HorizontalScrollDirection = -1 | 1

function useHorizontalToolbarScroll() {
  const containerRef = useRef<HTMLDivElement>(null)
  // Start with forward navigation available so asynchronously mounted toolbar
  // actions remain discoverable before the first layout measurement settles.
  const [scrollState, setScrollState] = useState({ canScrollBack: false, canScrollForward: true })

  const updateScrollState = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const canScrollBack = container.scrollLeft > 2
    const canScrollForward =
      container.scrollLeft + container.clientWidth < container.scrollWidth - 2
    setScrollState((current) =>
      current.canScrollBack === canScrollBack && current.canScrollForward === canScrollForward
        ? current
        : { canScrollBack, canScrollForward }
    )
  }, [])

  useLayoutEffect(() => {
    updateScrollState()
  }, [updateScrollState])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let active = true
    let frame = 0
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => updateScrollState())
    const observeToolbarChildren = () => {
      resizeObserver?.observe(container)
      container.querySelectorAll(':scope > *').forEach((child) => resizeObserver?.observe(child))
    }
    const mutationObserver =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(() => {
            observeToolbarChildren()
            updateScrollState()
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() => {
              if (active) updateScrollState()
            })
          })

    container.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)
    resizeObserver?.observe(container)
    mutationObserver?.observe(container, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    })
    observeToolbarChildren()
    updateScrollState()

    const settleTimers = [0, 50, 120, 250, 500, 1000].map((delay) =>
      window.setTimeout(updateScrollState, delay)
    )
    const fontReady = document.fonts?.ready.then(() => {
      if (active) updateScrollState()
    })

    return () => {
      active = false
      container.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
      resizeObserver?.disconnect()
      mutationObserver?.disconnect()
      cancelAnimationFrame(frame)
      settleTimers.forEach((timer) => window.clearTimeout(timer))
      void fontReady
    }
  }, [updateScrollState])

  const scrollByPage = useCallback((direction: HorizontalScrollDirection) => {
    const container = containerRef.current
    if (!container) return

    container.scrollBy({
      left: direction * Math.max(160, container.clientWidth * 0.72),
      behavior: 'auto',
    })
  }, [])

  return { containerRef, scrollState, scrollByPage }
}

interface ToolbarScrollControlsProps {
  placement: 'top' | 'bottom'
  label: string
  canScrollBack: boolean
  canScrollForward: boolean
  onScroll: (direction: HorizontalScrollDirection) => void
}

function ToolbarScrollControls({
  placement,
  label,
  canScrollBack,
  canScrollForward,
  onScroll,
}: ToolbarScrollControlsProps) {
  return (
    <>
      {canScrollBack && (
        <button
          type="button"
          className={`toolbar-scroll-control toolbar-scroll-control-${placement} toolbar-scroll-control-back`}
          onClick={() => onScroll(-1)}
          aria-label={`向左查看更多${label}`}
          title={`向左查看更多${label}`}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
      )}
      {canScrollForward && (
        <button
          type="button"
          className={`toolbar-scroll-control toolbar-scroll-control-${placement} toolbar-scroll-control-forward`}
          onClick={() => onScroll(1)}
          aria-label={`向右查看更多${label}`}
          title={`向右查看更多${label}`}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      )}
    </>
  )
}

export default function Toolbar({ canInstall = false, onInstall }: ToolbarProps) {
  const [historyPulse, setHistoryPulse] = useState<'undo' | 'redo' | null>(null)
  const pulseTimerRef = useRef<number | null>(null)
  const previousHistoryCountsRef = useRef<{ undoLen: number; redoLen: number } | null>(null)
  const { tool, setTool, brush, setBrush, clearAll, undo, redo, undoLen, redoLen } = useAppStore(
    useShallow((s) => ({
      tool: s.tool,
      setTool: s.setTool,
      brush: s.brush,
      setBrush: s.setBrush,
      clearAll: s.clearAll,
      undo: s.undo,
      redo: s.redo,
      undoLen: s.undoStack.length,
      redoLen: s.redoStack.length,
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
    cycleGridSize,
  } = useViewStore(
    useShallow((s) => ({
      zoomIn: s.zoomIn,
      zoomOut: s.zoomOut,
      resetView: s.resetView,
      zoom: s.viewBox.zoom,
      showGrid: s.showGrid,
      toggleGrid: s.toggleGrid,
      snapToGrid: s.snapToGrid,
      toggleSnapToGrid: s.toggleSnapToGrid,
      gridSize: s.gridSize,
      cycleGridSize: s.cycleGridSize,
    }))
  )
  const { isDarkMode, toggleTheme } = useThemeStore()
  const shortcutBindings = useShortcutStore((s) => s.bindings)
  const confirm = useConfirm()
  const drawingToolbarScroll = useHorizontalToolbarScroll()
  const canvasToolbarScroll = useHorizontalToolbarScroll()

  const shortcut = useCallback(
    (actionId: ShortcutActionId) => formatShortcutBinding(shortcutBindings[actionId]),
    [shortcutBindings]
  )

  const pulseHistoryButton = useCallback((kind: 'undo' | 'redo') => {
    if (pulseTimerRef.current !== null) {
      window.clearTimeout(pulseTimerRef.current)
    }
    setHistoryPulse(kind)
    pulseTimerRef.current = window.setTimeout(() => {
      setHistoryPulse(null)
      pulseTimerRef.current = null
    }, 360)
  }, [])

  useEffect(() => {
    const previous = previousHistoryCountsRef.current
    previousHistoryCountsRef.current = { undoLen, redoLen }
    if (!previous) return

    if (undoLen === previous.undoLen - 1 && redoLen === previous.redoLen + 1) {
      pulseHistoryButton('undo')
    } else if (redoLen === previous.redoLen - 1 && undoLen === previous.undoLen + 1) {
      pulseHistoryButton('redo')
    }
  }, [pulseHistoryButton, redoLen, undoLen])

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current !== null) window.clearTimeout(pulseTimerRef.current)
    }
  }, [])

  return (
    <>
      {/* Left toolbar: tools + undo/redo/clear only */}
      <div
        ref={drawingToolbarScroll.containerRef}
        className="sidebar panel"
        role="toolbar"
        aria-label="绘图工具"
        aria-orientation="vertical"
      >
        <ToolButtons tool={tool} setTool={setTool} />
        <div className="sb-sep" role="separator" />
        <div className="sb-group">
          <button
            onClick={undo}
            disabled={undoLen === 0}
            className={`abtn ${historyPulse === 'undo' ? 'history-pulse' : ''}`}
            data-tip={`撤销 ${shortcut('edit.undo')}`}
            aria-label="撤销"
          >
            {icons.undo}
          </button>
          <button
            onClick={redo}
            disabled={redoLen === 0}
            className={`abtn ${historyPulse === 'redo' ? 'history-pulse' : ''}`}
            data-tip={`重做 ${shortcut('edit.redo')}`}
            aria-label="重做"
          >
            {icons.redo}
          </button>
          <button
            onClick={async () => {
              if (await confirm('确定清空当前画布吗？')) clearAll()
            }}
            className="abtn"
            data-tip="清空画布"
            aria-label="清空画布"
          >
            {icons.trash}
          </button>
        </div>
      </div>
      <ToolbarScrollControls
        placement="bottom"
        label="绘图工具"
        canScrollBack={drawingToolbarScroll.scrollState.canScrollBack}
        canScrollForward={drawingToolbarScroll.scrollState.canScrollForward}
        onScroll={drawingToolbarScroll.scrollByPage}
      />

      {/* Top toolbar: brush + color + zoom + theme + grid + export */}
      <div
        ref={canvasToolbarScroll.containerRef}
        className="topbar panel"
        role="toolbar"
        aria-label="画布工具"
        aria-orientation="horizontal"
      >
        <div className="toolbar-brand" aria-label="MindNotes Pro">
          <div className="brand-icon" aria-hidden="true">
            M
          </div>
          <span className="brand-text">MindNotes Pro</span>
        </div>
        <div className="tb-sep" aria-hidden="true" />
        <BrushSelector brush={brush} setBrush={setBrush} tool={tool} />
        <TemplateMenu />
        <div className="tb-sep" aria-hidden="true" />
        <ColorPicker />
        <div className="tb-sep" aria-hidden="true" />
        <CanvasActionButtons />
        <div className="tb-sep" aria-hidden="true" />
        <button onClick={zoomIn} className="abtn" data-tip="放大" title="放大" aria-label="放大">
          {icons.zoomIn}
        </button>
        <button
          onClick={resetView}
          className="abtn"
          data-tip={`${Math.round(zoom * 100)}%`}
          title={`${Math.round(zoom * 100)}%`}
          style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)' }}
          aria-label={`重置缩放，当前 ${Math.round(zoom * 100)}%`}
        >
          {Math.round(zoom * 100)}
        </button>
        <button onClick={zoomOut} className="abtn" data-tip="缩小" title="缩小" aria-label="缩小">
          {icons.zoomOut}
        </button>
        <div className="tb-sep" aria-hidden="true" />
        <button
          onClick={toggleTheme}
          className="abtn"
          data-tip={isDarkMode ? '浅色模式' : '深色模式'}
          title={isDarkMode ? '浅色模式' : '深色模式'}
          aria-label={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
        >
          {isDarkMode ? icons.sun : icons.moon}
        </button>
        <button
          onClick={toggleGrid}
          className="abtn"
          data-tip={showGrid ? '隐藏网格' : `显示网格（${shortcut('view.toggleGrid')}）`}
          title={showGrid ? '隐藏网格' : `显示网格（${shortcut('view.toggleGrid')}）`}
          style={showGrid ? { color: 'var(--primary)', opacity: 1 } : undefined}
          aria-label={showGrid ? '隐藏网格' : '显示网格'}
          aria-pressed={showGrid}
        >
          {icons.grid}
        </button>
        <button
          onClick={toggleSnapToGrid}
          className="abtn"
          data-tip={
            snapToGrid
              ? `关闭网格吸附（${shortcut('view.toggleGridSnap')}）`
              : `开启网格吸附（${shortcut('view.toggleGridSnap')}）`
          }
          title={
            snapToGrid
              ? `关闭网格吸附（${shortcut('view.toggleGridSnap')}）`
              : `开启网格吸附（${shortcut('view.toggleGridSnap')}）`
          }
          style={snapToGrid ? { color: 'var(--primary)', opacity: 1 } : undefined}
          aria-label={snapToGrid ? '关闭网格吸附' : '开启网格吸附'}
          aria-pressed={snapToGrid}
        >
          {icons.snap}
        </button>
        <button
          onClick={cycleGridSize}
          className="abtn grid-size-btn"
          data-tip={`网格大小 ${gridSize}px`}
          title={`网格大小 ${gridSize}px`}
          aria-label={`网格大小 ${gridSize}px`}
        >
          {gridSize}
        </button>
        <div className="tb-sep" aria-hidden="true" />
        <ExportMenu />
        {canInstall && onInstall && (
          <>
            <div className="tb-sep" aria-hidden="true" />
            <button
              type="button"
              onClick={onInstall}
              className="install-btn"
              aria-label="安装 MindNotes Pro"
              title="安装 MindNotes Pro"
            >
              <Download size={15} aria-hidden="true" />
              <span className="install-btn-label">安装应用</span>
            </button>
          </>
        )}
      </div>
      <ToolbarScrollControls
        placement="top"
        label="画布工具"
        canScrollBack={canvasToolbarScroll.scrollState.canScrollBack}
        canScrollForward={canvasToolbarScroll.scrollState.canScrollForward}
        onScroll={canvasToolbarScroll.scrollByPage}
      />
    </>
  )
}
