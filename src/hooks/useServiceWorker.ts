import { useEffect, useRef, useState } from 'react'
import { debugError, debugLog } from '../utils/logger'

export function useServiceWorker() {
  const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [swReady, setSwReady] = useState(false)
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const currentWorkerRef = useRef<ServiceWorker | null>(null)

  useEffect(() => {
    // 在测试环境允许执行注册分支，便于覆盖关键行为。
    if (!import.meta.env.PROD && import.meta.env.MODE !== 'test') {
      return
    }

    // 检查 Service Worker 支持
    if (!('serviceWorker' in navigator)) {
      debugLog('[PWA] Service Worker not supported')
      return
    }

    let isMounted = true

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    const handleControllerChange = () => {
      debugLog('[PWA] Controller changed, reloading...')
      window.location.reload()
    }

    const handleStateChange = () => {
      const worker = currentWorkerRef.current
      if (worker?.state === 'installed' && navigator.serviceWorker.controller) {
        debugLog('[PWA] New content available')
        setUpdateAvailable(true)
      }
    }

    const handleUpdateFound = () => {
      const reg = registrationRef.current
      if (!reg) return

      if (currentWorkerRef.current) {
        currentWorkerRef.current.removeEventListener('statechange', handleStateChange)
      }

      const newWorker = reg.installing
      if (!newWorker) return

      currentWorkerRef.current = newWorker
      newWorker.addEventListener('statechange', handleStateChange)
    }

    // 注册 Service Worker
    const registerSW = async () => {
      try {
        const swUrl = `${import.meta.env.BASE_URL}sw.js`

        const reg = await navigator.serviceWorker.register(swUrl, {
          scope: import.meta.env.BASE_URL,
          type: 'module',
        })

        if (!isMounted) {
          return
        }

        registrationRef.current = reg
        debugLog('✅ [PWA] Service Worker registered:', reg.scope)
        setRegistration(reg)
        
        // 检查是否就绪
        if (reg.active) {
          setSwReady(true)
          debugLog('✅ [PWA] Service Worker ready')
        }

        // 监听更新
        reg.addEventListener('updatefound', handleUpdateFound)
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
      } catch (error) {
        debugError('[PWA] Service Worker registration failed:', error)
      }
    }

    registerSW()

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      isMounted = false
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)

      if (registrationRef.current) {
        registrationRef.current.removeEventListener('updatefound', handleUpdateFound)
      }

      if (currentWorkerRef.current) {
        currentWorkerRef.current.removeEventListener('statechange', handleStateChange)
      }

      currentWorkerRef.current = null
      registrationRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!registration) {
      return
    }

    const checkForUpdate = () => {
      registration.update().catch((error) => {
        debugError('[PWA] Scheduled update check failed:', error)
      })
    }

    const intervalId = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [registration])

  // 更新 Service Worker
  const updateServiceWorker = async () => {
    if (!registration) return

    try {
      await registration.update()
      debugLog('[PWA] Service Worker update checked')
    } catch (error) {
      debugError('[PWA] Service Worker update failed:', error)
    }
  }

  // 跳过等待，立即激活新版本
  const skipWaiting = () => {
    if (!registration?.waiting) return
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  return {
    registration,
    updateAvailable,
    isOnline,
    swReady,
    updateServiceWorker,
    skipWaiting,
  }
}
