import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { useThemeStore } from '../../store/useThemeStore'

interface Command {
  id: string
  name: string
  shortcut?: string
  icon?: string
  category: 'action' | 'insert' | 'view' | 'export'
  keywords?: string[]
  action: () => void
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

const CATEGORIES = {
  action: { name: '操作', icon: '⚡' },
  insert: { name: '插入', icon: '➕' },
  view: { name: '视图', icon: '👁️' },
  export: { name: '导出', icon: '📤' },
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    setTool,
    undo,
    redo,
    clearStrokes,
    zoomIn,
    zoomOut,
    resetView,
    toggleShowGuides,
    toggleSnapToGrid,
    toggleLayersPanel,
  } = useAppStore()

  const { toggleTheme } = useThemeStore()

  const COMMANDS: Command[] = [
    { id: 'pen', name: '笔工具', shortcut: '1', icon: '✏️', category: 'action', keywords: ['笔', '画', 'pen'], action: () => setTool('pen') },
    { id: 'eraser', name: '橡皮擦', shortcut: '2', icon: '🧹', category: 'action', keywords: ['橡皮', '擦', 'eraser'], action: () => setTool('eraser') },
    { id: 'pan', name: '平移工具', shortcut: '3', icon: '✋', category: 'action', keywords: ['平移', '移动', 'pan'], action: () => setTool('pan') },
    { id: 'rectangle', name: '矩形', shortcut: '4', icon: '⬜', category: 'insert', keywords: ['矩形', '方形', 'rect'], action: () => setTool('rectangle') },
    { id: 'circle', name: '圆形', shortcut: '5', icon: '⭕', category: 'insert', keywords: ['圆形', '圆', 'circle'], action: () => setTool('circle') },
    { id: 'triangle', name: '三角形', shortcut: '6', icon: '🔺', category: 'insert', keywords: ['三角', 'triangle'], action: () => setTool('triangle') },
    { id: 'line', name: '直线', shortcut: '7', icon: '📏', category: 'insert', keywords: ['直线', '线', 'line'], action: () => setTool('line') },
    { id: 'arrow', name: '箭头', shortcut: '8', icon: '➡️', category: 'insert', keywords: ['箭头', 'arrow'], action: () => setTool('arrow') },
    { id: 'undo', name: '撤销', shortcut: 'Ctrl+Z', icon: '↩️', category: 'action', keywords: ['撤销', 'undo'], action: () => undo() },
    { id: 'redo', name: '重做', shortcut: 'Ctrl+Shift+Z', icon: '↪️', category: 'action', keywords: ['重做', 'redo'], action: () => redo() },
    { id: 'clear', name: '清空画布', icon: '🗑️', category: 'action', keywords: ['清空', '清除', 'clear'], action: () => { if (confirm('确定清空画布？')) clearStrokes() } },
    { id: 'zoom-in', name: '放大', shortcut: '+', icon: '🔍', category: 'view', keywords: ['放大', 'zoom'], action: () => zoomIn() },
    { id: 'zoom-out', name: '缩小', shortcut: '-', icon: '🔍', category: 'view', keywords: ['缩小', 'zoom'], action: () => zoomOut() },
    { id: 'reset-view', name: '重置视图', shortcut: '0', icon: '🏠', category: 'view', keywords: ['重置', 'reset'], action: () => resetView() },
    { id: 'toggle-theme', name: '切换主题', icon: '🎨', category: 'view', keywords: ['主题', '深色', '浅色', 'theme'], action: () => toggleTheme() },
    { id: 'toggle-guides', name: '切换辅助线', icon: '📐', category: 'view', keywords: ['辅助线', 'guides'], action: () => toggleShowGuides() },
    { id: 'toggle-grid', name: '切换网格吸附', icon: '📐', category: 'view', keywords: ['网格', 'grid'], action: () => toggleSnapToGrid() },
    { id: 'toggle-layers', name: '图层面板', shortcut: 'L', icon: '📑', category: 'view', keywords: ['图层', 'layers'], action: () => toggleLayersPanel() },
    { id: 'save', name: '保存笔记', shortcut: 'Ctrl+S', icon: '💾', category: 'export', keywords: ['保存', 'save'], action: () => window.dispatchEvent(new CustomEvent('mindnotes-save')) },
    { id: 'export-png', name: '导出为图片', icon: '🖼️', category: 'export', keywords: ['导出', '图片', 'png'], action: () => window.dispatchEvent(new CustomEvent('mindnotes-save')) },
  ]

  const filteredCommands = COMMANDS.filter((cmd) => {
    const q = query.toLowerCase()
    return (
      cmd.name.toLowerCase().includes(q) ||
      cmd.keywords?.some((k) => k.toLowerCase().includes(q)) ||
      cmd.shortcut?.toLowerCase().includes(q)
    )
  })

  const groupedCommands = filteredCommands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = []
      acc[cmd.category].push(cmd)
      return acc
    },
    {} as Record<string, Command[]>
  )

  const executeSelected = useCallback(() => {
    const selected = filteredCommands[selectedIndex]
    if (selected) {
      selected.action()
      onClose()
    }
  }, [filteredCommands, selectedIndex, onClose])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1))
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        executeSelected()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex, onClose, executeSelected])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // 搜索变化时重置选中项
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
        className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="w-full max-w-2xl bg-[var(--bg-primary)] rounded-xl shadow-2xl overflow-hidden border border-[var(--border-color)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 搜索框 */}
          <div className="flex items-center border-b border-[var(--border-color)] p-4">
            <span className="text-2xl mr-3">⚡</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入命令或搜索功能..."
              className="flex-1 bg-transparent text-lg outline-none text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                ✕
              </button>
            )}
          </div>

          {/* 命令列表 */}
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {filteredCommands.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-secondary)]">
                <span className="text-4xl block mb-2">🔍</span>
                未找到相关命令
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, commands]) => (
                <div key={category} className="mb-4">
                  <div className="flex items-center px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    <span className="mr-2">{CATEGORIES[category as keyof typeof CATEGORIES]?.icon}</span>
                    {CATEGORIES[category as keyof typeof CATEGORIES]?.name}
                  </div>
                  {commands.map((cmd) => {
                    const globalIndex = filteredCommands.findIndex((c) => c.id === cmd.id)
                    const isSelected = globalIndex === selectedIndex
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => {
                          cmd.action()
                          onClose()
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                          isSelected ? 'bg-primary text-white' : 'hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="text-xl mr-3">{cmd.icon}</span>
                          <span className="font-medium">{cmd.name}</span>
                        </div>
                        {cmd.shortcut && (
                          <kbd className={`px-2 py-1 text-xs rounded font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* 底部提示 */}
          <div className="border-t border-[var(--border-color)] px-4 py-3 bg-[var(--bg-secondary)]">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <div className="flex items-center space-x-4">
                <span>↑↓ 导航</span>
                <span>↵ 执行</span>
                <span>Esc 关闭</span>
              </div>
              <span>{filteredCommands.length} 个命令</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
