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

  return (
    <>
      <div className="brand">
        <div className="brand-icon">M</div>
        <span className="brand-text">MindNotes</span>
        <span className="brand-ver">v2.1</span>
      </div>

      {/* Left toolbar: tools + undo/redo/clear only */}
      <div className="sidebar panel" role="toolbar">
        <ToolButtons tool={tool} setTool={setTool} />
        <div className="sb-sep" role="separator" />
        <div className="sb-group">
          <button onClick={undo} disabled={undoLen === 0} className="abtn" data-tip="Undo Ctrl+Z">
            {icons.undo}
          </button>
          <button
            onClick={redo}
            disabled={redoLen === 0}
            className="abtn"
            data-tip="Redo Ctrl+Shift+Z"
          >
            {icons.redo}
          </button>
          <button
            onClick={async () => {
              if (await confirm('Clear all?')) clearAll()
            }}
            className="abtn"
            data-tip="Clear"
          >
            {icons.trash}
          </button>
        </div>
      </div>

      {/* Top toolbar: brush + color + zoom + theme + grid + export */}
      <div className="topbar panel" role="toolbar">
        <BrushSelector brush={brush} setBrush={setBrush} tool={tool} />
        <ColorPicker />
        <div className="tb-sep" />
        <button onClick={zoomIn} className="abtn" data-tip="Zoom in">
          {icons.zoomIn}
        </button>
        <button
          onClick={resetView}
          className="abtn"
          data-tip={`${Math.round(zoom * 100)}%`}
          style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)' }}
        >
          {Math.round(zoom * 100)}
        </button>
        <button onClick={zoomOut} className="abtn" data-tip="Zoom out">
          {icons.zoomOut}
        </button>
        <div className="tb-sep" />
        <button onClick={toggleTheme} className="abtn" data-tip={isDarkMode ? 'Light' : 'Dark'}>
          {isDarkMode ? icons.sun : icons.moon}
        </button>
        <button
          onClick={toggleGrid}
          className="abtn"
          data-tip={showGrid ? 'Hide grid' : 'Show grid (G)'}
          style={showGrid ? { color: 'var(--primary)', opacity: 1 } : undefined}
        >
          {icons.grid}
        </button>
        <div className="tb-sep" />
        <ExportMenu />
      </div>
    </>
  )
}
