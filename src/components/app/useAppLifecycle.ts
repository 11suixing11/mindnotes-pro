import { useCallback, useEffect, useState } from 'react'
import { findShortcutAction, isEditableShortcutTarget } from '../../keyboard/shortcuts'
import { useAppStore } from '../../store/appStore'
import { useShortcutStore } from '../../store/useShortcutStore'
import { useThemeStore } from '../../store/useThemeStore'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: string }>
}

interface AppLifecycleState {
  canInstall: boolean
  installApp: () => Promise<void>
}

export function useAppLifecycle(onToggleShortcuts: () => void): AppLifecycleState {
  const initTheme = useThemeStore((state) => state.initTheme)
  const init = useAppStore((state) => state.init)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    initTheme()
    void init()
  }, [initTheme, init])

  useEffect(() => {
    const handleBeforeUnload = () => {
      useAppStore.getState().saveNow()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableShortcutTarget(event.target)) return

      const action = findShortcutAction(event, useShortcutStore.getState().bindings)
      if (action === 'help.shortcuts') {
        event.preventDefault()
        onToggleShortcuts()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onToggleShortcuts])

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }
    const handleAppInstalled = () => setDeferredPrompt(null)

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }, [deferredPrompt])

  return { canInstall: deferredPrompt !== null, installApp }
}
