import { useEffect, useState } from 'react'

export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    // 检查 Service Worker 支持
    if (!('serviceWorker' in navigator)) {
      console.log('[PWA] Service Worker not supported')
      return
    }

    // 注册 Service Worker
    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })
        console.log('[PWA] Service Worker registered:', reg.scope)
        setRegistration(reg)

        // 监听更新
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New content available')
              setUpdateAvailable(true)
            }
          })
        })

        // 监听控制器变化
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[PWA] Controller changed, reloading...')
          // 可以选择自动刷新或提示用户
        })

      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error)
      }
    }

    registerSW()

    // 监听网络状态
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 更新 Service Worker
  const updateServiceWorker = async () => {
    if (!registration) return

    try {
      await registration.update()
      console.log('[PWA] Service Worker update checked')
    } catch (error) {
      console.error('[PWA] Service Worker update failed:', error)
    }
  }

  // 跳过等待，立即激活新版本
  const skipWaiting = async () => {
    if (!registration?.waiting) return

    registration.addEventListener('updatefound', () => {
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
    })

    window.location.reload()
  }

  return {
    registration,
    updateAvailable,
    isOnline,
    updateServiceWorker,
    skipWaiting,
  }
}
