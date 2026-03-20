import React, { useState, useRef, useEffect, Suspense, lazy } from 'react'
import Canvas, { CanvasRef } from './components/Canvas'
import Toolbar from './components/Toolbar'
import SaveDialog from './components/SaveDialog'

import { useThemeStore } from './store/useThemeStore'
import { useServiceWorker } from './hooks/useServiceWorker'

// 懒加载非关键组件
const CommandPalette = lazy(() => import('./components/CommandPalette/CommandPalette'))
const TemplateSelector = lazy(() => import('./components/TemplateSelector/TemplateSelector'))

// 错误边界
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen flex items-center justify-center bg-red-50">
          <div className="text-center p-6 max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">加载失败</h1>
            <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const canvasRef = useRef<CanvasRef>(null)
  const { initTheme } = useThemeStore()
  const { updateAvailable, isOnline, skipWaiting } = useServiceWorker()

  // 初始化
  useEffect(() => {
    console.log('App mounting...')
    initTheme()
    setIsLoaded(true)
    console.log('App initialized')
  }, [initTheme])

  // 命令面板快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setShowCommandPalette(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 保存快捷键
  useEffect(() => {
    const handleSaveEvent = () => setShowSaveDialog(true)
    window.addEventListener('mindnotes-save', handleSaveEvent)
    return () => window.removeEventListener('mindnotes-save', handleSaveEvent)
  }, [])

  const handleUpdate = () => {
    if (confirm('有新版本可用，是否立即更新并刷新页面？')) {
      skipWaiting()
    }
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="w-full h-screen relative bg-[var(--bg-secondary)] overflow-hidden">
        {/* 顶部工具栏 */}
        <Toolbar />

        {/* 画布区域 */}
        <Canvas ref={canvasRef} />

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

        {/* 命令面板 - 懒加载 */}
        <Suspense fallback={null}>
          <CommandPalette
            isOpen={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            onExecute={(cmd) => {
              if (cmd.id === 'insert-template') {
                setShowTemplateSelector(true)
              }
            }}
          />
        </Suspense>

        {/* 模板选择器 - 懒加载 */}
        <Suspense fallback={null}>
          <TemplateSelector
            isOpen={showTemplateSelector}
            onClose={() => setShowTemplateSelector(false)}
          />
        </Suspense>

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

        {/* 状态指示器 */}
        <div className="fixed top-4 right-4 bg-[var(--toolbar-bg)] backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)] shadow-lg border border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
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
    </ErrorBoundary>
  )
}

export default App
