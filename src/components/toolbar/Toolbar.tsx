import { useCallback, useEffect, useRef, useState } from 'react'
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

export default function Toolbar() {
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

      {/* Top toolbar: brush + color + zoom + theme + grid + export */}
      <div
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
        <button onClick={zoomIn} className="abtn" data-tip="放大" aria-label="放大">
          {icons.zoomIn}
        </button>
        <button
          onClick={resetView}
          className="abtn"
          data-tip={`${Math.round(zoom * 100)}%`}
          style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)' }}
          aria-label={`重置缩放，当前 ${Math.round(zoom * 100)}%`}
        >
          {Math.round(zoom * 100)}
        </button>
        <button onClick={zoomOut} className="abtn" data-tip="缩小" aria-label="缩小">
          {icons.zoomOut}
        </button>
        <div className="tb-sep" aria-hidden="true" />
        <button
          onClick={toggleTheme}
          className="abtn"
          data-tip={isDarkMode ? '浅色模式' : '深色模式'}
          aria-label={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
        >
          {isDarkMode ? icons.sun : icons.moon}
        </button>
        <button
          onClick={toggleGrid}
          className="abtn"
          data-tip={showGrid ? '隐藏网格' : `显示网格（${shortcut('view.toggleGrid')}）`}
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
          aria-label={`网格大小 ${gridSize}px`}
        >
          {gridSize}
        </button>
        <div className="tb-sep" aria-hidden="true" />
        <ExportMenu />
      </div>
    </>
  )
}
