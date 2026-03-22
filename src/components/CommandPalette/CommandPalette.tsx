import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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
  onExecute?: (command: Command) => void
}

// 命令列表
const COMMANDS: Command[] = [
  // 操作类
  {
    id: 'new-note',
    name: '新建笔记',
    shortcut: 'Ctrl+N',
    icon: '📝',
    category: 'action',
    keywords: ['新建', '创建', 'note'],
    action: () => {}
  },
  {
    id: 'save-note',
    name: '保存笔记',
    shortcut: 'Ctrl+S',
    icon: '💾',
    category: 'action',
    keywords: ['保存', 'save'],
    action: () => {}
  },
  {
    id: 'clear-canvas',
    name: '清空画布',
    shortcut: '',
    icon: '🗑️',
    category: 'action',
    keywords: ['清空', '清除', 'clear'],
    action: () => {}
  },
  
  // 插入类
  {
    id: 'insert-text',
    name: '插入文本框',
    shortcut: 'T',
    icon: '📝',
    category: 'insert',
    keywords: ['文本', '文字', 'text'],
    action: () => {}
  },
  {
    id: 'insert-shape',
    name: '插入形状',
    shortcut: 'R',
    icon: '⬜',
    category: 'insert',
    keywords: ['形状', '图形', 'shape'],
    action: () => {}
  },
  {
    id: 'insert-image',
    name: '插入图片',
    shortcut: 'Ctrl+I',
    icon: '🖼️',
    category: 'insert',
    keywords: ['图片', '图像', 'image'],
    action: () => {}
  },
  {
    id: 'insert-template',
    name: '使用模板',
    shortcut: '',
    icon: '📋',
    category: 'insert',
    keywords: ['模板', 'template'],
    action: () => {}
  },
  
  // 视图类
  {
    id: 'toggle-theme',
    name: '切换主题',
    shortcut: 'Ctrl+Shift+L',
    icon: '🎨',
    category: 'view',
    keywords: ['主题', '深色', '浅色', 'theme'],
    action: () => {}
  },
  {
    id: 'toggle-grid',
    name: '切换网格',
    shortcut: '',
    icon: '📐',
    category: 'view',
    keywords: ['网格', 'grid'],
    action: () => {}
  },
  {
    id: 'zoom-in',
    name: '放大',
    shortcut: 'Ctrl++',
    icon: '🔍',
    category: 'view',
    keywords: ['放大', 'zoom'],
    action: () => {}
  },
  {
    id: 'zoom-out',
    name: '缩小',
    shortcut: 'Ctrl+-',
    icon: '🔍',
    category: 'view',
    keywords: ['缩小', 'zoom'],
    action: () => {}
  },
  
  // 导出类
  {
    id: 'export-image',
    name: '导出为图片',
    shortcut: '',
    icon: '📤',
    category: 'export',
    keywords: ['导出', '图片', 'export', 'png'],
    action: () => {}
  },
  {
    id: 'export-pdf',
    name: '导出为 PDF',
    shortcut: '',
    icon: '📄',
    category: 'export',
    keywords: ['导出', 'PDF', 'export'],
    action: () => {}
  },
  {
    id: 'export-markdown',
    name: '导出为 Markdown',
    shortcut: '',
    icon: '📝',
    category: 'export',
    keywords: ['导出', 'Markdown', 'export', 'md'],
    action: () => {}
  }
]

const CATEGORIES = {
  action: { name: '操作', icon: '⚡' },
  insert: { name: '插入', icon: '➕' },
  view: { name: '视图', icon: '👁️' },
  export: { name: '导出', icon: '📤' }
}

export default function CommandPalette({ isOpen, onClose, onExecute }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 过滤命令
  const filteredCommands = COMMANDS.filter(cmd => {
    const q = query.toLowerCase()
    return (
      cmd.name.toLowerCase().includes(q) ||
      cmd.keywords?.some(k => k.toLowerCase().includes(q)) ||
      cmd.shortcut?.toLowerCase().includes(q)
    )
  })

  // 按类别分组
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = []
    }
    acc[cmd.category].push(cmd)
    return acc
  }, {} as Record<string, Command[]>)

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        )
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        )
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        const selected = filteredCommands[selectedIndex]
        if (selected) {
          selected.action()
          onExecute?.(selected)
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex, onClose, onExecute])

  // 聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

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
          className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* 搜索框 */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 p-4">
            <span className="text-2xl mr-3">⚡</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="输入命令或搜索功能... (按 Esc 关闭)"
              className="flex-1 bg-transparent text-lg outline-none text-gray-900 dark:text-white placeholder-gray-400"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            )}
          </div>

          {/* 命令列表 */}
          <div 
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto p-2"
          >
            {filteredCommands.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <span className="text-4xl block mb-2">🔍</span>
                未找到相关命令
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, commands]) => (
                <div key={category} className="mb-4">
                  <div className="flex items-center px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <span className="mr-2">{CATEGORIES[category as keyof typeof CATEGORIES].icon}</span>
                    {CATEGORIES[category as keyof typeof CATEGORIES].name}
                    <span className="ml-2 text-gray-400">({commands.length})</span>
                  </div>
                  {commands.map((cmd) => {
                    const globalIndex = filteredCommands.findIndex(c => c.id === cmd.id)
                    const isSelected = globalIndex === selectedIndex
                    
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => {
                          cmd.action()
                          onExecute?.(cmd)
                          onClose()
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-blue-500 text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="text-xl mr-3">{cmd.icon}</span>
                          <span className="font-medium">{cmd.name}</span>
                        </div>
                        {cmd.shortcut && (
                          <kbd className={`px-2 py-1 text-xs rounded font-mono ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                          }`}>
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
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded mr-1">↑</kbd>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded mr-1">↓</kbd>
                  <span className="ml-1">导航</span>
                </span>
                <span className="flex items-center">
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded mr-1">↵</kbd>
                  <span className="ml-1">执行</span>
                </span>
                <span className="flex items-center">
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded mr-1">Esc</kbd>
                  <span className="ml-1">关闭</span>
                </span>
              </div>
              <span>{filteredCommands.length} 个命令</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
