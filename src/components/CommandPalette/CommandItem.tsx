import React from 'react'
import type { Command } from './types'

interface CommandItemProps {
  command: Command
  isSelected: boolean
  onClick: () => void
}

export const CommandItem: React.FC<CommandItemProps> = ({
  command,
  isSelected,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`command-item ${isSelected ? 'selected' : ''}`}
      role="option"
      aria-selected={isSelected}
    >
      <div className="command-icon">{command.icon}</div>
      <div className="command-content">
        <div className="command-name">{command.name}</div>
        {command.shortcut && (
          <div className="command-shortcut">{command.shortcut}</div>
        )}
      </div>
    </div>
  )
}

export default CommandItem
