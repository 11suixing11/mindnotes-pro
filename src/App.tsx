import { Suspense, lazy, useEffect, useState } from 'react'
import LoadingFallback from './components/ui/LoadingFallback'
import { ErrorBoundaryClass } from './components/ui/ErrorBoundary'
import { useThemeStore } from './store/useThemeStore'
import SyncEngine from './utils/syncEngine'
import { useShortcuts } from './hooks/useShortcuts'

const WelcomeGuide = lazy(() => import('./components/WelcomeGuide'))
const OnboardingGuide = lazy(() => import('./components/OnboardingGuide'))
const Canvas = lazy(() => import('./components/Canvas'))
const Toolbar = lazy(() => import('./components/Toolbar'))

const WELCOME_GUIDE_STORAGE_KEY = 'mindnotes-welcome-seen-v1'
const ONBOARDING_STORAGE_KEY = 'mindnotes-onboarding-seen'

export default function App() {
  const { initTheme } = useThemeStore()
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useShortcuts()

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(WELCOME_GUIDE_STORAGE_KEY) === '1'
    setShowWelcome(!hasSeenWelcome)
    
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1'
    if (!hasSeenOnboarding && hasSeenWelcome) {
      setShowOnboarding(true)
    }
  }, [])

  const handleWelcomeStart = () => {
    localStorage.setItem(WELCOME_GUIDE_STORAGE_KEY, '1')
    setShowWelcome(false)
    setTimeout(() => setShowOnboarding(true), 300)
  }

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1')
    setShowOnboarding(false)
  }

  useEffect(() => {
    initTheme()
  }, [initTheme])

  useEffect(() => {
    const engine = new SyncEngine()
    engine.initialize().catch((error: Error) => {
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
      {showOnboarding && (
        <Suspense fallback={<LoadingFallback label="正在加载新手引导..." fullScreen />}>
          <OnboardingGuide onComplete={handleOnboardingComplete} />
        </Suspense>
      )}

      <ErrorBoundaryClass fallback={<LoadingFallback label="白板引擎加载失败，请刷新页面" fullScreen />}>
        <Suspense fallback={<LoadingFallback label="正在加载白板引擎..." fullScreen />}>
          <Canvas />
        </Suspense>
      </ErrorBoundaryClass>

      <ErrorBoundaryClass fallback={<LoadingFallback label="工具栏加载失败" />}>
        <Suspense fallback={<LoadingFallback label="正在加载工具栏..." />}>
          <Toolbar />
        </Suspense>
      </ErrorBoundaryClass>

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
