import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getCommands, searchCommands } from './commands'
import CommandSearch from './CommandSearch'
import CommandItem from './CommandItem'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onExecute?: (command: any) => void
  dependencies?: {
    onNewNote?: () => void
    onSave?: () => void
    onClearCanvas?: () => void
    onInsertText?: () => void
    onInsertShape?: () => void
    onInsertImage?: () => void
    onToggleLayers?: () => void
    onZoomIn?: () => void
    onZoomOut?: () => void
    onResetView?: () => void
    onExportPNG?: () => void
    onExportSVG?: () => void
    onExportPDF?: () => void
    onAIAnalyze?: () => void
  }
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onExecute,
  dependencies = {},
}) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  useRef<HTMLInputElement>(null)

  const commands = getCommands(dependencies)
  const filteredCommands = searchCommands(query, commands)

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            Math.min(prev + 1, filteredCommands.length - 1)
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action()
            onExecute?.(filteredCommands[selectedIndex])
            onClose()
          }
          break
        case 'Escape':
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex, onClose, onExecute])

  // 重置选择索引
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="command-palette-overlay"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="command-palette"
          onClick={(e) => e.stopPropagation()}
        >
          <CommandSearch value={query} onChange={setQuery} />

          <div className="command-list">
            {filteredCommands.length === 0 ? (
              <div className="empty-state">未找到命令</div>
            ) : (
              filteredCommands.map((command, index) => (
                <CommandItem
                  key={command.id}
                  command={command}
                  isSelected={index === selectedIndex}
                  onClick={() => {
                    command.action()
                    onExecute?.(command)
                    onClose()
                  }}
                />
              ))
            )}
          </div>

          <div className="command-footer">
            <span>↑↓ 导航</span>
            <span>Enter 执行</span>
            <span>Esc 关闭</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default CommandPalette
