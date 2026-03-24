import { createContext, useContext, useState, useCallback } from 'react'

interface ToastAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  action?: ToastAction
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], duration?: number, action?: ToastAction) => void
  showSuccess: (message: string, action?: ToastAction) => void
  showError: (message: string, action?: ToastAction) => void
  showInfo: (message: string, action?: ToastAction) => void
  showWarning: (message: string, action?: ToastAction) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback(
    (message: string, type: Toast['type'] = 'info', duration: number = 3000, action?: ToastAction) => {
      const id = Math.random().toString(36).substr(2, 9)
      const toast: Toast = { id, message, type, duration, action }

      setToasts((prev) => [...prev, toast])

      // duration 为 0 时不自动移除，其余情况按时关闭，避免提示长期堆积
      if (duration === 0) {
        return
      }

      // 自动移除
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    },
    []
  )

  const showSuccess = useCallback(
    (message: string, action?: ToastAction) => {
      showToast(message, 'success', action ? 5000 : 3000, action)
    },
    [showToast]
  )

  const showError = useCallback(
    (message: string, action?: ToastAction) => {
      showToast(message, 'error', action ? 5000 : 3000, action)
    },
    [showToast]
  )

  const showInfo = useCallback(
    (message: string, action?: ToastAction) => {
      showToast(message, 'info', action ? 5000 : 3000, action)
    },
    [showToast]
  )

  const showWarning = useCallback(
    (message: string, action?: ToastAction) => {
      showToast(message, 'warning', action ? 8000 : 3000, action)
    },
    [showToast]
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning }}>
      {children}

      {/* Toast 容器 */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm
              transform transition-all duration-300 ease-out
              animate-slide-in-right
              max-w-sm
              ${toast.type === 'success' ? 'bg-green-500/90 text-white' : ''}
              ${toast.type === 'error' ? 'bg-red-500/90 text-white' : ''}
              ${toast.type === 'info' ? 'bg-blue-500/90 text-white' : ''}
              ${toast.type === 'warning' ? 'bg-yellow-500/90 text-white' : ''}
            `}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">
                {toast.type === 'success' && '✅'}
                {toast.type === 'error' && '❌'}
                {toast.type === 'info' && 'ℹ️'}
                {toast.type === 'warning' && '⚠️'}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{toast.message}</p>
                {toast.action && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => {
                        toast.action?.onClick()
                        removeToast(toast.id)
                      }}
                      className={`
                        px-3 py-1 text-xs font-medium rounded transition-colors
                        ${toast.action.variant === 'primary' 
                          ? 'bg-white text-blue-600 hover:bg-blue-50' 
                          : 'bg-white/20 text-white hover:bg-white/30'
                        }
                      `}
                    >
                      {toast.action.label}
                    </button>
                    <button
                      onClick={() => removeToast(toast.id)}
                      className="px-3 py-1 text-xs font-medium rounded bg-white/20 text-white hover:bg-white/30 transition-colors"
                    >
                      关闭
                    </button>
                  </div>
                )}
              </div>
              {!toast.action && (
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-lg opacity-70 hover:opacity-100"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
