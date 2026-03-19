import { createContext, useContext, useState, useCallback } from 'react'

interface ErrorBoundaryContextType {
  hasError: boolean
  error: Error | null
  resetError: () => void
  logError: (error: Error, componentStack?: string) => void
}

const ErrorBoundaryContext = createContext<ErrorBoundaryContextType | undefined>(undefined)

export function ErrorBoundaryProvider({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const logError = useCallback((error: Error, componentStack?: string) => {
    console.error('ErrorBoundary caught an error:', {
      error,
      componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    })

    // 可以发送到错误监控服务
    // sendToMonitoringService(error, componentStack)
  }, [])

  const resetError = useCallback(() => {
    setHasError(false)
    setError(null)
  }, [])

  return (
    <ErrorBoundaryContext.Provider value={{ hasError, error, resetError, logError }}>
      {children}
    </ErrorBoundaryContext.Provider>
  )
}

export function useErrorBoundary() {
  const context = useContext(ErrorBoundaryContext)
  if (context === undefined) {
    throw new Error('useErrorBoundary must be used within an ErrorBoundaryProvider')
  }
  return context
}

interface ErrorFallbackProps {
  error: Error | null
  resetError: () => void
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-pink-500 to-orange-500 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">出错了！</h1>
          <p className="text-gray-600 mb-6">应用程序遇到了问题，但我们已经记录下来。</p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-mono text-red-800 break-all">{error.message}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={resetError}
              className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🔄 重试
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200"
            >
              🏠 刷新页面
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
              }}
              className="w-full px-6 py-3 text-sm text-gray-500 hover:text-gray-700 transition-all duration-200"
            >
              📋 复制链接报告问题
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
