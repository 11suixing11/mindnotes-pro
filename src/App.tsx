import { useState, useRef, useEffect } from 'react'
import MindNotesTldraw from './components/MindNotesTldraw'
import Canvas, { CanvasRef } from './components/Canvas'
import Toolbar from './components/Toolbar'
import SaveDialog from './components/SaveDialog'
import LayersPanel from './components/LayersPanel'

import { useThemeStore } from './store/useThemeStore'
import { useServiceWorker } from './hooks/useServiceWorker'
import { useShortcuts } from './hooks/useShortcuts'

function App() {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [useTldraw, setUseTldraw] = useState(false) // 切换模式
  const canvasRef = useRef<CanvasRef>(null)
  const { initTheme } = useThemeStore()
  const { updateAvailable, isOnline, skipWaiting } = useServiceWorker()

  // 初始化快捷键
  useShortcuts()

  // 初始化主题
  useEffect(() => {
    initTheme()
  }, [initTheme])

  // 监听保存快捷键
  useEffect(() => {
    const handleSaveEvent = () => {
      setShowSaveDialog(true)
    }

    window.addEventListener('mindnotes-save', handleSaveEvent)
    return () => window.removeEventListener('mindnotes-save', handleSaveEvent)
  }, [])

  // 提示用户更新
  const handleUpdate = () => {
    if (confirm('有新版本可用，是否立即更新并刷新页面？')) {
      skipWaiting()
    }
  }

  // 监听图层面板切换事件
  useEffect(() => {
    const handleToggleLayers = () => {
      // 通过 store 管理，这里不需要额外状态
    }

    window.addEventListener('toggle-layers', handleToggleLayers)
    return () => window.removeEventListener('toggle-layers', handleToggleLayers)
  }, [])

  // 模式切换（开发用）
  useEffect(() => {
    const handleModeSwitch = () => {
      setUseTldraw((prev) => !prev)
    }
    window.addEventListener('switch-mode', handleModeSwitch)
    return () => window.removeEventListener('switch-mode', handleModeSwitch)
  }, [])

  return (
    <div className="w-full h-screen relative bg-[var(--bg-secondary)] overflow-hidden">
      {/* 顶部工具栏 */}
      <Toolbar />

      {/* 画布区域 - 可切换模式 */}
      {useTldraw ? <MindNotesTldraw /> : <Canvas ref={canvasRef} />}

      {/* 底部操作栏 */}
      <div className="fixed bottom-4 right-4 flex gap-3 z-10">
        <button
          onClick={() => setShowSaveDialog(true)}
          className="toolbar-btn bg-primary text-white shadow-lg hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all"
          title="保存笔记 (Ctrl+S)"
        >
          💾 保存
        </button>
      </div>

      {/* 保存对话框 */}
      <SaveDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        canvas={canvasRef.current?.getCanvas() || null}
      />

      {/* 使用说明 */}
      <div className="fixed bottom-4 left-4 bg-[var(--toolbar-bg)] backdrop-blur-sm rounded-xl px-4 py-3 text-sm text-[var(--text-secondary)] shadow-lg border border-[var(--border-color)]">
        <div className="font-medium mb-2">💡 使用提示</div>
        <div className="space-y-1">
          <div>🖱️ 鼠标按住绘写</div>
          <div>⌨️ Ctrl+Z 撤销</div>
          <div>💾 Ctrl+S 保存</div>
          <div>🗑️ Delete 清空</div>
        </div>
      </div>

      {/* 右上角状态指示器 */}
      <div className="fixed top-4 right-4 bg-[var(--toolbar-bg)] backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)] shadow-lg border border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
          />
          <span>{isOnline ? '就绪' : '离线'}</span>
        </div>
      </div>

      {/* PWA 更新提示 */}
      {updateAvailable && (
        <div className="fixed bottom-20 right-4 bg-primary text-white rounded-lg px-4 py-3 text-sm shadow-xl z-50 animate-bounce">
          <div className="flex items-center gap-2">
            <span>🔄 新版本可用</span>
            <button
              onClick={handleUpdate}
              className="ml-2 px-3 py-1 bg-white text-primary rounded hover:bg-gray-100 font-medium"
            >
              更新
            </button>
            <button onClick={() => {}} className="ml-1 px-2 py-1 hover:bg-white/20 rounded">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* PWA 安装提示（仅移动端） */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[var(--toolbar-bg)] backdrop-blur-sm rounded-xl px-4 py-2 text-xs text-[var(--text-secondary)] shadow-lg border border-[var(--border-color)] md:hidden">
        <div className="flex items-center gap-2">
          <span>📱</span>
          <span>添加到主屏幕获得更好体验</span>
        </div>
      </div>

      {/* 快捷键提示（右下角） */}
      <div className="fixed bottom-4 right-4 bg-[var(--toolbar-bg)] backdrop-blur-sm rounded-xl px-3 py-2 text-xs text-[var(--text-secondary)] shadow-lg border border-[var(--border-color)] hidden md:block">
        <div className="flex items-center gap-2">
          <span>⌨️</span>
          <span>按</span>
          <kbd className="px-2 py-0.5 bg-[var(--bg-tertiary)] rounded text-xs border border-[var(--border-color)]">
            ?
          </kbd>
          <span>查看快捷键</span>
        </div>
      </div>

      {/* 图层面板 */}
      <LayersPanel />
    </div>
  )
}

export default App
