import { useEffect } from 'react'
import { useToast } from '../components/ui/Toast'

export function useNetworkStatus() {
  const toast = useToast()

  useEffect(() => {
    const handleOnline = () => {
      toast.showSuccess('已恢复网络连接')
    }

    const handleOffline = () => {
      toast.showWarning('已断开网络连接，部分功能可能不可用')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 初始状态
    if (!navigator.onLine) {
      handleOffline()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [toast])

  return {
    isOnline: navigator.onLine,
  }
}
