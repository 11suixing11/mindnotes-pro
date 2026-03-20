import { useState, useEffect } from 'react'
import App from './App'
import LoadingScreen from './components/ui/LoadingScreen'
import { ToastProvider } from './components/ui/Toast'
import { ErrorBoundaryProvider, ErrorFallback, useErrorBoundary } from './components/ui/ErrorBoundary'

function AppWrapper() {
  const [isLoading, setIsLoading] = useState(true)
  const { hasError, error, resetError } = useErrorBoundary()

  useEffect(() => {
    // 等关键资源就绪
    const prepare = async () => {
      try {
        await document.fonts.ready
      } catch {
        // 忽略
      }
    }
    prepare()
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
