import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Position {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

type DragMode = 'none' | 'drag' | 'resize'

export default function FloatingNotes() {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 })
  const [size, setSize] = useState<Size>({ width: 400, height: 600 })
  const [dragMode, setDragMode] = useState<DragMode>('none')
  const dragOffset = useRef({ x: 0, y: 0 })

  // 加载保存的位置
  useEffect(() => {
    const savedPos = localStorage.getItem('floating-notes-position')
    if (savedPos) setPosition(JSON.parse(savedPos))
    const savedSize = localStorage.getItem('floating-notes-size')
    if (savedSize) setSize(JSON.parse(savedSize))
  }, [])

  // 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 统一的鼠标事件处理
  useEffect(() => {
    if (dragMode === 'none') return

    const handleMouseMove = (e: MouseEvent) => {
      if (dragMode === 'drag') {
        const newPos = {
          x: Math.max(0, Math.min(window.innerWidth - 48, e.clientX - dragOffset.current.x)),
          y: Math.max(0, Math.min(window.innerHeight - 48, e.clientY - dragOffset.current.y)),
        }
        setPosition(newPos)
      } else if (dragMode === 'resize') {
        const newSize = {
          width: Math.max(300, e.clientX - position.x),
          height: Math.max(400, e.clientY - position.y),
        }
        setSize(newSize)
      }
    }

    const handleMouseUp = () => {
      // 保存位置和尺寸
      localStorage.setItem('floating-notes-position', JSON.stringify(position))
      localStorage.setItem('floating-notes-size', JSON.stringify(size))
      setDragMode('none')
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragMode, position, size])

  const handleTitleBarMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return
    setDragMode('drag')
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
  }

  return (
    <>
      {/* 悬浮按钮 */}
      <motion.button
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center z-50"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="打开 MindNotes Pro (Ctrl+Shift+M)"
      >
        <span className="text-2xl">🧠</span>
      </motion.button>

      {/* 笔记窗口 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
            style={{ left: position.x, top: position.y, width: size.width, height: size.height }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            {/* 标题栏 */}
            <div
              className="h-12 bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-between px-4 cursor-move no-drag"
              onMouseDown={handleTitleBarMouseDown}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🧠</span>
                <span className="text-white font-medium">MindNotes Pro</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white no-drag">
                ✕
              </button>
            </div>

            {/* 内容区域 */}
            <div className="h-[calc(100%-3rem)] overflow-auto p-4">
              <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                <p className="mb-4">💡 快速笔记</p>
                <p className="text-sm">在这里记录你的想法</p>
                <p className="text-xs mt-4 text-gray-400">快捷键：Ctrl+Shift+M</p>
              </div>
            </div>

            {/* 调整大小手柄 */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize no-drag"
              onMouseDown={() => setDragMode('resize')}
            >
              <svg className="w-full h-full text-gray-400" viewBox="0 0 10 10">
                <path d="M0 10 L10 10 L10 0" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
