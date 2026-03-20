import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import Canvas, { CanvasRef } from './components/Canvas'
import Toolbar from './components/Toolbar'
import SaveDialog from './components/SaveDialog'
import CommandPalette from './components/CommandPalette/CommandPalette'
import TemplateSelector from './components/TemplateSelector/TemplateSelector'

import { useThemeStore } from './store/useThemeStore'
import { useServiceWorker } from './hooks/useServiceWorker'
import { useShortcuts } from './hooks/useShortcuts'
import { useCommandPaletteShortcut } from './hooks/useKeyboardShortcuts'

// 懒加载 tldraw 组件
const MindNotesTldraw = lazy(() => import('./components/MindNotesTldraw'))

// Loading 组件
function AppLoading() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">加载中...</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">MindNotes Pro</p>
      </div>
    </div>
  )
}

// Error Boundary
function AppError({ error, onRetry }: { error: Error, onRetry: () => void }) {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-red-50 dark:bg-red-900/20">
      <div className="text-center max-w-md p-6">
        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">加载失败</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error.message}</p>
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          重试
        </button>
      </div>
    </div>
  )
}

function App() {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [useTldraw, setUseTldraw] = useState(false) // 切换模式
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const canvasRef = useRef<CanvasRef>(null)
  const { initTheme } = useThemeStore()
  const { updateAvailable, isOnline, skipWaiting } = useServiceWorker()

  // 初始化快捷键
  useShortcuts()
  
  // 命令面板快捷键 (Ctrl/Cmd+P)
  useCommandPaletteShortcut(() => setShowCommandPalette(true))

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

  // 错误处理
  const handleRetry = () => {
    setLoadError(null)
    window.location.reload()
  }

  if (loadError) {
    return <AppError error={loadError} onRetry={handleRetry} />
  }

  return (
    <div className="w-full h-screen relative bg-[var(--bg-secondary)] overflow-hidden">
      {/* 新手引导 - 暂时禁用 */}
      {/* {showWelcome && <WelcomeGuide onComplete={() => setShowWelcome(false)} />} */}

      {/* 顶部工具栏 */}
      <Toolbar />

      {/* 画布区域 - 可切换模式 */}
      <Suspense fallback={<AppLoading />}>
        {useTldraw ? (
          <MindNotesTldraw 
            onReady={() => console.log('Tldraw ready')}
            onError={(error: Error) => setLoadError(error)}
          />
        ) : (
          <Canvas ref={canvasRef} />
        )}
      </Suspense>

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

      {/* 命令面板 */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onExecute={(cmd) => {
          if (cmd.id === 'insert-template') {
            setShowTemplateSelector(true)
          }
        }}
      />

      {/* 模板选择器 */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
      />

      {/* 使用说明 */}
      <div className="fixed bottom-4 left-4 bg-[var(--toolbar-bg)] backdrop-blur-sm rounded-xl px-4 py-3 text-sm text-[var(--text-secondary)] shadow-lg border border-[var(--border-color)]">
        <div className="font-medium mb-2">💡 使用提示</div>
        <div className="space-y-1">
          <div>🖱️ 鼠标按住绘写</div>
          <div>⌨️ Ctrl+Z 撤销</div>
          <div>💾 Ctrl+S 保存</div>
          <div>⚡ Ctrl+P 命令面板</div>
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
          </div>
        </div>
      )}
    </div>
  )
}

export default App
