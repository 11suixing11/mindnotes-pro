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
  const { zoomIn, zoomOut, resetView, zoom } = useViewStore(
    useShallow((s) => ({
      zoomIn: s.zoomIn,
      zoomOut: s.zoomOut,
      resetView: s.resetView,
      zoom: s.viewBox.zoom,
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

      <div className="sidebar panel" role="toolbar" aria-label="画布工具栏">
        <ToolButtons tool={tool} setTool={setTool} />
        <div className="sb-sep" role="separator" />
        <div className="sb-group">
          <button
            onClick={undo}
            disabled={undoLen === 0}
            className="abtn"
            data-tip="撤销 Ctrl+Z"
            aria-label="撤销"
          >
            {icons.undo}
          </button>
          <button
            onClick={redo}
            disabled={redoLen === 0}
            className="abtn"
            data-tip="重做 Ctrl+Shift+Z"
            aria-label="重做"
          >
            {icons.redo}
          </button>
          <button
            onClick={async () => {
              if (await confirm('清空所有？')) clearAll()
            }}
            className="abtn"
            data-tip="清空"
            aria-label="清空画布"
          >
            {icons.trash}
          </button>
        </div>
        <div className="sb-sep" role="separator" />
        <div className="sb-group">
          <button onClick={zoomIn} className="abtn" data-tip="放大" aria-label="放大">
            {icons.zoomIn}
          </button>
          <button
            onClick={resetView}
            className="abtn"
            data-tip={`${Math.round(zoom * 100)}%`}
            aria-label="重置视图"
          >
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)' }}>
              {Math.round(zoom * 100)}
            </span>
          </button>
          <button onClick={zoomOut} className="abtn" data-tip="缩小" aria-label="缩小">
            {icons.zoomOut}
          </button>
          <button
            onClick={toggleTheme}
            className="abtn"
            data-tip={isDarkMode ? '浅色' : '深色'}
            aria-label={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
          >
            {isDarkMode ? icons.sun : icons.moon}
          </button>
        </div>
      </div>

      <div className="topbar panel" role="toolbar" aria-label="绘图工具栏">
        <BrushSelector brush={brush} setBrush={setBrush} tool={tool} />
        <ColorPicker />
        <ExportMenu />
      </div>
    </>
  )
}
