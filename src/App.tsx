import { Suspense, lazy, useEffect, useState } from 'react'
import LoadingFallback from './components/ui/LoadingFallback'
import { useThemeStore } from './store/useThemeStore'
import { syncEngine } from './utils/syncEngine'

const WelcomeGuide = lazy(() => import('./components/WelcomeGuide'))
const Canvas = lazy(() => import('./components/Canvas'))
const Toolbar = lazy(() => import('./components/Toolbar'))
const ConflictResolutionPanel = lazy(() => import('./components/ConflictResolutionPanel'))
const AIDevToolsPanel = lazy(() => import('./components/AIDevToolsPanel'))

const WELCOME_GUIDE_STORAGE_KEY = 'mindnotes-welcome-seen-v1'

export default function App() {
  const { initTheme } = useThemeStore()
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null)

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(WELCOME_GUIDE_STORAGE_KEY) === '1'
    setShowWelcome(!hasSeenWelcome)
  }, [])

  const handleWelcomeStart = () => {
    localStorage.setItem(WELCOME_GUIDE_STORAGE_KEY, '1')
    setShowWelcome(false)
  }

  useEffect(() => {
    initTheme()
  }, [initTheme])

  useEffect(() => {
    syncEngine.initialize().catch((error) => {
      console.error('同步引擎初始化失败:', error)
    })
  }, [])

  if (showWelcome === null) {
    return <LoadingFallback label="正在准备欢迎页..." fullScreen />
  }

  if (showWelcome) {
    return (
      <Suspense fallback={<LoadingFallback label="正在加载产品引导..." fullScreen />}>
        <WelcomeGuide onStart={handleWelcomeStart} />
      </Suspense>
    )
  }

  return (
    <div className="w-full h-screen relative overflow-hidden bg-[var(--bg-secondary)]">
      <Suspense fallback={<LoadingFallback label="正在加载白板引擎..." fullScreen />}>
        <Canvas />
      </Suspense>

      <Suspense fallback={<LoadingFallback label="正在加载工具栏..." />}>
        <Toolbar />
      </Suspense>

      <Suspense fallback={<LoadingFallback label="正在加载同步模块..." />}>
        <ConflictResolutionPanel />
      </Suspense>

      <Suspense fallback={<LoadingFallback label="正在加载 AI 调试模块..." />}>
        <AIDevToolsPanel />
      </Suspense>

      <div className="fixed bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl px-4 py-3 text-sm text-gray-600 dark:text-gray-300 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="font-medium mb-2">💡 使用提示</div>
        <div className="space-y-1">
          <div>🖱️ 鼠标按住绘写</div>
          <div>🧹 橡皮擦除</div>
          <div>✋ 平移画布</div>
        </div>
      </div>
      <div className="fixed top-4 right-4 z-10 rounded-xl border border-gray-200 bg-white/90 px-3 py-2 text-xs text-gray-600 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-300">
        离线优先已启用：断网可编辑，联网自动同步
      </div>
    </div>
  )
}
