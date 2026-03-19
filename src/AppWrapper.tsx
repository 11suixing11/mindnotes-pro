import { useState, useEffect } from 'react'
import App from './App'
import LoadingScreen from './components/ui/LoadingScreen'
import { ToastProvider } from './components/ui/Toast'
import { ErrorBoundaryProvider, ErrorFallback, useErrorBoundary } from './components/ui/ErrorBoundary'

function AppWrapper() {
  const [isLoading, setIsLoading] = useState(true)
  const { hasError, error, resetError } = useErrorBoundary()

  useEffect(() => {
    // 预加载关键资源
    const preloadResources = async () => {
      try {
        // 预加载字体
        await document.fonts.ready
        
        // 预加载关键图片
        const images = [
          '/icon-192.png',
          '/icon-512.png',
        ]
        
        await Promise.all(
          images.map(src => {
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
        console.error('预加载资源失败:', error)
      }
    }

    preloadResources()
  }, [])

  const handleLoad = () => {
    setIsLoading(false)
  }

  if (hasError) {
    return <ErrorFallback error={error} resetError={resetError} />
  }

  if (isLoading) {
    return <LoadingScreen onLoad={handleLoad} />
  }

  return (
    <ToastProvider>
      <App />
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
