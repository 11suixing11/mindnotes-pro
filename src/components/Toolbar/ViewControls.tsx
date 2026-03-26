import React from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useThemeStore } from '../../store/useThemeStore'

interface ViewControlsProps {
  onAction?: (action: string) => void
}

export const ViewControls: React.FC<ViewControlsProps> = ({ onAction }) => {
  const { zoomIn, zoomOut, resetView, clearStrokes, undo } = useAppStore()
  const { isDarkMode, toggleTheme } = useThemeStore()

  const handleZoomIn = () => {
    zoomIn()
    onAction?.('zoomIn')
  }

  const handleZoomOut = () => {
    zoomOut()
    onAction?.('zoomOut')
  }

  const handleResetView = () => {
    resetView()
    onAction?.('resetView')
  }

  const handleClearStrokes = () => {
    if (window.confirm('确定要清空所有笔迹吗？此操作不可恢复。')) {
      clearStrokes()
      onAction?.('clearStrokes')
    }
  }

  const handleUndo = () => {
    undo()
    onAction?.('undo')
  }

  const handleToggleTheme = () => {
    toggleTheme()
    onAction?.('toggleTheme')
  }

  return (
    <div className="view-controls" role="group" aria-label="视图控制">
      {/* 缩放控制 */}
      <div className="control-group">
        <button
          onClick={handleZoomIn}
          className="control-button"
          title="放大 (+)"
          aria-label="放大"
        >
          🔍+
        </button>
        <button
          onClick={handleZoomOut}
          className="control-button"
          title="缩小 (-)"
          aria-label="缩小"
        >
          🔍-
        </button>
        <button
          onClick={handleResetView}
          className="control-button"
          title="重置视图 (0)"
          aria-label="重置视图"
        >
          1:1
        </button>
      </div>

      {/* 编辑操作 */}
      <div className="control-group">
        <button
          onClick={handleUndo}
          className="control-button"
          title="撤销 (Ctrl+Z)"
          aria-label="撤销"
        >
          ↩️
        </button>
        <button
          onClick={handleClearStrokes}
          className="control-button danger"
          title="清空画布"
          aria-label="清空画布"
        >
          🗑️
        </button>
      </div>

      {/* 主题切换 */}
      <div className="control-group">
        <button
          onClick={handleToggleTheme}
          className="control-button"
          title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
          aria-label="切换主题"
        >
          {isDarkMode ? '🌙' : '☀️'}
        </button>
      </div>
    </div>
  )
}

export default ViewControls
