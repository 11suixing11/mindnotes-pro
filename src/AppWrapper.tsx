import { useState, useEffect } from 'react'
import App from './App'
import LoadingScreen from './components/ui/LoadingScreen'
import { ToastProvider, useToast } from './components/ui/Toast'
import {
  ErrorBoundaryProvider,
  ErrorFallback,
  useErrorBoundary,
} from './components/ui/ErrorBoundary'
import { useServiceWorker } from './hooks/useServiceWorker'
import { debugError } from './utils/logger'

function AppContent() {
  const [isLoading, setIsLoading] = useState(true)
  const { hasError, error, resetError } = useErrorBoundary()
  const { updateAvailable, skipWaiting } = useServiceWorker()
  const { showWarning } = useToast()

  useEffect(() => {
    // 预加载关键资源
    const preloadResources = async () => {
      try {
        // 预加载字体
        await document.fonts.ready

        // 预加载关键图片
        const images = [`${import.meta.env.BASE_URL}icon-192.png`, `${import.meta.env.BASE_URL}icon-512.png`]

        await Promise.all(
          images.map((src) => {
            return new Promise((resolve, reject) => {
              const img = new Image()
              img.src = src
              img.onload = resolve
              img.onerror = reject
            })
          })
        ).catch(() => {
          // 忽略图片加载错误
        })
      } catch (error) {
        debugError('预加载资源失败:', error)
      }
    }

    preloadResources()
  }, [])

  useEffect(() => {
    if (updateAvailable) {
      showWarning('🆕 发现新版本，立即更新可获得最新修复与功能。', {
        label: '立即更新',
        onClick: skipWaiting,
        variant: 'primary',
      })
    }
  }, [updateAvailable, skipWaiting, showWarning])

  const handleLoad = () => {
    setIsLoading(false)
  }

  if (hasError) {
    return <ErrorFallback error={error} resetError={resetError} />
  }

  if (isLoading) {
    return <LoadingScreen onLoad={handleLoad} />
  }

  return <App />
}

function AppWrapper() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

function Root() {
  return (
    <ErrorBoundaryProvider>
      <AppWrapper />
    </ErrorBoundaryProvider>
  )
}

export default Root