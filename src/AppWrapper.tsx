import { useState, useEffect, useRef } from 'react'
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
import {
  COMMAND_EXECUTION_ERROR_EVENT,
  type CommandExecutionErrorDetail,
} from './core/commands/registry'

const COMMAND_ERROR_TOAST_DEDUP_MS = 2000

function AppContent() {
  const [isLoading, setIsLoading] = useState(true)
  const { hasError, error, resetError } = useErrorBoundary()
  const { updateAvailable, skipWaiting } = useServiceWorker()
  const { showWarning, showError } = useToast()
  const lastCommandErrorRef = useRef<{ key: string; ts: number } | null>(null)

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

  useEffect(() => {
    const openShortcutsHelp = () => {
      window.dispatchEvent(new CustomEvent('toggle-shortcuts'))
    }

    const onCommandError = (event: Event) => {
      const customEvent = event as CustomEvent<CommandExecutionErrorDetail>
      const detail = customEvent.detail
      if (!detail) {
        return
      }

      const key = `${detail.commandId}::${detail.message}`
      const now = Date.now()
      const last = lastCommandErrorRef.current

      if (last && last.key === key && now - last.ts < COMMAND_ERROR_TOAST_DEDUP_MS) {
        return
      }

      lastCommandErrorRef.current = { key, ts: now }

      showError(`命令执行失败：${detail.commandId}（${detail.message}）`, {
        label: '查看快捷键',
        onClick: openShortcutsHelp,
        variant: 'secondary',
      })
    }

    window.addEventListener(COMMAND_EXECUTION_ERROR_EVENT, onCommandError)
    return () => {
      window.removeEventListener(COMMAND_EXECUTION_ERROR_EVENT, onCommandError)
    }
  }, [showError])

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