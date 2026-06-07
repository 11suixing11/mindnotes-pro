import { useAppStore } from '../store/appStore'
import { useViewStore } from '../store/useViewStore'
import { useThemeStore } from '../store/useThemeStore'
import { useShallow } from 'zustand/react/shallow'
import { useConfirm } from './ConfirmModal'
import ExportMenu from './ExportMenu'
import ToolButtons from './toolbar/ToolButtons'
import BrushSelector from './toolbar/BrushSelector'
import ColorPicker from './toolbar/ColorPicker'
import { icons } from './toolbar/icons'

export default function Toolbar() {
  const {
    tool, setTool, brush, setBrush,
    clearAll, undo, redo, undoLen, redoLen,
  } = useAppStore(useShallow((s) => ({
    tool: s.tool,
    setTool: s.setTool,
    brush: s.brush,
    setBrush: s.setBrush,
    clearAll: s.clearAll,
    undo: s.undo,
    redo: s.redo,
    undoLen: s.undoStack.length,
    redoLen: s.redoStack.length,
  })))
  const { zoomIn, zoomOut, resetView, zoom } = useViewStore(useShallow((s) => ({
    zoomIn: s.zoomIn,
    zoomOut: s.zoomOut,
    resetView: s.resetView,
    zoom: s.viewBox.zoom,
  })))
  const { isDarkMode, toggleTheme } = useThemeStore()
  const confirm = useConfirm()

  return (
    <>
      <div className="brand">
        <div className="brand-icon">M</div>
        <span className="brand-text">MindNotes</span>
        <span className="brand-ver">v2.1</span>
      </div>

      <div className="sidebar panel">
        <ToolButtons tool={tool} setTool={setTool} />
        <div className="sb-sep" />
        <div className="sb-group">
          <button onClick={undo} disabled={undoLen === 0} className="abtn" data-tip="撤销 Ctrl+Z">{icons.undo}</button>
          <button onClick={redo} disabled={redoLen === 0} className="abtn" data-tip="重做 Ctrl+Shift+Z">{icons.redo}</button>
          <button onClick={async () => { if (await confirm('清空所有？')) clearAll() }} className="abtn" data-tip="清空">{icons.trash}</button>
        </div>
        <div className="sb-sep" />
        <div className="sb-group">
          <button onClick={zoomIn} className="abtn" data-tip="放大">{icons.zoomIn}</button>
          <button onClick={resetView} className="abtn" data-tip={`${Math.round(zoom * 100)}%`}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)' }}>{Math.round(zoom * 100)}</span>
          </button>
          <button onClick={zoomOut} className="abtn" data-tip="缩小">{icons.zoomOut}</button>
          <button onClick={toggleTheme} className="abtn" data-tip={isDarkMode ? '浅色' : '深色'}>{isDarkMode ? icons.sun : icons.moon}</button>
        </div>
      </div>

      <div className="topbar panel">
        <BrushSelector brush={brush} setBrush={setBrush} tool={tool} />
        <ColorPicker />
        <ExportMenu />
      </div>
    </>
  )
}
