import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import { useThemeStore } from '../../store/useThemeStore'
import { useShallow } from 'zustand/react/shallow'
import { useConfirm } from '../confirm-modal'
import { ExportMenu } from '../export-menu'
import ToolButtons from './ToolButtons'
import BrushSelector from './BrushSelector'
import ColorPicker from './ColorPicker'
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
  const { zoomIn, zoomOut, resetView, zoom, showGrid, toggleGrid } = useViewStore(
    useShallow((s) => ({
      zoomIn: s.zoomIn,
      zoomOut: s.zoomOut,
      resetView: s.resetView,
      zoom: s.viewBox.zoom,
      showGrid: s.showGrid,
      toggleGrid: s.toggleGrid,
    }))
  )
  const { isDarkMode, toggleTheme } = useThemeStore()
  const confirm = useConfirm()

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
      <div className="brand" aria-hidden="true">
        <div className="brand-icon">M</div>
        <span className="brand-text">MindNotes</span>
        <span className="brand-ver">v2.1</span>
      </div>

      {/* Left toolbar: tools + undo/redo/clear only */}
      <div className="sidebar panel" role="toolbar" aria-label="Drawing tools">
        <ToolButtons tool={tool} setTool={setTool} />
        <div className="sb-sep" role="separator" />
        <div className="sb-group">
          <button
            onClick={undo}
            disabled={undoLen === 0}
            className={`abtn ${historyPulse === 'undo' ? 'history-pulse' : ''}`}
            data-tip="Undo Ctrl+Z"
            aria-label="Undo"
          >
            {icons.undo}
          </button>
          <button
            onClick={redo}
            disabled={redoLen === 0}
            className={`abtn ${historyPulse === 'redo' ? 'history-pulse' : ''}`}
            data-tip="Redo Ctrl+Shift+Z"
            aria-label="Redo"
          >
            {icons.redo}
          </button>
          <button
            onClick={async () => {
              if (await confirm('Clear all?')) clearAll()
            }}
            className="abtn"
            data-tip="Clear"
            aria-label="Clear all"
          >
            {icons.trash}
          </button>
        </div>
      </div>

      {/* Top toolbar: brush + color + zoom + theme + grid + export */}
      <div className="topbar panel" role="toolbar" aria-label="Canvas tools">
        <BrushSelector brush={brush} setBrush={setBrush} tool={tool} />
        <ColorPicker />
        <div className="tb-sep" aria-hidden="true" />
        <button onClick={zoomIn} className="abtn" data-tip="Zoom in" aria-label="Zoom in">
          {icons.zoomIn}
        </button>
        <button
          onClick={resetView}
          className="abtn"
          data-tip={`${Math.round(zoom * 100)}%`}
          style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)' }}
          aria-label={`Reset zoom - currently ${Math.round(zoom * 100)}%`}
        >
          {Math.round(zoom * 100)}
        </button>
        <button onClick={zoomOut} className="abtn" data-tip="Zoom out" aria-label="Zoom out">
          {icons.zoomOut}
        </button>
        <div className="tb-sep" aria-hidden="true" />
        <button
          onClick={toggleTheme}
          className="abtn"
          data-tip={isDarkMode ? 'Light' : 'Dark'}
          aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDarkMode ? icons.sun : icons.moon}
        </button>
        <button
          onClick={toggleGrid}
          className="abtn"
          data-tip={showGrid ? 'Hide grid' : 'Show grid (G)'}
          style={showGrid ? { color: 'var(--primary)', opacity: 1 } : undefined}
          aria-label={showGrid ? 'Hide grid' : 'Show grid'}
          aria-pressed={showGrid}
        >
          {icons.grid}
        </button>
        <div className="tb-sep" aria-hidden="true" />
        <ExportMenu />
      </div>
    </>
  )
}
