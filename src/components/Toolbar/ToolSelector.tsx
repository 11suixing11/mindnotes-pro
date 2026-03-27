import React from 'react'
import { useDrawingStore } from '../../store/useDrawingStore'

type ToolType = 'pen' | 'eraser' | 'pan' | 'rectangle' | 'circle' | 'triangle'

interface ToolButtonProps {
  tool: ToolType
  currentTool: ToolType
  onClick: () => void
  icon: string
  label: string
  shortcut?: string
}

const ToolButton: React.FC<ToolButtonProps> = ({
  tool,
  currentTool,
  onClick,
  icon,
  label,
  shortcut,
}) => {
  const isActive = tool === currentTool

  return (
    <button
      onClick={onClick}
      className={`tool-button ${isActive ? 'active' : ''}`}
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
      aria-label={label}
      aria-pressed={isActive}
    >
      <span className="tool-icon">{icon}</span>
      <span className="tool-label">{label}</span>
      {shortcut && <span className="tool-shortcut">{shortcut}</span>}
    </button>
  )
}

interface ToolSelectorProps {
  onToolChange?: (tool: ToolType) => void
}

export const ToolSelector: React.FC<ToolSelectorProps> = ({ onToolChange }) => {
  const { tool, setTool } = useDrawingStore()

  const handleToolChange = (newTool: ToolType) => {
    setTool(newTool)
    onToolChange?.(newTool)
  }

  const tools: Array<{ type: ToolType; icon: string; label: string; shortcut: string }> = [
    { type: 'pen', icon: '🖊️', label: '画笔', shortcut: '1' },
    { type: 'eraser', icon: '🧹', label: '橡皮', shortcut: '2' },
    { type: 'pan', icon: '✋', label: '移动', shortcut: '3' },
    { type: 'rectangle', icon: '⬜', label: '矩形', shortcut: '4' },
    { type: 'circle', icon: '⭕', label: '圆形', shortcut: '5' },
  ]

  return (
    <div className="tool-selector" role="group" aria-label="工具选择">
      {tools.map((t) => (
        <ToolButton
          key={t.type}
          tool={t.type}
          currentTool={tool as ToolType}
          onClick={() => handleToolChange(t.type)}
          icon={t.icon}
          label={t.label}
          shortcut={t.shortcut}
        />
      ))}
    </div>
  )
}

export default ToolSelector
