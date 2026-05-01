import { useState, useEffect, useRef } from 'react'
import App from './App'
import LoadingScreen from './components/ui/LoadingScreen'
import { ToastProvider, useToast } from './components/ui/Toast'
import { ErrorBoundaryClass } from './components/ui/ErrorBoundary'
import { useServiceWorker } from './hooks/useServiceWorker'
import {
  COMMAND_EXECUTION_ERROR_EVENT,
  type CommandExecutionErrorDetail,
} from './core/commands/registry'

const COMMAND_ERROR_TOAST_DEDUP_MS = 2000

function AppContent() {
  const [isLoading, setIsLoading] = useState(true)
  const { updateAvailable, skipWaiting } = useServiceWorker()
  const { showWarning, showError } = useToast()
  const lastCommandErrorRef = useRef<{ key: string; ts: number } | null>(null)

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
      if (!detail) return

      const key = `${detail.commandId}::${detail.message}`
      const now = Date.now()
      const last = lastCommandErrorRef.current

      if (last && last.key === key && now - last.ts < COMMAND_ERROR_TOAST_DEDUP_MS) return

      lastCommandErrorRef.current = { key, ts: now }

      showError(`命令执行失败：${detail.commandId}（${detail.message}）`, {
        label: '查看快捷键',
        onClick: openShortcutsHelp,
        variant: 'secondary',
      })
    }

    window.addEventListener(COMMAND_EXECUTION_ERROR_EVENT, onCommandError)
    return () => window.removeEventListener(COMMAND_EXECUTION_ERROR_EVENT, onCommandError)
  }, [showError])

  const handleLoad = () => {
    setIsLoading(false)
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

export default function Root() {
  return (
    <ErrorBoundaryClass>
      <AppWrapper />
    </ErrorBoundaryClass>
  )
}
